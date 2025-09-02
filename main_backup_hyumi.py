
import asyncio
import json
import os
import csv
from datetime import datetime
from typing import List, Dict

import requests
import websockets
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# .env 파일의 환경 변수를 로드합니다.
load_dotenv()

# --- Configuration ---
# 실전투자 서버
KIS_BASE_URL = "https://openapi.koreainvestment.com:9443"
WS_URL = "ws://ops.koreainvestment.com:31000"
KIS_APP_KEY = os.environ.get("KIS_APP_KEY")
KIS_APP_SECRET = os.environ.get("KIS_APP_SECRET")

# 전역 변수로 토큰 관리
ACCESS_TOKEN = ""

app = FastAPI()

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- CSV 저장 기능 ---
def save_snapshot_to_csv(data: dict):
    data_dir = "data"
    os.makedirs(data_dir, exist_ok=True)
    file_path = os.path.join(data_dir, "snapshots.csv")
    fieldnames = ["timestamp", "stck_bsop_date", "stck_prpr", "prdy_vrss", "prdy_ctrt"]
    
    data_to_save = {
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "stck_bsop_date": data.get("stck_bsop_date"),
        "stck_prpr": data.get("stck_prpr"),
        "prdy_vrss": data.get("prdy_vrss"),
        "prdy_ctrt": data.get("prdy_ctrt"),
    }

    file_exists = os.path.isfile(file_path)
    
    try:
        with open(file_path, mode='a', newline='', encoding='utf-8') as csvfile:
            writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
            if not file_exists:
                writer.writeheader()
            writer.writerow(data_to_save)
        print(f"[CSV 저장] {file_path}에 데이터 저장 완료.")
    except IOError as e:
        print(f"[CSV 저장 오류] 파일 쓰기 중 오류 발생: {e}")

# --- WebSocket 연결 관리 ---
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        print(f"새로운 클라이언트 연결: {websocket.client}")

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)
        print(f"클라이언트 연결 해제: {websocket.client}")

    async def broadcast(self, message: Dict):
        message_str = json.dumps(message)
        for connection in self.active_connections:
            await connection.send_text(message_str)

manager = ConnectionManager()

# --- 한국투자증권 API 관련 ---
def get_access_token():
    global ACCESS_TOKEN
    headers = {"content-type": "application/json"}
    body = {"grant_type": "client_credentials", "appkey": KIS_APP_KEY, "appsecret": KIS_APP_SECRET}
    path = "oauth2/tokenP"
    url = f"{KIS_BASE_URL}/{path}"
    try:
        res = requests.post(url, headers=headers, data=json.dumps(body))
        res.raise_for_status()
        token_data = res.json()
        ACCESS_TOKEN = token_data["access_token"]
        print("✅ 접근 토큰 발급 성공")
        return ACCESS_TOKEN
    except requests.exceptions.RequestException as e:
        print(f"접근 토큰 발급 중 오류: {e}")
        return None

def get_approval_key():
    headers = {"content-type": "application/json"}
    body = {"grant_type": "client_credentials", "appkey": KIS_APP_KEY, "secretkey": KIS_APP_SECRET}
    path = "oauth2/Approval"
    url = f"{KIS_BASE_URL}/{path}"
    try:
        res = requests.post(url, headers=headers, data=json.dumps(body))
        res.raise_for_status()
        approval_key = res.json().get("approval_key")
        if not approval_key: print(f"승인키 발급 실패: {res.text}")
        else: print("✅ 웹소켓 승인키 발급 성공")
        return approval_key
    except requests.exceptions.RequestException as e:
        print(f"승인키 발급 중 오류: {e}")
        return None

def get_current_price(stock_code: str):
    global ACCESS_TOKEN
    if not ACCESS_TOKEN: get_access_token()
    path = "/uapi/domestic-stock/v1/quotations/inquire-price"
    url = f"{KIS_BASE_URL}{path}"
    headers = {
        "Content-Type": "application/json",
        "authorization": f"Bearer {ACCESS_TOKEN}",
        "appKey": KIS_APP_KEY,
        "appSecret": KIS_APP_SECRET,
        "tr_id": "FHKST01010100",
    }
    params = {"fid_cond_mrkt_div_code": "J", "fid_input_iscd": stock_code}
    try:
        res = requests.get(url, headers=headers, params=params)
        res.raise_for_status()
        data = res.json()
        if data.get('rt_cd') == '0': return data['output']
        if data.get('msg_cd') == 'EGW00123':
            print("토큰 만료, 재발급 후 재시도...")
            get_access_token()
            headers["authorization"] = f"Bearer {ACCESS_TOKEN}"
            res = requests.get(url, headers=headers, params=params)
            res.raise_for_status()
            data = res.json()
            if data.get('rt_cd') == '0': return data['output']
        print(f"현재가 조회 실패: {data.get('msg1')}")
        return None
    except requests.exceptions.RequestException as e:
        print(f"현재가 조회 중 오류: {e}")
        return None

# --- 백그라운드 작업 ---
async def kis_websocket_client():
    approval_key = get_approval_key()
    if not approval_key: return
    subscribe_msg = {
        "header": {"approval_key": approval_key, "custtype": "P", "tr_type": "1", "content-type": "utf-8"},
        "body": {"input": {"tr_id": "H0STNAV0", "tr_key": "102110"}}
    }
    async with websockets.connect(WS_URL, ping_interval=20) as ws:
        print("📡 [Tick] KIS WebSocket 서버에 연결되었습니다.")
        await ws.send(json.dumps(subscribe_msg))
        print(f"[Tick] 구독 메시지 전송: {subscribe_msg['body']['input']['tr_id']}:{subscribe_msg['body']['input']['tr_key']}")
        while True:
            try:
                msg = await ws.recv()
                await manager.broadcast({"type": "tick", "data": msg})
            except websockets.exceptions.ConnectionClosed as e:
                print(f"⚠️ [Tick] KIS WebSocket 연결 종료: {e}")
                break
            except Exception as e:
                print(f"⚠️ [Tick] KIS WebSocket 처리 중 오류: {e}")
                break
    print("[Tick] KIS WebSocket 클라이언트 종료.")

async def fetch_price_periodically():
    stock_code = "102110"
    print(f"📈 [5분 주기] {stock_code} 현재가 조회를 시작합니다.")
    while True:
        await asyncio.sleep(300)  # 5분 대기
        price_data = get_current_price(stock_code)
        if price_data:
            simplified_data = {
                "stck_prpr": price_data.get("stck_prpr"),
                "prdy_vrss": price_data.get("prdy_vrss"),
                "prdy_ctrt": price_data.get("prdy_ctrt"),
                "stck_bsop_date": price_data.get("stck_bsop_date"),
            }
            await manager.broadcast({"type": "snapshot_5min", "data": simplified_data})
            save_snapshot_to_csv(simplified_data)
            print(f"[5분 주기] 데이터 전송 및 저장: {simplified_data}")

# --- FastAPI 엔드포인트 ---
@app.on_event("startup")
async def startup_event():
    get_access_token()
    asyncio.create_task(kis_websocket_client())
    asyncio.create_task(fetch_price_periodically())
    print("🚀 서버가 시작되었습니다. 실시간 Tick과 5분 주기 조회를 백그라운드에서 실행합니다.")

@app.get("/")
async def root():
    return {"message": "실시간 데이터 전송 서버 (Tick + 5분 주기)"}

@app.websocket("/ws/kospi200")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True: await websocket.receive_text()
    except WebSocketDisconnect: manager.disconnect(websocket)
