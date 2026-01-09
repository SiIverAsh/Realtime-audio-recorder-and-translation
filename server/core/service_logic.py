from core.translator import translate_text
from core.config import PROVIDER_CONFIG

def process_translation(text, source_lang, target_lang, engine, api_key, base_url, model, callback, is_final=True):
    """处理翻译并回调"""
    # print(f"[Debug] Process Translation: text='{text}', engine='{engine}', final={is_final}, model='{model}'")
    try:
        # 如果不是最终结果，跳过翻译步骤以提高速度
        if not is_final:
            if callback:
                callback(text, "", is_final) # 中间结果不翻译
            return

        # 最终结果：使用流式翻译（如果引擎支持）
        # print(f"[Debug] Starting translation with engine: {engine}")
        translation_generator = translate_text(
            text, 
            source=source_lang, 
            target=target_lang, 
            engine=engine, 
            api_key=api_key,
            base_url=base_url,
            model=model,
            stream=True # 启用流式
        )
        
        full_translation = ""
        has_chunks = False
        
        # 这里的 generator 会逐字(chunk) yield 内容
        # 即使是 Google 翻译，也会被封装成 yield 一次完整内容
        if translation_generator:
            for chunk in translation_generator:
                if chunk:
                    has_chunks = True
                    # print(f"[Debug] Got chunk: {chunk}")
                    full_translation += chunk
                    if callback:
                        # 实时回调每一个新增片段，实现前端打字机效果
                        callback(text, full_translation, is_final)
        
        if not has_chunks:
            print("[Warn] Translation generator yielded no chunks!")
        
        # 确保最后至少调用一次（防止 generator 为空的情况）
        if not full_translation and callback:
             callback(text, "", is_final)

    except Exception as e:
        print(f"Handle Result Error: {e}")

def update_audio_config(manager, data: dict):
    """
    统一处理来自前端的配置更新
    处理变量名对齐 (camelCase -> snake_case)
    """
    print(f"[Debug] Config Update Received: {data}")
    if "language" in data:
        manager.language = data["language"]
    
    if "targetLanguage" in data: 
        manager.target_language = data["targetLanguage"]
        
    if "engine" in data:
        manager.translation_engine = data["engine"]
        
    if "apiKey" in data:
        manager.llm_api_key = data["apiKey"]
        
    if "provider" in data:
        manager.base_url = PROVIDER_CONFIG.get(data["provider"])
        # 简单的模型映射逻辑 (根据 provider 自动切换默认模型)
        if data["provider"] == "deepseek":
            manager.llm_model = "deepseek-chat"
        elif data["provider"] == "openai":
            manager.llm_model = "gpt-3.5-turbo"
        elif data["provider"] == "siliconflow":
            manager.llm_model = "deepseek-ai/DeepSeek-V3" # 硅基流动默认模型
        elif data["provider"] == "gemini":
            manager.llm_model = "gemini-1.5-flash"
        elif data["provider"] == "groq":
             manager.llm_model = "llama3-70b-8192"

    print(f"[Debug] Manager State: engine={manager.translation_engine}, target={manager.target_language}, has_key={bool(manager.llm_api_key)}, model={manager.llm_model}")
    return f"配置已同步：{manager.target_language}"