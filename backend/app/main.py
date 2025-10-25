from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routers import health, nessie, budget, streak, ai

app = FastAPI(title="FinCoach API", version="1.0.0")

# CORS permisivo para front local
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(nessie.router)
app.include_router(budget.router)
app.include_router(streak.router)
app.include_router(ai.router)
