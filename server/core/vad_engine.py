from silero_vad import get_speech_timestamps, load_silero_vad
from core.config import SAMPLE_RATE, VAD_THRESHOLD

def init_vad():
    print("加载 Silero VAD")
    return load_silero_vad()

def detect_speech(audio, vad_model):
    return get_speech_timestamps(
        audio,
        vad_model,
        sampling_rate=SAMPLE_RATE,
        threshold=VAD_THRESHOLD,
        min_speech_duration_ms=400,
        min_silence_duration_ms=400
    )
