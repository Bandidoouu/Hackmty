from datetime import date
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from ..models import Streak

async def checkin(db: AsyncSession, user_id: int) -> dict:
    st = (await db.execute(select(Streak).where(Streak.user_id==user_id))).scalar_one_or_none()
    today = date.today()
    if not st:
        st = Streak(user_id=user_id, day_count=1, last_checkin_date=today)
        db.add(st)
        await db.commit()
        return {"user_id": user_id, "day_count": 1, "last_checkin_date": str(today)}
    if st.last_checkin_date != today:
        st.day_count += 1
        st.last_checkin_date = today
        await db.commit()
    return {"user_id": user_id, "day_count": st.day_count, "last_checkin_date": str(st.last_checkin_date)}
