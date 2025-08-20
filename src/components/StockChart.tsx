import React, { useState, useMemo, useRef } from 'react';
import { Box, Button, ButtonGroup } from '@mui/material';
import ReactECharts from 'echarts-for-react/lib/core';
import * as echarts from 'echarts/core';
import { LineChart, BarChart, CandlestickChart } from 'echarts/charts';
import {
  GridComponent,
  TooltipComponent,
  DataZoomComponent,
  VisualMapComponent,
  MarkAreaComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { TimePeriod } from '../pages/DashboardPage';

// ECharts 모듈 등록
echarts.use([
  LineChart, BarChart, CandlestickChart,
  GridComponent, TooltipComponent, DataZoomComponent, VisualMapComponent, MarkAreaComponent,
  CanvasRenderer
]);

// 데이터 타입 정의
interface ChartData {
  categories: string[];
  candlestick: number[][];
  line: number[];
}

interface StockChartProps {
  data: ChartData;
  initialZoom: { start: number; end: number };
  timePeriod: TimePeriod;
  onTimePeriodChange: (period: TimePeriod) => void;
}

const StockChart: React.FC<StockChartProps> = ({
  data,
  initialZoom,
  timePeriod,
  onTimePeriodChange,
}) => {
  const chartRef = useRef<any>(null);
  const [chartType, setChartType] = useState<'line' | 'bar' | 'candlestick'>('line');
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  const upColor = '#e01e1e'; // 상승 (붉은색)
  const downColor = '#1e90ff'; // 하락 (푸른색)

  const getLinePieces = useMemo(() => {
    const pieces = [];
    if (data.line.length <= 1) return [];

    let lastStatus = 'up';
    let startIndex = 0;

    for (let i = 1; i < data.line.length; i++) {
      const currentStatus = data.line[i] >= data.line[i - 1] ? 'up' : 'down';
      if (currentStatus !== lastStatus) {
        pieces.push({
          gte: startIndex,
          lte: i - 1,
          color: lastStatus === 'up' ? upColor : downColor,
        });
        startIndex = i - 1;
        lastStatus = currentStatus;
      }
    }
    pieces.push({
      gte: startIndex,
      lte: data.line.length - 1,
      color: lastStatus === 'up' ? upColor : downColor,
    });
    return pieces;
  }, [data.line]);

  const getSeries = useMemo(() => {
    const baseSeries = {
      'line': { type: 'line', data: data.line, smooth: true },
      'bar': {
        type: 'bar',
        data: data.line,
        itemStyle: {
          color: (params: { dataIndex: number }) =>
            params.dataIndex > 0 && data.line[params.dataIndex] < data.line[params.dataIndex - 1] ? downColor : upColor,
        },
      },
      'candlestick': {
        type: 'candlestick',
        data: data.candlestick,
        itemStyle: {
          color: upColor,
          color0: downColor,
          borderColor: upColor,
          borderColor0: downColor,
        },
      },
    }[chartType];

    return [baseSeries];
  }, [chartType, data, upColor, downColor]);

  const handleDataZoom = (params: any) => {
    if (!params.batch || params.batch.length === 0) return;

    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    debounceTimer.current = setTimeout(() => {
      const { start, end } = params.batch[0];
      const visibleRange = end - start;
      const totalPoints = data.categories.length;
      const visiblePoints = totalPoints * visibleRange / 100;

      let newPeriod: TimePeriod | null = null;
      if (timePeriod === 'day') {
        if (visibleRange < 95) return;
      } else {
        if (visiblePoints < 2) newPeriod = 'day';
        else if (visiblePoints <= 10) newPeriod = 'week';
        else if (visiblePoints <= 45) newPeriod = 'month';
        else newPeriod = 'year';
      }

      if (newPeriod && newPeriod !== timePeriod) {
        onTimePeriodChange(newPeriod);
      }
    }, 200);
  };

  const getXAxisLabelFormatter = () => {
    const totalPoints = data.categories.length;
    let interval = Math.ceil(totalPoints / 5);

    return (value: string, index: number) => {
      if (index % interval !== 0) return '';
      if (timePeriod === 'year') return value.substring(0, 7);
      if (timePeriod === 'month') return value.substring(5);
      return value;
    };
  };

  const option = useMemo(() => ({
    tooltip: { trigger: 'axis', axisPointer: { type: 'cross' } },
    xAxis: {
      type: 'category',
      data: data.categories,
      axisLabel: {
        formatter: getXAxisLabelFormatter(),
      },
    },
    yAxis: { scale: true },
    grid: { left: '5%', right: '5%', bottom: '10%', top: '5%', containLabel: true },
    dataZoom: [
      { type: 'inside', start: initialZoom.start, end: initialZoom.end },
      { type: 'slider', show: true, start: initialZoom.start, end: initialZoom.end },
    ],
    visualMap: chartType === 'line' ? {
      show: false,
      dimension: 0,
      pieces: getLinePieces,
    } : undefined,
    series: getSeries,
  }), [data, getSeries, initialZoom, chartType, getLinePieces, timePeriod]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <ButtonGroup variant="outlined" sx={{ mb: 2, alignSelf: 'center' }}>
        <Button onClick={() => setChartType('line')} variant={chartType === 'line' ? 'contained' : 'outlined'}>Line</Button>
        <Button onClick={() => setChartType('bar')} variant={chartType === 'bar' ? 'contained' : 'outlined'}>Bar</Button>
        <Button onClick={() => setChartType('candlestick')} variant={chartType === 'candlestick' ? 'contained' : 'outlined'}>Candlestick</Button>
      </ButtonGroup>
      <Box sx={{ flexGrow: 1 }}>
        <ReactECharts
          ref={chartRef}
          echarts={echarts}
          option={option}
          onEvents={{ 'datazoom': handleDataZoom }}
          style={{ height: '100%', width: '100%' }}
        />
      </Box>
    </Box>
  );
};

export default StockChart;