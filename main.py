import os
import json
import requests
import asyncio
import websockets
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

# ■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■
# ■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■
# 초기화
# ■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■
# ■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■

# --- 초기 설정 ---
load_dotenv()
models.Base.metadata.create_all(bind=engine)

# --- FastAPI 앱 생성 및 미들웨어 ---
app = FastAPI()
origins = ["http://localhost", "http://localhost:5173", "http://220.69.216.48:5173", "http://220.69.216.48:5174"]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

# --- KIS API 설정 및 헬퍼 ---
KIS_APP_KEY = os.getenv("KIS_APP_KEY")
KIS_APP_SECRET = os.getenv("KIS_APP_SECRET")
KIS_SECRET_KEY = os.getenv("KIS_SECRET_KEY")
KIS_BASE_URL = "https://openapi.koreainvestment.com:9443"
KIS_WS_URL = "ws://ops.koreainvestment.com:21000"
approval_key_data = {"key": None, "expires_at": None}
ACCESS_TOKEN_DATA = {"token": None, "expires_at": None}

# 파일 캐시를 위한 파일명 정의
APPROVAL_KEY_FILE = "kis_approval_key.json"
ACCESS_TOKEN_FILE = "kis_access_token.json"

# ■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■
# ■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■
# 회원 관련
# ■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■
# ■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■

def are_keys_configured(): return all([KIS_APP_KEY, KIS_APP_SECRET, KIS_SECRET_KEY])

def get_approval_key():
    today = datetime.now().strftime("%Y-%m-%d") # 오늘 날짜 (문자열)
    # 1. 파일에서 승인키 읽기 시도
    try:
        with open(APPROVAL_KEY_FILE, 'r') as f:
            key_data = json.load(f)
            # 파일에 저장된 발급 날짜가 오늘과 같으면 파일에서 읽은 키를 반환
            if key_data.get('issued_date') == today:
                return key_data['key']
    except (FileNotFoundError, json.JSONDecodeError, KeyError):
        # 파일이 없거나, 형식이 잘못되었거나, 필요한 키가 없으면 새로 발급
        pass

    # 2. 유효한 키가 없으면 새로 발급
    print("... Approval Key 신규 발급 시도 ...")
    url = f"{KIS_BASE_URL}/oauth2/Approval"
    body = {"grant_type": "P", "appkey": KIS_APP_KEY, "secretkey": KIS_SECRET_KEY}
    res = requests.post(url, json=body, timeout=5)
    res.raise_for_status()
    data = res.json()
    
    new_key = data["approval_key"]
    
    # 3. 새로 발급받은 키와 오늘 날짜를 파일에 저장
    with open(APPROVAL_KEY_FILE, 'w') as f:
        json.dump({
            'key': new_key,
            'issued_date': today
        }, f)
        
    print("✅ Approval Key 신규 발급 및 파일 저장 완료")
    return new_key

def get_access_token():
    today = datetime.now().strftime("%Y-%m-%d") # 오늘 날짜 (문자열)

    # 1. 파일에서 토큰 읽기 시도
    try:
        with open(ACCESS_TOKEN_FILE, 'r') as f:
            token_data = json.load(f)
            if token_data.get('issued_date') == today:
                return token_data['token']
    except (FileNotFoundError, json.JSONDecodeError, KeyError):
        pass

    # 2. 유효한 토큰이 없으면 새로 발급
    print("... Access Token 신규 발급 시도 ...")
    url = f"{KIS_BASE_URL}/oauth2/tokenP"
    body = {"grant_type": "client_credentials", "appkey": KIS_APP_KEY, "appsecret": KIS_APP_SECRET}
    res = requests.post(url, json=body, timeout=5)
    res.raise_for_status()
    data = res.json()
    
    new_token = data["access_token"]

    # 3. 새로 발급받은 토큰과 오늘 날짜를 파일에 저장
    with open(ACCESS_TOKEN_FILE, 'w') as f:
        json.dump({
            'token': new_token,
            'issued_date': today
        }, f)

    print("✅ Access Token 신규 발급 및 파일 저장 완료")
    return new_token

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

# ■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■
# ■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■
# 키, 웹소켓 관련
# ■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■
# ■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■

