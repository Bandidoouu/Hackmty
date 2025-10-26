
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_session
from app.models import User
from app.schemas import RegisterIn, LoginIn, TokenOut, UserOut
from app.security import get_password_hash, verify_password, create_access_token, get_current_user
from app.nessie_client import ensure_customer_and_account

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/register")
async def register(payload: RegisterIn, session: AsyncSession = Depends(get_session)):
    q = await session.execute(select(User).where(User.email == payload.email))
    if q.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        email=payload.email,
        password_hash=get_password_hash(payload.password),
        first_name=payload.first_name or "",
        last_name=payload.last_name or "",
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)

    try:
        addr = payload.address.model_dump()
        await ensure_customer_and_account(user, addr, session=session)
    except Exception:
        pass

    return {"message": "registered", "id": user.id}

@router.post("/login", response_model=TokenOut)
async def login(payload: LoginIn, session: AsyncSession = Depends(get_session)):
    q = await session.execute(select(User).where(User.email == payload.email))
    user = q.scalar_one_or_none()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password")
    token = create_access_token(subject=user.email)
    return TokenOut(access_token=token)

@router.get("/me", response_model=UserOut)
async def me(user: User = Depends(get_current_user)):
    return user

@router.post("/nessie/bootstrap")
async def bootstrap(user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    addr = {"street_number": "123", "street_name": "Main St", "city": "CDMX", "state": "MX", "zip": "01000"}
    try:
        cust_id, acc_id = await ensure_customer_and_account(user, addr, session=session)
        return {"customer_id": cust_id, "account_id": acc_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
