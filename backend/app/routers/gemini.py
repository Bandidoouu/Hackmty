from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.security import get_current_user
from app.database import get_session
from app.gemini_client import get_price, simulate_trade
from app.models import User
from pydantic import BaseModel
from typing import List, Dict, Any
from app.gemini_client import generate_recommendations

router = APIRouter(prefix="/gemini", tags=["gemini"])


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
async def advise(payload: AdviceIn, user: User = Depends(get_current_user)):
    try:
        # combine provided summary with any server-known values if needed
        summary = payload.model_dump()
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
