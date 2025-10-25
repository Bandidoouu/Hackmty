import asyncio, random
from datetime import date, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import AsyncSessionLocal, engine, Base
from app.models import User, Account, Transaction, Streak, Lesson, SurvivalBudget

MERCHANTS_ESSENTIAL = [
    ("Renta Casa", -8000, "housing"),
    ("CFE", -650, "utilities"),
    ("Agua Municipal", -300, "utilities"),
    ("Telco Fibra", -600, "utilities"),
    ("Transporte Urbano", -900, "transport"),
    ("Supermercado", -2500, "groceries_basic"),
    ("Pago Tarjeta", -1200, "debt"),
]
MERCHANTS_ANT = [
    ("Café Latte", -55, "coffee"),
    ("Snack Oxxo", -28, "snacks"),
    ("App Streaming", -149, "apps_sub"),
]

async def seed():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    async with AsyncSessionLocal() as db:
        user = User(name="Demo", age=28, monthly_income_sim=18000.0)
        db.add(user)
        await db.flush()

        acc = Account(user_id=user.id, nickname="Main", balance=5000.0)
        db.add(acc)
        await db.flush()

        # Lessons
        for t in ["Presupuesto 101", "Gasto hormiga 3 pasos", "Meta SMART en 60s"]:
            db.add(Lesson(title=t, xp=10))

        # Esenciales recurrentes: 3 meses
        today = date.today()
        start = today - timedelta(days=90)
        d = start
        while d <= today:
            # una vez por mes (aprox cada 30 días) para renta
            if d.day in (1, 2, 3):
                for m, amt, cat in MERCHANTS_ESSENTIAL:
                    tx = Transaction(account_id=acc.id, merchant=m, amount=amt, date=d, category=cat, is_essential=True)
                    db.add(tx)
            # semanal supermercado básico
            if d.weekday() == 5:
                db.add(Transaction(account_id=acc.id, merchant="Supermercado", amount=-600, date=d, category="groceries_basic", is_essential=True))
            # hormiga aleatoria
            if random.random() < 0.5:
                m, amt, cat = random.choice(MERCHANTS_ANT)
                db.add(Transaction(account_id=acc.id, merchant=m, amount=amt, date=d, category=cat, is_ant=True))
            d += timedelta(days=1)

        # Ingresos simulados: nómina semanal +4500
        d = start
        while d <= today:
            if d.weekday() == 4:  # viernes
                db.add(Transaction(account_id=acc.id, merchant="Nomina", amount=4500, date=d, category="income"))
            d += timedelta(days=1)

        # SurvivalBudget inicial
        db.add(SurvivalBudget(user_id=user.id, monthly_amount=9000.0))

        await db.commit()
    print("Seed listo. Usuario Demo (id=1), cuenta Main creada.")

if __name__ == "__main__":
    asyncio.run(seed())
