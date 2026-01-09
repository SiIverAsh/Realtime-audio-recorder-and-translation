import threading
import time
import queue # 导入 queue 模块
import numpy as np
from core.audio_capture import get_mic
from core.whisper_init import init_whisper, model_lock # 导入全局 model_lock
from core.silero_vad_engine import init_vad, detect_speech
from core.service_logic import process_translation
from core.config import SAMPLE_RATE, MIN_SPEECH_DURATION, SILENCE_THRESHOLD, TARGET_LANGUAGE, TRANSLATION_ENGINE, LLM_API_KEY, INTERMEDIATE_TRANSCRIPTION_INTERVAL, SPEECH_PADDING_DURATION, LLM_MODEL

class AudioManager:
    def __init__(self, callback=None, language=None):
        self.running = True 
        self.whisper = init_whisper() # 获取单例模型实例
        self.model_lock = model_lock # 引用全局锁
        self.vad_model = init_vad()
        self.mic, self.frames_per_chunk, self.audio_buffer = get_mic()
        self.callback = callback
        self.language = language if language != "auto" else None
        self.target_language = TARGET_LANGUAGE
        self.translation_engine = TRANSLATION_ENGINE
        self.llm_api_key = LLM_API_KEY
        self.llm_model = LLM_MODEL
        self.base_url = None
        
        # 上下文记忆
        self.last_final_text = ""
        
        # 任务队列
        self.transcription_queue = queue.Queue()
        self.last_intermediate_time = 0

        # 控制工作线程的 Event
        self._worker_running = threading.Event()
        self._worker_running.set()

        # 启动专门的推理工作线程
        self.worker_thread = threading.Thread(target=self._transcription_worker, daemon=True)
        self.worker_thread.start()

    def audio_stop(self):
        self.running = False
        self._worker_running.clear() # 发送停止信号
        self.transcription_queue.put(None) # 放入哨兵值解除阻塞
        if self.worker_thread.is_alive():
            self.worker_thread.join(timeout=2.0)

    def _transcription_worker(self):
        """
        独立的线程，负责从队列中获取任务并进行 Whisper 识别，
        确保 Whisper 模型始终在单线程中被访问。
        """
        print("Transcription worker started.")
        while self._worker_running.is_set():
            try:
                task = self.transcription_queue.get(timeout=1.0) # 设置超时以便能响应停止信号
                if task is None: # 哨兵值
                    self.transcription_queue.task_done()
                    break

                # 解包任务数据
                audio_data, is_final_result, detected_lang, target_lang, engine, api_key, base_url, model, callback = task
                
                # Debug: 检查 Worker 拿到的任务配置
                if is_final_result:
                   print(f"[Debug] Worker Task: engine={engine}, model={model}, final={is_final_result}")

                # --- 优化：丢帧策略 ---
                # 如果是中间结果，且队列中还有积压的任务，直接跳过当前任务，只处理最新的
                if not is_final_result and not self.transcription_queue.empty():
                    # print(f"Skipping intermediate task, queue size: {self.transcription_queue.qsize()}")
                    self.transcription_queue.task_done()
                    continue
                
                try:
                    # 使用全局锁保护 transcribe 调用（虽然是单线程，但为了防止其他潜在入口）
                    with self.model_lock:
                        segments = self.whisper.transcribe(
                            audio_data, 
                            language=detected_lang if detected_lang else 'auto',
                            n_threads=6 if is_final_result else 4,
                            print_progress=False,
                            print_realtime=False
                            # initial_prompt=self.last_final_text # 暂时禁用上下文提示以减少幻觉
                        )
                    
                    combined_text = "".join(seg.text.strip() for seg in segments)
                    
                    if combined_text:
                        # 如果是最终结果，更新上下文记忆
                        if is_final_result:
                            # 只保留最近的 200 个字符作为 Prompt，避免太长
                            self.last_final_text = (self.last_final_text + " " + combined_text)[-200:].strip()

                        # 翻译任务可以在新线程中运行，因为它只涉及网络请求，不涉及 Whisper 模型
                        threading.Thread(
                            target=process_translation,
                            args=(combined_text, detected_lang, target_lang, engine, api_key, base_url, model, callback, is_final_result),
                            daemon=True
                        ).start()

                except Exception as e:
                    print(f"Transcription worker processing error: {e}")
                finally:
                    self.transcription_queue.task_done()

            except queue.Empty:
                continue # 队列为空，继续循环检查停止信号
            except Exception as e:
                print(f"Transcription worker loop error: {e}")
        
        print("Transcription worker stopped.")

    def audio_process(self):
        # 重新初始化计时器
        self.last_intermediate_time = time.time()

        with self.mic.recorder(samplerate=SAMPLE_RATE) as recorder:
            while self.running: 
                chunk = recorder.record(numframes=self.frames_per_chunk)
                chunk_mono = chunk.mean(axis=1).astype(np.float32)
                self.audio_buffer.extend(chunk_mono)

                buffer_np = np.array(self.audio_buffer, dtype=np.float32)
                speech_timestamps = detect_speech(buffer_np, self.vad_model)

                if not speech_timestamps:
                    if len(self.audio_buffer) >= (self.audio_buffer.maxlen or 160000): # 防止无限增长
                        self.audio_buffer.clear()
                    continue

                # --- 新增：中间流式识别逻辑 ---
                current_time = time.time()
                if current_time - self.last_intermediate_time > INTERMEDIATE_TRANSCRIPTION_INTERVAL:
                    self.last_intermediate_time = current_time
                    
                    # 避免队列堆积：只有当队列比较空时才添加中间任务
                    if self.transcription_queue.qsize() < 2:
                        self.transcription_queue.put((
                            buffer_np.copy(), # 音频数据副本
                            False,            # is_final_result
                            self.language,    # detected_lang
                            self.target_language,
                            self.translation_engine,
                            self.llm_api_key,
                            self.base_url,
                            self.llm_model,
                            self.callback
                        ))

                # 强制切分逻辑：如果 Buffer 过长（例如超过15秒），强制进行一次识别
                MAX_SPEECH_DURATION = 15.0
                if len(buffer_np) / SAMPLE_RATE > MAX_SPEECH_DURATION:
                     print(f"Audio buffer exceeded {MAX_SPEECH_DURATION}s, forcing final transcription.")
                     self.transcription_queue.put((
                        buffer_np.copy(), 
                        True, # is_final_result
                        self.language,
                        self.target_language,
                        self.translation_engine,
                        self.llm_api_key,
                        self.base_url,
                        self.llm_model,
                        self.callback
                    ))
                     self.audio_buffer.clear()
                     continue

                last_speech_end = speech_timestamps[-1]['end']
                silence_sec = (len(buffer_np) - last_speech_end) / SAMPLE_RATE

                if silence_sec >= SILENCE_THRESHOLD:
                    # --- 优化：尾部 Padding (防止吞音) ---
                    padding_samples = int(SPEECH_PADDING_DURATION * SAMPLE_RATE)
                    end_index = min(last_speech_end + padding_samples, len(buffer_np))
                    
                    speech_audio = buffer_np[:end_index]
                    duration_sec = len(speech_audio) / SAMPLE_RATE

                    if duration_sec >= MIN_SPEECH_DURATION:
                        print(f"VAD检测到语音 ({duration_sec:.2f}s)，开始最终识别...")
                        # 放入最终识别任务
                        self.transcription_queue.put((
                            speech_audio.copy(), # 音频数据副本
                            True,                # is_final_result
                            self.language,
                            self.target_language,
                            self.translation_engine,
                            self.llm_api_key,
                            self.base_url,
                            self.llm_model,
                            self.callback
                        ))

                    # --- 优化：头部 Padding (上下文保留) ---
                    # 关键修复：不要丢弃 end_index 之后的数据！
                    # end_index 是本次送去识别的截止点，之后的所有数据都属于“下一句”，必须保留。
                    self.audio_buffer.clear()
                    
                    if end_index < len(buffer_np):
                        remaining_audio = buffer_np[end_index:]
                        self.audio_buffer.extend(remaining_audio)
                        # print(f"Preserved {len(remaining_audio)/SAMPLE_RATE:.2f}s of future audio.")
                    else:
                        # 如果正好切完，为了保险起见，还是保留一点点静音 Padding 作为过渡
                        # (仅当 buffer 足够长时)
                        if len(buffer_np) > padding_samples:
                             self.audio_buffer.extend(buffer_np[-padding_samples:])