from pydantic import BaseModel, Field
from typing import List, Optional

class BudgetSummary(BaseModel):
    survival_min: float = Field(..., description="Monto mensual mínimo para vivir (esenciales)")
    ant_spend: float = Field(..., description="Gasto hormiga mensual estimado")
    top_ant: list[dict] = Field(..., description="Top merchants hormiga")
    cushion: float = Field(..., description="Colchón: ingreso - esenciales")

class CreateGoal(BaseModel):
    user_id: int
    name: str
    target_amount: float
    due_date: Optional[str] = None

class GoalOut(BaseModel):
    id: int
    name: str
    target_amount: float
    due_date: Optional[str] = None
    progress: float
    class Config:
        from_attributes = True

class StreakOut(BaseModel):
    user_id: int
    day_count: int
    last_checkin_date: Optional[str] = None
