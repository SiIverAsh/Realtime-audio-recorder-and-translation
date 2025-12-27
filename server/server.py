import warnings

from soundcard import SoundcardRuntimeWarning
warnings.filterwarnings("ignore", category=SoundcardRuntimeWarning)

import asyncio
import threading
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from core.audio_manager import AudioManager
from core.connect_utils import validate_llm_api
from core.config import PROVIDER_CONFIG, FORCE_LANGUAGE

# 全局状态管理
class ServerState:
    def __init__(self):
        self.active_connections: [] = []
        self.loop = None
        self.audio_manager = None

state = ServerState()

def broadcast_callback(original, translation):
    """音频识别回调：过滤空内容并发送至前端"""
    if not original or not original.strip():
        return 
    if state.loop and state.active_connections:
        asyncio.run_coroutine_threadsafe(
            broadcast(original.strip(), translation.strip() if translation else ""), 
            state.loop
        )

async def broadcast(original, translation):
    """广播消息给所有 WebSocket 客户端"""
    for connection in list(state.active_connections):
        try:
            await connection.send_json({"original": original, "translation": translation})
        except:
            if connection in state.active_connections:
                state.active_connections.remove(connection)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """生命周期管理：启动音频线程"""
    state.loop = asyncio.get_running_loop()
    state.audio_manager = AudioManager(callback=broadcast_callback, language=FORCE_LANGUAGE)
    
    t = threading.Thread(target=state.audio_manager.audio_process, daemon=True)
    t.start()
    print("RTTrans 服务已在后台线程启动")
    yield
    if state.audio_manager:
        state.audio_manager.audio_stop()

app = FastAPI(lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    state.active_connections.append(websocket)
    print(f"新连接已建立。当前连接数: {len(state.active_connections)}")
    
    try:
        while True:
            msg = await websocket.receive_json()
            m_type = msg.get("type")

            # 1. 调用校验逻辑
            if m_type == "llm_api_key_validate":
                key, prv = msg.get("value"), msg.get("provider")
                is_valid, info = await validate_llm_api(key, prv)
                
                if is_valid and state.audio_manager:
                    # 验证成功后更新管理器状态
                    state.audio_manager.llm_api_key = key
                    state.audio_manager.base_url = PROVIDER_CONFIG.get(prv)
                
                # 发送验证反馈日志 (保留 Toast)
                await websocket.send_json({"type": "toast", "status": "success" if is_valid else "error", "message": info})

            # 2. 调用 AudioManager 
            elif m_type in ["full_config", "config_update"]:
                if state.audio_manager:
                    # 将复杂的配置判断传给核心
                    info = state.audio_manager.update_config(msg.get("data", {}))
                    
                    # 发送配置同步反馈日志 (保留 Toast)
                    await websocket.send_json({
                        "type": "toast", 
                        "status": "success", 
                        "message": f"模式切换完成：{info}"
                    })

    except WebSocketDisconnect:
        state.active_connections.remove(websocket)
        print("客户端断开连接")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)