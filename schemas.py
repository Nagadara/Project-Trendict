from pydantic import BaseModel

# API가 회원가입 요청을 받을 때 사용할 스키마
class UserBase(BaseModel):
    username: str

class UserCreate(UserBase):
    password: str

# API가 사용자 정보를 응답으로 보낼 때 사용할 스키마 (비밀번호 제외)
class User(UserBase):
    id: int

    class Config:
        orm_mode = True

# API가 로그인 응답으로 토큰을 보낼 때 사용할 스키마
class Token(BaseModel):
    access_token: str
    token_type: str

# JWT 토큰 안에 저장될 데이터의 형식을 정의
class TokenData(BaseModel):
    username: str | None = None