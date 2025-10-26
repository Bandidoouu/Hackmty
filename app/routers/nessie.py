
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.security import get_current_user
from app.models import User, LocalTransaction
from app.database import get_session
from app.nessie_client import ensure_customer_and_account, deposit_to_account
from app.schemas import PaycheckIn

router = APIRouter(prefix="/nessie", tags=["nessie"])


@router.post("/simulate-paycheck")
async def simulate_paycheck(payload: PaycheckIn, user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    cust_id, acc_id = await ensure_customer_and_account(user, {"street_number":"1","street_name":"Main","city":"CDMX","state":"MX","zip":"01000"}, session=session)
    try:
        dep = await deposit_to_account(acc_id, payload.amount, session=session)
        return {"status": "ok", "deposit": dep}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Nessie error: {e}")


@router.get("/balance")
async def get_balance(user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    """Return the user's primary account computed balance (demo mode sums local transactions)."""
    cust_id, acc_id = await ensure_customer_and_account(user, None, session=session)
    q = await session.execute(select(func.coalesce(func.sum(LocalTransaction.amount), 0.0)).where(LocalTransaction.account_id == acc_id))
    total = q.scalar_one()
    return {"account_id": acc_id, "balance": float(total)}


from pydantic import BaseModel


class TransferIn(BaseModel):
    to_account_id: str
    amount: float
    description: str | None = "Transfer"


@router.post("/transfer")
async def transfer(payload: TransferIn, user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    """Simulate a transfer: create a negative transaction for the sender and a positive transaction for the receiver (demo)."""
    cust_id, acc_id = await ensure_customer_and_account(user, None, session=session)
    if payload.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")
    # create debit on user's account
    debit = LocalTransaction(account_id=acc_id, amount=-float(payload.amount), description=payload.description or "Transfer out")
    session.add(debit)
    # create credit on target account (in demo we just add a local tx)
    credit = LocalTransaction(account_id=payload.to_account_id, amount=float(payload.amount), description=payload.description or "Transfer in")
    session.add(credit)
    await session.commit()
    return {"status": "ok", "from": acc_id, "to": payload.to_account_id, "amount": payload.amount}


@router.get("/transactions")
async def list_transactions(limit: int = 50, user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    """Return recent transactions for the user's primary account (desc by created_at)."""
    cust_id, acc_id = await ensure_customer_and_account(user, None, session=session)
    q = await session.execute(select(LocalTransaction).where(LocalTransaction.account_id == acc_id).order_by(LocalTransaction.created_at.desc()).limit(limit))
    rows = q.scalars().all()
    # simple serializable output
    out = [
        {"id": r.id, "account_id": r.account_id, "amount": float(r.amount), "description": r.description, "created_at": r.created_at.isoformat()}
        for r in rows
    ]
    return {"account_id": acc_id, "transactions": out}
