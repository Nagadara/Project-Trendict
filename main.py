import os
import json
import requests
import asyncio
import websockets
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv # .env 파일 로드를 위한 추가

# .env 파일 로드
load_dotenv()

# =========================
# 환경변수
# =========================
# .env 파일에서 KIS API 키를 가져옵니다.
# 명명 규칙을 통일 (VITE_ 접두사 제거)
KIS_APP_KEY = os.getenv("KIS_APP_KEY")
KIS_APP_SECRET = os.getenv("KIS_APP_SECRET")
KIS_SECRET_KEY = os.getenv("KIS_SECRET_KEY")

KIS_BASE_URL = "https://openapi.koreainvestment.com:9443"
KIS_WS_URL = "ws://ops.koreainvestment.com:21000"

# 환경 변수 필수 체크
if not KIS_APP_KEY or not KIS_APP_SECRET or not KIS_SECRET_KEY:
    raise ValueError("KIS API 환경 변수 (KIS_APP_KEY, KIS_APP_SECRET, KIS_SECRET_KEY)를 설정해주세요.")

# =========================
# FastAPI 앱
# =========================
app = FastAPI()
origins = [
    "http://localhost",
    "http://localhost:5173", # 프론트엔드 개발 서버
    "http://220.69.216.48:5173", # 프론트엔드 배포 서버 예시
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =========================
# KIS API 인증 및 토큰 관리
# =========================
approval_key_data = {"key": None, "expires_at": None}
ACCESS_TOKEN_DATA = {"token": None, "expires_at": None}

def get_approval_key():
    global approval_key_data
    now = datetime.now()
    if approval_key_data["key"] and approval_key_data["expires_at"] and approval_key_data["expires_at"] > now:
        return approval_key_data["key"]

    url = f"{KIS_BASE_URL}/oauth2/Approval"
    body = {"appkey": KIS_APP_KEY, "secretkey": KIS_SECRET_KEY}
    try:
        res = requests.post(url, json=body, timeout=5)
        res.raise_for_status() # HTTP 오류 발생 시 예외 발생
        data = res.json()
        approval_key_data["key"] = data["approval_key"]
        # KIS 승인키 유효기간이 24시간이지만, 여유 있게 23시간 50분으로 설정
        approval_key_data["expires_at"] = now + timedelta(hours=23, minutes=50)
        print("✅ Approval Key 발급 완료")
        return approval_key_data["key"]
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"KIS 승인키 발급 실패: {e}")

def get_access_token():
    global ACCESS_TOKEN_DATA
    now = datetime.now()
    if ACCESS_TOKEN_DATA["token"] and ACCESS_TOKEN_DATA["expires_at"] and ACCESS_TOKEN_DATA["expires_at"] > now:
        return ACCESS_TOKEN_DATA["token"]

    url = f"{KIS_BASE_URL}/oauth2/tokenP"
    body = {"grant_type": "client_credentials", "appkey": KIS_APP_KEY, "appsecret": KIS_APP_SECRET}
    try:
        res = requests.post(url, json=body, timeout=5)
        res.raise_for_status() # HTTP 오류 발생 시 예외 발생
        data = res.json()
        ACCESS_TOKEN_DATA["token"] = data["access_token"]
        # KIS 토큰 유효기간은 보통 24시간, 여유 있게 1분 적게 설정
        ACCESS_TOKEN_DATA["expires_at"] = now + timedelta(seconds=int(data["expires_in"]) - 60)
        print("✅ Access Token 발급 완료")
        return ACCESS_TOKEN_DATA["token"]
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"KIS Access Token 발급 실패: {e}")

# =========================
# REST API 엔드포인트 (KIS API 래퍼)
# =========================

