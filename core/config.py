import torch

WHISPER_MODEL_PATH = "../faster-whisper-large-v2" # 请替换Whisper模型路径
# FASTER_CRISPERWHISPER_PATH = "D:/faster_whisper_moudle/faster_CrisperWhisper" # 请替换FasterCrisperWhisper模块路径
DEEPSEEK_API_KEY = "sk-xxx" # 请替换为您的DeepSeek API密钥
SAMPLE_RATE = 16000     #采样率
CHUNK_DURATION = 0.1    #每次读取的音频块长度
BUFFER_DURATION = 6     #缓冲区长度
MIN_SPEECH_DURATION = 0.1    #最小语音持续时间
SILENCE_THRESHOLD = 0.2  #静音阈值
VAD_THRESHOLD = 0.5     #VAD阈值
USE_CUDA = torch.cuda.is_available()
# FORCE_LANGUAGE = "ja"  # 强制识别语言代码，例如 "ja" 表示日语；设置为 None 则自动检测语言