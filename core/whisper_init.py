from faster_whisper import WhisperModel
from core.config import WHISPER_MODEL_PATH
from core.config import FASTER_CRISPERWHISPER_PATH

def init_whisper():
    print("加载 Whisper")
    return WhisperModel(
        WHISPER_MODEL_PATH,
        # FASTER_CRISPERWHISPER_PATH,
        device="cuda" ,
        compute_type="float16"
    )
