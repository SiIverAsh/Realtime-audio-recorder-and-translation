import os
import numpy as np
import onnxruntime
from core.config import SAMPLE_RATE, VAD_THRESHOLD, VAD_MODEL_PATH

class OnnxVad:
    def __init__(self, model_path):
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"VAD model not found at {model_path}")
        
        # 抑制 ONNX Runtime 的日志
        opts = onnxruntime.SessionOptions()
        opts.log_severity_level = 3
        
        # 优先使用 CPU，Release 版体积更小
        self.session = onnxruntime.InferenceSession(
            model_path, 
            providers=['CPUExecutionProvider'], 
            sess_options=opts
        )
        
        # 自动检测模型版本 (v4 vs v5)
        inputs = [node.name for node in self.session.get_inputs()]
        if 'state' in inputs:
            self.version = 5
            print("VAD 引擎: 检测到 v5 模型")
        else:
            self.version = 4
            print("VAD 引擎: 检测到 v4 模型 (Legacy)")
            
        self.reset_states()

    def reset_states(self):
        self._state = np.zeros((2, 1, 128), dtype=np.float32)
        if self.version == 5:
            self._state = np.zeros((2, 1, 128), dtype=np.float32)
        else:
            # v4 使用 h, c (2, 1, 64)
            self._h = np.zeros((2, 1, 64),  dtype=np.float32)
            self._c = np.zeros((2, 1, 64), dtype=np.float32)

    def __call__(self, x, sr):
        # 增加 batch 维度 (1, N)
        if x.ndim == 1:
            x = x[np.newaxis, :]
        
        # float32
        if x.dtype != np.float32:
            x = x.astype(np.float32)
        
        sr_input = np.array([sr], dtype=np.int64)
        ort_inputs = {
            'input': x,
            'sr': sr_input,
            'state': self._state
        }
        
        out, next_state = self.session.run(None, ort_inputs)
        self._state = next_state
        if self.version == 5:
            ort_inputs = {
                'input': x,
                'sr': sr_input,
                'state': self._state
            }
            out, self._state = self.session.run(None, ort_inputs)
        else:
            # v4 推理
            ort_inputs = {
                'input': x,
                'sr': sr_input,
                'h': self._h,
                'c': self._c
            }
            out, self._h, self._c = self.session.run(None, ort_inputs)
        
        return out[0][0]

def init_vad():
    print(f"加载 Silero VAD (ONNX v5): {VAD_MODEL_PATH}")
    print(f"加载 Silero VAD (ONNX): {VAD_MODEL_PATH}")
    return OnnxVad(VAD_MODEL_PATH)

def detect_speech(audio, vad_model):# 检测语音时间戳

    # 每次处理完整 buffer 前重置状态
    vad_model.reset_states()
    
    # 16kHz下的窗口大小为 512
    window_size_samples = 512
    
    min_speech_samples = int(SAMPLE_RATE * 0.25) # 250ms
    min_silence_samples = int(SAMPLE_RATE * 0.1) # 100ms
    
    speech_probs = []
    
    # 1. 分块推理
    for i in range(0, len(audio), window_size_samples):
        chunk = audio[i: i+window_size_samples]
        if len(chunk) < window_size_samples:
            # 填充最后一块，确保形状固定为 (512,)
            chunk = np.pad(chunk, (0, window_size_samples - len(chunk)))
            
        prob = vad_model(chunk, SAMPLE_RATE)
        speech_probs.append(prob)

    # 调试：如果一直没反应，打印一下当前最大的语音概率
    # max_prob = max(speech_probs) if speech_probs else 0
    # if max_prob > 0.05: 
    #     print(f"\r当前最大语音概率: {max_prob:.2f}", end="")

    # 2. 转换概率为时间戳
    timestamps = []
    triggered = False
    start_idx = 0
    silence_counter = 0
    
    threshold = VAD_THRESHOLD
    neg_threshold = VAD_THRESHOLD - 0.15 # 防止在边缘抖动

    for i, prob in enumerate(speech_probs):
        current_time = i * window_size_samples
        
        if not triggered:
            if prob >= threshold:
                triggered = True
                start_idx = current_time
                silence_counter = 0
        else:
            if prob < neg_threshold:
                silence_counter += window_size_samples
                if silence_counter > min_silence_samples:
                    triggered = False
                    end_idx = current_time
                    if (end_idx - start_idx) >= min_speech_samples:
                        timestamps.append({'start': start_idx, 'end': end_idx})
            else:
                silence_counter = 0

    # 处理结尾还在说话的情况
    if triggered:
        end_idx = len(audio)
        if (end_idx - start_idx) >= min_speech_samples:
            timestamps.append({'start': start_idx, 'end': end_idx})
            
    return timestamps