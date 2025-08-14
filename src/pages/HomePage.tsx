import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Typography, Box, keyframes } from '@mui/material';
import ReactECharts from 'echarts-for-react';

// 키프레임 애니메이션 정의
const fadeIn = keyframes`
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
`;

function GetRandomInt(max) {
  return Math.floor(Math.random() * max);
}

const HomePage: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate('/dashboard');
    }, 3000); // 3초 후에 대시보드로 이동

    return () => clearTimeout(timer); // 컴포넌트 언마운트 시 타이머 제거
  }, [navigate]);

  // 애니메이션을 위한 간단한 차트 옵션
  const chartOption = {
    xAxis: {
      type: 'category',
      show: false,
    },
    yAxis: {
      type: 'value',
      show: false,
    },
    series: [{
      data: [GetRandomInt(300), GetRandomInt(300), GetRandomInt(300), GetRandomInt(300), GetRandomInt(300), GetRandomInt(300), GetRandomInt(300)],
      type: 'line',
      smooth: true,
      showSymbol: false,
      lineStyle: {
        width: 3,
        color: '#5470C6'
      }
    }],
    grid: {
      top: '5%',
      bottom: '5%',
      left: '5%',
      right: '5%'
    }
  };

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '80vh',
          animation: `${fadeIn} 1.5s ease-in-out`,
        }}
      >
        <Typography component="h1" variant="h2" gutterBottom sx={{ fontWeight: 'bold' }}>
          Trendict
        </Typography>
        <Box sx={{ width: '100%', height: '200px' }}>
          <ReactECharts option={chartOption} style={{ height: '100%', width: '100%' }} />
        </Box>
        <Typography component="h2" variant="h6" sx={{ mt: 2, color: 'text.secondary' }}>
          AI 기반 주가 예측 서비스
        </Typography>
      </Box>
    </Container>
  );
};

export default HomePage;
