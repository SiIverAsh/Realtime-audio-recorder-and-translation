import os
# from faster_whisper import WhisperModel
from pywhispercpp.model import Model
from core.config import WHISPER_MODEL_PATH 

# from core.config import FASTER_CRISPERWHISPER_PATH


def init_whisper(model_path=WHISPER_MODEL_PATH):
    # print("加载 Whisper")
    # return WhisperModel(
    #     model_path,
    #     # FASTER_CRISPERWHISPER_PATH,
    #     device="cuda" ,
    #     compute_type="float16",
    # )

    # 如果检测到 CUDA，设置 n_gpu_layers 以将计算卸载到 GPU
    # n_gpu_layers = 64 if USE_CUDA else 0

    return Model(
        model_path, 
        n_threads=6, 
        # n_gpu_layers=n_gpu_layers,
        print_realtime=False, 
        print_progress=False
    )
