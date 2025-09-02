import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Box, Button, ButtonGroup, Paper, Typography } from '@mui/material';
import ReactECharts from 'echarts-for-react/lib/core';
import * as echarts from 'echarts/core';
import { LineChart, BarChart, CandlestickChart } from 'echarts/charts';
import {
  GridComponent,
  TooltipComponent,
  DataZoomComponent,
  LegendComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import StockInfoDisplay from './StockInfoDisplay';
import { ChartPeriod } from '../pages/DashboardPage';

echarts.use([
  LineChart, BarChart, CandlestickChart,
  GridComponent, TooltipComponent, DataZoomComponent, LegendComponent,
  CanvasRenderer
]);

interface StockInfo {
  marketType: 'KOSPI' | 'KOSDAQ'; stockCode: string; stockName: string;
  open: number; high: number; low: number; week52high: number; week52low: number;
  proxyPrice: number; volume: number; tradeValue: number; marketCap: number;
  foreignRatio: number; per: number; pbr: number; dividendYield: number;
}

interface StockChartProps {
  chartData: { categories: string[]; candlestick: number[][]; line: number[]; };
  stockInfo: StockInfo;
  onPredict: () => void;
  currentPeriod: ChartPeriod;
  onPeriodChange: (period: ChartPeriod) => void;
}

const StockChart: React.FC<StockChartProps> = ({
  chartData, stockInfo, onPredict, currentPeriod, onPeriodChange
}) => {
  const chartRef = useRef<any>(null);
  const [chartType, setChartType] = useState<'candlestick' | 'line'>('candlestick');
  const [currentOption, setCurrentOption] = useState({});

  const upColor = '#e01e1e';
  const downColor = '#1e90ff';
  const upColorLight = 'rgba(224, 30, 30, 0.5)';
  const downColorLight = 'rgba(30, 144, 255, 0.5)';
  const upColorArea = 'rgba(224, 30, 30, 0.3)';
  const downColorArea = 'rgba(30, 144, 255, 0.3)';

  const processedData = useMemo(() => {
    if (!chartData || !chartData.candlestick) {
      return { categories: [], candlestick: [], line: [], volumes: [] };
    }
    const volumes = chartData.candlestick.map((item, index) => [
      index,
      Math.random() * 2000000,
      item[0] > item[1] ? -1 : 1,
    ]);
    return { ...chartData, volumes };
  }, [chartData]);

  useEffect(() => {
    const isOverallUp = processedData.line.length > 1 && processedData.line[processedData.line.length - 1] > processedData.line[0];
    const mainChartColor = isOverallUp ? upColor : downColor;

    const newOption = {
      animation: false,
      legend: {
        bottom: 10, left: 'center', data: [stockInfo.stockName, '거래량', '예측'],
        icon: 'rect'
      },
      tooltip: { trigger: 'axis', axisPointer: { type: 'cross' } },
      axisPointer: { link: [{ xAxisIndex: 'all' }] },
      xAxis: [
        { type: 'category', data: processedData.categories, scale: true, boundaryGap: false, axisLine: { onZero: false }, min: 'dataMin', max: 'dataMax' },
        { type: 'category', gridIndex: 1, data: processedData.categories, scale: true, boundaryGap: false, axisLine: { onZero: false }, axisLabel: { show: false }, min: 'dataMin', max: 'dataMax' }
      ],
      yAxis: [
        { scale: true, splitArea: { show: true } },
        {
          scale: true, gridIndex: 1, splitNumber: 3,
          axisLabel: { 
            show: true,
            formatter: (value: number) => {
              if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
              if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
              return value;
            }
          },
        }
      ],
      grid: [
        { left: '8%', right: '8%', top: '10%', height: '48%' },
        { left: '8%', right: '8%', bottom: '20%', height: '18%' }
      ],
      dataZoom: [
        { type: 'inside', xAxisIndex: [0, 1], start: 70, end: 100 },
        { show: true, type: 'slider', xAxisIndex: [0, 1], top: '85%', start: 70, end: 100 }
      ],
      series: [
        {
          name: stockInfo.stockName,
          type: chartType,
          data: chartType === 'candlestick' ? processedData.candlestick : processedData.line,
          itemStyle: { color: upColor, color0: downColor, borderColor: undefined, borderColor0: undefined },
          ...(chartType === 'line' && { lineStyle: { color: mainChartColor } }),
          smooth: chartType === 'line'
        },
        {
          name: '거래량', type: 'bar', xAxisIndex: 1, yAxisIndex: 1,
          data: processedData.volumes,
          itemStyle: { color: ({ value }: { value: any[] }) => (value[2] === 1 ? upColor : downColor) }
        }
      ]
    };
    setCurrentOption(newOption);
  }, [processedData, chartType, stockInfo]);


  const handlePredict = () => {
    const chartInstance = chartRef.current.getEchartsInstance();
    const option = chartInstance.getOption();
    if (!option || !option.series || option.series.length === 0) return;

    const originalDataLength = processedData.line.length;
    
    const lastClose = processedData.line[originalDataLength - 1];
    const predictionLine = [];
    const predictionCandlestick = [];
    let currentClose = lastClose;

    for (let i = 0; i < 30; i++) {
      const open = currentClose;
      const close = open * (1 + (Math.random() * 0.04 - 0.02));
      const high = Math.max(open, close) * (1 + Math.random() * 0.01);
      const low = Math.min(open, close) * (1 - Math.random() * 0.01);
      predictionLine.push(close);
      predictionCandlestick.push([open, close, low, high]);
      currentClose = close;
    }
    
    const lastDate = new Date(processedData.categories[originalDataLength - 1]);
    const newCategories = [...processedData.categories];
    for (let i = 0; i < 30; i++) {
      lastDate.setDate(lastDate.getDate() + 1);
      newCategories.push(`${lastDate.getFullYear()}-${String(lastDate.getMonth() + 1).padStart(2, '0')}-${String(lastDate.getDate()).padStart(2, '0')}`);
    }

    const isUpTrend = predictionLine[predictionLine.length - 1] > lastClose;
    const predictionColor = isUpTrend ? upColorLight : downColorLight;
    
    const predictionSeries = {
      name: '예측',
      type: chartType,
      data: new Array(originalDataLength - 1).fill(null).concat(
        chartType === 'line' 
        ? [lastClose, ...predictionLine] 
        : [[processedData.candlestick[originalDataLength-1][1], predictionCandlestick[0][1], predictionCandlestick[0][2], predictionCandlestick[0][3]], ...predictionCandlestick]
      ),
      itemStyle: { color: predictionColor, color0: predictionColor, borderColor: predictionColor, borderColor0: predictionColor },
      lineStyle: { color: predictionColor, type: 'dashed' },
      smooth: chartType === 'line',
      symbol: 'none',
    };

    const newDataLength = newCategories.length;
    const currentVisibleCount = originalDataLength * (option.dataZoom[0].end - option.dataZoom[0].start) / 100;
    const newStartPercent = 100 - ((currentVisibleCount + 30) / newDataLength) * 100;

    chartInstance.setOption({
      xAxis: [{ data: newCategories }, { data: newCategories }],
      dataZoom: [{ start: newStartPercent, end: 100 }, { start: newStartPercent, end: 100 }],
      series: [option.series[0], option.series[1], predictionSeries]
    });
  };
  
  useEffect(() => {
    const isOverallUp = processedData.line.length > 1 && processedData.line[processedData.line.length - 1] > processedData.line[0];
    const mainChartColor = isOverallUp ? upColor : downColor;

    const newOption = {
      animation: false,
      legend: {
        bottom: 10, left: 'center', data: [stockInfo.stockName, '거래량', '예측'],
        icon: 'rect'
      },
      tooltip: { trigger: 'axis', axisPointer: { type: 'cross' } },
      axisPointer: { link: [{ xAxisIndex: 'all' }] },
      xAxis: [
        { type: 'category', data: processedData.categories, scale: true, boundaryGap: false, axisLine: { onZero: false }, min: 'dataMin', max: 'dataMax' },
        { type: 'category', gridIndex: 1, data: processedData.categories, scale: true, boundaryGap: false, axisLine: { onZero: false }, axisLabel: { show: false }, min: 'dataMin', max: 'dataMax' }
      ],
      yAxis: [
        { scale: true, splitArea: { show: true } },
        {
          scale: true, gridIndex: 1, splitNumber: 3,
          axisLabel: { 
            show: true,
            formatter: (value: number) => {
              if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
              if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
              return value;
            }
          },
        }
      ],
      grid: [
        { left: '8%', right: '8%', top: '10%', height: '48%' },
        { left: '8%', right: '8%', bottom: '20%', height: '18%' }
      ],
      dataZoom: [
        { type: 'inside', xAxisIndex: [0, 1], start: 70, end: 100 },
        { show: true, type: 'slider', xAxisIndex: [0, 1], top: '85%', start: 70, end: 100 }
      ],
      series: [
        {
          name: stockInfo.stockName,
          type: chartType,
          data: chartType === 'candlestick' ? processedData.candlestick : processedData.line,
          
          ...(chartType === 'candlestick'
            ? { // 캔들스틱 차트의 스타일
                itemStyle: {
                  color: upColor,
                  color0: downColor,
                  borderColor: undefined,
                  borderColor0: undefined,
                }
              }
            : { // 라인 차트의 스타일
                smooth: true,
                symbol: 'none',
                lineStyle: {
                  color: mainChartColor
                },
                emphasis: {
                  itemStyle: {
                    color: mainChartColor,
                    borderColor: mainChartColor,
                  }
                },
                areaStyle: {
                  //그라데이션
                  color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                    { 
                      offset: 0,
                      color: isOverallUp ? upColorArea : downColorArea
                    },
                    {
                      offset: 1,
                      color: 'rgba(255, 255, 255, 0)'
                    }
                  ])
                }
              }
          )
        },
        {
          name: '거래량', type: 'bar', xAxisIndex: 1, yAxisIndex: 1,
          data: processedData.volumes,
          itemStyle: { color: ({ value }: { value: any[] }) => (value[2] === 1 ? upColor : downColor) }
        }
      ]
    };
    setCurrentOption(newOption);
  }, [processedData, chartType, stockInfo]);

  const hasChartData = chartData && chartData.categories && chartData.categories.length > 0;
  const periodButtons: ChartPeriod[] = ['1D', '1W', '1M', '3M', '1Y'];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* [수정] 상단 컨트롤 영역 */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1, mb: 2 }}>
        <ButtonGroup variant="outlined" size="small">
          {periodButtons.map((period) => (
            <Button key={period} onClick={() => onPeriodChange(period)} variant={currentPeriod === period ? 'contained' : 'outlined'}>
              {period}
            </Button>
          ))}
        </ButtonGroup>
        <ButtonGroup variant="outlined" size="small">
          <Button onClick={() => setChartType('candlestick')} variant={chartType === 'candlestick' ? 'contained' : 'outlined'}>Candlestick</Button>
          <Button onClick={() => setChartType('line')} variant={chartType === 'line' ? 'contained' : 'outlined'}>Line</Button>
        </ButtonGroup>
        <Button onClick={onPredict} variant="contained" size="small">종목 예측하기</Button>
      </Box>
      
      <Box sx={{ flexGrow: 1, height: 'calc(100% - 120px)' }}>
        {/* [수정] hasChartData 조건을 컴포넌트 내부에서 사용합니다. */}
        {hasChartData ? (
          <ReactECharts ref={chartRef} echarts={echarts} option={currentOption} style={{ height: '100%', width: '100%' }} />
        ) : (
          // 데이터가 없을 때 보여줄 UI를 여기에 정의합니다.
          <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%', p: 2 }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              차트 데이터 없음
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2, textAlign: 'center' }}>
              KIS 모의투자 서버에서는 장중 시간에만 과거 데이터가 제공될 수 있습니다.
            </Typography>
            <Paper sx={{ p: 2, backgroundColor: '#f5f5f5', border: '1px solid #e0e0e0' }}>
              <Typography variant="body2">현재가: {stockInfo.currentPrice.toLocaleString()} 원</Typography>
              <Typography variant="body2">시가: {stockInfo.open.toLocaleString()} 원</Typography>
              <Typography variant="body2">고가: {stockInfo.high.toLocaleString()} 원</Typography>
              <Typography variant="body2">저가: {stockInfo.low.toLocaleString()} 원</Typography>
            </Paper>
          </Box>
        )}
      </Box>

      <Box sx={{ mt: 3 }}>
        <StockInfoDisplay info={stockInfo} />
      </Box>
    </Box>
  );
};

export default StockChart;