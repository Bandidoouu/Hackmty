import httpx
from datetime import date
from typing import Any, Dict, Optional

class NessieClient:
    def __init__(self, base_url: str, api_key: str) -> None:
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key

    async def _post(self, path: str, json: Dict[str, Any]):
        url = f"{self.base_url}{path}?key={self.api_key}"
        async with httpx.AsyncClient(timeout=20.0) as client:
            r = await client.post(url, json=json)
            r.raise_for_status()
            return r.json()

    async def _get(self, path: str):
        url = f"{self.base_url}{path}?key={self.api_key}"
        async with httpx.AsyncClient(timeout=20.0) as client:
            r = await client.get(url)
            r.raise_for_status()
            return r.json()

    async def deposit(self, account_id: str, amount: float, description: str):
        payload = {
            "medium": "balance",
            "transaction_date": date.today().isoformat(),
            "amount": amount,
            "description": description,
        }
        return await self._post(f"/accounts/{account_id}/deposits", payload)

    async def p2p_transfer(self, from_account: str, to_account: str, amount: float, description: str):
        payload = {
            "medium": "balance",
            "payee_id": to_account,
            "amount": amount,
            "transaction_date": date.today().isoformat(),
            "description": description,
        }
        return await self._post(f"/accounts/{from_account}/transfers", payload)
