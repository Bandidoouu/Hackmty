from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from ..database import get_db
from ..services.budget import compute_budget_summary
from ..schemas import BudgetSummary

router = APIRouter(prefix="/budget", tags=["budget"])

@router.get("/summary", response_model=BudgetSummary)
async def budget_summary(user_id: int = 1, db: AsyncSession = Depends(get_db)):
    data = await compute_budget_summary(db, user_id=user_id)
    return data
