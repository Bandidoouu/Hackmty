from collections import defaultdict
from datetime import date, timedelta
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from ..models import Transaction, User
from dateutil.relativedelta import relativedelta

ESSENTIAL_CATEGORIES = {"housing","utilities","transport","groceries_basic","debt"}

def is_ant_expense(tx: Transaction) -> bool:
    return (tx.amount < 0) and (abs(tx.amount) < 150) and (tx.category not in ESSENTIAL_CATEGORIES)

async def compute_budget_summary(db: AsyncSession, user_id: int) -> dict:
    # get user and transactions of last 30 days
    user = (await db.execute(select(User).where(User.id==user_id))).scalar_one()
    since = date.today() - relativedelta(days=30)
    q = await db.execute(select(Transaction).join(User.accounts).where(User.id==user_id, Transaction.date>=since))
    txs = q.scalars().all()

    essential_total = 0.0
    ant_total = 0.0
    ant_by_merchant = defaultdict(float)

    for tx in txs:
        if tx.amount >= 0:
            continue
        if tx.category in ESSENTIAL_CATEGORIES or tx.is_essential:
            essential_total += abs(tx.amount)
        elif is_ant_expense(tx) or tx.is_ant:
            ant_total += abs(tx.amount)
            ant_by_merchant[tx.merchant] += abs(tx.amount)

    top_ant = sorted([{"merchant":k,"amount":v} for k,v in ant_by_merchant.items()], key=lambda x: x["amount"], reverse=True)[:5]
    survival_min = round(essential_total, 2)
    cushion = round(user.monthly_income_sim - survival_min, 2)
    return {
        "survival_min": survival_min,
        "ant_spend": round(ant_total, 2),
        "top_ant": top_ant,
        "cushion": cushion
    }
