# Trendict Backend

한국투자증권(KIS) 코스피200 실시간 데이터 WebSocket 서버

---

## 1. 필수 파일
- `main.py` : FastAPI 서버 코드
- `requirements.txt` : Python 패키지 목록
- `.env.example` : 환경변수 예시 (API 키 없이)
- `.env` : **개인용 환경변수 파일**

---

## 2. Python 패키지 설치

```bash
pip install -r requirements.txt

## 3. 환경변수 설정

.env 파일을 프로젝트 루트에 생성하고 .env.example 참고:

KIS_APP_KEY=app_key
KIS_APP_SECRET=app_secret
KIS_SECRET_KEY=secret_key
(위의 app_key, app_secret, secret_key는 카톡에 올라겠습니다. 외부로 유출되지 않게 유의해주세요. 제미나이를 돌리더라도 이 키 값은 유출되면 안됩니다.)

## 4. 서버 실행
 uvicorn main:app --reload --port 8000

서버 실행 후 : http://127.0.0.1:8000에서 FastAPI 서버 확인 가능

## 5. WebSocket 연결 (프론트엔드/클라이언트용)

WebSocket URL: ws://ops.koreainvestment.com:21000

## 6. 주의사항

.env 파일과 API 키는 절대 공개하지 않습니다.

WebSocket 데이터는 실시간이므로 테스트 환경에서 확인하세요.

서버 실행 전에 Python 패키지가 모두 설치되어야 합니다.
