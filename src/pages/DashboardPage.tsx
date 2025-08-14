import React, { useState, useEffect } from 'react';
import { Container, Typography, Grid, Paper, Button, Box, CircularProgress } from '@mui/material';
import StockChart from '../components/StockChart';
import AiResult from '../components/AiResult';
import KospiStatus from '../components/KospiStatus';

// (기존 mockApiData는 그대로 사용)
// API 응답을 가정한 모의 데이터 (8월 1일 ~ 8월 30일)
const mockApiData = {
  kospi: {
    value: 2785.49, // 8월 30일 종가 기준으로 업데이트
    change: 10.21,
    changePercent: 0.37,
    date: '2025년 8월 30일',
  },
  chart: {
    categories: [
      '2025-08-01', '2025-08-02', '2025-08-03', '2025-08-04', '2025-08-05',
      '2025-08-06', '2025-08-07', '2025-08-08', '2025-08-09', '2025-08-10',
      '2025-08-11', '2025-08-12', '2025-08-13', '2025-08-14', '2025-08-15',
      '2025-08-16', '2025-08-17', '2025-08-18', '2025-08-19', '2025-08-20',
      '2025-08-21', '2025-08-22', '2025-08-23', '2025-08-24', '2025-08-25',
      '2025-08-26', '2025-08-27', '2025-08-28', '2025-08-29', '2025-08-30'
    ],
    // 데이터 형식: [시가, 종가, 저가, 고가]
    candlestick: [
      [2700.00, 2715.33, 2695.11, 2720.45], // 08-01
      [2715.33, 2728.91, 2710.23, 2735.66], // 08-02
      [2728.91, 2720.15, 2718.44, 2733.12], // 08-03
      [2720.15, 2745.88, 2715.99, 2750.01], // 08-04
      [2745.88, 2730.42, 2725.76, 2751.87], // 08-05
      [2730.42, 2755.11, 2728.65, 2760.32], // 08-06
      [2755.11, 2768.00, 2750.18, 2772.43], // 08-07
      [2768.00, 2759.21, 2755.88, 2775.10], // 08-08
      [2759.21, 2740.77, 2738.91, 2761.54], // 08-09
      [2740.77, 2735.19, 2729.43, 2745.98], // 08-10
      [2735.19, 2722.68, 2719.54, 2740.11], // 08-11
      [2722.68, 2705.81, 2701.33, 2725.92], // 08-12
      [2705.81, 2719.99, 2700.56, 2722.04], // 08-13
      [2719.99, 2733.14, 2718.78, 2738.49], // 08-14
      [2733.14, 2749.50, 2730.21, 2755.00], // 08-15
      [2749.50, 2760.18, 2745.33, 2765.91], // 08-16
      [2760.18, 2751.72, 2748.99, 2763.48], // 08-17
      [2751.72, 2768.33, 2750.05, 2771.12], // 08-18
      [2768.33, 2780.94, 2765.71, 2785.22], // 08-19
      [2780.94, 2775.43, 2770.11, 2788.67], // 08-20
      [2775.43, 2763.81, 2760.29, 2779.54], // 08-21
      [2763.81, 2755.90, 2751.48, 2769.31], // 08-22
      [2755.90, 2748.12, 2742.66, 2760.15], // 08-23
      [2748.12, 2761.40, 2745.87, 2765.22], // 08-24
      [2761.40, 2777.65, 2759.99, 2780.01], // 08-25
      [2777.65, 2789.10, 2775.32, 2795.88], // 08-26
      [2789.10, 2781.25, 2778.44, 2793.19], // 08-27
      [2781.25, 2770.98, 2765.73, 2785.41], // 08-28
      [2770.98, 2775.28, 2768.99, 2779.67], // 08-29
      [2775.28, 2785.49, 2772.01, 2790.11]  // 08-30
    ],
    line: [
      2715.33, 2728.91, 2720.15, 2745.88, 2730.42, 2755.11, 2768.00,
      2759.21, 2740.77, 2735.19, 2722.68, 2705.81, 2719.99, 2733.14,
      2749.50, 2760.18, 2751.72, 2768.33, 2780.94, 2775.43, 2763.81,
      2755.90, 2748.12, 2761.40, 2777.65, 2789.10, 2781.25, 2770.98,
      2775.28, 2785.49
    ],
  }
};


const DashboardPage: React.FC = () => {
  const [predicting, setPredicting] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [marketData, setMarketData] = useState<typeof mockApiData | null>(null);

  useEffect(() => {
    setTimeout(() => {
      setMarketData(mockApiData);
    }, 1000);
  }, []);

  const handlePredictClick = () => {
    setPredicting(true);
    setShowResult(false);
    setTimeout(() => {
      setPredicting(false);
      setShowResult(true);
    }, 3000);
  };

  if (!marketData) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Loading Market Data...</Typography>
      </Box>
    );
  }

  return (
    <Container maxWidth={false} sx={{ mt: 4, mb: 4, pl: '24px !important', pr: '24px !important' }}>
      <Grid container spacing={10}>
        {/* 차트 (화면의 약 3/4 차지) */}
        <Grid item xs={12} lg={9}>
          <Paper
            sx={{
              p: 2,
              display: 'flex',
              flexDirection: 'column',
              height: 'calc(100vh - 150\px)',
              overflow: 'hidden',
            }}
          >
            <StockChart data={marketData.chart} />
          </Paper>
        </Grid>

        {/* 코스피 현황 및 AI 예측 (화면의 약 1/4 차지) */}
        <Grid item xs={12} lg={3}>
          <Grid container direction="column" spacing={3}>
            <Grid item>
              <KospiStatus data={marketData.kospi} />
            </Grid>
            <Grid item>
              <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column' }}>
                <Typography variant="h6" gutterBottom>
                  AI 예측 서비스
                </Typography>
                <Button
                  variant="contained"
                  onClick={handlePredictClick}
                  disabled={predicting}
                >
                  {predicting ? 'AI 분석 중...' : '코스피 예측하기'}
                </Button>
                {showResult && <AiResult />}
              </Paper>
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </Container>
  );
};

export default DashboardPage;