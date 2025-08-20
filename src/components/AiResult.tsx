import React, { useState } from 'react';
import { Paper, Typography, Box, Button, CircularProgress, Grid } from '@mui/material';

// Prediction 타입 정의
interface Prediction {
  range: [number, number];
  analysis: string;
  reason: string;
}

interface AiResultProps {
  lastClose: number | undefined;
}

const AiResult: React.FC<AiResultProps> = ({ lastClose }) => {
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [predicting, setPredicting] = useState(false);
  const [showResult, setShowResult] = useState(false);

  const handlePredictClick = () => {
    if (!lastClose) return;

    setPredicting(true);
    setShowResult(false);
    setPrediction(null);

    setTimeout(() => {
      // AI 예측 결과 생성
      const predictedMin = lastClose * 1.005; // +0.5%
      const predictedMax = lastClose * 1.012; // +1.2%

      setPrediction({
        range: [predictedMin, predictedMax],
        analysis: '현재 시장은 단기적 변동성이 높으나, 주요 기술 지표들은 긍정적인 신호를 보내고 있습니다. 다음 주 코스피 지수는 소폭 상승할 가능성이 높습니다.',
        reason: '외국인 순매수 지속, 반도체 업황 개선 기대감',
      });
      setPredicting(false);
      setShowResult(true);
    }, 3000);
  };

  return (
    <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column' }}>
      <Typography variant="h6" gutterBottom>
        AI 예측 서비스
      </Typography>
      <Button
        variant="contained"
        onClick={handlePredictClick}
        disabled={predicting || !lastClose}
      >
        {predicting ? 'AI 분석 중...' : '코스피 예측하기'}
      </Button>
      
      {predicting && (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mt: 2 }}>
          <CircularProgress size={24} />
          <Typography sx={{ ml: 1 }}>AI가 시장을 분석하고 있습니다...</Typography>
        </Box>
      )}

      {showResult && prediction && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle1" gutterBottom fontWeight="bold">
            다음 주 예측 결과
          </Typography>
          <Paper variant="outlined" sx={{ p: 2, backgroundColor: '#f5f5f5' }}>
            <Grid container spacing={1}>
              <Grid item xs={4}>
                <Typography variant="body2" color="text.secondary">예측 범위</Typography>
              </Grid>
              <Grid item xs={8}>
                <Typography variant="body2" fontWeight="bold" color="primary.main">
                  {prediction.range[0].toFixed(2)} ~ {prediction.range[1].toFixed(2)}
                </Typography>
              </Grid>
              <Grid item xs={4}>
                <Typography variant="body2" color="text.secondary">핵심 분석</Typography>
              </Grid>
              <Grid item xs={8}>
                <Typography variant="body2">{prediction.analysis}</Typography>
              </Grid>
              <Grid item xs={4}>
                <Typography variant="body2" color="text.secondary">주요 근거</Typography>
              </Grid>
              <Grid item xs={8}>
                <Typography variant="body2">{prediction.reason}</Typography>
              </Grid>
            </Grid>
          </Paper>
        </Box>
      )}
    </Paper>
  );
};

export default AiResult;
