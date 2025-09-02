import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Container, Typography, Box, CircularProgress, Paper, TextField, Autocomplete, Alert, InputAdornment } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import StockChart from '../components/StockChart';
import AiResult from '../components/AiResult';
import MarketIndices from '../components/MarketIndices';
import { getStockData, getAllStocks, Stock, StockData, getMarketIndices, Index } from '../services/apiService';
import useWebSocket from 'react-use-websocket';
import Kospi200Realtime, { KospiDataBody } from '../components/Kospi200Realtime';

export type ChartPeriod = '1D' | '1W' | '1M' | '3M' | '1Y';

// 초기 상태 기본값
const emptyStockData: StockData = {
  info: {
    marketType: '', stockCode: '', stockName: '종목을 선택하세요',
    open: 0, high: 0, low: 0, currentPrice: 0, week52high: 0, week52low: 0,
    volume: 0, tradeValue: 0, marketCap: 0, foreignRatio: 0,
    per: 0, pbr: 0, dividendYield: 0,
  },
  chartData: { categories: [], candlestick: [], line: [] },
};

const DashboardPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [currentStockData, setCurrentStockData] = useState<StockData>(emptyStockData);
  const [currentStockCode, setCurrentStockCode] = useState('005930');
  const [allStocks, setAllStocks] = useState<Stock[]>([]);
  const [marketIndices, setMarketIndices] = useState<Index[]>([]); // API로 받는 정적 지수 (KOSPI, KOSDAQ)
  const [kospi200Data, setKospi200Data] = useState<Index | null>(null); // KOSPI 200 실시간 지수
  const [realtimeTickData, setRealtimeTickData] = useState<Index | null>(null); // KODEX 200 실시간 시세
  const [searchError, setSearchError] = useState('');
  const [chartPeriod, setChartPeriod] = useState<ChartPeriod>('3M');

  // KODEX 200 실시간 시세 수신을 위한 웹소켓 연결
  const { lastJsonMessage } = useWebSocket('ws://127.0.0.1:8000/ws/stock-updates', {
    shouldReconnect: () => true,
  });

  useEffect(() => {
    if (lastJsonMessage?.type === 'tick' && typeof lastJsonMessage.data === 'string' && !lastJsonMessage.data.includes('PINGPONG')) {
      console.log('Received stock update:', lastJsonMessage);
      try {
        // [최종 수정] KIS 원본 데이터는 JSON이 아니라 '^'로 구분된 텍스트입니다.
        // 1. '|'로 분리하여 데이터 부분만 추출합니다. (e.g., "069500^...")
        const dataParts = lastJsonMessage.data.split('|');
        const bodyStr = dataParts[dataParts.length - 1]; // 마지막 부분이 실제 데이터
        
        // 2. '^'로 분리하여 배열로 만듭니다.
        const tickParts = bodyStr.split('^');

        // 3. KIS API 명세에 따라 올바른 인덱스에서 값을 추출합니다.
        // H0STCNT0 (실시간 주식 체결가) 응답 기준:
        // tickParts[2]: 현재가 (stck_prpr)
        // tickParts[3]: 전일 대비 (prdy_vrss)
        // tickParts[5]: 전일 대비율 (prdy_ctrt)
        const currentPrice = parseFloat(tickParts[2]);
        const change = parseFloat(tickParts[3]);
        const changeRate = parseFloat(tickParts[5]);

        // 4. 상태를 업데이트합니다.
        setRealtimeTickData({
            name: 'KODEX 200 (실시간)',
            value: currentPrice,
            change: change,
            changePercent: changeRate,
            flag: '📈'
        });
      } catch (e) {
        console.error("실시간 Tick 데이터 파싱 오류:", e);
      }
    }
  }, [lastJsonMessage]);

  const handlePredict = useCallback(() => {
    // AI 예측 로직 (그대로 둠)
  }, []);

  // KOSPI 200 실시간 데이터를 받아 상태에 저장하는 콜백 함수
  const handleKospi200Update = useCallback((data: KospiDataBody) => {
    const sign = ['4', '5'].includes(data.prdy_vrss_sign) ? -1 : 1;
    setKospi200Data({
      name: 'KOSPI 200',
      value: parseFloat(data.bstp_nmix_prpr),
      change: parseFloat(data.bstp_nmix_prdy_vrss),
      changePercent: parseFloat(data.bstp_nmix_prdy_ctrt) * sign,
      flag: '🇰🇷'
    });
  }, []);

  // 초기 데이터 로드 (종목 목록 + 정적 지수)
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setSearchError('');
        const [stocks, indices] = await Promise.all([
          getAllStocks(),
          getMarketIndices()
        ]);
        setAllStocks(stocks);
        setMarketIndices(indices);
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

  // 정적 지수와 모든 실시간 데이터를 결합하는 로직
  const combinedIndices = useMemo(() => {
    let indices = [...marketIndices];
    
    // KOSPI 200 데이터 추가 또는 업데이트
    if (kospi200Data) {
      const existingIndex = indices.findIndex(idx => idx.name === 'KOSPI 200');
      if (existingIndex > -1) {
        indices[existingIndex] = kospi200Data;
      } else {
        indices.push(kospi200Data);
      }
    }

    // KODEX 200 데이터 추가 또는 업데이트
    if (realtimeTickData) {
      const existingIndex = indices.findIndex(idx => idx.name.includes('KODEX 200'));
      if (existingIndex > -1) {
        indices[existingIndex] = realtimeTickData;
      } else {
        indices.push(realtimeTickData);
      }
    }
    
    return indices;
  }, [marketIndices, kospi200Data, realtimeTickData]);

  // 로딩 상태
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
            <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', height: '100%' }}>
              {searchError && <Alert severity="warning" sx={{ mb: 2 }}>{searchError}</Alert>}
              
              {currentStockData.info.stockCode ? (
                <StockChart 
                  chartData={currentStockData.chartData}
                  stockInfo={currentStockData.info}
                  onPredict={handlePredict}
                  currentPeriod={chartPeriod}
                  onPeriodChange={setChartPeriod}
                />
              ) : (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
                  <Typography>종목을 선택해주세요.</Typography>
                </Box>
              )}
            </Paper>
          </Box>

          {/* 오른쪽 사이드바: KOSPI200 실시간 + 통합된 지수 현황 */}
          <Box sx={{ width: { xs: '100%', lg: 280 }, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Kospi200Realtime onDataUpdate={handleKospi200Update} />
            <MarketIndices indices={combinedIndices} />
          </Box>
        </Box>

        <Box>
          {currentStockData.info.currentPrice > 0 && (
            <AiResult lastClose={currentStockData.info.currentPrice} stockCode={currentStockCode} onPredict={handlePredict} />
          )}
        </Box>
      </Box>
    </Container>
  );
};

export default DashboardPage;