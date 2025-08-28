// src/services/apiService.ts
import axios from 'axios';

// .env 파일에서 Vite 환경 변수를 가져옵니다.
// VITE_API_BASE_URL: 실제 API의 기본 URL (예: http://localhost:8000)
// VITE_API_KEY: 발급받은 API 키 (필요한 경우)
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const API_KEY = import.meta.env.VITE_API_KEY;

// API 클라이언트 인스턴스 생성
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    // API_KEY가 존재할 경우에만 Authorization 헤더를 추가합니다.
    ...(API_KEY && { 'Authorization': `Bearer ${API_KEY}` }),
    'Content-Type': 'application/json',
  },
});

// --- 타입 정의 ---
export interface Stock {
  code: string;
  name: string;
}

export interface StockInfo {
  marketType: string;
  stockCode: string;
  stockName: string;
  open: number;
  high: number;
  low: number;
  currentPrice: number;
  week52high: number;
  week52low: number;
  volume: number;
  tradeValue: number;
  marketCap: number;
  foreignRatio: number;
  per: number;
  pbr: number;
  dividendYield: number;
}

export interface ChartData {
  categories: string[];
  candlestick: number[][];
  line: number[];
}

export interface StockData {
  info: StockInfo;
  chartData: ChartData;
}

export interface Prediction {
  range: [number, number];
  analysis: string;
  reason: string;
  positiveFactors: string[];
  potentialRisks: string[];
}

// --- API 호출 함수들 ---

/**
 * 실제 API의 종목 목록 엔드포인트를 호출합니다.
 * (API에 따라 엔드포인트는 /stocks, /market/all, /tickers 등 다양할 수 있습니다.)
 */
export const getAllStocks = async (): Promise<Stock[]> => {
  if (!API_BASE_URL) {
    console.error("API URL이 .env 파일에 설정되지 않았습니다.");
    // 설정이 없을 경우 기존의 하드코딩된 데이터를 보여줍니다.
    return [
      { code: "005930", name: "삼성전자" },
      { code: "000660", name: "SK하이닉스" },
    ];
  }

  try {
    // 예시: GET /market/stocks
    const response = await apiClient.get('/market/stocks');

    // API 응답 형식에 맞춰 데이터를 변환합니다.
    // 예: response.data가 [{ symbol: '005930', name: '삼성전자' }, ...] 형태일 경우
    const stocks = response.data.map((item: any) => ({
      code: item.symbol,
      name: item.name,
    }));

    return stocks;

  } catch (error) {
    console.error("Failed to fetch all stocks:", error);
    throw new Error("전체 종목 목록을 불러오는 데 실패했습니다.");
  }
};

/**
 * 실제 API의 특정 종목 상세 정보 및 차트 데이터 엔드포인트를 호출합니다.
 */
export const getStockData = async (stockCode: string): Promise<StockData> => {
  if (!API_BASE_URL) {
    throw new Error("API URL이 .env 파일에 설정되지 않았습니다.");
  }

  try {
    // 여러 API를 동시에 호출하여 정보를 조합합니다.
    // 1. 현재 시세 정보 가져오기 (예: /stocks/{stockCode}/price)
    const pricePromise = apiClient.get(`/stocks/${stockCode}/price`);
    // 2. 일봉 차트 데이터 가져오기 (예: /stocks/{stockCode}/candles?interval=day)
    const chartPromise = apiClient.get(`/stocks/${stockCode}/candles`, { params: { interval: 'day' } });

    const [priceResponse, chartResponse] = await Promise.all([pricePromise, chartPromise]);

    const priceData = priceResponse.data;
    const chartRawData = chartResponse.data;

    // API 응답을 프론트엔드의 StockData 형식으로 변환
    const stockData: StockData = {
      info: {
        marketType: priceData.market,
        stockCode: stockCode,
        stockName: priceData.name,
        open: parseFloat(priceData.open),
        high: parseFloat(priceData.high),
        low: parseFloat(priceData.low),
        currentPrice: parseFloat(priceData.current),
        week52high: parseFloat(priceData.week52high),
        week52low: parseFloat(priceData.week52low),
        volume: parseFloat(priceData.volume),
        tradeValue: parseFloat(priceData.tradeValue),
        marketCap: parseFloat(priceData.marketCap),
        foreignRatio: parseFloat(priceData.foreignRatio),
        per: parseFloat(priceData.per),
        pbr: parseFloat(priceData.pbr),
        dividendYield: parseFloat(priceData.dividendYield),
      },
      chartData: {
        categories: chartRawData.map((d: any) => d.date), // x축 (날짜)
        candlestick: chartRawData.map((d: any) => [d.open, d.close, d.low, d.high]),
        line: chartRawData.map((d: any) => d.close), // 종가 라인
      }
    };

    return stockData;

  } catch (error) {
    console.error(`Failed to fetch stock data for ${stockCode}:`, error);
    throw new Error(`'${stockCode}' 종목 데이터를 불러오는 데 실패했습니다.`);
  }
};

/** AI 예측은 시뮬레이션으로 유지 */
export const getAIPrediction = async (stockCode: string, lastClose: number): Promise<Prediction> => {
  await new Promise(resolve => setTimeout(resolve, 2000));
  const predictedMin = lastClose * 0.99;
  const predictedMax = lastClose * 1.02;
  return {
    range: [predictedMin, predictedMax],
    analysis: `(시뮬레이션) AI가 분석한 결과, ${stockCode}의 주가는 단기적으로 변동성을 보일 수 있으나, 장기적으로는 긍정적인 흐름이 예상됩니다.`,
    reason: `(시뮬레이션) 최근 기관 투자자의 순매수세가 강하게 유입되고 있으며, 관련된 산업 섹터의 성장 전망이 밝습니다.`,
    positiveFactors: ['기관 순매수세 유입', '산업 섹터 성장 전망'],
    potentialRisks: ['글로벌 경제 불확실성', '단기 차익 실현 매물 출회 가능성']
  };
};