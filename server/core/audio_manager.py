# core/audio_manager.py
import threading
import numpy as np
from core.audio_capture import get_mic
from core.whisper_init import init_whisper
from core.silero_vad_engine import init_vad, detect_speech
from core.service_logic import process_translation
from core.config import SAMPLE_RATE, MIN_SPEECH_DURATION, SILENCE_THRESHOLD, TARGET_LANGUAGE, TRANSLATION_ENGINE, LLM_API_KEY

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

    def audio_stop(self):
        self.running = False

    def audio_process(self):
        with self.mic.recorder(samplerate=SAMPLE_RATE) as recorder:
            while self.running: 
                chunk = recorder.record(numframes=self.frames_per_chunk)
                chunk_mono = chunk.mean(axis=1).astype(np.float32)
                self.audio_buffer.extend(chunk_mono)

                buffer_np = np.array(self.audio_buffer, dtype=np.float32)   #由于whispercpp对输入格式要求float32
                speech_timestamps = detect_speech(buffer_np, self.vad_model)


                if not speech_timestamps:
                    if len(self.audio_buffer) >= (self.audio_buffer.maxlen or 160000):
                        self.audio_buffer.clear()
                    continue

                last_speech_end = speech_timestamps[-1]['end']
                silence_sec = (len(buffer_np) - last_speech_end) / SAMPLE_RATE

                if silence_sec >= SILENCE_THRESHOLD:
                    speech_audio = buffer_np[:last_speech_end]
                    duration_sec = len(speech_audio) / SAMPLE_RATE

                    if duration_sec >= MIN_SPEECH_DURATION:
                        print(f"VAD检测到语音 ({duration_sec:.2f}s)，开始识别...")
                        # # 识别时，记录 Whisper 探测到的语言
                        # segments, info = self.whisper.transcribe(
                        #     speech_audio, beam_size=5, language=self.language
                        # Whisper CPP 识别
                        # pywhispercpp transcribe 返回 segments 列表
                        segments = self.whisper.transcribe(
                            speech_audio, 
                            language=self.language if self.language else 'auto',
                            n_threads=6
                        )
                        # detected_lang = info.language 
                        
                        # whisper.cpp 绑定通常较难直接获取 info.language，这里使用配置语言或标记为 auto
                        detected_lang = self.language if self.language else "auto"
                        combined_text = "".join(seg.text.strip() for seg in segments)
                        
                        if combined_text:
                            print(f"识别:{combined_text}")
                            threading.Thread(
                                target=process_translation,
                                args=(combined_text, detected_lang, self.target_language, self.translation_engine, self.llm_api_key, self.base_url, self.callback), 
                                daemon=True
                            ).start()

                    self.audio_buffer.clear()