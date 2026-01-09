import os
import numpy as np
import onnxruntime
from core.config import SAMPLE_RATE, VAD_THRESHOLD, VAD_MODEL_PATH

class OnnxVad:
    def __init__(self, model_path):
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"未找到 VAD 模型，路径: {model_path}")
        
        # 禁用 ONNX Runtime 的日志输出
        opts = onnxruntime.SessionOptions()
        opts.log_severity_level = 3
        
        # 使用 CPU 进行轻量级推理
        self.session = onnxruntime.InferenceSession(
            model_path, 
            providers=['CPUExecutionProvider'], 
            sess_options=opts
        )
        
        # 检查输入以区分 V4/V5 版本 (虽然我们下载的是 V5)
        inputs = [node.name for node in self.session.get_inputs()]
        self.version = 5 if 'state' in inputs else 4
        print(f"VAD 引擎 (ONNX): 已加载版本 {self.version}，来自 {model_path}")
            
        self.reset_states()

    def reset_states(self):
        if self.version == 5:
            # v5 状态: (2, batch=1, 128)
            self._state = np.zeros((2, 1, 128), dtype=np.float32)
        else:
            # v4 旧版状态: h, c (2, batch=1, 64)
            self._h = np.zeros((2, 1, 64),  dtype=np.float32)
            self._c = np.zeros((2, 1, 64), dtype=np.float32)

    def __call__(self, x, sr):
        # x 形状: (N,) -> (1, N)
        if x.ndim == 1:
            x = x[np.newaxis, :]
        
        # 确保是 float32 类型
        if x.dtype != np.float32:
            x = x.astype(np.float32)
        
        # 对于 v5 逻辑，采样率 (SR) 必须是标量张量 (0 维)
        sr_input = np.array(sr, dtype=np.int64)
        
        if self.version == 5:
            ort_inputs = {
                'input': x,
                'sr': sr_input,
                'state': self._state
            }
            # 运行推理
            out, self._state = self.session.run(None, ort_inputs)
        else:
            # v4 旧版路径
            ort_inputs = {
                'input': x,
                'sr': sr_input,
                'h': self._h,
                'c': self._c
            }
            out, self._h, self._c = self.session.run(None, ort_inputs)
        
        # 输出形状是 (batch, 1) -> 标量
        return out[0][0]

def init_vad():
    model_path = VAD_MODEL_PATH
    # 健壮的路径处理
    if not os.path.exists(model_path):
        # 尝试相对于当前工作目录或 server 根目录进行解析
        potential_path = os.path.join(os.path.dirname(__file__), "..", "..", "models", os.path.basename(VAD_MODEL_PATH))
        if os.path.exists(potential_path):
            model_path = os.path.abspath(potential_path)
        elif os.path.exists(os.path.join("models", os.path.basename(VAD_MODEL_PATH))):
             model_path = os.path.join("models", os.path.basename(VAD_MODEL_PATH))
    
    print(f"正在加载 Silero VAD (ONNX): {model_path}")
    return OnnxVad(model_path)

def detect_speech(audio, vad_model):
    """
    检测给定音频缓冲区中的语音。
    返回包含时间戳字典的列表 [{'start': int, 'end': int}]。
    """
    # 每次处理新块时重置状态，将其视为新的流
    # (如果您希望跨调用保持连续流状态，请移除此行)
    vad_model.reset_states()
    
    # 16kHz 下支持的窗口大小: 512, 1024, 1536
    window_size_samples = 512 
    
    min_speech_samples = int(SAMPLE_RATE * 0.25) # 250毫秒
    min_silence_samples = int(SAMPLE_RATE * 0.1) # 100毫秒
    
    speech_probs = []
    
    # 1. 分块推理
    for i in range(0, len(audio), window_size_samples):
        chunk = audio[i: i+window_size_samples]
        
        # 填充最后一个块
        if len(chunk) < window_size_samples:
            chunk = np.pad(chunk, (0, window_size_samples - len(chunk)))
            
        prob = vad_model(chunk, SAMPLE_RATE)
        speech_probs.append(prob)
        
    # print(f"调试: 最大概率: {max(speech_probs) if speech_probs else 0:.4f}")

    # 2. 将概率转换为时间戳
    timestamps = []
    triggered = False
    start_idx = 0
    silence_counter = 0
    
    threshold = VAD_THRESHOLD
    neg_threshold = VAD_THRESHOLD - 0.15 

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

    # 处理语音一直持续到结尾的情况
    if triggered:
        end_idx = len(audio)
        if (end_idx - start_idx) >= min_speech_samples:
            timestamps.append({'start': start_idx, 'end': end_idx})
            
    return timestamps