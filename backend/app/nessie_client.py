import os, httpx, datetime
from typing import Any

class NessieClient:
    def __init__(self):
        self.use_nessie = os.getenv("USE_NESSIE", "false").lower() == "true"
        self.base = os.getenv("NESSIE_BASE_URL", "https://api.nessieisreal.com")
        self.key = os.getenv("NESSIE_API_KEY", "")
        self.mock_state: list[dict[str, Any]] = []

    def _url(self, path: str) -> str:
        return f"{self.base}{path}"

    def _params(self) -> dict:
        return {"key": self.key}

    async def deposit(self, account_id: str, amount: float, description: str):
        if not self.use_nessie or not self.key:
            self.mock_state.append({"type":"deposit","account_id":account_id,"amount":amount,"description":description})
            return {"status":"mocked","account_id":account_id,"amount":amount}
        async with httpx.AsyncClient(timeout=20) as client:
            payload = {"medium":"balance","transaction_date": str(datetime.date.today()), "amount": amount, "description": description}
            r = await client.post(self._url(f"/accounts/{account_id}/deposits"), params=self._params(), json=payload)
            r.raise_for_status()
            return r.json()

    async def schedule_bill(self, account_id: str, payee: str, amount: float, payment_date: str):
        if not self.use_nessie or not self.key:
            self.mock_state.append({"type":"bill","account_id":account_id,"payee":payee,"amount":amount,"payment_date":payment_date})
            return {"status":"mocked","account_id":account_id,"payee":payee,"amount":amount,"payment_date":payment_date}
        async with httpx.AsyncClient(timeout=20) as client:
            payload = {"status":"pending","payee":payee,"nickname":payee,"payment_date":payment_date,"payment_amount":amount}
            r = await client.post(self._url(f"/accounts/{account_id}/bills"), params=self._params(), json=payload)
            r.raise_for_status()
            return r.json()

    async def p2p_transfer(self, from_account: str, to_account: str, amount: float, description: str="P2P"):
        if not self.use_nessie or not self.key:
            self.mock_state.append({"type":"transfer","from":from_account,"to":to_account,"amount":amount,"description":description})
            return {"status":"mocked","from":from_account,"to":to_account,"amount":amount}
        async with httpx.AsyncClient(timeout=20) as client:
            payload = {"medium":"balance","payee_id": to_account, "amount": amount, "description": description}
            r = await client.post(self._url(f"/accounts/{from_account}/transfers"), params=self._params(), json=payload)
            r.raise_for_status()
            return r.json()
