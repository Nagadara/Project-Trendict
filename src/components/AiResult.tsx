import React, { useState } from 'react';
import { Paper, Typography, Box, Button, CircularProgress, Grid, Divider } from '@mui/material';

// Prediction 타입 정의
interface Prediction {
  range: [number, number];
  analysis: string;
  reason: string;
  positiveFactors: string[];
  potentialRisks: string[];
}

interface AiResultProps {
  lastClose: number | undefined;
  onPredict: () => void; // 부모로부터 받을 예측 함수
}

const AiResult: React.FC<AiResultProps> = ({ lastClose, onPredict }) => {
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [predicting, setPredicting] = useState(false);
  const [showResult, setShowResult] = useState(false);

  const handlePredictClick = () => {
    if (!lastClose) return;

    // 부모의 예측 핸들러(차트 업데이트 등) 호출
    onPredict();

    setPredicting(true);
    setShowResult(false);
    setPrediction(null);

    // 실제 API 호출을 시뮬레이션하는 setTimeout
    setTimeout(() => {
      // AI 예측 결과 생성 (시뮬레이션)
      const predictedMin = lastClose * 0.985; // -1.5%
      const predictedMax = lastClose * 1.03;  // +3.0%

      setPrediction({
        range: [predictedMin, predictedMax],
        analysis: `단기적으로는 중립적 상승(Neutral-Bullish) 관점을 유지합니다. 현재 주가는 주요 저항선 돌파를 시도하는 과정에 있으며, 성공 시 추가적인 상승 모멘텀이 기대됩니다. 기술적으로, 20일 이동평균선이 60일 이동평균선을 상향 돌파하는 '골든 크로스' 발생 가능성이 포착되었습니다. RSI 지표는 65 수준으로 과매수 구간에 근접하고 있으나, 아직 상승 여력은 남아있는 것으로 판단됩니다. 다만, 최근 급등에 따른 단기적 차익 실현 매물이 출회될 수 있어 일시적인 조정 가능성도 염두에 두어야 합니다. 펀더멘털 측면에서는 안정적인 실적이 주가를 뒷받침하고 있으며, 시장의 유동성 또한 풍부한 상황입니다.`,
        reason: `종합적인 시장 데이터와 퀀트 모델 분석 결과, 상승 요인이 하락 요인보다 다소 우세한 것으로 나타났습니다. 아래의 긍정적 요인과 잠재적 리스크를 함께 고려하여 신중한 투자 결정을 내리는 것이 중요합니다.`,
        positiveFactors: [
          '최근 5거래일 연속 기관 및 외국인 투자자의 동시 순매수세가 유입되며 강력한 수급이 확인되었습니다.',
          '관련 핵심 산업(반도체, AI, 바이오 등)의 긍정적인 뉴스 플로우가 지속되어 투자 심리 개선에 기여하고 있습니다.',
          '주요 매크로 지표(환율, 금리)가 안정세를 보이며 시장의 전반적인 불확실성을 완화시키고 있습니다.'
        ],
        potentialRisks: [
          '주요 저항선 돌파에 실패할 경우, 실망 매물이 출회되며 단기 하락으로 전환될 수 있습니다.',
          '이번 주 예정된 주요 국가의 경제 지표 발표 결과에 따라 시장의 변동성이 예상보다 확대될 수 있습니다.'
        ]
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
        {predicting ? 'AI 분석 중...' : 'AI 종목 분석'}
      </Button>
      
      {predicting && (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mt: 3 }}>
          <CircularProgress size={24} />
          <Typography sx={{ ml: 2 }}>AI가 시장 데이터를 분석하고 있습니다...</Typography>
        </Box>
      )}

      {showResult && prediction && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle1" gutterBottom fontWeight="bold">
            AI 종합 분석 결과
          </Typography>
          <Paper variant="outlined" sx={{ p: 2, backgroundColor: '#f5f5f5' }}>
            <Grid container spacing={1.5} alignItems="center"> {/* spacing을 1.5로 조정, alignItems 추가 */}

              {/* --- 예측 범위 --- */}
              <Grid item xs={12} sm={3}>
                <Typography variant="body2" color="text.secondary">
                  다음 주 예측 범위
                </Typography>
              </Grid>
              <Grid item xs={12} sm={9}>
                <Typography variant="body1" fontWeight="bold" color="primary.main">
                  {prediction.range[0].toLocaleString(undefined, { minimumFractionDigits: 2 })} ~ {prediction.range[1].toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </Typography>
              </Grid>

              {/* --- 구분선 --- */}
              <Grid item xs={12}>
                <Divider sx={{ my: 1 }} /> {/* my: 1로 위아래 여백 추가 */}
              </Grid>

              {/* --- 핵심 분석 --- */}
              <Grid item xs={12} sm={3}>
                <Typography variant="body2" color="text.secondary">
                  핵심 분석
                </Typography>
              </Grid>
              <Grid item xs={12} sm={9}>
                <Typography variant="body2">{prediction.analysis}</Typography>
              </Grid>

              {/* --- 구분선 --- */}
              <Grid item xs={12}>
                <Divider sx={{ my: 1 }} />
              </Grid>

              {/* --- 주요 근거 --- */}
              <Grid item xs={12} sm={3}>
                <Typography variant="body2" color="text.secondary">
                  주요 근거
                </Typography>
              </Grid>
              <Grid item xs={12} sm={9}>
                <Typography variant="body2">{prediction.reason}</Typography>
              </Grid>

              {/* --- 구분선 --- */}
              <Grid item xs={12}>
                <Divider sx={{ my: 1 }} />
              </Grid>

              {/* --- 긍정적 요인 --- */}
              <Grid item xs={12} sm={3}>
                <Typography variant="body2" color="text.secondary" sx={{ color: 'success.main' }}>
                  긍정적 요인
                </Typography>
              </Grid>
              <Grid item xs={12} sm={9}>
                {prediction.positiveFactors.map((factor, index) => (
                  <Typography key={index} variant="body2" sx={{ mb: 1 }}>
                    • {factor}
                  </Typography>
                ))}
              </Grid>

              {/* --- 구분선 --- */}
              <Grid item xs={12}>
                <Divider sx={{ my: 1 }} />
              </Grid>

              {/* --- 잠재적 리스크 --- */}
              <Grid item xs={12} sm={3}>
                <Typography variant="body2" color="text.secondary" sx={{ color: 'error.main' }}>
                  잠재적 리스크
                </Typography>
              </Grid>
              <Grid item xs={12} sm={9}>
                {prediction.potentialRisks.map((risk, index) => (
                  <Typography key={index} variant="body2" sx={{ mb: 1 }}>
                    • {risk}
                  </Typography>
                ))}
              </Grid>
              
            </Grid>
          </Paper>
        </Box>
      )}
    </Paper>
  );
};

export default AiResult;