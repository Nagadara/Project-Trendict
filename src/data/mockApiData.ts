// Helper function to generate randomized chart data for a stock
const generateStockData = (basePrice: number, days: number) => {
  const data = {
    categories: [] as string[],
    candlestick: [] as number[][],
    line: [] as number[],
  };

  let currentDate = new Date();
  currentDate.setDate(currentDate.getDate() - days);
  let lastClose = basePrice;

  for (let i = 0; i < days; i++) {
    const open = lastClose * (1 + (Math.random() * 0.02 - 0.01));
    const close = open * (1 + (Math.random() * 0.06 - 0.03));
    const high = Math.max(open, close) * (1 + Math.random() * 0.02);
    const low = Math.min(open, close) * (1 - Math.random() * 0.02);

    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const day = String(currentDate.getDate()).padStart(2, '0');
    
    data.categories.push(`${year}-${month}-${day}`);
    data.candlestick.push([
      parseFloat(open.toFixed(2)),
      parseFloat(close.toFixed(2)),
      parseFloat(low.toFixed(2)),
      parseFloat(high.toFixed(2))
    ]);
    data.line.push(parseFloat(close.toFixed(2)));

    lastClose = close;
    currentDate.setDate(currentDate.getDate() + 1);
  }
  return data;
};

// --- Stock Database ---
const stockDatabase: { [key: string]: any } = {
  '028050': {
    info: {
      marketType: 'KOSPI', stockCode: '028050', stockName: '삼성E&A',
      open: 51000, high: 53000, low: 50500, week52high: 60000, week52low: 40000,
      proxyPrice: 51500, volume: 1234567, tradeValue: 64197484000, marketCap: 12345678,
      foreignRatio: 25.5, per: 15.5, pbr: 1.2, dividendYield: 2.1,
    },
    chartData: generateStockData(52000, 365 * 2),
  },
  '066570': {
    info: {
      marketType: 'KOSPI', stockCode: '066570', stockName: 'LG전자',
      open: 95000, high: 96500, low: 94800, week52high: 120000, week52low: 90000,
      proxyPrice: 95200, volume: 876543, tradeValue: 83024589000, marketCap: 15876543,
      foreignRatio: 30.1, per: 12.8, pbr: 0.9, dividendYield: 1.5,
    },
    chartData: generateStockData(95800, 365 * 2),
  },
  '035720': {
    info: {
      marketType: 'KOSPI', stockCode: '035720', stockName: '카카오',
      open: 43000, high: 43500, low: 42800, week52high: 65000, week52low: 38000,
      proxyPrice: 43100, volume: 2345678, tradeValue: 101234567000, marketCap: 19123456,
      foreignRatio: 22.8, per: 35.2, pbr: 2.1, dividendYield: 0.5,
    },
    chartData: generateStockData(43200, 365 * 2),
  }
};

// --- Main Export ---
export const mockApiData = {
  getStockData: (stockCode: string) => {
    return stockDatabase[stockCode] || null;
  },
  // 자동완성용 데이터 제공 함수
  getAllStocks: () => {
    return Object.keys(stockDatabase).map(code => ({
      code: code,
      name: stockDatabase[code].info.stockName,
    }));
  },
  indices: [
    { name: '코스피', value: 2785.49, change: 10.21, changePercent: 0.37, flag: '🇰🇷' },
    { name: '코스닥', value: 854.12, change: -2.55, changePercent: -0.30, flag: '🇰🇷' },
    { name: '나스닥', value: 17688.88, change: 21.32, changePercent: 0.12, flag: '🇺🇸' },
    { name: 'S&P 500', value: 5477.90, change: 4.77, changePercent: 0.09, flag: '🇺🇸' },
  ],
};
