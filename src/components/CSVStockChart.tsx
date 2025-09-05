import React, { useEffect, useMemo, useState } from 'react';
import Papa from 'papaparse';
import Chart from 'react-apexcharts';
import { Box, Stack, FormControlLabel, Switch, ToggleButtonGroup, ToggleButton, Typography } from '@mui/material';

type Row = Record<string, any>;
type SeriesDataPoint = { x: number; y: number | [number, number, number, number] };
type RangeKey = '1W' | '1M' | '3M' | '1Y' | 'ALL';

type Props = {
  csvPath: string;
  height?: number;
  defaultType?: 'candlestick' | 'line';
  defaultRange?: RangeKey;
};

const CSVStockChart: React.FC<Props> = ({
  csvPath,
  height = 460,
  defaultType = 'candlestick',
  defaultRange = '3M',
}) => {
  const [chartType, setChartType] = useState<'candlestick' | 'line'>(defaultType);
  const [showVolume, setShowVolume] = useState(true);
  const [logScale, setLogScale] = useState(false);
  const [showSMA20, setShowSMA20] = useState(true);
  const [showSMA60, setShowSMA60] = useState(false);
  const [range, setRange] = useState<RangeKey>(defaultRange);

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setErr(null);
    const normalized = csvPath.replace(/\\/g, '/').replace(/^\/?public\//, '/');
    Papa.parse(normalized, {
      download: true,
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
      complete: (res) => {
        setRows(res.data as Row[]);
        setLoading(false);
      },
      error: (e) => {
        setErr(`CSV 로드 실패: ${e.message}`);
        setLoading(false);
      },
    });
  }, [csvPath]);

  const keys = useMemo(() => {
    const lower = (k: string) => k.trim().toLowerCase();
    const allKeys = rows.length ? Object.keys(rows[0]) : [];
    const find = (...cands: string[]) => allKeys.find((k) => cands.includes(lower(k)));
    return {
      date: find('date', '날짜'),
      open: find('open', '시가'),
      high: find('high', '고가'),
      low: find('low', '저가'),
      close: find('close', '종가'),
      volume: find('volume', '거래량'),
    };
  }, [rows]);

  const parsed = useMemo(() => {
    if (!rows.length || !keys.date || !keys.close) return [];
    const toTime = (v: any) => {
      if (typeof v === 'number') return v;
      const s = String(v).replace(/[./]/g, '-');
      const t = new Date(s).getTime();
      return isNaN(t) ? null : t;
    };
    return rows
      .map((r) => {
        const t = toTime(r[keys.date!]);
        return t
          ? {
              t,
              open: Number(r[keys.open!]),
              high: Number(r[keys.high!]),
              low: Number(r[keys.low!]),
              close: Number(r[keys.close!]),
              volume: keys.volume ? Number(r[keys.volume!]) : undefined,
            }
          : null;
      })
      .filter(Boolean)
      .sort((a: any, b: any) => a.t - b.t);
  }, [rows, keys]);

  const filtered = useMemo(() => {
    if (range === 'ALL') return parsed;
    const last = parsed.at(-1)?.t ?? Date.now();
    const day = 24 * 3600 * 1000;
    const spans: Record<RangeKey, number> = {
      '1W': 7 * day,
      '1M': 30 * day,
      '3M': 90 * day,
      '1Y': 365 * day,
      'ALL': Number.POSITIVE_INFINITY,
    };
    const from = last - spans[range];
    return parsed.filter((d) => d.t >= from);
  }, [parsed, range]);

  const calcSMA = (period: number) => {
    const out: { x: number; y: number }[] = [];
    let sum = 0;
    const q: number[] = [];
    for (const d of filtered) {
      q.push(d.close);
      sum += d.close;
      if (q.length > period) sum -= q.shift()!;
      if (q.length === period) out.push({ x: d.t, y: +(sum / period).toFixed(4) });
    }
    return out;
  };

  const sma20 = useMemo(() => calcSMA(20), [filtered]);
  const sma60 = useMemo(() => calcSMA(60), [filtered]);

  const series = useMemo(() => {
    const baseTimePrice: SeriesDataPoint[] =
      chartType === 'candlestick'
        ? filtered
            .filter((d) => [d.open, d.high, d.low].every((v) => typeof v === 'number'))
            .map((d) => ({
              x: d.t,
              y: [d.open!, d.high!, d.low!, d.close],
            }))
        : filtered.map((d) => ({ x: d.t, y: d.close }));

    const s: any[] = [
      { name: chartType === 'candlestick' ? 'KODEX200 OHLC' : 'Close', type: chartType, data: baseTimePrice },
    ];

    if (showVolume && filtered.some((d) => typeof d.volume === 'number')) {
      s.push({ name: 'Volume', type: 'column', data: filtered.map((d) => ({ x: d.t, y: d.volume ?? 0 })), yAxisIndex: 1 });
    }
    if (showSMA20 && sma20.length) s.push({ name: 'SMA 20', type: 'line', data: sma20 });
    if (showSMA60 && sma60.length) s.push({ name: 'SMA 60', type: 'line', data: sma60 });

    return s;
  }, [filtered, chartType, showVolume, sma20, sma60, showSMA20, showSMA60]);

  const options: ApexCharts.ApexOptions = useMemo(
    () => ({
      chart: { id: 'kodex200-chart', animations: { enabled: true }, toolbar: { show: true } },
      xaxis: { type: 'datetime', labels: { datetimeUTC: false } },
      yaxis: [
        { seriesName: 'KODEX200', decimalsInFloat: 2, logarithmic: logScale },
        { show: showVolume, seriesName: 'Volume', opposite: true, decimalsInFloat: 0 },
      ],
      stroke: { width: [1.5, 1, 2, 2], dashArray: [0, 0, 0, 5] },
      plotOptions: { candlestick: { colors: { upward: '#d32f2f', downward: '#1976d2' } } },
      tooltip: { shared: true, x: { format: 'yyyy-MM-dd' } },
      legend: { position: 'top', horizontalAlign: 'left' },
    }),
    [logScale, showVolume]
  );

  if (loading) return <Typography sx={{ p: 2 }}>CSV 불러오는 중…</Typography>;
  if (err) return <Typography color="error" sx={{ p: 2 }}>{err}</Typography>;
  if (!filtered.length) return <Typography sx={{ p: 2 }}>표시할 데이터가 없습니다.</Typography>;

  return (
    <Box sx={{ height, minHeight: height, flex: '0 0 auto' }}>
      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1, flexWrap: 'wrap' }}>
        <ToggleButtonGroup size="small" value={range} exclusive onChange={(_, v) => v && setRange(v)}>
          <ToggleButton value="1W">1W</ToggleButton>
          <ToggleButton value="1M">1M</ToggleButton>
          <ToggleButton value="3M">3M</ToggleButton>
          <ToggleButton value="1Y">1Y</ToggleButton>
          <ToggleButton value="ALL">ALL</ToggleButton>
        </ToggleButtonGroup>
        <ToggleButtonGroup size="small" value={chartType} exclusive onChange={(_, v) => v && setChartType(v)}>
          <ToggleButton value="candlestick">Candles</ToggleButton>
          <ToggleButton value="line">Line</ToggleButton>
        </ToggleButtonGroup>
        <FormControlLabel control={<Switch checked={showVolume} onChange={(e) => setShowVolume(e.target.checked)} />} label="거래량" />
        <FormControlLabel control={<Switch checked={logScale} onChange={(e) => setLogScale(e.target.checked)} />} label="로그스케일" />
        <FormControlLabel control={<Switch checked={showSMA20} onChange={(e) => setShowSMA20(e.target.checked)} />} label="SMA20" />
        <FormControlLabel control={<Switch checked={showSMA60} onChange={(e) => setShowSMA60(e.target.checked)} />} label="SMA60" />
      </Stack>
      <Chart options={options} series={series} type="line" height="100%" />
    </Box>
  );
};

export default CSVStockChart;
