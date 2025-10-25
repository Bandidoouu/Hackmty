from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Integer, Float, Date, DateTime, Boolean, ForeignKey, func
from .database import Base

class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100))
    age: Mapped[int] = mapped_column(Integer, default=25)
    monthly_income_sim: Mapped[float] = mapped_column(Float, default=20000.0)

    accounts: Mapped[list["Account"]] = relationship(back_populates="user")
    goals: Mapped[list["Goal"]] = relationship(back_populates="user")
    streak: Mapped["Streak"] = relationship(back_populates="user", uselist=False)
    budget: Mapped["SurvivalBudget"] = relationship(back_populates="user", uselist=False)

class Account(Base):
    __tablename__ = "accounts"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    nessie_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    type: Mapped[str] = mapped_column(String(50), default="checking")
    nickname: Mapped[str] = mapped_column(String(50), default="Main")
    balance: Mapped[float] = mapped_column(Float, default=0.0)

    user: Mapped["User"] = relationship(back_populates="accounts")
    transactions: Mapped[list["Transaction"]] = relationship(back_populates="account")

class Transaction(Base):
    __tablename__ = "transactions"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    account_id: Mapped[int] = mapped_column(ForeignKey("accounts.id"))
    merchant: Mapped[str] = mapped_column(String(120))
    amount: Mapped[float] = mapped_column(Float)  # negative = expense, positive = income
    date: Mapped[Date] = mapped_column(Date)
    category: Mapped[str] = mapped_column(String(50))
    is_essential: Mapped[bool] = mapped_column(Boolean, default=False)
    is_ant: Mapped[bool] = mapped_column(Boolean, default=False)

    account: Mapped["Account"] = relationship(back_populates="transactions")

class Goal(Base):
    __tablename__ = "goals"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    name: Mapped[str] = mapped_column(String(120))
    target_amount: Mapped[float] = mapped_column(Float)
    due_date: Mapped[Date | None] = mapped_column(Date, nullable=True)
    progress: Mapped[float] = mapped_column(Float, default=0.0)
    created_at: Mapped[DateTime] = mapped_column(DateTime, server_default=func.now())

    user: Mapped["User"] = relationship(back_populates="goals")

class Streak(Base):
    __tablename__ = "streaks"
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), primary_key=True)
    day_count: Mapped[int] = mapped_column(Integer, default=0)
    last_checkin_date: Mapped[Date | None] = mapped_column(Date, nullable=True)

    user: Mapped["User"] = relationship(back_populates="streak")

class Lesson(Base):
    __tablename__ = "lessons"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(120))
    xp: Mapped[int] = mapped_column(Integer, default=10)

class SurvivalBudget(Base):
    __tablename__ = "survival_budgets"
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), primary_key=True)
    monthly_amount: Mapped[float] = mapped_column(Float, default=0.0)
    updated_at: Mapped[DateTime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    user: Mapped["User"] = relationship(back_populates="budget")
