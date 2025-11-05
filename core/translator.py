from openai import OpenAI
from core.config import DEEPSEEK_API_KEY
import re

client = OpenAI(
    api_key=DEEPSEEK_API_KEY,
    base_url="https://api.deepseek.com"
)

def translate_text(text: str):
    response = client.chat.completions.create(
        model="deepseek-chat",
        messages=[
            {"role": "system", "content": "请把识别结果翻译为简体中文，不要解释、润色"},
            {"role": "user", "content": text}
        ]
    )
    if not response.choices or not response.choices[0].message.content:
        return None
    return response.choices[0].message.content.strip()


def translate_and_print(text: str):
    translated = translate_text(text)
    if translated:
        print(f"翻译：{translated}")
