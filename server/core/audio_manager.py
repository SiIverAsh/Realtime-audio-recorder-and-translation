import threading
import numpy as np
from transformers.utils.import_utils import FORCE_TF_AVAILABLE

from core.audio_capture import get_mic
from core.whisper_init import init_whisper
from core.vad_engine import init_vad, detect_speech
from core.translator import translate_text
from core.config import SAMPLE_RATE, MIN_SPEECH_DURATION, SILENCE_THRESHOLD, TARGET_LANGUAGE, TRANSLATION_ENGINE, LLM_API_KEY
import re


class AudioManager:
    running = True

    def __init__(self, callback=None, language=None):
        self.whisper = init_whisper()
        self.vad_model = init_vad()
        self.mic, self.frames_per_chunk, self.audio_buffer = get_mic()
        self.callback = callback
        self.language = language
        self.target_language = TARGET_LANGUAGE
        self.translation_engine = TRANSLATION_ENGINE
        self.llm_api_key = LLM_API_KEY


    def audio_stop(self):
        AudioManager.running = False
        

    def audio_process(self):
        with self.mic.recorder(samplerate=SAMPLE_RATE) as recorder:
            while AudioManager.running:
                chunk = recorder.record(numframes=self.frames_per_chunk)
                chunk_mono = chunk.mean(axis=1).astype(np.float32)
                self.audio_buffer.extend(chunk_mono)

                buffer_np = np.array(self.audio_buffer)
                speech_timestamps = detect_speech(buffer_np, self.vad_model)

                if not speech_timestamps:
                    if len(self.audio_buffer) and self.audio_buffer.maxlen is not None and len(self.audio_buffer) >= self.audio_buffer.maxlen:
                        self.audio_buffer.clear()
                    continue

                last_speech_end = speech_timestamps[-1]['end']
                silence_sec = (len(buffer_np) - last_speech_end) / SAMPLE_RATE

                if silence_sec >= SILENCE_THRESHOLD:
                    speech_audio = buffer_np[:last_speech_end]
                    duration_sec = len(speech_audio) / SAMPLE_RATE

                    if duration_sec >= MIN_SPEECH_DURATION:
                        segments, info = self.whisper.transcribe(
                            speech_audio, beam_size=5, language=self.language
                        )
                        combined_text = "".join(seg.text.strip() for seg in segments)
                        # clean_text = re.sub(r"blocked_out_string\d+", "", combined_text).strip()
                        if combined_text:
                            print(f"识别:{combined_text}")
                            threading.Thread(
                                target=self._handle_result,
                                args=(combined_text,),
                                daemon=True
                            ).start()

                    self.audio_buffer.clear()

    def _handle_result(self, text):
        translation = translate_text(text, target=self.target_language, engine=self.translation_engine, api_key=self.llm_api_key)
        if self.callback:
            self.callback(text, translation)
        else:
            if translation:
                print(f"{translation}")
