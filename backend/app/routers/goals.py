from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from ..database import get_db
from ..models import Goal
from ..schemas import CreateGoal, GoalOut

router = APIRouter(prefix="/goals", tags=["goals"])

@router.post("", response_model=GoalOut)
async def create_goal(payload: CreateGoal, db: AsyncSession = Depends(get_db)):
    g = Goal(user_id=payload.user_id, name=payload.name, target_amount=payload.target_amount, due_date=payload.due_date)
    db.add(g)
    await db.commit()
    await db.refresh(g)
    return g

@router.get("", response_model=list[GoalOut])
async def list_goals(user_id: int = 1, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Goal).where(Goal.user_id==user_id))
    return res.scalars().all()
