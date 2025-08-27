import os
import json
import requests
import asyncio
import websockets
from datetime import datetime, timedelta
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

# =========================
# 환경변수
# =========================
KIS_APP_KEY = os.getenv("KIS_APP_KEY")
KIS_APP_SECRET = os.getenv("KIS_APP_SECRET")
KIS_SECRET_KEY = os.getenv("KIS_SECRET_KEY")
KIS_BASE_URL = "https://openapi.koreainvestment.com:9443"
KIS_WS_URL = "ws://ops.koreainvestment.com:21000"

# =========================
# FastAPI 앱
# =========================
app = FastAPI()
origins = [
    "http://localhost",
    "http://localhost:5173",
    "http://220.69.216.48:5173",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =========================
# Approval Key 캐싱
# =========================
approval_key_data = {"key": None, "expires_at": None}

def get_approval_key():
    global approval_key_data
    now = datetime.now()
    if approval_key_data["key"] and approval_key_data["expires_at"] > now:
        return approval_key_data["key"]

    url = f"{KIS_BASE_URL}/oauth2/Approval"
    body = {"appkey": KIS_APP_KEY, "secretkey": KIS_SECRET_KEY}
    res = requests.post(url, json=body)
    if res.status_code != 200:
        raise Exception(f"승인키 발급 실패: {res.text}")

    data = res.json()
    approval_key_data["key"] = data["approval_key"]
    approval_key_data["expires_at"] = now + timedelta(hours=23, minutes=50)
    print("✅ Approval Key 발급 완료")
    return approval_key_data["key"]

# =========================
# REST API 예시
# =========================
ACCESS_TOKEN = None
ACCESS_TOKEN_EXP = None

def get_access_token():
    global ACCESS_TOKEN, ACCESS_TOKEN_EXP
    if ACCESS_TOKEN and datetime.now() < ACCESS_TOKEN_EXP:
        return ACCESS_TOKEN
    url = f"{KIS_BASE_URL}/oauth2/tokenP"
    body = {"grant_type": "client_credentials", "appkey": KIS_APP_KEY, "appsecret": KIS_APP_SECRET}
    res = requests.post(url, json=body)
    if res.status_code != 200:
        raise Exception(f"토큰 발급 실패: {res.text}")
    data = res.json()
    ACCESS_TOKEN = data["access_token"]
    ACCESS_TOKEN_EXP = datetime.now() + timedelta(seconds=int(data["expires_in"]) - 60)
    return ACCESS_TOKEN

@app.get("/get-price/{ticker}")
def get_price(ticker: str):
    token = get_access_token()
    url = f"{KIS_BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-price"
    headers = {
        "Authorization": f"Bearer {token}",
        "appkey": KIS_APP_KEY,
        "appsecret": KIS_APP_SECRET,
        "tr_id": "FHKST01010100"
    }
    params = {"fid_cond_mrkt_div_code": "J", "fid_input_iscd": ticker}
    res = requests.get(url, headers=headers, params=params)
    if res.status_code != 200:
        raise Exception(f"가격 조회 실패: {res.text}")
    return res.json()

# =========================
# WebSocket 연결
# =========================
latest_kospi200 = None

async def kis_ws_to_client(websocket: WebSocket):
    global latest_kospi200
    await websocket.accept()
    while True:
        try:
            approval_key = get_approval_key()
            headers = {
                "approval_key": approval_key,
                "appkey": KIS_APP_KEY,
                "secretkey": KIS_SECRET_KEY,
                "custtype": "P"
            }
            async with websockets.connect(KIS_WS_URL, extra_headers=headers, ping_interval=20) as ws:
                subscribe_msg = {
                    "body": {
                        "input": {
                            "tr_id": "H0UPANC0",  # 코스피200 실시간 지수
                            "tr_key": "2001"
                        }
                    }
                }
                await ws.send(json.dumps(subscribe_msg))
                print("📡 코스피200 실시간 구독 시작")
                while True:
                    msg = await ws.recv()
                    latest_kospi200 = msg
                    await websocket.send_text(msg)
        except Exception as e:
            print("⚠️ WebSocket 오류 발생, 5초 후 재연결:", e)
            await asyncio.sleep(5)

@app.websocket("/ws/kospi200")
async def websocket_endpoint(websocket: WebSocket):
    try:
        await kis_ws_to_client(websocket)
    except WebSocketDisconnect:
        print("❌ 클라이언트 연결 종료")

# =========================
# 서버 시작 시 WebSocket 백그라운드 실행
# =========================
@app.on_event("startup")
async def startup_event():
    print("KIS 코스피200 실시간 WebSocket 서버가 실행 중입니다.")
