
import httpx, random, string, logging
from datetime import date
from app.config import settings
from app.models import LocalTransaction

logger = logging.getLogger(__name__)


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
    """Create a customer at the configured Nessie backend, or fall back to a local demo id if the API is unreachable.

    This function is resilient: network errors or non-2xx responses will be logged and cause a demo id to be returned so the UI remains usable.
    """
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
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            r = await client.post(_u("/customers"), json=body)
            if r.status_code not in (200, 201):
                logger.warning("Nessie create_customer returned status %s: %s", r.status_code, r.text)
                # fallback to demo id so the app stays usable
                return _demo_id("LOCALCUST")
            data = r.json()
            if isinstance(data, dict) and "objectCreated" in data and "_id" in data["objectCreated"]:
                return data["objectCreated"]["_id"]
            return data.get("_id") or data["objectCreated"]["_id"]
    except Exception as e:
        logger.exception("Nessie create_customer failed, falling back to demo mode: %s", e)
        return _demo_id("LOCALCUST")


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
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            r = await client.post(_u(f"/customers/{customer_id}/accounts"), json=body)
            if r.status_code not in (200, 201):
                logger.warning("Nessie create_account returned status %s: %s", r.status_code, r.text)
                # fallback to demo account
                acc_id = _demo_id("LOCALACC")
                if session is not None and balance:
                    tx = LocalTransaction(account_id=acc_id, amount=float(balance), description="Initial balance (demo)")
                    session.add(tx)
                    await session.commit()
                return acc_id
            data = r.json()
            if isinstance(data, dict) and "objectCreated" in data and "_id" in data["objectCreated"]:
                return data["objectCreated"]["_id"]
            return data.get("_id") or data["objectCreated"]["_id"]
    except Exception as e:
        logger.exception("Nessie create_account failed, falling back to demo account: %s", e)
        acc_id = _demo_id("LOCALACC")
        if session is not None and balance:
            tx = LocalTransaction(account_id=acc_id, amount=float(balance), description="Initial balance (demo)")
            session.add(tx)
            await session.commit()
        return acc_id


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
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            r = await client.post(_u(f"/accounts/{account_id}/deposits"), json=body)
            if r.status_code not in (200, 201):
                logger.warning("Nessie deposit returned status %s: %s", r.status_code, r.text)
                # fallback: record local transaction and return demo-like response
                if session is not None:
                    tx = LocalTransaction(account_id=account_id, amount=amount, description="Payroll deposit (fallback)")
                    session.add(tx)
                    await session.commit()
                return {"status": "ok", "mode": "fallback", "account_id": account_id, "amount": amount, "transaction_date": str(date.today())}
            return r.json()
    except Exception as e:
        logger.exception("Nessie deposit failed, falling back to demo transaction: %s", e)
        if session is not None:
            tx = LocalTransaction(account_id=account_id, amount=amount, description="Payroll deposit (fallback)")
            session.add(tx)
            await session.commit()
        return {"status": "ok", "mode": "fallback", "account_id": account_id, "amount": amount, "transaction_date": str(date.today())}


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
