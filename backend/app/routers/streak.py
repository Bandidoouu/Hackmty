from fastapi import APIRouter, Query
from datetime import date, timedelta

router = APIRouter(tags=["streak"])

_last_checkin = {}
_streaks = {}

@router.post("/streak/checkin")
async def streak_checkin(user_id: int = Query(1)):
    today = date.today()
    last = _last_checkin.get(user_id)
    streak = _streaks.get(user_id, 0)

    if last is None:
        streak = 1
    else:
        if last == today - timedelta(days=1):
            streak += 1
        elif last < today:
            streak = 1

    _last_checkin[user_id] = today
    _streaks[user_id] = streak
    return {"user_id": user_id, "streak": streak, "last_checkin": today.isoformat()}
