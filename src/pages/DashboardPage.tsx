import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Container, Typography, Box, CircularProgress, Paper
} from '@mui/material';
import StockChart from '../components/StockChart';
import AiResult from '../components/AiResult';
import MarketIndices from '../components/MarketIndices';
import { getStockData, getAllStocks, Stock, StockData, Index } from '../services/apiService';
import useWebSocket from 'react-use-websocket';

export type ChartPeriod = '실시간' | '1W' | '1M' | '3M' | '1Y';

type ChartData = {
  categories: string[];
  candlestick: [number, number, number, number][];
  line: number[];
};

type Ohlc = { open: number; high: number; low: number; close: number };

const emptyStockData: StockData = {
  info: {
    marketType: '', stockCode: '', stockName: '종목을 선택하세요',
    open: 0, high: 0, low: 0, currentPrice: 0,
    week52high: 0, week52low: 0, volume: 0, tradeValue: 0, marketCap: 0,
    foreignRatio: 0, per: 0, pbr: 0, dividendYield: 0,
  },
  chartData: { categories: [], candlestick: [], line: [] },
};

/***********************************************************************
localStorage 로직을 강화하여 KODEX 200 기본값을 포함하도록 합니다.
***********************************************************************/
const initialKodex200: Index = {
  name: 'KODEX 200 (끊김)',
  value: 0,
  change: 0,
  changePercent: 0,
  flag: '📈'
};
const loadInitialIndices = (): Index[] => {
  try {
    const savedIndices = localStorage.getItem('marketIndices');
    const indices: Index[] = savedIndices ? JSON.parse(savedIndices) : [];
    
    // 마지막으로 저장된 값에 KODEX 200이 있는지 확인합니다.
    const hasKodex200 = indices.some(idx => idx.name.includes('KODEX 200'));

    // 없다면, 기본값을 추가해줍니다.
    if (!hasKodex200) {
      indices.push(initialKodex200);
    }
    return indices;
  } catch (error) {
    console.error("Failed to load indices from localStorage", error);
    // 실패할 경우에도 기본값을 포함하여 반환합니다.
    return [initialKodex200];
  }
};

const DashboardPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [currentStockData, setCurrentStockData] = useState<StockData>(emptyStockData);
  const [currentStockCode, setCurrentStockCode] = useState('069500');
  const [allStocks, setAllStocks] = useState<Stock[]>([]);
  const [marketIndices, setMarketIndices] = useState<Index[]>([]);
  const [realtimeTickData, setRealtimeTickData] = useState<Index | null>(null);
  const [searchError, setSearchError] = useState('');
  const [chartPeriod, setChartPeriod] = useState<ChartPeriod>('3M');

  // Intraday (실시간 모드용) 상태
  const [intradayChartData, setIntradayChartData] = useState<ChartData>({ categories: [], candlestick: [], line: [] });
  const bucketsRef = React.useRef<Map<number, Ohlc>>(new Map());
  const dayKeyRef = React.useRef<string>('');

  // 예측 결과 상태
  const [predictionData, setPredictionData] = useState<{ categories: string[]; line: number[] } | null>(null);

  // 웹소켓 연결
  const { lastJsonMessage } = useWebSocket('ws://127.0.0.1:8000/ws/stock-updates', {
    shouldReconnect: () => true,
  });

  // === 유틸 ===
  const KR_ZONE = 'Asia/Seoul';
  const floorTo5min = (date: Date) =>
    new Date(Math.floor(date.getTime() / (5 * 60 * 1000)) * 5 * 60 * 1000);
  const fmtHM = (d: Date) =>
    d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: KR_ZONE });
  const getTodayKey = () =>
    new Date().toLocaleDateString('ko-KR', { timeZone: KR_ZONE });
  const isDuringKRX = (d: Date) => {
    const h = d.getHours(), m = d.getMinutes();
    const s = h * 60 + m;
    return s >= 9 * 60 && s <= 15 * 60 + 30;
  };

  // 당일 바뀌면 초기화
  useEffect(() => {
    const todayKey = getTodayKey();
    if (dayKeyRef.current !== todayKey) {
      dayKeyRef.current = todayKey;
      bucketsRef.current.clear();
      setIntradayChartData({ categories: [], candlestick: [], line: [] });

      const saved = sessionStorage.getItem(`intraday_${currentStockCode}_${todayKey}`);
      if (saved) {
        const parsed = JSON.parse(saved) as [number, Ohlc][];
        bucketsRef.current = new Map(parsed);
        const categories = parsed.map(([t]) => fmtHM(new Date(t)));
        const candles = parsed.map(([, o]) => [o.open, o.high, o.low, o.close] as [number, number, number, number]);
        const line = parsed.map(([, o]) => o.close);
        setIntradayChartData({ categories, candlestick: candles, line });
      }
    }
  }, [currentStockCode]);

  // 실시간 틱 처리
  useEffect(() => {
    if (lastJsonMessage?.type !== 'tick' || typeof lastJsonMessage.data !== 'string' || lastJsonMessage.data.includes('PINGPONG')) {
      return;
    }
    try {
      const dataParts = lastJsonMessage.data.split('|');
      const bodyStr = dataParts.length > 3 ? dataParts[3] : dataParts[0];
      const tickParts = bodyStr.split('^');

      const currentPrice = parseFloat(tickParts[2]);
      const openPrice = parseFloat(tickParts[7]);
      const highPrice = parseFloat(tickParts[8]);
      const lowPrice = parseFloat(tickParts[9]);
      const hhmmss = tickParts[1];

      const nowKR = new Date(new Date().toLocaleString('en-US', { timeZone: KR_ZONE }));
      nowKR.setHours(Number(hhmmss.slice(0, 2)), Number(hhmmss.slice(2, 4)), Number(hhmmss.slice(4, 6)), 0);

      if (!isDuringKRX(nowKR)) return;

      const bucketTs = floorTo5min(nowKR).getTime();
      const buckets = bucketsRef.current;
      const prev = buckets.get(bucketTs);

      if (!prev) {
        buckets.set(bucketTs, {
          open: isFinite(openPrice) ? openPrice : currentPrice,
          high: Math.max(highPrice || currentPrice, currentPrice),
          low: Math.min(lowPrice || currentPrice, currentPrice),
          close: currentPrice,
        });
        const ordered = Array.from(buckets.entries()).sort((a, b) => a[0] - b[0]);
        const categories = ordered.map(([t]) => fmtHM(new Date(t)));
        const candles = ordered.map(([, o]) => [o.open, o.high, o.low, o.close] as [number, number, number, number]);
        const line = ordered.map(([, o]) => o.close);
        setIntradayChartData({ categories, candlestick: candles, line });
        sessionStorage.setItem(`intraday_${currentStockCode}_${getTodayKey()}`, JSON.stringify(ordered));
      } else {
        prev.high = Math.max(prev.high, highPrice || currentPrice, currentPrice);
        prev.low = Math.min(prev.low, lowPrice || currentPrice, currentPrice);
        prev.close = currentPrice;
      }

      setRealtimeTickData({
        name: 'KODEX 200 (실시간)',
        value: currentPrice,
        change: parseFloat(tickParts[3]),
        changePercent: parseFloat(tickParts[5]),
        flag: '📈'
      });
    } catch (e) {
      console.error('실시간 Tick 데이터 파싱 오류:', e);
    }
  }, [lastJsonMessage, currentStockCode]);

  // 예측 버튼
  const handlePredict = useCallback(async () => {
    try {
      const res = await fetch(`/api/predictions?code=${currentStockCode}&period=${chartPeriod}`);
      if (!res.ok) throw new Error('예측 CSV를 불러오지 못했습니다.');
      const csv = await res.text();
      const rows = csv.trim().split('\n').slice(1);
      const categories: string[] = [];
      const line: number[] = [];
      for (const r of rows) {
        const [dateStr, predStr] = r.split(',').map(s => s.trim());
        if (!dateStr || !predStr) continue;
        categories.push(dateStr);
        line.push(Number(predStr));
      }
      setPredictionData({ categories, line });
    } catch (e) {
      console.error(e);
      alert('예측 결과를 불러오지 못했습니다.');
    }
  }, [currentStockCode, chartPeriod]);

  // [수정] 초기 데이터 로드에서 getMarketIndices 호출을 제거합니다.
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setSearchError('');
        const stocks = await getAllStocks();
        setAllStocks(stocks);
      } catch (err) {
        console.error("초기 데이터 로딩 실패:", err);
        setSearchError('시장 데이터를 불러오는 데 실패했습니다.');
      }
    };
    fetchInitialData();
  }, []);

  // 종목 데이터 로드
  useEffect(() => {
    const fetchStockData = async () => {
      if (!currentStockCode) return;
      setLoading(true);
      setSearchError('');
      try {
        const data = await getStockData(currentStockCode, chartPeriod);
        setCurrentStockData(data);
      } catch (err: any) {
        console.error("종목 데이터 로딩 실패:", err);
        setSearchError('종목 데이터를 불러오는 데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };
    fetchStockData();
  }, [currentStockCode, chartPeriod]);

  // 어떤 차트 데이터를 보여줄지
  const chartDataToDisplay = useMemo(() => {
    if (chartPeriod === '실시간' && currentStockCode === '069500') {
      return intradayChartData;
    }
    return currentStockData.chartData;
  }, [chartPeriod, currentStockCode, intradayChartData, currentStockData.chartData]);

  const combinedIndices = useMemo(() => {
    // 초기값으로 localStorage 또는 기본값을 사용합니다.
    let indices = loadInitialIndices();
    
    // API로 받은 정적 지수 업데이트
    marketIndices.forEach(apiIndex => {
      const existingIndex = indices.findIndex(idx => idx.name === apiIndex.name);
      if (existingIndex > -1) indices[existingIndex] = apiIndex;
      else indices.unshift(apiIndex); // KOSPI, KOSDAQ을 맨 앞에 추가
    });

    // KODEX 200 실시간 데이터 업데이트
    if (realtimeTickData) {
      const existingIndex = indices.findIndex(idx => idx.name.includes('KODEX 200'));
      if (existingIndex > -1) indices[existingIndex] = realtimeTickData;
      else indices.push(realtimeTickData);
    }
    
    return indices;
  }, [marketIndices, realtimeTickData]);

  // [추가] combinedIndices가 변경될 때마다 localStorage에 저장하는 useEffect
  useEffect(() => {
    // 데이터가 하나라도 있어야 저장 (초기 기본값 제외)
    if (combinedIndices.some(idx => idx.value !== 0)) {
      localStorage.setItem('marketIndices', JSON.stringify(combinedIndices));
    }
  }, [combinedIndices]);

  if (loading && currentStockData.info.stockName === '종목을 선택하세요') {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Loading Market Data...</Typography>
      </Box>
    );
  }

  return (
    <Container maxWidth={false} sx={{ mt: 4, mb: 4, pl: '24px !important', pr: '24px !important' }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', lg: 'row' } }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', height: '100%', minHeight: '700px' }}>
              <StockChart
                chartData={chartDataToDisplay}
                stockInfo={currentStockData.info}
                onPredict={handlePredict}
                currentPeriod={chartPeriod}
                onPeriodChange={setChartPeriod}
                predictionData={predictionData}
              />
            </Paper>
          </Box>
          <Box sx={{ width: { xs: '100%', lg: 280 }, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
            {currentStockData.info.currentPrice > 0 && (
              <AiResult lastClose={currentStockData.info.currentPrice} stockCode={currentStockCode} onPredict={handlePredict} />
            )}
            <MarketIndices indices={combinedIndices} />
          </Box>
        </Box>
      </Box>
    </Container>
  );
};

export default DashboardPage;
