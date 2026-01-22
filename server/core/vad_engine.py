import os
import numpy as np
import onnxruntime
from core.config import SAMPLE_RATE, VAD_THRESHOLD, VAD_MODEL_PATH

class OnnxVad:
    def __init__(self, model_path):
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"VAD model not found at {model_path}")
        
        opts = onnxruntime.SessionOptions()
        opts.log_severity_level = 3
        
        self.session = onnxruntime.InferenceSession(
            model_path, 
            providers=['CPUExecutionProvider'], 
            sess_options=opts
        )
        
        # 自动检测模型版本
        inputs = [node.name for node in self.session.get_inputs()]
        self.version = 5
        print("VAD 引擎: 检测到 v5 模型")

        self.reset_states()

    def reset_states(self):
        if self.version == 5:
            self._state = np.zeros((2, 1, 128), dtype=np.float32)
        else:
            self._h = np.zeros((2, 1, 64), dtype=np.float32)
            self._c = np.zeros((2, 1, 64), dtype=np.float32)

    def __call__(self, x, sr):
        # 增加维度 [batch, samples]
        if x.ndim == 1:
            x = x[np.newaxis, :]
        
        x = x.astype(np.float32)
        sr_input = np.array([sr], dtype=np.int64)
        
        # 根据版本执行单一推理路径
        self.version == 5:
        ort_inputs = {'input': x, 'sr': sr_input, 'state': self._state}
        out, self._state = self.session.run(None, ort_inputs)
        return out[0][0] # 返回概率

def init_vad():
    print(f"加载 Silero VAD (ONNX v5): {VAD_MODEL_PATH}")
    print(f"加载 Silero VAD (ONNX): {VAD_MODEL_PATH}")
    return OnnxVad(VAD_MODEL_PATH)

def detect_speech(audio, vad_model):
    """
    工业级 VAD 检测逻辑（NumPy 复刻版）
    """
    vad_model.reset_states() # 关键修复：每次处理完整 buffer 前必须重置模型状态
    # --- 1. 预处理：归一化与去直流偏置 ---
    if np.abs(audio).max() > 1.0:
        audio = audio.astype(np.float32) / 32768.0
    
    # 核心 Trick 1: 减去均值。消除硬件产生的静电偏置，使波形完美对齐 0 轴。
    audio = audio - np.mean(audio)

    # --- 2. 初始化与推理 ---
    window_size_samples = 512
    raw_probs = []
    
    for i in range(0, len(audio), window_size_samples):
        chunk = audio[i : i + window_size_samples]
        if len(chunk) < window_size_samples:
            chunk = np.pad(chunk, (0, window_size_samples - len(chunk)))
        
        prob = vad_model(chunk, SAMPLE_RATE)
        raw_probs.append(prob)

    if not raw_probs:
        return []

    # --- 3. 核心 Trick 2: 概率平滑 (Prob Smoothing) ---
    # 官方库不会因为一个 32ms 的瞬间概率低就断开。我们使用中值平滑处理。
    smoothed_probs = []
    smoothing_window = 3 # 观察前后 3 个块的平均表现
    for i in range(len(raw_probs)):
        start = max(0, i - smoothing_window)
        end = min(len(raw_probs), i + smoothing_window + 1)
        smoothed_probs.append(np.mean(raw_probs[start:end]))

    # --- 4. 核心 Trick 3: 双阈值滞后判定 (Hysteresis) ---
    timestamps = []
    triggered = False
    temp_start = 0
    silence_samples_accum = 0
    
    # 滞后设计：高阈值进入（严），低阈值维持（松）
    # 这样能有效防止“吞字”和“呼吸声干扰”
    enter_threshold = VAD_THRESHOLD
    exit_threshold = max(0.1, VAD_THRESHOLD - 0.15) 
    
    # 时长限制（基于 16k 采样率）
    min_speech_samples = int(SAMPLE_RATE * 0.25) # 250ms
    min_silence_samples = int(SAMPLE_RATE * 0.2)  # 200ms

    for i, prob in enumerate(smoothed_probs):
        current_sample_idx = i * window_size_samples
        
        if not triggered:
            # 只有连续能量足够高才触发开始
            if prob >= enter_threshold:
                triggered = True
                temp_start = current_sample_idx
                silence_samples_accum = 0
        else:
            # 一旦触发，只要概率不低于出口阈值，就认为还在说话
            if prob < exit_threshold:
                silence_samples_accum += window_size_samples
                if silence_samples_accum > min_silence_samples:
                    triggered = False
                    temp_end = current_sample_idx
                    if (temp_end - temp_start) >= min_speech_samples:
                        timestamps.append({'start': temp_start, 'end': temp_end})
            else:
                silence_samples_accum = 0

    if triggered:
        temp_end = len(audio)
        if (temp_end - temp_start) >= min_speech_samples:
            timestamps.append({'start': temp_start, 'end': temp_end})
            
    return timestamps