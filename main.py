import os
import json
import requests
import asyncio
import websockets
import csv
from datetime import datetime, timedelta
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from dotenv import load_dotenv

import models
import schemas
import security
from database import engine, get_db

# --- 초기 설정 ---
load_dotenv()
models.Base.metadata.create_all(bind=engine)

# --- FastAPI 앱 생성 및 미들웨어 ---
app = FastAPI()
origins = ["http://localhost", "http://localhost:5173", "http://220.69.216.48:5173", "http://220.69.216.48:5174"]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

# --- WebSocket 연결 관리자 ---
class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)
    async def broadcast(self, message: str):
        for connection in self.active_connections:
            await connection.send_text(message)
manager = ConnectionManager()

# --- KIS API 설정 및 헬퍼 ---
KIS_APP_KEY = os.getenv("KIS_APP_KEY")
KIS_APP_SECRET = os.getenv("KIS_APP_SECRET")
KIS_SECRET_KEY = os.getenv("KIS_SECRET_KEY")
KIS_BASE_URL = "https://openapi.koreainvestment.com:9443"
KIS_WS_URL = "ws://ops.koreainvestment.com:21000"
APPROVAL_KEY_FILE = "kis_approval_key.json"
ACCESS_TOKEN_FILE = "kis_access_token.json"

def are_keys_configured(): return all([KIS_APP_KEY, KIS_APP_SECRET, KIS_SECRET_KEY])

def get_approval_key(force_reissue=False):
    # 웹소켓 연결 시에는 항상 새로 발급받는 것이 안정적입니다.
    print("... Approval Key 신규 발급 시도 (실시간 연결용) ...")
    url = f"{KIS_BASE_URL}/oauth2/Approval"; body = {"grant_type": "P", "appkey": KIS_APP_KEY, "secretkey": KIS_SECRET_KEY}
    try:
        res = requests.post(url, json=body, timeout=5); res.raise_for_status()
        data = res.json(); new_key = data["approval_key"]
        print("✅ Approval Key 신규 발급 성공"); return new_key
    except requests.exceptions.RequestException as e:
        print(f"⚠️ Approval Key 발급 실패: {e}"); raise e

def get_access_token():
    today = datetime.now().strftime("%Y-%m-%d")
    try:
        with open(ACCESS_TOKEN_FILE, 'r') as f:
            token_data = json.load(f)
            if token_data.get('issued_date') == today:
                print("🔑 Access Token 재사용 (from file)"); return token_data['token']
    except Exception: pass
    print("... Access Token 신규 발급 시도 ...")
    url = f"{KIS_BASE_URL}/oauth2/tokenP"; body = {"grant_type": "client_credentials", "appkey": KIS_APP_KEY, "appsecret": KIS_APP_SECRET}
    res = requests.post(url, json=body, timeout=5); res.raise_for_status(); data = res.json()
    new_token = data["access_token"]
    with open(ACCESS_TOKEN_FILE, 'w') as f: json.dump({'token': new_token, 'issued_date': today}, f)
    print("✅ Access Token 신규 발급 및 파일 저장 완료"); return new_token

def get_current_price(stock_code: str):
    try:
        token = get_access_token()
        url = f"{KIS_BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-price"
        headers = {"Authorization": f"Bearer {token}", "appkey": KIS_APP_KEY, "appsecret": KIS_APP_SECRET, "tr_id": "FHKST01010100"}
        params = {"fid_cond_mrkt_div_code": "J", "fid_input_iscd": stock_code}
        res = requests.get(url, headers=headers, params=params, timeout=5); res.raise_for_status()
        data = res.json()
        if data.get('rt_cd') == '0': return data['output']
    except Exception as e: print(f"⚠️ {stock_code} 현재가 조회 실패: {e}")
    return None

