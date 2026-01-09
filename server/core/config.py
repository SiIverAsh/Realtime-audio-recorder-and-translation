import os
from pathlib import Path
from dotenv import load_dotenv

# 从 .env 文件加载环境变量
# 假设 .env 文件位于项目根目录（即 server 目录的父目录的父目录，因为当前文件在 server/core/）
# 注意：根据实际部署情况，这里可能需要调整层级，建议直接指向项目根目录
BASE_DIR = Path(__file__).resolve().parent.parent.parent
load_dotenv(BASE_DIR / ".env")

# 模型路径配置
# 确保路径始终为绝对路径，避免从不同目录启动时失效
_default_whisper_path = BASE_DIR / "models" / "ggml-small.bin"
_default_vad_path = BASE_DIR / "models" / "silero_vad.onnx"

# 从环境变量读取，如果是相对路径则自动基于 BASE_DIR 转为绝对路径
env_whisper_path = os.getenv("WHISPER_MODEL_PATH")
if env_whisper_path:
    WHISPER_MODEL_PATH = str(BASE_DIR / env_whisper_path) if not os.path.isabs(env_whisper_path) else env_whisper_path
else:
    WHISPER_MODEL_PATH = str(_default_whisper_path)

env_vad_path = os.getenv("VAD_MODEL_PATH")
if env_vad_path:
    VAD_MODEL_PATH = str(BASE_DIR / env_vad_path) if not os.path.isabs(env_vad_path) else env_vad_path
else:
    VAD_MODEL_PATH = str(_default_vad_path)

# 语言设置
TARGET_LANGUAGE = os.getenv("TARGET_LANGUAGE", "zh-CN") # 翻译目标语言
FORCE_LANGUAGE = os.getenv("FORCE_LANGUAGE", "ja")      # 强制语音识别源语言
if FORCE_LANGUAGE and FORCE_LANGUAGE.lower() in ["none", "null", ""]:
    FORCE_LANGUAGE = None

# 音频与识别参数设置
SAMPLE_RATE = int(os.getenv("SAMPLE_RATE", 16000))            # 采样率
CHUNK_DURATION = float(os.getenv("CHUNK_DURATION", 0.1))      # 每次读取的音频块长度
BUFFER_DURATION = float(os.getenv("BUFFER_DURATION", 20))     # 缓冲区长度
MIN_SPEECH_DURATION = float(os.getenv("MIN_SPEECH_DURATION", 0.2)) # 最小语音持续时间
SILENCE_THRESHOLD = float(os.getenv("SILENCE_THRESHOLD", 0.3))     # 静音阈值
SPEECH_PADDING_DURATION = float(os.getenv("SPEECH_PADDING_DURATION", 0.3)) # 语音切分缓冲(秒)
VAD_THRESHOLD = float(os.getenv("VAD_THRESHOLD", 0.3))             # VAD 阈值
INTERMEDIATE_TRANSCRIPTION_INTERVAL = float(os.getenv("INTERMEDIATE_TRANSCRIPTION_INTERVAL", 0.4)) # 中间结果识别间隔

# USE_CUDA = False 
# import torch
# USE_CUDA = torch.cuda.is_available()



# --- 翻译引擎设置 ---
TRANSLATION_ENGINE = os.getenv("TRANSLATION_ENGINE", "google")
LLM_API_KEY = os.getenv("LLM_API_KEY", "")
LLM_BASE_URL = os.getenv("LLM_BASE_URL", "https://api.deepseek.com")
LLM_MODEL = os.getenv("LLM_MODEL", "deepseek-chat")

# --- API供应商 ---
PROVIDER_CONFIG = {
    "deepseek": "https://api.deepseek.com/v1",
    "openai": "https://api.openai.com/v1",
    "siliconflow": "https://api.siliconflow.cn/v1",
    "openrouter": "https://openrouter.ai/api/v1",
    "gemini": "https://generativelanguage.googleapis.com/v1beta/openai/",
    "groq": "https://api.groq.com/openai/v1"
}