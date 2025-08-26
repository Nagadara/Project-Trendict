import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Container, Typography, Box, CircularProgress, Paper, TextField, Autocomplete, Alert, InputAdornment } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import StockChart from '../components/StockChart';
import AiResult from '../components/AiResult';
import MarketIndices from '../components/MarketIndices';
import { mockApiData } from '../data/mockApiData';

const DashboardPage: React.FC = () => {
  const [currentStockData, setCurrentStockData] = useState<any | null>(null);
  const [currentStockCode, setCurrentStockCode] = useState('028050'); // Default stock
  const [searchError, setSearchError] = useState('');
  const [triggerPrediction, setTriggerPrediction] = useState(0);
  
  // mockApiData에서 모든 주식 목록을 가져옵니다.
  const allStocks = useMemo(() => mockApiData.getAllStocks(), []);

  // currentStockCode가 변경될 때마다 해당 종목 데이터를 가져옵니다.
  useEffect(() => {
    const data = mockApiData.getStockData(currentStockCode);
    if (data) {
      setCurrentStockData(data);
      setSearchError('');
    } else {
      setSearchError(`종목 코드 '${currentStockCode}'에 대한 데이터를 찾을 수 없습니다.`);
      setCurrentStockData(null);
    }
  }, [currentStockCode]);

  // AI 예측을 트리거하는 함수입니다.
  const handlePredict = useCallback(() => {
    setTriggerPrediction(prev => prev + 1);
  }, []);

  // 데이터 로딩 중이거나 에러 발생 시 보여줄 화면입니다.
  if (!currentStockData) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Loading Market Data...</Typography>
        {searchError && <Alert severity="error" sx={{ position: 'absolute', top: '100px' }}>{searchError}</Alert>}
      </Box>
    );
  }

  // 차트에 표시될 마지막 종가를 계산합니다.
  const lastClose = currentStockData.chartData.line[currentStockData.chartData.line.length - 1];

  return (
    <Container maxWidth={false} sx={{ mt: 4, mb: 4, pl: '24px !important', pr: '24px !important' }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Box sx={{ display: 'flex', gap: 3 }}>
          {/* 좌측 메인 영역 (차트) */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Paper
              sx={{
                p: 2,
                display: 'flex',
                flexDirection: 'column',
                height: 'calc(100vh - 150px)',
                overflow: 'hidden',
              }}
            >
              {/* 종목 검색 자동완성 입력창 */}
              <Autocomplete
                sx={{ mb: 2, width: 300 }}
                options={allStocks}
                autoHighlight
                getOptionLabel={(option) => `${option.name} (${option.code})`}
                value={allStocks.find(stock => stock.code === currentStockCode) || null}
                onChange={(event, newValue) => {
                  if (newValue) {
                    setCurrentStockCode(newValue.code);
                  }
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="종목 검색"
                    variant="outlined"
                    size="small"
                    InputProps={{
                      ...params.InputProps,
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon />
                        </InputAdornment>
                      ),
                    }}
                  />
                )}
              />
              
              {/* 검색 에러 발생 시 경고 메시지 */}
              {searchError && <Alert severity="warning" sx={{ mb: 2 }}>{searchError}</Alert>}
              
              {/* 주식 차트 컴포넌트 */}
              <StockChart 
                chartData={currentStockData.chartData}
                stockInfo={currentStockData.info}
                triggerPrediction={triggerPrediction}
                onPredict={handlePredict}
              />
            </Paper>
          </Box>
          
          {/* 우측 사이드 영역 (주요 지수) */}
          <Box sx={{ width: 280, flexShrink: 0 }}>
            <MarketIndices indices={mockApiData.indices} />
          </Box>
        </Box>

        {/* 하단 AI 분석 결과 영역 */}
        <Box>
          <AiResult lastClose={lastClose} onPredict={handlePredict} />
        </Box>
      </Box>
    </Container>
  );
};

export default DashboardPage;