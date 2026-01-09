import requests
import json
from deep_translator import GoogleTranslator
from core.config import TARGET_LANGUAGE, TRANSLATION_ENGINE, LLM_API_KEY, LLM_BASE_URL, LLM_MODEL

def translate_with_llm(text: str, target: str, api_key: str = None, base_url: str = None, model: str = None):
    """标准 LLM 翻译"""
    key = api_key if api_key else LLM_API_KEY
    url = base_url if base_url else LLM_BASE_URL
    current_model = model if model else LLM_MODEL
    
    if not key or not url: 
        print("[Error] LLM API Key or Base URL is missing!")
        return None

    headers = {"Authorization": f"Bearer {key}"}
    payload = {
        "model": current_model,
        "messages": [
            {"role": "system", "content": f"You are a professional simultaneous interpreter. Translate the text to {target} concisely and accurately."},
            {"role": "user", "content": text}
        ],
        "temperature": 0.3
    }
    try:
        full_url = f"{url.rstrip('/')}/chat/completions"
        response = requests.post(full_url, json=payload, headers=headers, timeout=10)
        response.raise_for_status()
        result = response.json()["choices"][0]["message"]["content"].strip()
        return result
    except Exception as e:
        print(f"LLM Error: {e}")
        return None

def stream_translate_with_llm(text: str, target: str, api_key: str = None, base_url: str = None, model: str = None):
    """标准 LLM 流式翻译"""
    key = api_key if api_key else LLM_API_KEY
    url = base_url if base_url else LLM_BASE_URL
    current_model = model if model else LLM_MODEL
    
    if not key or not url: 
        print("[Error] LLM API Key or Base URL is missing (Stream)!")
        return

    headers = {"Authorization": f"Bearer {key}"}
    payload = {
        "model": current_model,
        "messages": [
            {"role": "system", "content": f"You are a professional simultaneous interpreter. Translate the text to {target} concisely and accurately."},
            {"role": "user", "content": text}
        ],
        "temperature": 0.3,
        "stream": True
    }
    try:
        full_url = f"{url.rstrip('/')}/chat/completions"
        response = requests.post(full_url, json=payload, headers=headers, stream=True, timeout=20)
        
        if response.status_code != 200:
            print(f"[Error] LLM Stream Failed, Status: {response.status_code}, Body: {response.text}")
        response.raise_for_status()
        
        for line in response.iter_lines():
            if line:
                decoded = line.decode('utf-8').strip()
                if decoded.startswith("data: "):
                    json_str = decoded[6:]
                    if json_str == "[DONE]": break
                    try:
                        chunk_json = json.loads(json_str)
                        if "choices" in chunk_json and len(chunk_json["choices"]) > 0:
                            delta = chunk_json["choices"][0].get("delta", {})
                            content = delta.get("content", "")
                            if content: 
                                yield content
                    except Exception as e:
                        # print(f"[Warn] JSON Parse Error: {e}")
                        pass
    except Exception as e:
        print(f"LLM Stream Error: {e}")

def translate_text(text: str, source: str = 'auto', target: str = TARGET_LANGUAGE, engine: str = None, api_key: str = None, base_url: str = None, model: str = None, stream=False):
    """统一翻译入口"""
    safe_target = target if target else 'zh-CN'
    current_engine = engine if engine else TRANSLATION_ENGINE

    if current_engine == "llm":
        if stream:
            # 必须使用 yield from 来代理生成器
            yield from stream_translate_with_llm(text, safe_target, api_key, base_url, model)
            return
        else:
            return translate_with_llm(text, safe_target, api_key, base_url, model)

    # 默认 Google 翻译
    try:
        result = GoogleTranslator(source=source if source else 'auto', target=safe_target).translate(text)
        if stream:
            if result:
                yield result
        else:
            return result
    except Exception as e:
        print(f"Google Error: {e}")
        return None