# --- 주식 데이터 API 엔드포인트 ---
# (이전 버전의 KIS 키 없어도 실행되는 로직 포함)
@app.get("/stocks/all", tags=["Stock Data"])
async def get_all_stocks_api():
    # KIS API 키가 없을 경우 예시 데이터 반환
    if not are_keys_configured(): 
        return [{"code": "005930", "name": "(예시) 삼성전자"}, {"code": "000660", "name": "(예시) SK하이닉스"}]

    token = get_access_token()
    # [API 변경] '업종별 종목 시세' API를 사용하여 시장 전체 종목을 가져옵니다. 더 안정적입니다.
    url = f"{KIS_BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-sector-stock-price"
    headers = {
        "Authorization": f"Bearer {token}",
        "appkey": KIS_APP_KEY,
        "appsecret": KIS_APP_SECRET,
        "tr_id": "FHKST03010200"  # 업종별 종목 시세 TR_ID
    }

    all_stocks = []
    stock_codes_seen = set()
    # 0001: 코스피, 1001: 코스닥
    markets = ["0001", "1001"]

    for market_code in markets:
        # '001'은 해당 시장의 '전체' 업종을 의미합니다.
        params = { "FID_INPUT_ISCD": market_code, "FID_SEC_APL_CLS_CODE": "001" }
        try:
            res = requests.get(url, headers=headers, params=params, timeout=10)
            res.raise_for_status()
            data = res.json()

            if data.get('rt_cd') == '0' and 'output1' in data and data['output1']:
                for item in data['output1']:
                    # 이 API의 응답 필드명은 'stck_shrn_iscd'와 'hts_kor_isnm' 입니다.
                    stock_code = item.get('stck_shrn_iscd')
                    stock_name = item.get('hts_kor_isnm')
                    if stock_code and stock_name and stock_code not in stock_codes_seen:
                        all_stocks.append({"code": stock_code, "name": stock_name})
                        stock_codes_seen.add(stock_code)
        except Exception as e:
            print(f"!!! /stocks/all 오류 ({market_code}): {e}")
            continue
            
    # [안정성 강화] KIS API 호출에 실패하여 목록이 비어있더라도 500 에러를 발생시키지 않고,
    # 빈 리스트를 정상적으로 반환하여 프론트엔드가 깨지는 것을 방지합니다.
    if not all_stocks:
        print("⚠️ 경고: KIS API를 통해 종목 목록을 가져오지 못했습니다. 빈 목록을 반환합니다.")
        return []

    return sorted(all_stocks, key=lambda x: x['name'])

@app.get("/stocks/{stock_code}/info")
async def get_stock_info(stock_code: str):
    if not are_keys_configured():
        return {
            "marketType": "N/A", "stockCode": stock_code, "stockName": "KIS API 키 필요",
            "currentPrice": 0, "open": 0, "high": 0, "low": 0, "week52high": 0, "week52low": 0,
            "volume": 0, "tradeValue": 0, "marketCap": 0, "foreignRatio": 0, "per": 0, "pbr": 0, "dividendYield": 0
        }
    # ... (이전과 동일한 실제 API 호출 로직)
    token = get_access_token()
    url = f"{KIS_BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-price"
    headers = {"Authorization": f"Bearer {token}", "appkey": KIS_APP_KEY, "appsecret": KIS_APP_SECRET, "tr_id": "FHKST01010100"}
    params = {"fid_cond_mrkt_div_code": "J", "fid_input_iscd": stock_code}
    res = requests.get(url, headers=headers, params=params, timeout=5)
    res.raise_for_status()
    data = res.json()
    if data.get('rt_cd') == '0':
        output = data['output']
        return {
            "marketType": output.get('rprs_mrkt_kor_name', 'N/A'), "stockCode": stock_code,
            "stockName": output.get('bstp_kor_isnm', '알 수 없음'), "currentPrice": float(output.get('stck_prpr', 0)),
            "open": float(output.get('stck_oprc', 0)), "high": float(output.get('stck_hgpr', 0)),
            "low": float(output.get('stck_lwpr', 0)), "week52high": float(output.get('w52_hgpr', 0)),
            "week52low": float(output.get('w52_lwpr', 0)), "volume": float(output.get('acml_vol', 0)),
            "tradeValue": float(output.get('acml_tr_pbmn', 0)), "marketCap": float(output.get('mket_prtt_val', 0)),
            "foreignRatio": float(output.get('frgn_hldn_qty_rate', 0)), "per": float(output.get('per', 0)),
            "pbr": float(output.get('pbr', 0)), "dividendYield": float(output.get('dvrg_rto', 0)),
        }
    raise HTTPException(status_code=404, detail=f"KIS API 오류: {data.get('msg1')}")

