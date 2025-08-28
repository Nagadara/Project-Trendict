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
      console.log("실제로 API에서 받은 데이터:", result); 
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
          {/* ... */}
          <Typography variant="body1" fontWeight="bold" color="primary.main">
            {/* prediction.range가 없을 수도 있는 경우를 대비 */}
            {prediction.range?.[0]?.toLocaleString(undefined, { minimumFractionDigits: 2 })} ~ {prediction.range?.[1]?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </Typography>
          {/* ... */}
          <Typography variant="body2">{prediction.analysis}</Typography>
          {/* ... */}
          {/* prediction.positiveFactors가 없을 수도 있는 경우를 대비 */}
          {prediction.positiveFactors?.map((factor, index) => (
            <Typography key={index} variant="body2" sx={{ mb: 1 }}>• {factor}</Typography>
          ))}
          {/* ... */}
        </Box>
      )}
    </Paper>
  );
};

export default AiResult;