import asyncio
from httpx import AsyncClient
from backend.app.main import app

async def test_checkin():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        r = await ac.post("/streak/checkin?user_id=1")
        assert r.status_code == 200
        assert "day_count" in r.json()
