from fastapi import APIRouter, Depends
from pydantic import BaseModel
from ..nessie_client import NessieClient
from ..database import get_db
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/nessie", tags=["nessie"])
client = NessieClient()

class PaycheckIn(BaseModel):
    account_id: str
    amount: float
    description: str = "Nómina semanal"

class BillIn(BaseModel):
    account_id: str
    payee: str
    amount: float
    payment_date: str

class P2PIn(BaseModel):
    from_account: str
    to_account: str
    amount: float
    description: str = "P2P"

@router.post("/simulate-paycheck")
async def simulate_paycheck(data: PaycheckIn, db: AsyncSession = Depends(get_db)):
    res = await client.deposit(data.account_id, data.amount, data.description)
    return {"result": res}

@router.post("/schedule-bill")
async def schedule_bill(data: BillIn):
    res = await client.schedule_bill(data.account_id, data.payee, data.amount, data.payment_date)
    return {"result": res}

@router.post("/p2p-transfer")
async def p2p_transfer(data: P2PIn):
    res = await client.p2p_transfer(data.from_account, data.to_account, data.amount, data.description)
    return {"result": res}
