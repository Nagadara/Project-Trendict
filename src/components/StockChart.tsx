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

    const series = [];
    const grid = [];

    // 선택된 기간에 따라 dataZoom의 start 값을 동적으로 계산합니다.
    let startValue = 0;
    const totalDataPoints = processedData.categories.length;

    if (totalDataPoints > 0) {
      let pointsToShow = 0;
      switch (currentPeriod) {
        case '실시간':
          pointsToShow = totalDataPoints; // 실시간은 받은 데이터 전체를 보여줌
          break;
        case '1W':
          pointsToShow = 7;
          break;
        case '1M':
          pointsToShow = 22; // 영업일 기준 약 1달
          break;
        case '3M':
          pointsToShow = 66; // 영업일 기준 약 3달
          break;
        case '1Y':
          pointsToShow = 252; // 영업일 기준 약 1년
          break;
        default:
          pointsToShow = totalDataPoints;
      }

      // 가지고 있는 데이터보다 더 많이 보여달라고 할 수는 없으므로, 최대값을 제한
      const effectivePointsToShow = Math.min(pointsToShow, totalDataPoints);
      startValue = 100 - (effectivePointsToShow / totalDataPoints) * 100;
    }

    const newOption = {
      animation: false,
      legend: {
        bottom: 10, left: 'center', data: [stockInfo.stockName, '거래량', '예측'],
        icon: 'rect'
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' },
        formatter: (params) => {
          if (!params || params.length === 0) return '';

          const dataIndex = params[0].dataIndex; // 현재 데이터의 인덱스 가져오기
          const date = params[0].axisValue;
          let tooltipString = `${date}<br/><br/>`;

          // [핵심] 차트 타입과 상관없이 항상 candlestick 데이터에서 OHLC 값을 가져옵니다.
          const candleData = processedData.candlestick[dataIndex];
          if (!candleData) return tooltipString; // 데이터가 없으면 종료

          const open = candleData[0];
          const close = candleData[1];
          const low = candleData[2];
          const high = candleData[3];

          params.forEach(param => {
            const seriesName = param.seriesName;
            const marker = param.marker;

            if (seriesName === '거래량') {
              const volume = param.value[1];
              const formattedVolume = parseFloat(volume).toLocaleString(undefined, {
                minimumFractionDigits: 0,
                maximumFractionDigits: 1
              });
              tooltipString += `${marker} ${seriesName}: <strong>${formattedVolume}</strong><br/>`;
            } else if (param.seriesType === 'candlestick' || param.seriesType === 'line') {
              // 이제 어떤 차트 타입이든 모든 값을 표시할 수 있습니다.
              tooltipString += `${marker} <strong>${seriesName}</strong><br/>`;
              tooltipString += `&nbsp;&nbsp;시가: ${open.toLocaleString()}<br/>`;
              tooltipString += `&nbsp;&nbsp;종가: ${close.toLocaleString()}<br/>`;
              tooltipString += `&nbsp;&nbsp;저가: ${low.toLocaleString()}<br/>`;
              tooltipString += `&nbsp;&nbsp;고가: ${high.toLocaleString()}<br/>`;
            }
          });
          return tooltipString;
        }
      },
      axisPointer: { link: [{ xAxisIndex: 'all' }] },
      xAxis: [
        { type: 'category', data: processedData.categories, scale: true, boundaryGap: false, axisLine: { onZero: false }, min: 'dataMin', max: 'dataMax' },
        { type: 'category', gridIndex: 1, data: processedData.categories, scale: true, boundaryGap: false, axisLine: { onZero: false }, axisLabel: { show: false }, min: 'dataMin', max: 'dataMax' }
      ],
      yAxis: [
        // Y축 scale: true를 제거하여 확대/축소 시 세로축이 고정되도록 합니다.
        //{ splitArea: { show: true } },
        { splitArea: { show: true } },
        {
          gridIndex: 1, splitNumber: 3,
          axisLabel: {
            show: true,
            formatter: (value: number) => {
              if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
              if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
              return value.toLocaleString(undefined, {
                minimumFractionDigits: 0, // 소수점이 없으면 굳이 표시하지 않음
                maximumFractionDigits: 3  // 소수점을 최대 3자리까지만 표시
              });
            }
          },
        }
      ],
      // [최종 수정] grid 설정을 여기서 변경합니다.
      grid: [
        {
          //캔들스틱 차트
          left: '8%',
          right: '8%',
          top: '10%',
          height: '48%',
          containLabel: true
        },
        {
          //거래량 차트
          left: '8%',
          right: '8%',
          top: '66%',
          height: '18%',
          containLabel: true
        }
      ],
      dataZoom: [
        // dataZoom은 X축에만 적용되도록 합니다.
        // filterMode: 'none' 차트가 가로축을 침범하면 넣기, 단 넣을 시 색상이 초기화되고 candlestick의 크기가 매우 작아지는 버그 있음
        { type: 'inside', xAxisIndex: [0, 1], start: startValue, end: 100 },
        { show: true, type: 'slider', xAxisIndex: [0, 1], top: '85%', start: startValue, end: 100 }
      ],
      series: [
        {
          name: stockInfo.stockName,
          type: chartType,
          data: chartType === 'candlestick' ? processedData.candlestick : processedData.line,

          ...(chartType === 'candlestick'
            ? {
                itemStyle: { color: upColor, color0: downColor, borderColor: undefined, borderColor0: undefined },
                barWidth: '60%'
              }
            : {
                smooth: true,
                symbol: 'none',
                lineStyle: { color: mainChartColor },
                emphasis: { itemStyle: { color: mainChartColor, borderColor: mainChartColor } },
                barWidth: '60%',
                clip: true,
                areaStyle: {
                  color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                    { offset: 0, color: isOverallUp ? upColorArea : downColorArea },
                    { offset: 1, color: 'rgba(255, 255, 255, 0)' }
                  ])
                }
              }
          )
        },
        {
          name: '거래량', type: 'bar', xAxisIndex: 1, yAxisIndex: 1,
          data: processedData.volumes,
          itemStyle: { color: ({ value }: { value: any[] }) => (value[2] === 1 ? upColor : downColor) },
          barWidth: '60%', large:true
        }
      ]
    };
    setCurrentOption(newOption);
  }, [processedData, chartType, stockInfo]);

  const hasChartData = chartData && chartData.categories && chartData.categories.length > 0;
  const periodButtons: ChartPeriod[] = ['실시간', '1W', '1M', '3M', '1Y'];

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
    </Box>
  );
};

export default StockChart;