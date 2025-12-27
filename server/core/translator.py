import requests
from deep_translator import GoogleTranslator
from core.config import TARGET_LANGUAGE, TRANSLATION_ENGINE, LLM_API_KEY, LLM_BASE_URL, LLM_MODEL

def translate_with_llm(text: str, target: str, api_key: str = None): # type: ignore
    """使用 LLM API 进行翻译"""
    key = api_key if api_key else LLM_API_KEY
    if not key:
        print("错误: 未配置 LLM_API_KEY")
        return None

    headers = {
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json"
    }
    
    
    messages = [
        {"role": "system", "content": f"You are a professional translator. Translate the following text into the language code '{target}'. Output ONLY the translated text, without any explanation."},
        {"role": "user", "content": text}
    ]
    
    payload = {
        "model": LLM_MODEL,
        "messages": messages,
        "temperature": 0.3
    }
    
    try:
        url = f"{LLM_BASE_URL.rstrip('/')}/chat/completions"
        response = requests.post(url, json=payload, headers=headers, timeout=10)
        response.raise_for_status()
        data = response.json()
        return data["choices"][0]["message"]["content"].strip()
    except Exception as e:
        print(f"LLM Translation Error: {e}")
        return None

def translate_text(text: str, target: str = TARGET_LANGUAGE, engine: str = None, api_key: str = None): # type: ignore
    current_engine = engine if engine else TRANSLATION_ENGINE
    if current_engine == "llm":
        result = translate_with_llm(text, target, api_key=api_key)
        if result:
            return result
        print("LLM 翻译失败，正在回退到 Google 翻译...")

    try:
        # source='auto' 表示自动检测源语言，可以自行修改
        translated = GoogleTranslator(source='auto', target=target).translate(text)
        return translated
    except Exception as e:
        print(f"{e}")
        return None


def translate_and_print(text: str):
    translated = translate_text(text)
    if translated:
        print(f"{translated}")
