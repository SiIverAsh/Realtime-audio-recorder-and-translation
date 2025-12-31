from core.translator import translate_text
from core.config import PROVIDER_CONFIG

def process_translation(text, source_lang, target_lang, engine, api_key, base_url, callback):
    """处理翻译并回调"""
    try:
        translation = translate_text(
            text, 
            source=source_lang, 
            target=target_lang, 
            engine=engine, 
            api_key=api_key,
            base_url=base_url
        )
        if callback:
            callback(text, translation)
    except Exception as e:
        print(f"Handle Result Error: {e}")

def update_audio_config(manager, data: dict):
    """
    统一处理来自前端的配置更新
    处理变量名对齐 (camelCase -> snake_case)
    """
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
        
    return f"配置已同步：{manager.target_language}"