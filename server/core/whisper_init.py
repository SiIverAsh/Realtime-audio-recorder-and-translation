import os
from faster_whisper import WhisperModel
from core.config import WHISPER_MODEL_PATH
# from core.config import FASTER_CRISPERWHISPER_PATH


def init_whisper(model_path=WHISPER_MODEL_PATH):
    print("加载 Whisper")
    return WhisperModel(
        model_path,
        # FASTER_CRISPERWHISPER_PATH,
        device="cuda" ,
        compute_type="float16",
    )
