# core/utils.py
import httpx
from core.config import PROVIDER_CONFIG

async def validate_llm_api(api_key: str, provider_key: str):
    """真实验证 API Key 是否有效"""
    base_url = PROVIDER_CONFIG.get(provider_key, PROVIDER_CONFIG["deepseek"])
    target_url = base_url.rstrip("/") + "/models"
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(
                target_url,
                headers={"Authorization": f"Bearer {api_key}"},
                timeout=10.0
            )
            if response.status_code == 200:
                return True, "API Key 验证通过"
            elif response.status_code == 401:
                return False, "验证失败：Key 无效或已过期 (401)"
            return False, f"验证失败：服务器返回 {response.status_code}"
        except Exception as e:
            return False, f"网络错误: {str(e)}"