@app.get("/stocks/all", summary="모든 종목 목록 조회 (KIS API)", response_model=List[Dict[str, str]])
async def get_all_stocks_api():
    """
    KIS API를 통해 국내 주식 시장의 모든 종목 목록을 조회합니다.
    (실제 KIS API는 모든 종목을 직접 제공하지 않을 수 있으므로,
    여기서는 예시 데이터를 반환하거나, KIS에서 제공하는 종목 마스터 파일을
    파싱하는 로직이 필요할 수 있습니다.)
    """
    # KIS API는 모든 종목 목록을 직접 제공하는 엔드포인트가 명확하지 않습니다.
    # 일반적으로 종목 마스터 파일을 다운로드하여 파싱하거나,
    # 특정 시장(코스피/코스닥)의 종목을 페이지네이션하여 가져와야 합니다.
    # 여기서는 프론트엔드의 `apiService.ts`에 맞춰 임시 데이터를 반환합니다.
    # 실제 구현 시 KIS의 "주식 종목코드 다운로드" 기능을 활용해야 합니다.
    await asyncio.sleep(0.5) # API 호출 시뮬레이션 지연
    return [
        {"code": "005930", "name": "삼성전자"},
        {"code": "000660", "name": "SK하이닉스"},
        {"code": "035420", "name": "NAVER"},
        {"code": "005380", "name": "현대차"},
        {"code": "207940", "name": "삼성바이오로직스"},
    ]


@app.get("/stocks/{stock_code}/info", summary="특정 종목의 현재 시세 및 기본 정보 조회 (KIS API)")
async def get_stock_info(stock_code: str):
    token = get_access_token()
    url = f"{KIS_BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-price"
    headers = {
        "Authorization": f"Bearer {token}",
        "appkey": KIS_APP_KEY,
        "appsecret": KIS_APP_SECRET,
        "tr_id": "FHKST01010100" # 주식현재가 시세
    }
    params = {"fid_cond_mrkt_div_code": "J", "fid_input_iscd": stock_code} # 'J'는 주식, 'stock_code'는 종목코드
    try:
        res = requests.get(url, headers=headers, params=params, timeout=5)
        res.raise_for_status()
        data = res.json()
        if data.get('rt_cd') == '0': # 성공
            output = data['output']
            # KIS API 응답 필드명을 프론트엔드 StockInfo 타입에 맞게 매핑 및 파싱
            return {
                "marketType": "KOSPI", # KIS API에서 marketType을 직접 제공하지 않을 경우 추론 필요
                "stockCode": stock_code,
                "stockName": output.get('hts_kor_isnm', '알 수 없음'),
                "currentPrice": float(output.get('stck_prpr', 0)),
                "open": float(output.get('stck_oprc', 0)),
                "high": float(output.get('stck_hgpr', 0)),
                "low": float(output.get('stck_lwpr', 0)),
                "week52high": float(output.get('w52_hgpr', 0)),
                "week52low": float(output.get('w52_lwpr', 0)),
                "volume": float(output.get('acml_vol', 0)),
                "tradeValue": float(output.get('acml_tr_pbmn', 0)), # 누적거래대금
                "marketCap": float(output.get('mket_prtt_val', 0)), # 시가총액 (단위 확인 필요)
                "foreignRatio": float(output.get('frgn_hldn_qty_rate', 0)), # 외국인보유율
                "per": float(output.get('per', 0)),
                "pbr": float(output.get('pbr', 0)),
                "dividendYield": float(output.get('dvrg_rto', 0)), # 배당수익률
            }
        else:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"KIS API 오류: {data.get('msg1')}")
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"KIS 종목 정보 조회 실패: {e}")


