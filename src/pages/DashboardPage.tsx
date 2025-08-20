import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Container, Typography, Box, CircularProgress, ButtonGroup, Button, Paper } from '@mui/material';
import StockChart from '../components/StockChart';
import AiResult from '../components/AiResult';
import MarketIndices from '../components/MarketIndices';
import { mockApiData } from '../data/mockApiData';

// 기간 타입 정의
export type TimePeriod = 'day' | 'week' | 'month' | 'year';

const DashboardPage: React.FC = () => {
  const [marketData, setMarketData] = useState<typeof mockApiData | null>(null);
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('month');

  useEffect(() => {
    setTimeout(() => {
      setMarketData(mockApiData);
    }, 1000);
  }, []);

  const handleTimePeriodChange = useCallback((period: TimePeriod) => {
    setTimePeriod(period);
  }, []);

  const chartWindowData = useMemo(() => {
    if (!marketData) return null;

    if (timePeriod === 'day') {
      return {
        data: marketData.chart.intraday,
        initialZoom: { start: 0, end: 100 }
      };
    }

    const dailyChart = marketData.chart.daily;
    const dataLength = dailyChart.categories.length;
    const periodLength = { week: 7, month: 30, year: 365 }[timePeriod];
    
    const startIndex = Math.max(0, dataLength - periodLength);

    return {
      data: {
        categories: dailyChart.categories.slice(startIndex),
        candlestick: dailyChart.candlestick.slice(startIndex),
        line: dailyChart.line.slice(startIndex),
      },
      initialZoom: { start: 0, end: 100 }
    };
  }, [marketData, timePeriod]);

  if (!marketData) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Loading Market Data...</Typography>
      </Box>
    );
  }

  const lastClose = marketData.chart.daily.line[marketData.chart.daily.line.length - 1];

  return (
    <Container maxWidth={false} sx={{ mt: 4, mb: 4, pl: '24px !important', pr: '24px !important' }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Box sx={{ display: 'flex', gap: 3 }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Paper
              sx={{
                p: 2,
                display: 'flex',
                flexDirection: 'column',
                height: 'calc(100vh - 250px)',
                overflow: 'hidden',
              }}
            >
              <ButtonGroup variant="outlined" sx={{ mb: 2, alignSelf: 'center' }}>
                <Button onClick={() => handleTimePeriodChange('day')} variant={timePeriod === 'day' ? 'contained' : 'outlined'}>1일</Button>
                <Button onClick={() => handleTimePeriodChange('week')} variant={timePeriod === 'week' ? 'contained' : 'outlined'}>1주일</Button>
                <Button onClick={() => handleTimePeriodChange('month')} variant={timePeriod === 'month' ? 'contained' : 'outlined'}>1개월</Button>
                <Button onClick={() => handleTimePeriodChange('year')} variant={timePeriod === 'year' ? 'contained' : 'outlined'}>1년</Button>
              </ButtonGroup>
              {chartWindowData && (
                <StockChart 
                  key={timePeriod} // Re-mount component when timePeriod changes
                  data={chartWindowData.data} 
                  initialZoom={chartWindowData.initialZoom}
                  timePeriod={timePeriod}
                  onTimePeriodChange={handleTimePeriodChange}
                />
              )}
            </Paper>
          </Box>
          <Box sx={{ width: 280, flexShrink: 0 }}>
            <MarketIndices indices={marketData.indices} />
          </Box>
        </Box>
        <Box>
          <AiResult lastClose={lastClose} />
        </Box>
      </Box>
    </Container>
  );
};

export default DashboardPage;