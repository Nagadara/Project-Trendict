import React from 'react';
import { Paper, Typography, Box, Divider, Chip, List, ListItem, ListItemText } from '@mui/material';
import ArrowDropUpIcon from '@mui/icons-material/ArrowDropUp';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';

// props 타입 정의 (기존 프로젝트에 맞게 조정하세요)
interface Index {
  name: string;
  value: number;
  change: number;
  changePercent: number;
  flag: string;
}

interface MarketIndicesProps {
  indices: Index[];
}

const isMarketOpen = (): boolean => {
  const now = new Date();
  const utcHours = now.getUTCHours();
  const kstHours = (utcHours + 9) % 24; // 한국은 UTC+9
  const kstDay = now.getUTCDay(); // 0: 일요일, 6: 토요일

  // 주말(토, 일)이면 장 마감
  if (kstDay === 0 || kstDay === 6) {
    return false;
  }
  // 한국 시간 기준 오전 9시 ~ 오후 3시 30분 사이가 아니면 장 마감
  if (kstHours < 9 || kstHours > 15 || (kstHours === 15 && now.getUTCMinutes() > 30)) {
    return false;
  }
  return true;
};

const MarketIndices: React.FC<MarketIndicesProps> = ({ indices }) => {
  const marketOpen = isMarketOpen();

  return (
    <Paper sx={{ p: 2, height: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" gutterBottom sx={{ mb: 0 }}>
          주요 지수 현황
        </Typography>
        {/* 장 마감 알림 */}
        <Chip
          label={marketOpen ? "장 중" : "장 마감"}
          color={marketOpen ? "success" : "error"}
          size="small"
        />
      </Box>
      <Divider sx={{ my: 1 }} />

      {/* 모든 지수를 감싸는 컨테이너 */}
      <Box sx={{ minHeight: '150px' }}>
        {indices && indices.length > 0 ? (
          <List disablePadding>
            {indices.map((index) => {
              const isPositive = index.change >= 0;
              const color = isPositive ? 'error.main' : 'primary.main';

              return (
                <ListItem key={index.name} disableGutters sx={{ py: 0.5 }}>
                  <ListItemText
                    primary={
                      <Typography variant="body1" fontWeight="bold">
                        {index.flag} {index.name}
                      </Typography>
                    }
                  />
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="body1" fontWeight="bold">
                      {index.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', color }}>
                      {isPositive ? <ArrowDropUpIcon /> : <ArrowDropDownIcon />}
                      <Typography variant="body2" component="span">
                        {isPositive ? '+' : ''}{index.change.toFixed(2)}
                      </Typography>
                      <Typography variant="body2" component="span" sx={{ ml: 0.5 }}>
                        ({isPositive ? '+' : ''}{index.changePercent.toFixed(2)}%)
                      </Typography>
                    </Box>
                  </Box>
                </ListItem>
              );
            })}
          </List>
        ) : (
          // 데이터가 없을 때 표시할 내용
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '150px' }}>
            <Typography color="text.secondary">
              {marketOpen ? "데이터 수신 중..." : "장 마감"}
            </Typography>
          </Box>
        )}
      </Box>
    </Paper>
  );
};


export default MarketIndices;