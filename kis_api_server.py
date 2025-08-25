import requests
import json
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware # CORS 미들웨어 임포트
from datetime import datetime, timedelta
import pandas as pd
import asyncio

# FastAPI 앱 생성
app = FastAPI()

# --- CORS 미들웨어 설정 추가 ---
# 모든 출처에서의 요청을 허용합니다. (개발 환경)
origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"], # 모든 HTTP 메소드 허용
    allow_headers=["*"], # 모든 HTTP 헤더 허용
)
# --------------------------

# 한국투자증권 API 정보 (실제 값으로 반드시 교체해야 합니다)
KIS_APP_KEY = "PSoH7SMsNqrCgKtMXt1UsrC6V32trtb32z6L"
KIS_APP_SECRET = "5ipDsTXcFk08/D2Xzgm9d/JcAdm6JqYbZu26xo1q8Er4NPngwZX7vwH5Rf8mp2cfPzKbefGWCpK8q7kZOVZsEWaOzaheTB3eKa12d9NZyeg8536NGoxXlP8dFizl0OgDeFyQ1+rU085FGWuieRw7KV4vxUMVRi+h+C0gEdwKlXdmVec+c8k="
KIS_BASE_URL = "https://openapi.koreainvestment.com:9443" # 실전투자 환경

# 전역 변수로 토큰과 만료 시간을 관리
access_token_data = {
    "token": None,
    "expires_at": None
}

# 비동기 작업을 위한 Lock 객체 생성
token_lock = asyncio.Lock()

async def get_access_token():
    """새로운 접근 토큰을 비동기적으로 안전하게 발급받거나 유효한 기존 토큰을 반환합니다."""
    async with token_lock:
        global access_token_data
        now = datetime.now()

        if access_token_data["token"] and access_token_data["expires_at"] > now + timedelta(minutes=10):
            return access_token_data["token"]

        path = "/oauth2/tokenP"
        url = f"{KIS_BASE_URL}{path}"
        headers = {"content-type": "application/json"}
        body = {
            "grant_type": "client_credentials",
            "appkey": KIS_APP_KEY,
            "appsecret": KIS_APP_SECRET
        }
        
        try:
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(None, lambda: requests.post(url, headers=headers, data=json.dumps(body)))
            response.raise_for_status()
            res_data = response.json()
            
            access_token_data["token"] = f"Bearer {res_data['access_token']}"
            expires_in = res_data.get("expires_in", 3600)
            access_token_data["expires_at"] = now + timedelta(seconds=expires_in)
            
            print("새로운 Access Token이 발급되었습니다.")
            return access_token_data["token"]

        except requests.RequestException as e:
            raise HTTPException(status_code=500, detail=f"API 요청 실패: {e}")

@app.get("/get-kospi200-index")
async def get_kospi200_index():
    """KODEX 200 ETF의 현재가를 조회하여 코스피 200 지수를 대체합니다."""
    try:
        token = await get_access_token()
    except HTTPException as e:
        return {"error": "Token 발급 실패", "details": e.detail}

    path = "/uapi/domestic-stock/v1/quotations/inquire-price"
    url = f"{KIS_BASE_URL}{path}"
    
    headers = {
        "Content-Type": "application/json",
        "authorization": token,
        "appkey": KIS_APP_KEY,
        "appsecret": KIS_APP_SECRET,
        "tr_id": "FHKST01010100"  # 일반 주식 현재가 조회 트랜잭션 ID
    }
    params = {
        "FID_COND_MRKT_DIV_CODE": "J", # 주식
        "FID_INPUT_ISCD": "069500", # KODEX 200 종목 코드
    }

    try:
        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(None, lambda: requests.get(url, headers=headers, params=params))
        response.raise_for_status()
        res_data = response.json()

        output = res_data.get("output", {})
        index_info = {
            "index_name": "KODEX 200 (KOSPI 200 추종)",
            "current_value": output.get("stck_prpr"), # 주식의 현재가
            "change_from_yesterday": output.get("prdy_vrss"), # 전일 대비
            "change_rate": output.get("prdy_ctrt"), # 전일 대비율
            "retrieved_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }
        return index_info

    except requests.RequestException as e:
        raise HTTPException(status_code=500, detail=f"지수 조회 API 요청 실패: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"처리 중 오류 발생: {e}")

@app.get("/")
def read_root():
    return {"message": "KIS API 서버. /get-kospi200-index 를 사용하여 KODEX 200 시세를 확인하세요."}

# --- 기존에 만들었던 다른 함수들은 그대로 유지됩니다 ---

@app.get("/get-price/{stock_code}")
async def get_stock_price(stock_code: str):
    """지정된 종목 코드의 현재가를 조회하는 API"""
    try:
        token = await get_access_token()
    except HTTPException as e:
        return {"error": "Token 발급 실패", "details": e.detail}

    path = "/uapi/domestic-stock/v1/quotations/inquire-price"
    url = f"{KIS_BASE_URL}{path}"
    
    headers = {
        "Content-Type": "application/json",
        "authorization": token,
        "appkey": KIS_APP_KEY,
        "appsecret": KIS_APP_SECRET,
        "tr_id": "FHKST01010100"
    }
    params = {
        "FID_COND_MRKT_DIV_CODE": "J",
        "FID_INPUT_ISCD": stock_code,
    }

    try:
        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(None, lambda: requests.get(url, headers=headers, params=params))
        response.raise_for_status()
        res_data = response.json()

        output = res_data.get("output", {})
        price_info = {
            "stock_code": stock_code,
            "current_price": output.get("stck_prpr"),
            "change_from_yesterday": output.get("prdy_vrss"),
            "volume": output.get("acml_vol"),
            "retrieved_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }
        return price_info

    except requests.RequestException as e:
        return {"stock_code": stock_code, "error": f"주가 조회 API 요청 실패: {e}", "current_price": None}
    except Exception as e:
        return {"stock_code": stock_code, "error": f"처리 중 오류 발생: {e}", "current_price": None}

@app.get("/get-kospi200-prices")
async def get_kospi200_prices():
    """kospi_200.csv에 있는 모든 종목의 현재가를 비동기적으로 조회합니다."""
    try:
        df = pd.read_csv('kospi_200.csv', dtype={'code': str})
        stock_codes = df['code'].tolist()
    except FileNotFoundError:
        raise HTTPException(status_code=500, detail="'kospi_200.csv' 파일을 찾을 수 없습니다.")
    
    tasks = [get_stock_price(code) for code in stock_codes]
    results = await asyncio.gather(*tasks)
    return results

@app.get("/search-ticker")
async def search_ticker(name: str):
    """회사 이름으로 종목코드를 검색합니다."""
    try:
        df = pd.read_csv('krx_tickers.csv', dtype={'code': str}, encoding='cp949')
        results = df[df['name'].str.contains(name, na=False)]
        
        if results.empty:
            return {"message": f"'{name}'에 해당하는 종목을 찾을 수 없습니다."}
        
        results['price_inquiry_url'] = results['code'].apply(lambda code: f"/get-price/{code}")
        return results.to_dict('records')

    except FileNotFoundError:
        raise HTTPException(status_code=500, detail="'krx_tickers.csv' 파일을 찾을 수 없습니다.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"종목 검색 중 오류 발생: {e}")