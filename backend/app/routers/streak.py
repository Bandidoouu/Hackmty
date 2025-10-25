from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from ..database import get_db
from ..schemas import StreakOut
from ..services.gamification import checkin

router = APIRouter(prefix="/streak", tags=["streak"])

@router.post("/checkin", response_model=StreakOut)
async def do_checkin(user_id: int = 1, db: AsyncSession = Depends(get_db)):
    data = await checkin(db, user_id=user_id)
    return data

@router.get("", response_model=StreakOut)
async def get_streak(user_id: int = 1, db: AsyncSession = Depends(get_db)):
    data = await checkin(db, user_id=user_id)  # ensures creation
    return data
