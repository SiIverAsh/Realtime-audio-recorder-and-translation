import os
import threading
# 假设pywhispercpp的Whisper模型类
from pywhispercpp.model import Model as Whisper 
from core.config import WHISPER_MODEL_PATH

_whisper_model_instance = None
_model_initialization_lock = threading.Lock()
model_lock = threading.Lock() # 全局模型访问锁，用于保护 transcribe 调用

def init_whisper():
    global _whisper_model_instance
    with _model_initialization_lock:
        if _whisper_model_instance is None:
            print(f"Loading Whisper model from {WHISPER_MODEL_PATH} for the first time...")
            if not os.path.exists(WHISPER_MODEL_PATH):
                raise FileNotFoundError(f"Whisper model file not found at {WHISPER_MODEL_PATH}")
            try:
                _whisper_model_instance = Whisper(WHISPER_MODEL_PATH)
                print("Whisper model loaded successfully.")
            except Exception as e:
                print(f"Error loading Whisper model: {e}")
                raise
        return _whisper_model_instance
