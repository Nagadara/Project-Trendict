import React, { useState, useEffect, useCallback } from 'react';
import { Container, Typography, Box, CircularProgress, Paper, TextField, Autocomplete, Alert, InputAdornment } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import StockChart from '../components/StockChart';
import AiResult from '../components/AiResult';
import MarketIndices from '../components/MarketIndices';
// mockApiData 대신 apiService와 타입을 import 합니다.
import { getStockData, getAllStocks, Stock, StockData } from '../services/apiService';
import Kospi200Realtime from '../components/Kospi200Realtime';

const DashboardPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [currentStockData, setCurrentStockData] = useState<StockData | null>(null);
  const [currentStockCode, setCurrentStockCode] = useState('028050');
  const [allStocks, setAllStocks] = useState<Stock[]>([]);
  const [searchError, setSearchError] = useState('');
  const [triggerPrediction, setTriggerPrediction] = useState(0);

  // 최초 렌더링 시 전체 종목 목록을 API(시뮬레이션)로 가져옵니다.
  useEffect(() => {
    const fetchAllStocks = async () => {
      try {
        const stocks = await getAllStocks();
        setAllStocks(stocks);
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
        setCurrentStockData(null);
        console.error(err);
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
            {/*  */}
            <Kospi200Realtime />
            {/* 이 부분도 나중에 API 연동 필요 */}
            <MarketIndices indices={[]} />
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