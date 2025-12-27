# core/audio_manager.py
import threading
import numpy as np
from core.audio_capture import get_mic
from core.whisper_init import init_whisper
from core.vad_engine import init_vad, detect_speech
from core.translator import translate_text
from core.config import SAMPLE_RATE, MIN_SPEECH_DURATION, SILENCE_THRESHOLD, TARGET_LANGUAGE, TRANSLATION_ENGINE, LLM_API_KEY, PROVIDER_CONFIG

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

                buffer_np = np.array(self.audio_buffer)
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
                        # 识别时，记录 Whisper 探测到的语言
                        segments, info = self.whisper.transcribe(
                            speech_audio, beam_size=5, language=self.language
                        )
                        detected_lang = info.language 
                        combined_text = "".join(seg.text.strip() for seg in segments)
                        
                        if combined_text:
                            print(f"识别:{combined_text}")
                            threading.Thread(
                                target=self._handle_result,
                                args=(combined_text, detected_lang), 
                                daemon=True
                            ).start()

                    self.audio_buffer.clear()

    def _handle_result(self, text, source_lang):
        """修复：传入 source_lang 彻底解决 Google 翻译 None 报错"""
        try:
            translation = translate_text(
                text, 
                source=source_lang, 
                target=self.target_language, 
                engine=self.translation_engine, 
                api_key=self.llm_api_key,
                base_url=self.base_url
            )
            if self.callback:
                self.callback(text, translation)
        except Exception as e:
            print(f"Handle Result Error: {e}")
    
    def update_config(self, data: dict):
        """
        统一处理来自前端的配置更新
        处理变量名对齐 (camelCase -> snake_case)
        """
        if "language" in data:
            self.language = data["language"]
        
        if "targetLanguage" in data: 
            self.target_language = data["targetLanguage"]
            
        if "engine" in data:
            self.translation_engine = data["engine"]
            
        if "apiKey" in data:
            self.llm_api_key = data["apiKey"]
            
        if "provider" in data:
            self.base_url = PROVIDER_CONFIG.get(data["provider"])
            
        return f"配置已同步：{self.target_language}"