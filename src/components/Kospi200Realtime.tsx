import React, { useState, useEffect } from 'react';
import useWebSocket, { ReadyState } from 'react-use-websocket';
import { Paper, Typography, Box, Chip } from '@mui/material';

const Kospi200Realtime: React.FC = () => {
  // 1. 웹소켓 서버 주소 설정 (main.py의 /ws/kospi200)
  //    - http:// 대신 ws:// 프로토콜을 사용합니다.
  const WS_URL = 'ws://127.0.0.1:8000/ws/kospi200';

  // 2. useWebSocket 훅을 사용하여 서버에 연결
  const { lastMessage, readyState } = useWebSocket(WS_URL);

  // 3. 수신한 데이터를 저장할 상태
  const [kospiData, setKospiData] = useState<any>(null);

  // 4. 서버로부터 새로운 메시지(lastMessage)가 도착할 때마다 실행
  useEffect(() => {
    if (lastMessage !== null) {
      // KIS 웹소켓 데이터는 '0|H0UPANC0|...' 형태의 문자열로 올 수 있습니다.
      // 먼저 콘솔에서 실제 데이터 형식을 확인하는 것이 중요합니다.
      console.log('Received WebSocket message:', lastMessage.data);

      // 데이터가 암호화된 JSON 문자열 형태일 경우 파싱합니다.
      try {
        const data = JSON.parse(lastMessage.data);
        // 필요한 데이터가 body에 있을 경우
        if (data.body) {
          setKospiData(data.body);
        }
      } catch (e) {
        // 만약 데이터가 pipe(|)로 구분된 문자열이라면 여기서 파싱 로직을 추가해야 합니다.
        // 예: const parts = lastMessage.data.split('|');
        // 지금은 단순 텍스트로 표시합니다.
        setKospiData({ raw: lastMessage.data });
      }
    }
  }, [lastMessage]);

  // 5. 연결 상태를 시각적으로 표시하기 위한 헬퍼
  const connectionStatus = {
    [ReadyState.CONNECTING]: { text: '연결 중...', color: 'warning' },
    [ReadyState.OPEN]: { text: '실시간 연결 중', color: 'success' },
    [ReadyState.CLOSING]: { text: '연결 종료 중...', color: 'warning' },
    [ReadyState.CLOSED]: { text: '연결 끊김', color: 'error' },
    [ReadyState.UNINSTANTIATED]: { text: '준비 안됨', color: 'default' },
  }[readyState];

  return (
    <Paper sx={{ p: 2, height: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">코스피200 실시간</Typography>
        <Chip 
          label={connectionStatus.text} 
          color={connectionStatus.color as any} 
          size="small" 
        />
      </Box>
      
      {kospiData ? (
        <Box>
          {/* KIS API 응답 필드명(예: bstp_nmix_prpr)에 맞춰 수정해야 합니다. */}
          <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
            {kospiData.bstp_nmix_prpr || '데이터 수신 중...'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            기준 일자: {kospiData.bsop_date || '-'}
          </Typography>
          {/* 받은 원본 데이터를 보고 싶을 때 사용 */}
          {/* <pre>{JSON.stringify(kospiData, null, 2)}</pre> */}
        </Box>
      ) : (
        <Typography color="text.secondary">
          서버로부터 실시간 데이터를 기다리는 중입니다...
        </Typography>
      )}
    </Paper>
  );
};

export default Kospi200Realtime;