@app.get("/stocks/{stock_code}/candles", summary="특정 종목의 일봉 차트 데이터 조회 (KIS API)")
async def get_stock_candles(stock_code: str, interval: str = "D", count: int = 120):
    """
    KIS API를 통해 특정 종목의 일봉(D), 주봉(W), 월봉(M) 차트 데이터를 조회합니다.
    `interval`은 'D', 'W', 'M' 중 하나여야 합니다.
    `count`는 조회할 봉의 개수입니다.
    """
    if interval not in ["D", "W", "M"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="interval은 'D', 'W', 'M' 중 하나여야 합니다.")

    token = get_access_token()
    url = f"{KIS_BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-daily-itemchart"
    headers = {
        "Authorization": f"Bearer {token}",
        "appkey": KIS_APP_KEY,
        "appsecret": KIS_APP_SECRET,
        "tr_id": "FHKST03010100" # 주식일자별
    }
    params = {
        "fid_cond_mrkt_div_code": "J",
        "fid_input_iscd": stock_code,
        "fid_input_date_1": (datetime.now() - timedelta(days=count*2)).strftime("%Y%m%d"), # 충분히 과거 날짜
        "fid_input_date_2": datetime.now().strftime("%Y%m%d"),
        "fid_period_div_code": interval, # D: 일봉, W: 주봉, M: 월봉
        "fid_org_adj_prc": "1" # 수정주가 반영 (0: 미반영, 1: 반영)
    }

    try:
        res = requests.get(url, headers=headers, params=params, timeout=5)
        res.raise_for_status()
        data = res.json()
        if data.get('rt_cd') == '0':
            chart_data = []
            for item in reversed(data['output2']): # 최신 데이터가 마지막에 오도록 역순 정렬
                chart_data.append({
                    "date": datetime.strptime(item['stck_bsop_date'], "%Y%m%d").strftime("%Y-%m-%d"),
                    "open": float(item['stck_oprc']),
                    "high": float(item['stck_hgpr']),
                    "low": float(item['stck_lwpr']),
                    "close": float(item['stck_clpr']),
                    "volume": float(item['acml_vol']),
                })
            return chart_data[-count:] # 요청한 개수만큼만 반환
        else:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"KIS API 오류: {data.get('msg1')}")
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"KIS 차트 데이터 조회 실패: {e}")


@app.get("/market/indices", summary="주요 시장 지수 현황 조회 (KIS API)")
async def get_market_indices():
    """
    주요 시장 지수 (코스피, 코스닥 등)의 현재 현황을 조회합니다.
    (KIS API에서 여러 지수를 한 번에 가져오는 엔드포인트가 없을 경우,
    각 지수별로 호출하여 조합해야 합니다.)
    """
    token = get_access_token()
    headers = {
        "Authorization": f"Bearer {token}",
        "appkey": KIS_APP_KEY,
        "appsecret": KIS_APP_SECRET,
        "tr_id": "FHKUP03500000" # 업종 현재가
    }

    indices_to_fetch = [
        {"name": "KOSPI", "code": "0001", "flag": "🇰🇷"},
        {"name": "KOSDAQ", "code": "1001", "flag": "🇰🇷"},
        # 추가 지수 필요 시 여기에 정의
        # 예: {"name": "NASDAQ", "code": "...", "flag": "🇺🇸"},
    ]
    results = []

    for index_info in indices_to_fetch:
        params = {"fid_input_iscd": index_info["code"]}
        try:
            res = requests.get(f"{KIS_BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-price", headers=headers, params=params, timeout=5)
            res.raise_for_status()
            data = res.json()
            if data.get('rt_cd') == '0':
                output = data['output']
                results.append({
                    "name": index_info["name"],
                    "value": float(output.get('idx_prpr', 0)), # 지수 현재가
                    "change": float(output.get('prdy_vrss', 0)), # 전일 대비
                    "changePercent": float(output.get('prdy_vrss_sign', '1')) * float(output.get('prdy_vrss_rate', 0)), # 전일 대비 부호 * 전일 대비율
                    "flag": index_info["flag"],
                })
            else:
                print(f"KIS API 오류 (지수 {index_info['name']}): {data.get('msg1')}")
                results.append({
                    "name": index_info["name"], "value": 0, "change": 0, "changePercent": 0, "flag": index_info["flag"]
                }) # 오류 시 기본값
        except requests.exceptions.RequestException as e:
            print(f"KIS 지수 조회 실패 ({index_info['name']}): {e}")
            results.append({
                "name": index_info["name"], "value": 0, "change": 0, "changePercent": 0, "flag": index_info["flag"]
            }) # 오류 시 기본값

    return results

