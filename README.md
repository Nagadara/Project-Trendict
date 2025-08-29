# Project-Trendict

/project-Trendict/
│
├── 📂 backend/                  <-- FastAPI 백엔드 서버 관련 파일
│   ├── .env                     # (중요) API 키, DB 정보 등 민감한 환경 변수
│   ├── main.py                  # FastAPI 앱의 메인 실행 파일, 라우터 포함
│   ├── database.py              # 데이터베이스 연결 및 세션 관리
│   ├── models.py                # SQLAlchemy 모델 (DB 테이블 구조 정의)
│   ├── schemas.py               # Pydantic 스키마 (API 데이터 형식 정의)
│   ├── security.py              # 비밀번호 해싱, JWT 토큰 관리 등 보안 관련 로직
│   └── requirements.txt         # 백엔드에 필요한 Python 라이브러리 목록
│
└── 📂 frontend/                 <-- React 프론트엔드 앱 관련 파일

    ├── package.json             # 프로젝트 정보 및 의존성 라이브러리 목록
    
    ├── vite.config.ts           # Vite 빌드 설정 파일
    
    ├── tsconfig.json            # TypeScript 컴파일러 설정
    
    ├── .env.local               # (중요) 프론트엔드용 환경 변수 (예: VITE_API_BASE_URL)
    
    ├── index.html               # 앱의 진입점이 되는 HTML 파일
    
    ├── 📂 public/               # 정적 파일 (이미지, 폰트 등)
    
    └── 📂 src/                  # 실제 React 소스 코드
    
        ├── main.tsx             # React 앱을 DOM에 렌더링하는 진입점
        
        ├── App.tsx              # 앱의 최상위 컴포넌트, 라우팅 설정
        
        ├── index.css            # 전역 CSS 스타일
        
        │
        
        ├── 📂 pages/            # 페이지 단위의 컴포넌트
        
        │   ├── HomePage.tsx     # 스플래시/로딩 화면
        
        │   ├── DashboardPage.tsx# 메인 대시보드 페이지
        
        │   └── ProfilePage.tsx  # 사용자 프로필 페이지
        
        │
        
        ├── 📂 components/       # 재사용 가능한 UI 컴포넌트
        
        │   ├── Header.tsx       # 상단 내비게이션 바
        
        │   ├── StockChart.tsx   # 주식 차트 (StockInfoDisplay 포함 가능)
        
        │   ├── StockInfoDisplay.tsx # (StockChart에 포함되지 않았다면 별도 파일)
        
        │   ├── AiResult.tsx     # AI 분석 결과 표시
        
        │   ├── Kospi200Realtime.tsx # 실시간 코스피200 지수
        
        │   └── MarketIndices.tsx  # 주요 시장 지수
        
        │
        
        └── 📂 services/         # API 통신 등 비즈니스 로직
        
            ├── apiService.ts    # Axios 기반, 종목 데이터 및 AI 예측 API
            
            └── stockService.ts  # Fetch 기반, 차트 및 지수 데이터 API (현재 미사용)
