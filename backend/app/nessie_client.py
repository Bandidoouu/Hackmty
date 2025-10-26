
import httpx, random, string
from datetime import date
from app.config import settings
from app.models import LocalTransaction

class NessieError(Exception):
    pass

def _u(path: str) -> str:
    sep = "&" if "?" in path else "?"
    return f"{settings.nessie_base_url.rstrip('/')}{path}{sep}key={settings.nessie_api_key}"

def _demo_id(prefix: str) -> str:
    return f"{prefix}-" + ''.join(random.choices(string.ascii_uppercase + string.digits, k=10))

def is_demo() -> bool:
    return not bool(settings.nessie_api_key)

async def create_customer(first_name: str, last_name: str, address: dict) -> str:
    if is_demo():
        return _demo_id("LOCALCUST")
    body = {
        "first_name": first_name or "Nombre",
        "last_name": last_name or "Usuario",
        "address": {
            "street_number": address.get("street_number", "123"),
            "street_name": address.get("street_name", "Main St"),
            "city": address.get("city", "CDMX"),
            "state": address.get("state", "MX"),
            "zip": address.get("zip", "01000"),
        },
    }
    async with httpx.AsyncClient(timeout=20) as client:
        r = await client.post(_u("/customers"), json=body)
        if r.status_code not in (200, 201):
            raise NessieError(f"Create customer failed: {r.text}")
        data = r.json()
        if isinstance(data, dict) and "objectCreated" in data and "_id" in data["objectCreated"]:
            return data["objectCreated"]["_id"]
        return data.get("_id") or data["objectCreated"]["_id"]

async def create_account_for_customer(customer_id: str, nickname="FinCoach", balance=0, session=None) -> str:
    if is_demo():
        acc_id = _demo_id("LOCALACC")
        # create an initial local transaction representing the starting balance
        if session is not None and balance:
            tx = LocalTransaction(account_id=acc_id, amount=float(balance), description="Initial balance (demo)")
            session.add(tx)
            await session.commit()
        return acc_id
    body = {"type": "Checking", "nickname": nickname, "rewards": 0, "balance": balance}
    async with httpx.AsyncClient(timeout=20) as client:
        r = await client.post(_u(f"/customers/{customer_id}/accounts"), json=body)
        if r.status_code not in (200, 201):
            raise NessieError(f"Create account failed: {r.text}")
        data = r.json()
        if isinstance(data, dict) and "objectCreated" in data and "_id" in data["objectCreated"]:
            return data["objectCreated"]["_id"]
        return data.get("_id") or data["objectCreated"]["_id"]

async def deposit_to_account(account_id: str, amount: float, session=None) -> dict:
    if is_demo():
        if session is not None:
            tx = LocalTransaction(account_id=account_id, amount=amount, description="Payroll deposit (demo)")
            session.add(tx)
            await session.commit()
        return {"status": "ok", "mode": "demo", "account_id": account_id, "amount": amount, "transaction_date": str(date.today())}
    body = {
        "medium": "balance",
        "transaction_date": str(date.today()),
        "status": "pending",
        "description": "Payroll deposit",
        "amount": amount,
    }
    async with httpx.AsyncClient(timeout=20) as client:
        r = await client.post(_u(f"/accounts/{account_id}/deposits"), json=body)
        if r.status_code not in (200, 201):
            raise NessieError(f"Deposit failed: {r.text}")
        return r.json()

async def ensure_customer_and_account(user, address_dict: dict | None, session=None) -> tuple[str, str]:
    if user.nessie_customer_id and user.primary_account_id:
        return user.nessie_customer_id, user.primary_account_id

    cust_id = user.nessie_customer_id
    if not cust_id:
        cust_id = await create_customer(user.first_name or "Nombre", user.last_name or "Usuario", address_dict or {})
        user.nessie_customer_id = cust_id

    acc_id = user.primary_account_id
    if not acc_id:
        acc_id = await create_account_for_customer(cust_id, nickname="FinCoach", balance=1000, session=session)
        user.primary_account_id = acc_id

    if session is not None:
        session.add(user)
        await session.commit()

    return cust_id, acc_id
