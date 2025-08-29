// src/services/apiService.ts
import axios from 'axios';

// 백엔드 FastAPI 서버 주소
const API_BASE_URL = 'http://localhost:8000';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// --- 타입 정의 (기존과 동일) ---
export interface Stock {
  code: string;
  name: string;
}

export interface StockInfo {
  marketType: string; stockCode: string; stockName: string;
  open: number; high: number; low: number; currentPrice: number;
  week52high: number; week52low: number; volume: number;
  tradeValue: number; marketCap: number; foreignRatio: number;
  per: number; pbr: number; dividendYield: number;
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
  range: [number, number]; analysis: string; reason: string;
  positiveFactors: string[]; potentialRisks: string[];
}

export interface Index {
  name: string; value: number; change: number;
  changePercent: number; flag: string;
}

/*
■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■
■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■
홈페이지 인증 함수
■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■
■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■
*/

export const loginUser = async (formData) => {
  // 백엔드의 /token 엔드포인트에 POST 요청
};
export const registerUser = async (userData) => {
  // 백엔드의 /users/register 엔드포인트에 POST 요청
};

/*
■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■
■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■
API 호출 함수들 (개선된 백엔드에 맞게 수정)
■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■
■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■
*/

/**
 * 백엔드의 /stocks/all 엔드포인트를 호출합니다.
 */
export const getAllStocks = async (): Promise<Stock[]> => {
  try {
    const response = await apiClient.get<Stock[]>('/stocks/all');
    return response.data;
  } catch (error) {
    console.error("Failed to fetch all stocks:", error);
    throw new Error("전체 종목 목록을 불러오는 데 실패했습니다.");
  }
};

/**
 * 백엔드의 /stocks/{stockCode}/info 와 /stocks/{stockCode}/candles 를 호출하여
 * 하나의 StockData 객체로 조합합니다.
 */
export const getStockData = async (stockCode: string): Promise<StockData> => {
  try {
    // 1. 종목 정보 API와 2. 차트 데이터 API를 동시에 호출
    const infoPromise = apiClient.get<StockInfo>(`/stocks/${stockCode}/info`);
    
    // chartPromise 호출 시 params에서 'count'를 제거합니다.
    // 백엔드가 알아서 적절한 기간의 데이터를 보내주므로 프론트에서는 신경 쓸 필요가 없습니다.
    const chartPromise = apiClient.get<any[]>(`/stocks/${stockCode}/candles`, { 
      params: { interval: 'D' } 
    });

    const [infoResponse, chartResponse] = await Promise.all([infoPromise, chartPromise]);

    const stockInfo = infoResponse.data;
    const chartRawData = chartResponse.data;

    // 차트 데이터를 프론트엔드 형식으로 변환
    const chartData: ChartData = {
      categories: chartRawData.map((d: any) => d.date),
      candlestick: chartRawData.map((d: any) => [d.open, d.close, d.low, d.high]),
      line: chartRawData.map((d: any) => d.close),
    };

    return { info: stockInfo, chartData: chartData };

  } catch (error) {
    console.error(`Failed to fetch stock data for ${stockCode}:`, error);
    if (axios.isAxiosError(error) && error.response) {
      // 백엔드가 보낸 상세 에러 메시지를 우선적으로 보여줍니다.
      throw new Error(error.response.data.detail || `'${stockCode}' 종목 데이터를 불러오는 데 실패했습니다.`);
    }
    throw new Error(`'${stockCode}' 종목 데이터를 불러오는 데 실패했습니다.`);
  }
};
/*
export const getStockData = async (stockCode: string): Promise<StockData> => {
  try {
    // [임시 디버깅] 1. 종목 정보 API만 먼저 호출해봅니다.
    const infoResponse = await apiClient.get<StockInfo>(`/stocks/${stockCode}/info`);
    const stockInfo = infoResponse.data;

    // [임시 디버깅] 2. 차트 데이터는 잠시 비워둡니다.
    const chartData: ChartData = {
      categories: [],
      candlestick: [],
      line: [],
    };

    // [임시 디버깅] 3. 차트 API를 따로 호출하여 콘솔에서 에러를 확인합니다.
    try {
        await apiClient.get<any[]>(`/stocks/${stockCode}/candles`);
    } catch (chartError) {
        console.error("차트 데이터 로딩 실패! 원인:", chartError);
    }

    return { info: stockInfo, chartData: chartData };

  } catch (error) {
    console.error(`Failed to fetch stock data for ${stockCode}:`, error);
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data.detail || `'${stockCode}' 종목 데이터를 불러오는 데 실패했습니다.`);
    }
    throw new Error(`'${stockCode}' 종목 데이터를 불러오는 데 실패했습니다.`);
  }
};
*/

/**
 * 백엔드의 /ai/predict/{stockCode} 엔드포인트를 호출합니다.
 */
export const getAIPrediction = async (stockCode: string, lastClose: number): Promise<Prediction> => {
  try {
    const response = await apiClient.post<Prediction>(`/ai/predict/${stockCode}`, null, {
      params: { last_close: lastClose }
    });
    return response.data;
  } catch (error) {
    console.error("Failed to fetch AI prediction:", error);
    throw new Error("AI 예측을 가져오는 데 실패했습니다.");
  }
};

/**
 * 백엔드의 /market/indices 엔드포인트를 호출합니다.
 */
export const getMarketIndices = async (): Promise<Index[]> => {
    try {
        const response = await apiClient.get<Index[]>('/market/indices');
        return response.data;
    } catch (error) {
        console.error("Failed to fetch market indices:", error);
        // 실패 시 빈 배열 반환하여 UI가 깨지지 않도록 함
        return [];
    }
};