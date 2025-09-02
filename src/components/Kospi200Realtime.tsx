import React, { useState, useEffect, useCallback } from 'react';
import useWebSocket, { ReadyState } from 'react-use-websocket';
import { Paper, Typography, Box, Chip } from '@mui/material';

// KIS 웹소켓 응답 Body 타입 정의
interface KospiDataBody {
  bstp_nmix_prpr: string; // 업종 지수 현재가
  bstp_nmix_prdy_vrss: string; // 업종 지수 전일 대비
  prdy_vrss_sign: string; // 전일 대비 부호 (1:상한, 2:상승, 3:보합, 4:하한, 5:하락)
  bstp_nmix_prdy_ctrt: string; // 업종 지수 전일 대비율
  bsop_date: string; // 영업 일자
}

// 부모 컴포넌트로 데이터를 전달하기 위한 Props 정의
interface Kospi200RealtimeProps {
  onDataUpdate: (data: KospiDataBody) => void;
}

const Kospi200Realtime: React.FC<Kospi200RealtimeProps> = ({ onDataUpdate }) => {
  const WS_URL = 'ws://127.0.0.1:8000/ws/kospi200';
  const { lastMessage, readyState } = useWebSocket(WS_URL, {
    shouldReconnect: () => true,
    reconnectInterval: 5000,
  });

  const [kospiData, setKospiData] = useState<KospiDataBody | null>(null);

  useEffect(() => {
    if (lastMessage?.data) {
      const data = lastMessage.data;
      if (typeof data === 'string') {
        try {
          // "0|H0UPANC0|{...}" 형태의 데이터 파싱
          const bodyStr = data.startsWith('0|') || data.startsWith('1|') ? data.split('|')[2] : data;
          const bodyData = JSON.parse(bodyStr);
          if(bodyData.bstp_nmix_prpr) {
            setKospiData(bodyData);
            onDataUpdate(bodyData); // [수정] 부모 컴포넌트로 데이터 전달
          }
        } catch (e) { /* PONG 메시지 등 무시 */ }
      }
    }
  }, [lastMessage, onDataUpdate]);

  const connectionStatus = {
    [ReadyState.CONNECTING]: { text: '연결 중...', color: 'warning' },
    [ReadyState.OPEN]: { text: '실시간 연결 중', color: 'success' },
    [ReadyState.CLOSING]: { text: '연결 종료 중...', color: 'warning' },
    [ReadyState.CLOSED]: { text: '연결 끊김', color: 'error' },
    [ReadyState.UNINSTANTIATED]: { text: '준비 안됨', color: 'default' },
  }[readyState];

  const isValidNumber = (val: string | undefined) => val && !isNaN(parseFloat(val));
  const isPositive = kospiData ? ['1', '2'].includes(kospiData.prdy_vrss_sign) : false;
  const isNegative = kospiData ? ['4', '5'].includes(kospiData.prdy_vrss_sign) : false;
  const color = isPositive ? 'error.main' : isNegative ? 'primary.main' : 'text.primary';

  return (
    <Paper sx={{ p: 2, height: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">코스피200 실시간</Typography>
        <Chip label={connectionStatus.text} color={connectionStatus.color as any} size="small" />
      </Box>
      
      {kospiData && isValidNumber(kospiData.bstp_nmix_prpr) ? (
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
            {parseFloat(kospiData.bstp_nmix_prpr).toFixed(2)}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', color }}>
            <Typography sx={{ fontWeight: 'medium' }}>
              {isValidNumber(kospiData.bstp_nmix_prdy_vrss) && `${isNegative ? '' : '+'}${parseFloat(kospiData.bstp_nmix_prdy_vrss).toFixed(2)}`}
              &nbsp;
              {isValidNumber(kospiData.bstp_nmix_prdy_ctrt) && `(${isNegative ? '' : '+'}${parseFloat(kospiData.bstp_nmix_prdy_ctrt).toFixed(2)}%)`}
            </Typography>
          </Box>
        </Box>
      ) : (
        <Typography color="text.secondary">
          {readyState === ReadyState.OPEN ? "데이터 수신 대기 중..." : "실시간 연결 시도 중..."}
        </Typography>
      )}
    </Paper>
  );
};

export default Kospi200Realtime;