@app.get("/stocks/{stock_code}/candles")
async def get_stock_candles(stock_code: str, interval: str = "D"):
    if not are_keys_configured():
        return [] # 키가 없으면 빈 차트 데이터를 반환
    # ... (이전과 동일한 실제 API 호출 로직)
    token = get_access_token()
    url = f"{KIS_BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-daily-itemchartprice"
    headers = {"Authorization": f"Bearer {token}", "appkey": KIS_APP_KEY, "appsecret": KIS_APP_SECRET, "tr_id": "FHKST03010100"}
    params = {"FID_COND_MRKT_DIV_CODE": "J", "FID_INPUT_ISCD": stock_code, "FID_INPUT_DATE_1": (datetime.now() - timedelta(days=365)).strftime("%Y%m%d"), "FID_INPUT_DATE_2": datetime.now().strftime("%Y%m%d"), "FID_PERIOD_DIV_CODE": interval, "FID_ORG_ADJ_PRC": "1"}
    try:
        res = requests.get(url, headers=headers, params=params, timeout=5)
        res.raise_for_status()
        data = res.json()
        if data.get('rt_cd') != '0': return []
        output = data.get('output1')
        if not output: return []
        if isinstance(output, dict): output = [output]
        chart_data = []
        for item in reversed(output):
            if not isinstance(item, dict): continue
            chart_data.append({"date": datetime.strptime(item['stck_bsop_date'], "%Y%m%d").strftime("%Y-%m-%d"), "open": float(item.get('stck_oprc') or 0), "high": float(item.get('stck_hgpr') or 0), "low": float(item.get('stck_lwpr') or 0), "close": float(item.get('stck_clpr') or 0), "volume": float(item.get('acml_vol') or 0)})
        return chart_data
    except Exception:
        return []

@app.get("/market/indices")
async def get_market_indices():
    if not are_keys_configured():
        return [] # 키가 없으면 빈 지수 데이터를 반환
    # ... (이전과 동일한 실제 API 호출 로직)
    token = get_access_token()
    url = f"{KIS_BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-index-price"
    headers = {"Authorization": f"Bearer {token}", "appkey": KIS_APP_KEY, "appsecret": KIS_APP_SECRET, "tr_id": "FHPUP02110000"}
    results = []
    for index_info in [{"name": "KOSPI", "code": "0001", "flag": "🇰🇷"}, {"name": "KOSDAQ", "code": "1001", "flag": "🇰🇷"}]:
        params = {"FID_INPUT_ISCD": index_info["code"], "FID_COND_MRKT_DIV_CODE": "U"}
        try:
            res = requests.get(url, headers=headers, params=params, timeout=5)
            res.raise_for_status()
            data = res.json()
            if data.get('rt_cd') == '0':
                output = data['output']
                sign = -1 if output.get('prdy_vrss_sign') in ['4', '5'] else 1
                results.append({"name": index_info["name"], "value": float(output.get('bstp_nmix_prpr', 0)), "change": float(output.get('prdy_vrss', 0)), "changePercent": float(output.get('prdy_ctrt', 0)) * sign, "flag": index_info["flag"]})
            else:
                results.append({"name": index_info["name"], "value": 0, "change": 0, "changePercent": 0, "flag": index_info["flag"]})
        except Exception:
            results.append({"name": index_info["name"], "value": 0, "change": 0, "changePercent": 0, "flag": index_info["flag"]})
    return results

@app.websocket("/ws/kospi200")
async def websocket_kospi200_endpoint(websocket: WebSocket):
    origin = websocket.headers.get('origin', '').rstrip('/')
    if origin not in origins:
        await websocket.close(code=1008)
        return
    await websocket.accept()
    if not are_keys_configured():
        await websocket.send_json({"error": "KIS API keys not configured on server."})
        await websocket.close(code=1011)
        return
    # ... (이전과 동일한 실제 웹소켓 릴레이 로직)
    try:
        approval_key = get_approval_key()
        async with websockets.connect(KIS_WS_URL, ping_interval=None) as ws:
            subscribe_msg = {"header": {"approval_key": approval_key, "custtype": "P", "tr_type": "1", "content-type": "utf-8"}, "body": {"input": {"tr_id": "H0UPANC0", "tr_key": "2001"}}}
            await ws.send(json.dumps(subscribe_msg))
            while True:
                msg = await ws.recv()
                await websocket.send_text(msg)
    except Exception as e:
        print(f"⚠️ KIS 웹소켓 오류 발생: {e}")

@app.on_event("startup")
async def startup_event():
    print("FastAPI 서버가 시작되었습니다.")
    if are_keys_configured():
        print("✅ KIS API 키가 감지되었습니다. API 연동을 시도합니다.")
        try:
            get_approval_key()
            get_access_token()
        except Exception as e:
            print(f"초기 KIS 인증 실패: {e}")
    else:
        # 키가 없으면 서버를 멈추지 않고 경고만 출력
        print("⚠️ 경고: KIS API 키가 .env 파일에 설정되지 않았습니다. 예시 데이터로 작동합니다.")