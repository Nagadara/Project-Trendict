import React from 'react';
import { Typography, Paper, Grid, Box, Icon } from '@mui/material';
import {
  TrendingUp, TrendingDown, ShowChart, BarChart, PieChart,
  Business, AttachMoney, Percent, CorporateFare
} from '@mui/icons-material';

// ... (interface definitions remain the same)
interface StockInfo {
  marketType: 'KOSPI' | 'KOSDAQ'; stockCode: string; stockName: string;
  open: number; high: number; low: number; week52high: number; week52low: number;
  proxyPrice: number; volume: number; tradeValue: number; marketCap: number;
  foreignRatio: number; per: number; pbr: number; dividendYield: number;
}

interface StockInfoDisplayProps {
  info: StockInfo;
}


const InfoItem: React.FC<{ icon: React.ElementType; label: string; value: string | number; unit?: string; color?: string }> = ({ icon, label, value, unit, color }) => (
  <Grid item xs={12} sm={6} md={4} lg={6}>
    <Box sx={{ display: 'flex', alignItems: 'center', py: 1 }}>
      <Icon component={icon} sx={{ mr: 1.5, color: 'text.secondary' }} />
      <Box>
        <Typography variant="body2" color="text.secondary">{label}</Typography>
        <Typography variant="body1" fontWeight="medium" sx={{ color }}>
          {typeof value === 'number' ? value.toLocaleString() : value}
          {unit && ` ${unit}`}
        </Typography>
      </Box>
    </Box>
  </Grid>
);

const StockInfoDisplay: React.FC<StockInfoDisplayProps> = ({ info }) => {
  const priceItems = [
    { icon: ShowChart, label: '시가', value: info.open },
    { icon: TrendingUp, label: '고가', value: info.high, color: 'success.main' },
    { icon: TrendingDown, label: '저가', value: info.low, color: 'error.main' },
    { icon: TrendingUp, label: '52주 최고', value: info.week52high, color: 'success.main' },
    { icon: TrendingDown, label: '52주 최저', value: info.week52low, color: 'error.main' },
    { icon: AttachMoney, label: '대용가', value: info.proxyPrice },
  ];

  const tradingItems = [
    { icon: BarChart, label: '거래량', value: info.volume, unit: '주' },
    { icon: AttachMoney, label: '거래대금', value: info.tradeValue, unit: '원' },
    { icon: Business, label: '시가총액', value: info.marketCap, unit: '백만원' },
    { icon: CorporateFare, label: '외국인비율', value: info.foreignRatio, unit: '%' },
    { icon: PieChart, label: 'PER', value: info.per },
    { icon: PieChart, label: 'PBR', value: info.pbr },
    { icon: Percent, label: '배당수익률', value: info.dividendYield, unit: '%' },
  ];

  return (
    <Paper 
      elevation={2} 
      sx={{ 
        p: 3, 
        backgroundColor: '#f8f9fa',
        border: '1px solid #dee2e6'
      }}
    >
      {/* 1. 전체를 감싸는 Flexbox 컨테이너 */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        
        {/* 2. 왼쪽 영역 (종목 정보) */}
        <Box>
          <Typography variant="h4" component="h1" gutterBottom sx={{ mb: 0 }}>
            {info.stockName}
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            {info.marketType} | {info.stockCode}
          </Typography>
        </Box>

        {/* 3. 오른쪽 영역 (가격 및 거래 정보) */}
        {/* flex: 1 로 남은 공간을 모두 차지하고, ml: 4 로 왼쪽과 간격을 줌 */}
        <Box sx={{ flex: 1, ml: 4 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Grid container>{priceItems.map(item => <InfoItem key={item.label} {...item} />)}</Grid>
            </Grid>
            <Grid item xs={12} md={6}>
              <Grid container>{tradingItems.map(item => <InfoItem key={item.label} {...item} />)}</Grid>
            </Grid>
          </Grid>
        </Box>

      </Box>
    </Paper>
  );
};

export default StockInfoDisplay;