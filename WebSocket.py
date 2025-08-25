import asyncio
import random
from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

#--- COPS 설정 추가 ---
# 프론트엔드 주소인 http://llocalhost:5173 요청을 허용함
origins = [
    "http://localhost:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# ---------------------------

@app.get("/")
def read_root():
    return {"message": "Hello World"}

# --- 웹소켓 엔드포인트 추가 ---
@app.websocket("/ws/stock-price")
async def stock_price_websocket(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            # 가상의 주식 가격 생성(30,000 ~ 40,000 사이의 랜덤 값)
            mock_price = random.randint(30000, 40000)

            # 프론트엔드로 데이터 전송 (JSON 형식)
            await websocket.send_json({"stock": "MyStock", "price": mock_price})

            # 1초 대기
            await asyncio.sleep(1)
    except Exception as e:
        print(f"WebSocket Error: {e}")
    finally:
        print("Client disconnected")
