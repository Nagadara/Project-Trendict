import requests
import json
from fastapi import FastAPI, HTTPException
from datetime import datetime, timedelta

# FastAPI 앱 생성
app = FastAPI()

# 한국투자증권 API 정보 (실제 값으로 반드시 교체해야 합니다)
KIS_APP_KEY = "PSoH7SMsNqrCgKtMXt1UsrC6V32trtb32z6L"
KIS_APP_SECRET = "5ipDsTXcFk08/D2Xzgm9d/JcAdm6JqYbZu26xo1q8Er4NPngwZX7vwH5Rf8mp2cfPzKbefGWCpK8q7kZOVZsEWaOzaheTB3eKa12d9NZyeg8536NGoxXlP8dFizl0OgDeFyQ1+rU085FGWuieRw7KV4vxUMVRi+h+C0gEdwKlXdmVec+c8k="
KIS_BASE_URL = "https://openapi.koreainvestment.com:9443" # 실전투자 환경

# 전역 변수로 토큰과 만료 시간을 관리
access_token_data = {
    "token": None,
    "expires_at": None
}

def get_access_token():
    """새로운 접근 토큰을 발급받거나 유효한 기존 토큰을 반환합니다."""
    global access_token_data
    now = datetime.now()

    # 토큰이 없거나 만료 시간이 다가오면 새로 발급
    if not access_token_data["token"] or access_token_data["expires_at"] <= now + timedelta(minutes=10):
        path = "/oauth2/tokenP"
        url = f"{KIS_BASE_URL}{path}"
        headers = {"content-type": "application/json"}
        body = {
            "grant_type": "client_credentials",
            "appkey": KIS_APP_KEY,
            "appsecret": KIS_APP_SECRET
        }
        
        try:
            response = requests.post(url, headers=headers, data=json.dumps(body))
            response.raise_for_status()
            res_data = response.json()
            
            # 토큰 정보 업데이트
            access_token_data["token"] = f"Bearer {res_data['access_token']}"
            # KIS API는 만료 시간을 초 단위로 제공
            expires_in = res_data.get("expires_in", 3600) # 기본값 1시간
            access_token_data["expires_at"] = now + timedelta(seconds=expires_in)
            
            print("새로운 Access Token이 발급되었습니다.")

        except requests.RequestException as e:
            raise HTTPException(status_code=500, detail=f"API 요청 실패: {e}")

    return access_token_data["token"]

@app.get("/get-price/{stock_code}")
async def get_stock_price(stock_code: str):
    """지정된 종목 코드의 현재가를 조회하는 API"""
    try:
        token = get_access_token()
    except HTTPException as e:
        return {"error": "Token 발급 실패", "details": e.detail}

    path = "/uapi/domestic-stock/v1/quotations/inquire-price"
    url = f"{KIS_BASE_URL}{path}"
    
    headers = {
        "Content-Type": "application/json",
        "authorization": token,
        "appkey": KIS_APP_KEY,
        "appsecret": KIS_APP_SECRET,
        "tr_id": "FHKST01010100"  # 주식 현재가 조회 트랜잭션 ID
    }
    params = {
        "FID_COND_MRKT_DIV_CODE": "J", # 주식
        "FID_INPUT_ISCD": stock_code, # 종목 코드 (예: 005930 for 삼성전자)
    }

    try:
        response = requests.get(url, headers=headers, params=params)
        response.raise_for_status()
        res_data = response.json()

        # 필요한 정보만 추출하여 반환
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
        raise HTTPException(status_code=500, detail=f"주가 조회 API 요청 실패: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"처리 중 오류 발생: {e}")

import pandas as pd

@app.get("/search-ticker")
async def search_ticker(name: str):
    """회사 이름으로 종목코드를 검색합니다."""
    try:
        # CSV 파일에서 종목코드 목록을 읽어옵니다.
        # 종목코드는 문자열(str)로 취급하여 앞의 0이 사라지지 않게 합니다.
        df = pd.read_csv('krx_tickers.csv', dtype={'code': str}, encoding='cp949')
        
        # 'name' 컬럼에서 입력된 이름(name)을 포함하는 모든 행을 찾습니다.
        results = df[df['name'].str.contains(name, na=False)]
        
        if results.empty:
            return {"message": f"'{name}'에 해당하는 종목을 찾을 수 없습니다."}
        
        # 찾은 결과에 각 종목의 시세 조회 URL을 추가합니다.
        results['price_inquiry_url'] = results['code'].apply(lambda code: f"/get-price/{code}")

        # 찾은 결과를 JSON 형식으로 변환하여 반환합니다.
        return results.to_dict('records')

    except FileNotFoundError:
        raise HTTPException(status_code=500, detail="'krx_tickers.csv' 파일을 찾을 수 없습니다.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"종목 검색 중 오류 발생: {e}")

@app.get("/")
def read_root():
    return {"message": "KIS API 서버가 실행 중입니다. /get-price/{종목코드} 또는 /search-ticker?name={회사이름} 으로 요청하세요."}
