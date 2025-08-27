import React, { useState } from 'react';
import { Paper, Typography, Box, Button, CircularProgress, Grid, Divider, Alert } from '@mui/material';
// apiService와 타입을 import 합니다.
import { getAIPrediction, Prediction } from '../services/apiService';

interface AiResultProps {
  lastClose: number | undefined;
  stockCode: string; // 부모로부터 현재 종목 코드를 받습니다.
  onPredict: () => void;
}

const AiResult: React.FC<AiResultProps> = ({ lastClose, stockCode, onPredict }) => {
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [predicting, setPredicting] = useState(false);
  const [error, setError] = useState('');

  // handlePredictClick을 async 함수로 변경합니다.
  const handlePredictClick = async () => {
    if (!lastClose) return;
    onPredict(); // 부모의 예측 핸들러(차트 업데이트 등) 호출
    
    setPredicting(true);
    setError('');
    setPrediction(null);

    try {
      // setTimeout 대신 시뮬레이션된 API를 호출합니다.
      const result = await getAIPrediction(stockCode, lastClose);
      setPrediction(result);
    } catch (err) {
      setError('AI 분석 중 오류가 발생했습니다.');
      console.error(err);
    } finally {
      setPredicting(false);
    }
  };

  return (
    <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column' }}>
      <Typography variant="h6" gutterBottom>AI 예측 서비스</Typography>
      <Button variant="contained" onClick={handlePredictClick} disabled={predicting || !lastClose}>
        {predicting ? 'AI 분석 중...' : 'AI 종목 분석'}
      </Button>
      
      {predicting && (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mt: 3 }}>
          <CircularProgress size={24} />
          <Typography sx={{ ml: 2 }}>AI가 시장 데이터를 분석하고 있습니다...</Typography>
        </Box>
      )}

      {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}

      {prediction && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle1" gutterBottom fontWeight="bold">AI 종합 분석 결과</Typography>
          <Paper variant="outlined" sx={{ p: 2, backgroundColor: '#f5f5f5' }}>
            <Grid container spacing={1.5} alignItems="center">
              {/* --- 예측 범위 --- */}
              <Grid item xs={12} sm={3}><Typography variant="body2" color="text.secondary">다음 주 예측 범위</Typography></Grid>
              <Grid item xs={12} sm={9}><Typography variant="body1" fontWeight="bold" color="primary.main">{prediction.range[0].toLocaleString(undefined, { minimumFractionDigits: 2 })} ~ {prediction.range[1].toLocaleString(undefined, { minimumFractionDigits: 2 })}</Typography></Grid>
              
              {/* --- 나머지 UI는 기존과 동일하게 prediction 객체를 사용합니다 --- */}
              <Grid item xs={12}><Divider sx={{ my: 1 }} /></Grid>
              <Grid item xs={12} sm={3}><Typography variant="body2" color="text.secondary">핵심 분석</Typography></Grid>
              <Grid item xs={12} sm={9}><Typography variant="body2">{prediction.analysis}</Typography></Grid>
              <Grid item xs={12}><Divider sx={{ my: 1 }} /></Grid>
              <Grid item xs={12} sm={3}><Typography variant="body2" color="text.secondary">주요 근거</Typography></Grid>
              <Grid item xs={12} sm={9}><Typography variant="body2">{prediction.reason}</Typography></Grid>
              <Grid item xs={12}><Divider sx={{ my: 1 }} /></Grid>
              <Grid item xs={12} sm={3}><Typography variant="body2" color="text.secondary" sx={{ color: 'success.main' }}>긍정적 요인</Typography></Grid>
              <Grid item xs={12} sm={9}>{prediction.positiveFactors.map((factor, index) => (<Typography key={index} variant="body2" sx={{ mb: 1 }}>• {factor}</Typography>))}</Grid>
              <Grid item xs={12}><Divider sx={{ my: 1 }} /></Grid>
              <Grid item xs={12} sm={3}><Typography variant="body2" color="text.secondary" sx={{ color: 'error.main' }}>잠재적 리스크</Typography></Grid>
              <Grid item xs={12} sm={9}>{prediction.potentialRisks.map((risk, index) => (<Typography key={index} variant="body2" sx={{ mb: 1 }}>• {risk}</Typography>))}</Grid>
            </Grid>
          </Paper>
        </Box>
      )}
    </Paper>
  );
};

export default AiResult;