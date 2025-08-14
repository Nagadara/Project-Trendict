import React, { useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { Box, Button, ButtonGroup } from '@mui/material';

// 데이터 타입을 정의합니다.
interface ChartData {
  categories: string[];
  // [시가, 종가, 저가, 고가]
  candlestick: number[][];
  // 종가
  line: number[];
}

interface StockChartProps {
  data: ChartData;
}

const StockChart: React.FC<StockChartProps> = ({ data }) => {
  const [chartType, setChartType] = useState<'line' | 'bar' | 'candlestick'>('line');

  const upColor = '#e01e1e'; // 상승 (붉은색)
  const downColor = '#1e90ff'; // 하락 (푸른색)

  const getSeries = () => {
    switch (chartType) {
      case 'candlestick':
        return [{
          type: 'candlestick',
          data: data.candlestick,
          itemStyle: {
            color: upColor,
            color0: downColor,
            borderColor: upColor,
            borderColor0: downColor,
          }
        }];
      case 'bar':
        return [{
          type: 'bar',
          data: data.line,
          // 각 바의 색상을 동적으로 결정
          itemStyle: {
            color: (params: { dataIndex: number; }) => {
              if (params.dataIndex > 0) {
                return data.line[params.dataIndex] >= data.line[params.dataIndex - 1] ? upColor : downColor;
              }
              return upColor; // 첫 번째 데이터는 기본 색상
            }
          }
        }];
      case 'line':
      default:
        return [{
          type: 'line',
          data: data.line,
          smooth: true,
          // 시각적 매핑을 통해 상승/하락 구간 색상 변경
          visualMap: {
            show: false,
            pieces: [{
              gt: 0,
              lte: 1,
              color: upColor
            }, {
              gt: 1,
              lte: 2,
              color: downColor
            }],
            outOfRange: {
              color: '#999'
            }
          },
        }];
    }
  };

  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross'
      }
    },
    xAxis: {
      type: 'category',
      data: data.categories,
    },
    yAxis: {
      scale: true, // y축이 데이터에 맞춰 자동으로 스케일링되도록 설정
    },
    series: getSeries(),
    // 차트가 컨테이너에 꽉 차도록 grid 조정
    grid: {
      left: '10%',
      right: '10%',
      bottom: '15%'
    },
    dataZoom: [
      {
        type: 'inside', // 마우스 휠, 터치로 줌/이동
        zoomOnMouseWheel: true,
        moveOnMouseMove: true,
        moveOnMouseWheel: true
      },
      {
        type: 'slider', // 하단에 슬라이더 UI
        show: true,
        realtime: true,
        start: 0,
        end: 100
      }
    ]
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <ButtonGroup variant="outlined" aria-label="chart type button group" sx={{ mb: 2, alignSelf: 'center' }}>
        <Button onClick={() => setChartType('line')} variant={chartType === 'line' ? 'contained' : 'outlined'}>Line</Button>
        <Button onClick={() => setChartType('bar')} variant={chartType === 'bar' ? 'contained' : 'outlined'}>Bar</Button>
        <Button onClick={() => setChartType('candlestick')} variant={chartType === 'candlestick' ? 'contained' : 'outlined'}>Candlestick</Button>
      </ButtonGroup>
      <Box sx={{ flexGrow: 1 }}>
        <ReactECharts option={option} style={{ height: '100%', width: '100%' }} />
      </Box>
    </Box>
  );
};

export default StockChart;
