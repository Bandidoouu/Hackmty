from fastapi import APIRouter, Query
from typing import Dict, Any
import random

router = APIRouter(tags=["budget"])

# Demo simple sin BD: genera porcentajes y totales deterministas por user_id.
def _summary_for(user_id: int) -> Dict[str, Any]:
    rnd = random.Random(user_id)
    income = 18000 + rnd.randint(-1000, 2000)
    needs = round(income * 0.55, 2)
    wants = round(income * 0.25, 2)
    savings = round(income - needs - wants, 2)
    return {
        "user_id": user_id,
        "income_estimate": income,
        "categories": {
            "needs": needs,
            "wants": wants,
            "savings": savings
        }
    }

@router.get("/budget/summary")
async def budget_summary(user_id: int = Query(1)):
    return _summary_for(user_id)
