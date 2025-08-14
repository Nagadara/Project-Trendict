import React from 'react';
import { Paper, Typography, Box } from '@mui/material';

const AiResult: React.FC = () => {
  return (
    <Paper sx={{ mt: 3, p: 3, backgroundColor: '#f5f5f5' }}>
      <Typography variant="h6" gutterBottom>
        AI 예측 결과
      </Typography>
      <Box>
        <Typography variant="body1" gutterBottom>
          <strong>종합 분석:</strong> 현재 시장은 단기적 변동성이 높으나, 주요 기술 지표들은 긍정적인 신호를 보내고 있습니다. 다음 주 코스피 지수는 소폭 상승할 가능성이 높습니다.
        </Typography>
        <Typography variant="body2" color="text.secondary">
          <strong>예상 등락 범위:</strong> +0.5% ~ +1.2%
        </Typography>
        <Typography variant="body2" color="text.secondary">
          <strong>주요 근거:</strong> 외국인 순매수 지속, 반도체 업황 개선 기대감
        </Typography>
      </Box>
    </Paper>
  );
};

export default AiResult;
