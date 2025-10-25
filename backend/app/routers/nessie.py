from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from ..config import settings
from ..nessie_client import NessieClient
import logging

router = APIRouter(tags=["nessie"])
log = logging.getLogger(__name__)

client = NessieClient(
    base_url=settings.NESSIE_BASE_URL,
    api_key=settings.NESSIE_API_KEY,
)

class PaycheckIn(BaseModel):
    amount: float

class TransferIn(BaseModel):
    to_account: str
    amount: float
    description: str | None = "P2P transfer"

@router.post("/nessie/simulate-paycheck")
async def simulate_paycheck(data: PaycheckIn):
    if data.amount <= 0:
        raise HTTPException(status_code=422, detail="amount must be > 0")

    if not settings.USE_NESSIE:
        return {"result": "mocked", "amount": data.amount}

    if not settings.DEFAULT_NESSIE_ACCOUNT_ID:
        raise HTTPException(status_code=400, detail="DEFAULT_NESSIE_ACCOUNT_ID no está configurado")

    try:
        res = await client.deposit(
            account_id=settings.DEFAULT_NESSIE_ACCOUNT_ID,
            amount=data.amount,
            description="Payroll",
        )
        return res
    except Exception as e:
        log.exception("Nessie deposit failed")
        raise HTTPException(status_code=502, detail=f"Nessie error: {e}")

@router.post("/nessie/p2p-transfer")
async def p2p_transfer(data: TransferIn):
    if data.amount <= 0:
        raise HTTPException(status_code=422, detail="amount must be > 0")

    if not settings.USE_NESSIE:
        return {"result": "mocked", "to": data.to_account, "amount": data.amount}

    if not settings.DEFAULT_NESSIE_ACCOUNT_ID:
        raise HTTPException(status_code=400, detail="DEFAULT_NESSIE_ACCOUNT_ID no está configurado")

    try:
        res = await client.p2p_transfer(
            from_account=settings.DEFAULT_NESSIE_ACCOUNT_ID,
            to_account=data.to_account,
            amount=data.amount,
            description=data.description or "P2P transfer",
        )
        return res
    except Exception as e:
        log.exception("Nessie transfer failed")
        raise HTTPException(status_code=502, detail=f"Nessie error: {e}")
