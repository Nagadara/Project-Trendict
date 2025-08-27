// src/services/apiService.ts

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// 타입 정의는 기존과 유사하게 유지
export interface Stock { code: string; name: string; }
export interface StockData { info: any; chartData: any; }
export interface Prediction { /*...*/ }

/**
 * 백엔드에 /stocks 엔드포인트가 없으므로, 프론트엔드에서 임시 목록을 관리합니다.
 */
export const getAllStocks = async (): Promise<Stock[]> => {
  console.log("Using hardcoded stock list because /stocks endpoint is not available.");
  return [
    { code: "005930", name: "삼성전자" },
    { code: "000660", name: "SK하이닉스" },
    { code: "035720", name: "카카오" },
    { code: "035420", name: "NAVER" },
    { code: "028050", name: "삼성엔지니어링" },
  ];
};

/**
 * main.py의 /get-price/{ticker}를 호출하고, 그 결과를 프론트엔드 형식으로 변환합니다.
 */
export const getStockData = async (stockCode: string): Promise<StockData> => {
  console.log(`Calling REAL API: /get-price/${stockCode}`);
  const response = await fetch(`${API_BASE_URL}/get-price/${stockCode}`);

  if (!response.ok) {
    throw new Error(`'${stockCode}' 종목 데이터를 불러오는 데 실패했습니다.`);
  }

  const kisData = await response.json();
  const info_raw = kisData.output;

  // KIS API 응답을 프론트엔드의 StockData 형식으로 변환
  const stockData: StockData = {
    info: {
      marketType: "KOSPI", stockCode: stockCode, stockName: "종목명(API조회필요)",
      open: parseFloat(info_raw.stck_oprc), high: parseFloat(info_raw.stck_hgpr),
      low: parseFloat(info_raw.stck_lwpr), week52high: parseFloat(info_raw.w52_hgpr),
      week52low: parseFloat(info_raw.w52_lwpr), proxyPrice: 0, volume: parseFloat(info_raw.acml_vol),
      tradeValue: parseFloat(info_raw.acml_tr_pbmn), marketCap: parseFloat(info_raw.stck_shrn_iscd), // 시가총액 필드가 다를 수 있음
      foreignRatio: parseFloat(info_raw.frgn_hldn_qty_rt), per: parseFloat(info_raw.per),
      pbr: parseFloat(info_raw.pbr), dividendYield: 0,
      // 현재가를 info 객체에도 추가
      currentPrice: parseFloat(info_raw.stck_prpr)
    },
    // 중요: 백엔드가 과거 데이터를 주지 않으므로, 차트 데이터는 비워둡니다.
    chartData: {
      categories: [],
      candlestick: [],
      line: [],
    }
  };

  return stockData;
};

/** AI 예측은 백엔드에 기능이 없으므로 시뮬레이션으로 유지합니다. */
export const getAIPrediction = async (stockCode: string, lastClose: number): Promise<Prediction> => {
    // ... (이전 답변의 시뮬레이션 코드와 동일) ...
    await new Promise(resolve => setTimeout(resolve, 3000));
    const predictedMin = lastClose * 0.985;
    const predictedMax = lastClose * 1.03;
    return {
        range: [predictedMin, predictedMax],
        analysis: `(시뮬레이션 API 응답) ...`,
        reason: `(시뮬레이션 API 응답) ...`,
        positiveFactors: ['...'],
        potentialRisks: ['...']
    };
};