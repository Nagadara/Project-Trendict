// src/services/stockService.ts

// FastAPI 서버의 기본 URL
// .env 파일을 사용하여 환경 변수로 관리하는 것이 좋습니다.
const API_BASE_URL = 'http://localhost:8000/api/v1';

// 우리 앱에서 사용할 데이터 타입 (기존과 동일)
export interface AppChartData {
  categories: string[];
  candlestick: number[][];
  line: number[];
}

export interface Index {
  name: string;
  value: number;
  change: number;
  changePercent: number;
  flag: string;
}

/**
 * KOSPI 차트 데이터를 FastAPI 서버로부터 가져오는 함수
 */
export const fetchStockData = async (symbol: string, startDate: string, endDate: string): Promise<AppChartData> => {
  // FastAPI 엔드포인트에 맞게 URL을 수정합니다.
  const response = await fetch(`${API_BASE_URL}/stock/${symbol.toLowerCase()}?start_date=${startDate}&end_date=${endDate}`);

  if (!response.ok) {
    throw new Error('네트워크 응답에 문제가 있습니다.');
  }
  // FastAPI가 이미 가공된 데이터를 주므로, 별도의 변환 과정이 필요 없습니다.
  return response.json();
};

/**
 * 주요 지수 데이터를 FastAPI 서버로부터 가져오는 함수
 */
export const fetchMarketIndices = async (): Promise<Index[]> => {
  const response = await fetch(`${API_...