@app.post("/ai/predict/{stock_code}", summary="AI 주가 예측 (시뮬레이션)")
async def ai_predict(stock_code: str, last_close: float):
    """
    AI 주가 예측 결과를 반환합니다. 현재는 시뮬레이션 데이터입니다.
    """
    await asyncio.sleep(2) # AI 분석 시뮬레이션 지연

    predicted_min = last_close * 0.99
    predicted_max = last_close * 1.02
    return {
        "range": [predicted_min, predicted_max],
        "analysis": f"AI가 분석한 결과, {stock_code}의 주가는 단기적으로 변동성을 보일 수 있으나, 장기적으로는 긍정적인 흐름이 예상됩니다.",
        "reason": "최근 기관 투자자의 순매수세가 강하게 유입되고 있으며, 관련된 산업 섹터의 성장 전망이 밝습니다.",
        "positiveFactors": ["기관 순매수세 유입", "산업 섹터 성장 전망", "기술 혁신 기대"],
        "potentialRisks": ["글로벌 경제 불확실성 증가", "단기 차익 실현 매물 출회 가능성", "경쟁 심화"]
    }


# =========================
# WebSocket 연결
# =========================
# KIS 웹소켓 서버에서 수신한 메시지를 클라이언트에게 전달하는 역할
async def relay_kis_websocket(websocket: WebSocket, tr_id: str, tr_key: str):
    await websocket.accept()
    print(f"클라이언트 웹소켓 연결 수락: {tr_id} / {tr_key}")
    while True:
        try:
            approval_key = get_approval_key()
            headers = {
                "approval_key": approval_key,
                "appkey": KIS_APP_KEY,
                "secretkey": KIS_SECRET_KEY,
                "custtype": "P"
            }
            # KIS 웹소켓 서버에 연결
            async with websockets.connect(KIS_WS_URL, extra_headers=headers, ping_interval=20) as ws:
                subscribe_msg = {
                    "header": {
                        "approval_key": approval_key,
                        "custtype": "P",
                        "id": tr_id, # KIS TR ID
                        "pwd": "",
                        "gt_uid": ""
                    },
                    "body": {
                        "input": {
                            "tr_id": tr_id,
                            "tr_key": tr_key
                        }
                    }
                }
                await ws.send(json.dumps(subscribe_msg))
                print(f"📡 KIS 웹소켓 구독 시작: {tr_id} / {tr_key}")

                while True:
                    # KIS 웹소켓으로부터 메시지 수신
                    msg = await ws.recv()
                    # 클라이언트 웹소켓으로 메시지 전달
                    await websocket.send_text(msg)
        except websockets.exceptions.ConnectionClosedOK:
            print(f"KIS 웹소켓 연결 정상 종료: {tr_id} / {tr_key}")
            break # 정상 종료 시 루프 탈출
        except websockets.exceptions.ConnectionClosedError as e:
            print(f"⚠️ KIS 웹소켓 연결 오류 발생 ({tr_id} / {tr_key}): {e}, 5초 후 재연결 시도...")
            await asyncio.sleep(5)
        except WebSocketDisconnect:
            print(f"❌ 클라이언트 웹소켓 연결 종료: {tr_id} / {tr_key}")
            break # 클라이언트 연결 종료 시 루프 탈출
        except Exception as e:
            print(f"⚠️ 일반 오류 발생 ({tr_id} / {tr_key}): {e}, 5초 후 재연결 시도...")
            await asyncio.sleep(5)


@app.websocket("/ws/kospi200")
async def websocket_kospi200_endpoint(websocket: WebSocket):
    await relay_kis_websocket(websocket, tr_id="H0UPANC0", tr_key="2001") # 코스피200 실시간 지수 TR_ID: H0UPANC0, TR_KEY: 2001

# =========================
# 서버 시작 시 실행
# =========================
@app.on_event("startup")
async def startup_event():
    print("FastAPI 서버가 시작되었습니다.")
    # 서버 시작 시 Approval Key와 Access Token을 미리 발급 시도
    try:
        get_approval_key()
        get_access_token()
    except HTTPException as e:
        print(f"초기 KIS 인증 실패: {e.detail}")
    print("KIS API 연동 준비 완료.")