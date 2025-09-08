import React, {useState} from 'react';
import { Paper, Typography, Box, Button, CircularProgress, Grid, Divider, Alert } from '@mui/material';
import { getAIPrediction, Prediction } from '../services/apiService';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ReportProblemOutlinedIcon from '@mui/icons-material/ReportProblemOutlined';

interface AiResultProps {
  lastClose: number | undefined;
  stockCode: string;
  onPredict: () => void;
}

const AiResult: React.FC<AiResultProps> = ({ lastClose, stockCode, onPredict }) => {
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [predicting, setPredicting] = useState(false);
  const [error, setError] = useState('');

  const handlePredictClick = async () => {
    if (!lastClose) return;
    onPredict();
    setPredicting(true);
    setError('');
    setPrediction(null);
    try {
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

  const isUpTrend = prediction && lastClose && prediction.range[1] > lastClose;

  return (
    <Paper sx={{ p: 3, display: 'flex', flexDirection: 'column', minHeight: '250px' }}>
      <Typography variant="h6" gutterBottom>AI 예측 서비스</Typography>
      <Button variant="contained" onClick={handlePredictClick} disabled={predicting || !lastClose}>
        {predicting ? 'AI가 분석 중입니다...' : 'AI 종목 분석'}
      </Button>
      
      {predicting && (
        <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', mt: 4 }}>
          <CircularProgress />
          <Typography sx={{ mt: 2 }} color="text.secondary">AI가 시장 데이터를 분석하고 있습니다...</Typography>
        </Box>
      )}

      {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}

      {prediction && (
        <Box sx={{ mt: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item>
              {isUpTrend ? <TrendingUpIcon color="error" sx={{ fontSize: 40 }}/> : <TrendingDownIcon color="primary" sx={{ fontSize: 40 }}/>}
            </Grid>
            <Grid item>
              <Typography variant="body2" color="text.secondary">AI 예측 목표 주가 (단기)</Typography>
              <Typography variant="h5" fontWeight="bold" color={isUpTrend ? 'error.main' : 'primary.main'}>
                {prediction.range[0].toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}원 ~ {prediction.range[1].toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}원
              </Typography>
            </Grid>
          </Grid>
          
          <Divider sx={{ my: 2 }} />
          
          <Typography variant="subtitle1" fontWeight="bold">종합 분석</Typography>
          <Typography variant="body2" sx={{ mb: 3 }}>{prediction.analysis}</Typography>
          
          {/* [최종 수정] Grid container를 제거하고, Box를 사용하여 위아래로 배치합니다. */}
          <Box>
            {/* 긍정적 요인 섹션 */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'success.main' }}>
                <CheckCircleOutlineIcon fontSize="small" /> 긍정적 요인
              </Typography>
              {prediction.positiveFactors?.map((factor, index) => (
                <Typography key={index} variant="body2" sx={{ pl: 1, py: 0.5 }}>• {factor}</Typography>
              ))}
            </Box>

            {/* 잠재적 리스크 섹션 */}
            <Box>
              <Typography variant="subtitle2" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'warning.main' }}>
                <ReportProblemOutlinedIcon fontSize="small" /> 잠재적 리스크
              </Typography>
              {prediction.potentialRisks?.map((risk, index) => (
                <Typography key={index} variant="body2" sx={{ pl: 1, py: 0.5 }}>• {risk}</Typography>
              ))}
            </Box>
          </Box>
          
          <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block', textAlign: 'center' }}>
            ※ 본 정보는 AI 시뮬레이션 결과이며, 투자 참고용으로만 활용하시기 바랍니다.
          </Typography>
        </Box>
      )}
    </Paper>
  );
};

export default AiResult;