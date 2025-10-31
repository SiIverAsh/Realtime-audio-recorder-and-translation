import soundcard as sc
from collections import deque
from core.config import SAMPLE_RATE, CHUNK_DURATION, BUFFER_DURATION

def get_mic():
    mic = sc.get_microphone(id=str(sc.default_speaker().name), include_loopback=True)
    frames_per_chunk = int(SAMPLE_RATE * CHUNK_DURATION)
    audio_buffer = deque(maxlen=int(SAMPLE_RATE * BUFFER_DURATION))
    return mic, frames_per_chunk, audio_buffer
