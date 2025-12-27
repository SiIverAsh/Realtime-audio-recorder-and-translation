import requests
from deep_translator import GoogleTranslator
from core.config import TARGET_LANGUAGE, TRANSLATION_ENGINE, LLM_API_KEY, LLM_BASE_URL, LLM_MODEL

def translate_with_llm(text: str, target: str, api_key: str = None, base_url: str = None):
    """使用 LLM API 进行翻译"""
    key = api_key if api_key else LLM_API_KEY
    url = base_url if base_url else LLM_BASE_URL
    
    if not key or not url:
        return None


    headers = {
        "Authorization": f"Bearer {key}"
    }
    

    target_name = "Chinese" if "zh" in target.lower() else target
    
    messages = [
        {"role": "system", "content": f"Translate text to {target_name}. Only output translation."},
        {"role": "user", "content": text}
    ]
    
    payload = {
        "model": LLM_MODEL,
        "messages": messages,
        "temperature": 0.3
    }
    
    try:
        full_url = f"{url.rstrip('/')}/chat/completions"
        
        response = requests.post(
            full_url, 
            json=payload, 
            headers=headers, 
            timeout=10
        )
        
        response.raise_for_status()
        data = response.json()
        return data["choices"][0]["message"]["content"].strip()
    except Exception as e:
        print(f"LLM Translation Exception: {e}")
        return None

def translate_text(text: str, source: str = 'auto', target: str = TARGET_LANGUAGE, engine: str = None, api_key: str = None, base_url: str = None):
    """通用翻译入口"""
    safe_source = source if source else 'auto'
    safe_target = target if target else 'zh-CN'
    
    current_engine = engine if engine else TRANSLATION_ENGINE
    if current_engine == "llm":
        result = translate_with_llm(text, safe_target, api_key=api_key, base_url=base_url)
        if result: return result
        print("LLM 翻译失败，回退到 Google 翻译...")

    try:
        # 回退
        translated = GoogleTranslator(source=safe_source, target=safe_target).translate(text)
        return translated
    except Exception as e:
        print(f"Google Translation Error: {e}")
        return None