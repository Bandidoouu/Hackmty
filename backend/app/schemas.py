
from pydantic import BaseModel, EmailStr, Field

class AddressIn(BaseModel):
    street_number: str
    street_name: str
    city: str
    state: str
    zip: str

class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    first_name: str | None = None
    last_name: str | None = None
    address: AddressIn

class LoginIn(BaseModel):
    email: EmailStr
    password: str

class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"

class UserOut(BaseModel):
    email: EmailStr
    first_name: str | None = None
    last_name: str | None = None
    nessie_customer_id: str | None = None
    primary_account_id: str | None = None

    class Config:
        from_attributes = True

class PaycheckIn(BaseModel):
    amount: float = Field(gt=0)