def save_snapshot_to_csv(data: dict):
    file_path = 'price_snapshots.csv'; is_new_file = not os.path.exists(file_path)
    with open(file_path, 'a', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        if is_new_file: writer.writerow(['timestamp', 'price', 'change', 'change_rate', 'date'])
        writer.writerow([datetime.now().isoformat(), data.get("stck_prpr"), data.get("prdy_vrss"), data.get("prdy_ctrt"), data.get("stck_bsop_date")])

# --- 사용자 인증 엔드포인트 ---
def get_user_by_username(db: Session, username: str):
    return db.query(models.User).filter(models.User.username == username).first()

@app.post("/users/register", response_model=schemas.User, tags=["Authentication"])
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = get_user_by_username(db, username=user.username)
    if db_user: raise HTTPException(status_code=400, detail="이미 등록된 사용자 이름입니다.")
    hashed_password = security.get_password_hash(user.password)
    db_user = models.User(username=user.username, hashed_password=hashed_password)
    db.add(db_user); db.commit(); db.refresh(db_user)
    return db_user

@app.post("/token", response_model=schemas.Token, tags=["Authentication"])
def login_for_access_token(db: Session = Depends(get_db), form_data: OAuth2PasswordRequestForm = Depends()):
    user = get_user_by_username(db, username=form_data.username)
    if not user or not security.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="사용자 이름 또는 비밀번호가 올바르지 않습니다.", headers={"WWW-Authenticate": "Bearer"})
    access_token = security.create_access_token(data={"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer"}

# --- 주식 데이터 API 엔드포인트 ---
@app.get("/stocks/all", tags=["Stock Data"])
async def get_all_stocks_api():
    if not are_keys_configured(): return [{"code": "005930", "name": "(예시) 삼성전자"}, {"code": "000660", "name": "(예시) SK하이닉스"}]
    print("✅ KIS 종목 목록 API가 불안정하여, 대표 종목 목록을 반환합니다.")
    return [{"code": "005930", "name": "삼성전자"}, {"code": "000660", "name": "SK하이닉스"}, {"code": "035420", "name": "NAVER"}, {"code": "005380", "name": "현대차"}, {"code": "051910", "name": "LG화학"}, {"code": "207940", "name": "삼성바이오로직스"}, {"code": "006400", "name": "삼성SDI"}, {"code": "068270", "name": "셀트리온"}, {"code": "035720", "name": "카카오"}, {"code": "028050", "name": "삼성E&A"}]

@app.get("/stocks/{stock_code}/info", tags=["Stock Data"])
async def get_stock_info(stock_code: str):
    if not are_keys_configured(): return {"marketType": "N/A", "stockCode": stock_code, "stockName": "KIS API 키 필요", "currentPrice": 0, "open": 0, "high": 0, "low": 0, "week52high": 0, "week52low": 0, "volume": 0, "tradeValue": 0, "marketCap": 0, "foreignRatio": 0, "per": 0, "pbr": 0, "dividendYield": 0}
    token = get_access_token()
    url = f"{KIS_BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-price"
    headers = {"Authorization": f"Bearer {token}", "appkey": KIS_APP_KEY, "appsecret": KIS_APP_SECRET, "tr_id": "FHKST01010100"}
    params = {"fid_cond_mrkt_div_code": "J", "fid_input_iscd": stock_code}
    res = requests.get(url, headers=headers, params=params, timeout=5); res.raise_for_status(); data = res.json()
    if data.get('rt_cd') == '0':
        output = data['output']
        return {"marketType": output.get('rprs_mrkt_kor_name', 'N/A'), "stockCode": stock_code, "stockName": output.get('bstp_kor_isnm', '알 수 없음'), "currentPrice": float(output.get('stck_prpr', 0)), "open": float(output.get('stck_oprc', 0)), "high": float(output.get('stck_hgpr', 0)), "low": float(output.get('stck_lwpr', 0)), "week52high": float(output.get('w52_hgpr', 0)), "week52low": float(output.get('w52_lwpr', 0)), "volume": float(output.get('acml_vol', 0)), "tradeValue": float(output.get('acml_tr_pbmn', 0)), "marketCap": float(output.get('mket_prtt_val', 0)), "foreignRatio": float(output.get('frgn_hldn_qty_rate', 0)), "per": float(output.get('per', 0)), "pbr": float(output.get('pbr', 0)), "dividendYield": float(output.get('dvrg_rto', 0))}
    raise HTTPException(status_code=404, detail=f"KIS API 오류: {data.get('msg1')}")

@app.get("/stocks/{stock_code}/candles", tags=["Stock Data"])
async def get_stock_candles(stock_code: str, period: str = "day", interval: str = "1"):
    if not are_keys_configured(): return []
    token = get_access_token()
    if period == "day":
        url = f"{KIS_BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-daily-itemchartprice"; tr_id = "FHKST03010100"
        kis_interval = {"1": "D", "7": "W", "30": "M"}.get(interval, "D")
        params = {"FID_COND_MRKT_DIV_CODE": "J", "FID_INPUT_ISCD": stock_code, "FID_INPUT_DATE_1": (datetime.now() - timedelta(days=365*5)).strftime("%Y%m%d"), "FID_INPUT_DATE_2": datetime.now().strftime("%Y%m%d"), "FID_PERIOD_DIV_CODE": kis_interval, "FID_ORG_ADJ_PRC": "1"}
    elif period == "minute":
        url = f"{KIS_BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-time-itemchartprice"; tr_id = "FHKST03010200"
        params = {"FID_COND_MRKT_DIV_CODE": "J", "FID_INPUT_ISCD": stock_code, "FID_ETC_CLS_CODE": "", "FID_INPUT_DATE_1": "", "FID_INPUT_HOUR_1": "090000", "FID_INPUT_HOUR_2": "153000", "FID_PERIOD_DIV_CODE": interval}
    else: raise HTTPException(status_code=400, detail="Invalid period specified.")
    headers = {"Authorization": f"Bearer {token}", "appkey": KIS_APP_KEY, "appsecret": KIS_APP_SECRET, "tr_id": tr_id}
    try:
        res = requests.get(url, headers=headers, params=params, timeout=5); res.raise_for_status(); data = res.json()
        if data.get('rt_cd') != '0' or not data.get('output1'): return []
        output = data['output1']
        if isinstance(output, dict): output = [output]
        chart_data = []
        for item in reversed(output):
            if not isinstance(item, dict): continue
            if period == "day": date_str, time_str, close_price = item.get('stck_bsop_date'), "000000", item.get('stck_clpr')
            else: date_str, time_str, close_price = datetime.now().strftime("%Y%m%d"), item.get('stck_cntg_hour'), item.get('stck_prpr')
            if not date_str: continue
            dt_obj = datetime.strptime(f"{date_str}{time_str}", "%Y%m%d%H%M%S")
            chart_data.append({"date": dt_obj.strftime("%Y-%m-%d %H:%M:%S"), "open": float(item.get('stck_oprc') or 0), "high": float(item.get('stck_hgpr') or 0), "low": float(item.get('stck_lwpr') or 0), "close": float(close_price or 0), "volume": float(item.get('cntg_vol') or item.get('acml_vol') or 0)})
        return chart_data
    except Exception as e: print(f"!!! /candles 엔드포인트에서 오류 발생: {e}"); return []

@app.get("/market/indices", tags=["Stock Data"])
async def get_market_indices():
    if not are_keys_configured(): return []
    token = get_access_token()
    url = f"{KIS_BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-index-price"
    headers = {"Authorization": f"Bearer {token}", "appkey": KIS_APP_KEY, "appsecret": KIS_APP_SECRET, "tr_id": "FHPUP02110000"}
    results = []
    for index_info in [{"name": "KOSPI", "code": "0001", "flag": "🇰🇷"}, {"name": "KOSDAQ", "code": "1001", "flag": "🇰🇷"}]:
        params = {"FID_INPUT_ISCD": index_info["code"], "FID_COND_MRKT_DIV_CODE": "U"}
        try:
            res = requests.get(url, headers=headers, params=params, timeout=5); res.raise_for_status(); data = res.json()
            if data.get('rt_cd') == '0':
                output = data['output']
                sign = -1 if output.get('prdy_vrss_sign') in ['4', '5'] else 1
                results.append({"name": index_info["name"], "value": float(output.get('bstp_nmix_prpr', 0)), "change": float(output.get('prdy_vrss', 0)), "changePercent": float(output.get('prdy_ctrt', 0)) * sign, "flag": index_info["flag"]})
            else: results.append({"name": index_info["name"], "value": 0, "change": 0, "changePercent": 0, "flag": index_info["flag"]})
        except Exception: results.append({"name": index_info["name"], "value": 0, "change": 0, "changePercent": 0, "flag": index_info["flag"]})
    return results

# --- AI Predict 엔드포인트 ---
@app.post("/ai/predict/{stock_code}", tags=["AI Service"])
async def ai_predict(stock_code: str, last_close: float):
    await asyncio.sleep(1)
    predicted_min = last_close * 0.99; predicted_max = last_close * 1.02
    return {"range": [predicted_min, predicted_max], "analysis": f"AI 분석 결과, {stock_code} 주가는 단기 변동성을 보일 수 있으나, 장기적으로 긍정적 흐름이 예상됩니다.", "reason": "최근 기관 투자자 순매수세가 강하게 유입되고 있으며, 관련 산업 섹터 성장 전망이 밝습니다.", "positiveFactors": ["기관 순매수세 유입", "산업 섹터 성장 전망"], "potentialRisks": ["글로벌 경제 불확실성", "단기 차익 실현 매물 출회 가능성"]}

# --- 웹소켓 엔드포인트 ---
@app.websocket("/ws/kospi200")
async def websocket_kospi200_endpoint(websocket: WebSocket):
    origin = websocket.headers.get('origin', '').rstrip('/');
    if origin not in origins: await websocket.close(code=1008); return
    await websocket.accept()
    if not are_keys_configured(): await websocket.send_json({"error": "KIS API keys not configured on server."}); await websocket.close(code=1011); return
    while True:
        try:
            approval_key = get_approval_key()
            async with websockets.connect(KIS_WS_URL, ping_interval=None) as ws:
                subscribe_msg = {"header": {"approval_key": approval_key, "custtype": "P", "tr_type": "1"}, "body": {"input": {"tr_id": "H0UPANC0", "tr_key": "2001"}}}
                await ws.send(json.dumps(subscribe_msg))
                print(f"📡 KIS 웹소켓 구독 시작 (KOSPI200 Index): {origin}")
                while True:
                    msg = await ws.recv()
                    if 'PINGPONG' not in msg: await websocket.send_text(msg)
        except WebSocketDisconnect: print(f"❌ 클라이언트 WebSocket 연결 종료: {origin}"); break
        except Exception as e: print(f"⚠️ KIS 웹소켓 오류 발생, 5초 후 재연결: {e}"); await asyncio.sleep(5)

# --- 백그라운드 데이터 수신을 위한 새 웹소켓 엔드포인트 ---
@app.websocket("/ws/stock-updates")
async def websocket_stock_updates_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    print(f"✅ 클라이언트가 실시간 업데이트에 연결되었습니다: {websocket.client.host}")
    try:
        while True: await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
        print(f"❌ 클라이언트가 실시간 업데이트에서 연결 해제되었습니다: {websocket.client.host}")

# --- 백그라운드 작업 ---
async def background_kis_websocket_client():
    stock_code = "069500" # KODEX 200
    while True:
        if not are_keys_configured(): await asyncio.sleep(60); continue
        try:
            approval_key = get_approval_key()
            async with websockets.connect(KIS_WS_URL, ping_interval=20) as ws:
                print(f"📡 [BG] KIS WebSocket 서버에 연결되었습니다. ({stock_code})")
                subscribe_msg = {"header": {"approval_key": approval_key, "custtype": "P", "tr_type": "1"}, "body": {"input": {"tr_id": "H0STCNT0", "tr_key": stock_code}}}
                await ws.send(json.dumps(subscribe_msg))
                print(f"📡 [BG] 구독 메시지 전송: {stock_code}")
                while True:
                    msg = await ws.recv()
                    await manager.broadcast(json.dumps({"type": "tick", "data": msg}))
        except Exception as e:
            print(f"⚠️ [BG] KIS WebSocket 오류, 30초 후 재시도: {e}")
            await asyncio.sleep(30)

async def background_fetch_price_periodically():
    stock_code = "069500" # KODEX 200
    print(f"📈 [5분 주기] {stock_code} 현재가 조회를 시작합니다.")
    while True:
        await asyncio.sleep(300)
        if are_keys_configured():
            price_data = get_current_price(stock_code)
            if price_data:
                simplified_data = {"stck_prpr": price_data.get("stck_prpr"), "prdy_vrss": price_data.get("prdy_vrss"), "prdy_ctrt": price_data.get("prdy_ctrt"), "stck_bsop_date": price_data.get("stck_bsop_date")}
                await manager.broadcast(json.dumps({"type": "snapshot_5min", "data": simplified_data}))
                save_snapshot_to_csv(simplified_data)
                print(f"📈 [5분 주기] 데이터 전송 및 저장: {simplified_data}")


# --- 서버 시작 이벤트 ---
@app.on_event("startup")
async def startup_event():
    print("■■■■■■■■■■■■■■■■■■■■\n■ FastAPI 서버가 시작되었습니다.\n■■■■■■■■■■■■■■■■■■■■")
    if are_keys_configured():
        print("✅ KIS API 키가 감지되었습니다. API 연동을 시도합니다.")
        try: get_access_token() # get_approval_key는 필요할 때만 호출
        except Exception as e: print(f"초기 KIS 인증 실패: {e}")
        asyncio.create_task(background_kis_websocket_client())
        asyncio.create_task(background_fetch_price_periodically())
    else: print("⚠️ 경고: KIS API 키가 .env 파일에 설정되지 않았습니다. 예시 데이터로 작동합니다.")