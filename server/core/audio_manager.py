# core/audio_manager.py
import threading
import time
import queue
import numpy as np
from datetime import datetime
from core.audio_capture import get_mic
from core.whisper_init import init_whisper
from core.silero_vad_engine import init_vad, detect_speech
# from core.vad_engine import init_vad, detect_speech
from core.service_logic import process_translation
from core.config import (
    SAMPLE_RATE, MIN_SPEECH_DURATION, SILENCE_THRESHOLD, 
    TARGET_LANGUAGE, TRANSLATION_ENGINE, LLM_API_KEY, 
    STREAMING_INTERVAL
)

class AudioManager:
    def __init__(self, callback=None, language=None):
        self.running = True 
        self.whisper = init_whisper()
        self.vad_model = init_vad()
        self.mic, self.frames_per_chunk, self.audio_buffer = get_mic()
        self.callback = callback
        self.language = language if language != "auto" else None
        self.target_language = TARGET_LANGUAGE
        self.translation_engine = TRANSLATION_ENGINE
        self.llm_api_key = LLM_API_KEY
        self.base_url = None
        
        self.audio_queue = queue.Queue()
        self.model_lock = threading.Lock() # 关键：模型互斥锁
        self.speech_start_time = None # 记录语音段开始时间

    def audio_stop(self):
        self.running = False

    def _record_loop(self):
        """录音生产线程：从麦克风读取数据并放入队列"""
        print("录音线程启动...")
        with self.mic.recorder(samplerate=SAMPLE_RATE) as recorder:
            while self.running:
                chunk = recorder.record(numframes=self.frames_per_chunk)
                self.audio_queue.put(chunk)
        print("录音线程停止")

    def _format_time_range(self, start, end, is_final):
        if not start: start = datetime.now()
        if not end: end = datetime.now()
        start_str = start.strftime('%H:%M:%S')
        if not is_final:
            return f"{start_str} ..."
        return f"{start_str} - {end.strftime('%H:%M:%S')}"

    def _run_whisper_task(self, audio_data, is_final, start_time, end_time):
        """
        Whisper 识别任务 (将在子线程运行)
        is_final: True 表示这是句子结束后的最终识别，False 表示流式中间结果
        """
        # 尝试获取锁：如果是 Final，必须阻塞等待；如果是流式，尝试非阻塞获取
        got_lock = False
        if is_final:
            self.model_lock.acquire()
            got_lock = True
        else:
            got_lock = self.model_lock.acquire(blocking=False)
            if not got_lock:
                return # 忙，跳过这次流式更新

        try:
            # 执行识别
            segments = self.whisper.transcribe(
                audio_data, 
                language=self.language if self.language else 'auto',
                n_threads=6
            )
            combined_text = "".join(seg.text.strip() for seg in segments)
            
            # 生成时间戳字符串
            time_str = self._format_time_range(start_time, end_time, is_final)

            # 回调处理
            if combined_text:
                if is_final:
                    print(f"Final [{time_str}]: {combined_text}")
                    detected_lang = self.language if self.language else "auto"
                    # 启动翻译任务 (异步)
                    threading.Thread(
                        target=process_translation,
                        args=(combined_text, detected_lang, self.target_language, self.translation_engine, self.llm_api_key, self.base_url, self.callback, time_str), 
                        daemon=True
                    ).start()
                else:
                    # 中间结果 (Stream)
                    # print(f"Stream: {combined_text}")
                    if self.callback:
                        self.callback(combined_text, None, step="asr", timestamp=time_str)
        except Exception as e:
            print(f"Whisper Error: {e}")
        finally:
            if got_lock:
                self.model_lock.release()

    def audio_process(self):
        """主处理循环：负责 VAD 检测与任务调度"""
        record_thread = threading.Thread(target=self._record_loop, daemon=True)
        record_thread.start()

        print("主处理循环启动")
        
        last_asr_time = time.time()
        
        while self.running: 
            try:
                # 阻塞等待数据，避免空转 CPU
                chunk = self.audio_queue.get(timeout=1)
            except queue.Empty:
                continue

            # 数据处理：双声道转单声道
            chunk_mono = chunk.mean(axis=1).astype(np.float32)
            self.audio_buffer.extend(chunk_mono)
            
            buffer_np = np.array(self.audio_buffer, dtype=np.float32)
            current_time = time.time()
            
            # VAD 检测 (快速判断是否有人声)
            speech_timestamps = detect_speech(buffer_np, self.vad_model)

            # --- 分支逻辑 ---
            if not speech_timestamps:
                # 如果没有人声且缓冲区过大，则清理以释放内存
                if len(self.audio_buffer) >= (self.audio_buffer.maxlen or 160000):
                    self.audio_buffer.clear()
                    self.speech_start_time = None # 清理时间状态
                continue
            
            # 如果检测到语音且之前没记录开始时间，则记录
            if self.speech_start_time is None:
                self.speech_start_time = datetime.now()

            last_speech_end = speech_timestamps[-1]['end']
            silence_sec = (len(buffer_np) - last_speech_end) / SAMPLE_RATE

            # 1. 检测到足够长的静音 -> 触发 Final 识别
            if silence_sec >= SILENCE_THRESHOLD:
                speech_audio = buffer_np[:last_speech_end]
                duration_sec = len(speech_audio) / SAMPLE_RATE

                if duration_sec >= MIN_SPEECH_DURATION:
                    # 复制数据用于识别，因为要立刻清空 buffer
                    audio_copy = speech_audio.copy()
                    
                    current_speech_end = datetime.now()
                    
                    # 启动 Final 任务 (使用阻塞锁，确保准确性)
                    threading.Thread(
                        target=self._run_whisper_task,
                        args=(audio_copy, True, self.speech_start_time, current_speech_end),
                        daemon=True
                    ).start()
                    
                    self.audio_buffer.clear()
                    self.speech_start_time = None # 重置开始时间
                    last_asr_time = current_time 
                    continue

            # 2. 流式间隔到达 -> 触发 Intermediate 识别
            if current_time - last_asr_time > STREAMING_INTERVAL:
                # 复制当前 buffer 的快照
                audio_copy = buffer_np.copy()
                
                # 启动流式任务 (使用非阻塞锁，忙则丢弃，保证实时性)
                threading.Thread(
                    target=self._run_whisper_task,
                    args=(audio_copy, False, self.speech_start_time, datetime.now()),
                    daemon=True
                ).start()
                
                last_asr_time = current_time
