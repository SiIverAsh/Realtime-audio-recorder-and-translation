import torch

# WHISPER_MODEL_PATH = "E:/faster_whisper_moudle/whisper-large-v3-float32" # 请替换Whisper模型路径
# # FASTER_CRISPERWHISPER_PATH = "D:/faster_whisper_moudle/faster_CrisperWhisper" # 请替换FasterCrisperWhisper模块路径
WHISPER_MODEL_PATH = "..\\models\\ggml-base.bin" 
VAD_MODEL_PATH = "..\\models\\silero_vad.onnx" 
# FASTER_CRISPERWHISPER_PATH = "D:/faster_whisper_moudle/faster_CrisperWhisper" # 不再需要
TARGET_LANGUAGE = "zh-CN" 
SAMPLE_RATE = 16000     #采样率
CHUNK_DURATION = 0.1    #每次读取的音频块长度
BUFFER_DURATION = 20     #缓冲区长度
MIN_SPEECH_DURATION = 0.1    #最小语音持续时间
SILENCE_THRESHOLD = 0.3  #静音阈值 (流式模式下稍微调高)
VAD_THRESHOLD = 0.3     #VAD阈值
STREAMING_INTERVAL = 0.5 # 流式识别尝试间隔

USE_CUDA = torch.cuda.is_available()
FORCE_LANGUAGE = "zh"  # 强制识别语言代码

# --- 翻译引擎设置 ---
TRANSLATION_ENGINE = "google" 
LLM_API_KEY = "***"  
LLM_BASE_URL = "https://api.deepseek.com"  
LLM_MODEL = "deepseek-chat"  

# --- API供应商 ---
PROVIDER_CONFIG = {
    "deepseek": "https://api.deepseek.com/v1",
    "openai": "https://api.openai.com/v1",
    "siliconflow": "https://api.siliconflow.cn/v1",
    "openrouter": "https://openrouter.ai/api/v1",
    "gemini": "https://generativelanguage.googleapis.com/v1beta/openai/",
    "groq": "https://api.groq.com/openai/v1"
}
