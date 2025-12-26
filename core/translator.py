from deep_translator import GoogleTranslator
from core.config import TARGET_LANGUAGE

def translate_text(text: str):
    try:
        # source='auto' 表示自动检测源语言，可以自行修改
        translated = GoogleTranslator(source='auto', target=TARGET_LANGUAGE).translate(text)
        return translated
    except Exception as e:
        print(f"{e}")
        return None


def translate_and_print(text: str):
    translated = translate_text(text)
    if translated:
        print(f"{translated}")
