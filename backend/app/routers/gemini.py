from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.security import get_current_user
from app.database import get_session
from app.gemini_client import get_price, simulate_trade, generate_recommendations
from app.models import User, LocalTransaction
from pydantic import BaseModel
from typing import List, Dict, Any
from app.config import settings

router = APIRouter(prefix="/gemini", tags=["gemini"])


@router.get('/info')
async def info():
    """Return info about Gemini integration mode (no secrets returned)."""
    return {
        'has_api_key': bool(settings.gemini_api_key),
        'has_api_secret': bool(settings.gemini_api_secret),
        'execute_trades': bool(settings.gemini_execute_trades)
    }


@router.get("/price")
async def price(symbol: str = "BTCUSD"):
    try:
        return await get_price(symbol)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class TradeIn(BaseModel):
    symbol: str
    side: str
    amount_usd: float


class AdviceIn(BaseModel):
    total_usd: float | None = None
    monthly_income: float | None = None
    monthly_expenses: float | None = None
    transactions: List[Dict[str, Any]] | None = None
    risk_profile: str | None = 'balanced'


@router.post('/advise')
async def advise(payload: AdviceIn, user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    try:
        # take provided summary and enrich with server-side known values (balance, recent txs) when missing
        summary = payload.model_dump()

        # if user has a primary account and total_usd or transactions not provided, compute from local transactions
        if (summary.get('total_usd') is None or summary.get('transactions') is None) and user.primary_account_id:
            # compute balance via sum of local transactions
            q = await session.execute(select(func.coalesce(func.sum(LocalTransaction.amount), 0.0)).where(LocalTransaction.account_id == user.primary_account_id))
            total = float(q.scalar_one())
            if summary.get('total_usd') is None:
                summary['total_usd'] = total

            if summary.get('transactions') is None:
                txq = await session.execute(select(LocalTransaction).where(LocalTransaction.account_id == user.primary_account_id).order_by(LocalTransaction.created_at.desc()).limit(50))
                rows = txq.scalars().all()
                summary['transactions'] = [ { 'id': r.id, 'account_id': r.account_id, 'amount': float(r.amount), 'description': r.description, 'created_at': r.created_at.isoformat() } for r in rows ]

        # attach user-friendly info for narrative
        summary['user_first_name'] = user.first_name or ''
        summary['account_id'] = user.primary_account_id or ''

        res = await generate_recommendations(summary)
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/trade")
async def trade(payload: TradeIn, user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    if payload.amount_usd <= 0:
        raise HTTPException(status_code=400, detail="amount_usd must be positive")
    try:
        res = await simulate_trade(user, payload.side, payload.amount_usd, payload.symbol, session=session)
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
