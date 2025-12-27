import asyncio
import threading
import warnings
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from typing import List
from soundcard import SoundcardRuntimeWarning


from core.audio_manager import AudioManager

try:
    from core.config import FORCE_LANGUAGE
except ImportError:
    FORCE_LANGUAGE = None # 默认自动检测


warnings.filterwarnings("ignore", category=SoundcardRuntimeWarning)

# 全局状态管理
class ServerState:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.loop = None
        self.audio_manager = None

state = ServerState()

def broadcast_callback(original, translation):
    """AudioManager 的回调函数"""
    if state.loop and state.active_connections:
        asyncio.run_coroutine_threadsafe(broadcast(original, translation), state.loop)

async def broadcast(original, translation):
    """向所有连接的客户端发送消息"""
    for connection in list(state.active_connections):
        try:
            await connection.send_json({"original": original, "translation": translation})
        except:
            pass

@asynccontextmanager
async def lifespan(app: FastAPI):
    state.loop = asyncio.get_running_loop() # type: ignore
    
    # 初始化 AudioManager，传入回调函数和默认语言
    print("正在初始化 AudioManager...")
    state.audio_manager = AudioManager(callback=broadcast_callback, language=FORCE_LANGUAGE) # type: ignore
    
    # 在后台线程启动音频处理循环
    t = threading.Thread(target=state.audio_manager.audio_process, daemon=True) # type: ignore
    t.start()
    print("服务已启动")
    
    yield
    
    if state.audio_manager:
        state.audio_manager.audio_stop()

app = FastAPI(lifespan=lifespan)

# 允许跨域
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    state.active_connections.append(websocket)
    print(f"客户端已连接，当前连接数: {len(state.active_connections)}")
    try:
        while True:
            # 接收前端控制指令
            data = await websocket.receive_json()
            if isinstance(data, dict) and data.get("type") == "language":
                lang = data.get("value")
                # 如果是 "auto" 则设为 None (自动检测)
                lang = None if lang == "auto" else lang
                if state.audio_manager:
                    state.audio_manager.language = lang
                print(f"识别语言切换为: {lang}")
            elif isinstance(data, dict) and data.get("type") == "target_language":
                target_lang = data.get("value")
                if state.audio_manager and target_lang:
                    state.audio_manager.target_language = target_lang
                print(f"翻译目标语言切换为: {target_lang}")
            elif isinstance(data, dict) and data.get("type") == "translation_engine":
                engine = data.get("value")
                if state.audio_manager:
                    state.audio_manager.translation_engine = engine
                print(f"翻译引擎切换为: {engine}")
            elif isinstance(data, dict) and data.get("type") == "llm_api_key":
                key = data.get("value")
                if state.audio_manager:
                    state.audio_manager.llm_api_key = key
                print(f"更新 LLM API Key")
    except WebSocketDisconnect:
        state.active_connections.remove(websocket)
        print("客户端断开连接")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)