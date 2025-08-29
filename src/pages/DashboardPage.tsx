import React, { useState, useEffect, useCallback } from 'react';
import { Container, Typography, Box, CircularProgress, Paper, TextField, Autocomplete, Alert, InputAdornment } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import StockChart from '../components/StockChart';
import AiResult from '../components/AiResult';
import MarketIndices from '../components/MarketIndices';
import { getStockData, getAllStocks, Stock, StockData, getMarketIndices, Index } from '../services/apiService';
import Kospi200Realtime from '../components/Kospi200Realtime';

const emptyStockData: StockData = {
  info: {
    marketType: '', stockCode: '005930', stockName: '데이터 로딩 중...',
    open: 0, high: 0, low: 0, currentPrice: 0, week52high: 0, week52low: 0,
    volume: 0, tradeValue: 0, marketCap: 0, foreignRatio: 0,
    per: 0, pbr: 0, dividendYield: 0,
  },
  chartData: { categories: [], candlestick: [], line: [] },
};

const DashboardPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  // 초기 상태를 null 대신 비어있는 기본 데이터로 설정합니다.
  const [currentStockData, setCurrentStockData] = useState<StockData>(emptyStockData);
  const [currentStockCode, setCurrentStockCode] = useState('005930'); // 기본 종목 코드
  const [allStocks, setAllStocks] = useState<Stock[]>([]);
  const [marketIndices, setMarketIndices] = useState<Index[]>([]);
  const [searchError, setSearchError] = useState('');
  const [triggerPrediction, setTriggerPrediction] = useState(0);
  const [isApiKeyMissing, setIsApiKeyMissing] = useState(false); // API 키 상태 추가

  // 최초 렌더링 시 전체 종목 목록을 API(시뮬레이션)로 가져옵니다.
  useEffect(() => {
    const fetchAllStocks = async () => {
      try {
        const stocks = await getAllStocks();
        setAllStocks(stocks);
        // 키가 없을 때 반환되는 예시 데이터인지 확인
        if (stocks.length > 0 && stocks[0].name.includes('(예시)')) {
          setIsApiKeyMissing(true);
        }
      } catch (err) {
        console.error(err);
        setSearchError('종목 목록을 불러오는 데 실패했습니다.');
      }
    };
    fetchAllStocks();
  }, []);

  // currentStockCode가 변경될 때마다 해당 종목 데이터를 API(시뮬레이션)로 가져옵니다.
  useEffect(() => {
    const fetchStockData = async () => {
      setLoading(true);
      setSearchError('');
      try {
        const data = await getStockData(currentStockCode);
        setCurrentStockData(data);
      } catch (err: any) {
        setSearchError(err.message || `종목 코드 '${currentStockCode}'에 대한 데이터를 찾을 수 없습니다.`);
        setCurrentStockData(emptyStockData); // 실패 시에도 기본 데이터로 설정
      } finally {
        setLoading(false);
      }
    };
    fetchStockData();
  }, [currentStockCode]);

  const handlePredict = useCallback(() => {
    setTriggerPrediction(prev => prev + 1);
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Loading Market Data...</Typography>
      </Box>
    );
  }

  if (!currentStockData) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Alert severity="error">{searchError}</Alert>
      </Box>
    );
  }

  /*const lastClose = currentStockData.chartData.line[currentStockData.chartData.line.length - 1];*/
  const lastClose = currentStockData.info.currentPrice;
  const hasChartData = currentStockData.chartData.categories.length > 0;

  return (
    <Container maxWidth={false} sx={{ mt: 4, mb: 4, pl: '24px !important', pr: '24px !important' }}>
      {/* API 키가 없을 때 경고 메시지를 표시합니다. */}
      {isApiKeyMissing 
        ? 
        <Alert severity="warning" sx={{ mb: 2 }}>
          백엔드에 KIS API 키가 설정되지 않았습니다. 현재 예시 데이터로 표시됩니다.
        </Alert>
        : 
        <Alert severity="warning" sx={{ mb: 2 }}>
          API 키 등록에 성공했습니다.
        </Alert>
      }
      {/* API 키가 있을 때 */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Box sx={{ display: 'flex', gap: 3 }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', height: 'calc(100vh - 150px)', overflow: 'hidden' }}>
              <Autocomplete
                sx={{ mb: 2, width: 300 }}
                options={allStocks}
                autoHighlight
                getOptionLabel={(option) => `${option.name} (${option.code})`}
                value={allStocks.find(stock => stock.code === currentStockCode) || null}
                onChange={(event, newValue) => { if (newValue) { setCurrentStockCode(newValue.code); } }}
                renderInput={(params) => (
                  <TextField {...params} label="종목 검색" variant="outlined" size="small"
                    InputProps={{ ...params.InputProps, startAdornment: (<InputAdornment position="start"><SearchIcon /></InputAdornment>) }}
                  />
                )}
              />
              {searchError && <Alert severity="warning" sx={{ mb: 2 }}>{searchError}</Alert>}
              {hasChartData ? (
                <StockChart 
                  chartData={currentStockData.chartData}
                  stockInfo={currentStockData.info}
                  triggerPrediction={triggerPrediction}
                  onPredict={handlePredict}
                />
              ) : (
                <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                  <Typography variant="h6" color="text.secondary">
                    차트 데이터 없음
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    현재 API는 실시간 시세 정보만 제공합니다.
                  </Typography>
                  <Paper sx={{p: 2, mt: 2, backgroundColor: '#f0f0f0'}}>
                    <Typography>현재가: {currentStockData.info.currentPrice.toLocaleString()} 원</Typography>
                    <Typography>시가: {currentStockData.info.open.toLocaleString()} 원</Typography>
                    <Typography>고가: {currentStockData.info.high.toLocaleString()} 원</Typography>
                    <Typography>저가: {currentStockData.info.low.toLocaleString()} 원</Typography>
                  </Paper>
                </Box>
              )}
            </Paper>
          </Box>
          <Box sx={{ width: 280, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* indices prop에 실제 데이터 전달 */}
            <Kospi200Realtime />
            <MarketIndices indices={marketIndices} />
          </Box>
        </Box>
        <Box>
          <AiResult lastClose={lastClose} stockCode={currentStockCode} onPredict={handlePredict} />
        </Box>
      </Box>
    </Container>
  );
};

export default DashboardPage;