import asyncio
from httpx import AsyncClient
from backend.app.main import app
from backend.app.database import engine, Base
from backend.app.services.budget import ESSENTIAL_CATEGORIES

async def test_health():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        r = await ac.get("/health")
        assert r.status_code == 200
        assert r.json()["status"] == "ok"
