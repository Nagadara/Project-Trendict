
// API 응답을 가정한 모의 데이터
/**
 * 5년치 KOSPI 지수 모의 데이터 (2020-08-01 ~ 2025-08-30)
 * - 데이터 생성 로직: ... (기존과 동일)
 * - 5분 단위 데이터 생성: 마지막 날짜(2025-08-30)에 대해 09:00 ~ 15:30 동안의 5분 단위 데이터를 생성합니다.
 */
export const mockApiData = (() => {
  // --- 일별 데이터 생성부 ---
  const dailyData: {
    categories: string[];
    candlestick: number[][];
    line: number[];
  } = {
    categories: [],
    candlestick: [],
    line: [],
  };

  const startDate = new Date('2020-08-01');
  const endDate = new Date('2025-07-31');
  let currentDate = new Date(startDate);
  let lastClose = 2350.00;

  while (currentDate <= endDate) {
    const open = lastClose;
    const changePercent = Math.random() * 0.052 - 0.025;
    const close = open * (1 + changePercent);
    const high = Math.max(open, close) * (1 + Math.random() * 0.015);
    const low = Math.min(open, close) * (1 - Math.random() * 0.015);

    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const day = String(currentDate.getDate()).padStart(2, '0');
    
    dailyData.categories.push(`${year}-${month}-${day}`);
    dailyData.candlestick.push([
      parseFloat(open.toFixed(2)),
      parseFloat(close.toFixed(2)),
      parseFloat(low.toFixed(2)),
      parseFloat(high.toFixed(2))
    ]);
    dailyData.line.push(parseFloat(close.toFixed(2)));

    lastClose = close;
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // --- 기존 1개월 데이터 (2025년 8월) ---
  const existingAugustData = {
    categories: [
      '2025-08-01', '2025-08-02', '2025-08-03', '2025-08-04', '2025-08-05',
      '2025-08-06', '2025-08-07', '2025-08-08', '2025-08-09', '2025-08-10',
      '2025-08-11', '2025-08-12', '2025-08-13', '2025-08-14', '2025-08-15',
      '2025-08-16', '2025-08-17', '2025-08-18', '2025-08-19', '2025-08-20',
      '2025-08-21', '2025-08-22', '2025-08-23', '2025-08-24', '2025-08-25',
      '2025-08-26', '2025-08-27', '2025-08-28', '2025-08-29', '2025-08-30'
    ],
    candlestick: [
      [2700.00, 2715.33, 2695.11, 2720.45], [2715.33, 2728.91, 2710.23, 2735.66],
      [2728.91, 2720.15, 2718.44, 2733.12], [2720.15, 2745.88, 2715.99, 2750.01],
      [2745.88, 2730.42, 2725.76, 2751.87], [2730.42, 2755.11, 2728.65, 2760.32],
      [2755.11, 2768.00, 2750.18, 2772.43], [2768.00, 2759.21, 2755.88, 2775.10],
      [2759.21, 2740.77, 2738.91, 2761.54], [2740.77, 2735.19, 2729.43, 2745.98],
      [2735.19, 2722.68, 2719.54, 2740.11], [2722.68, 2705.81, 2701.33, 2725.92],
      [2705.81, 2719.99, 2700.56, 2722.04], [2719.99, 2733.14, 2718.78, 2738.49],
      [2733.14, 2749.50, 2730.21, 2755.00], [2749.50, 2760.18, 2745.33, 2765.91],
      [2760.18, 2751.72, 2748.99, 2763.48], [2751.72, 2768.33, 2750.05, 2771.12],
      [2768.33, 2780.94, 2765.71, 2785.22], [2780.94, 2775.43, 2770.11, 2788.67],
      [2775.43, 2763.81, 2760.29, 2779.54], [2763.81, 2755.90, 2751.48, 2769.31],
      [2755.90, 2748.12, 2742.66, 2760.15], [2748.12, 2761.40, 2745.87, 2765.22],
      [2761.40, 2777.65, 2759.99, 2780.01], [2777.65, 2789.10, 2775.32, 2795.88],
      [2789.10, 2781.25, 2778.44, 2793.19], [2781.25, 2770.98, 2765.73, 2785.41],
      [2770.98, 2775.28, 2768.99, 2779.67], [2775.28, 2785.49, 2772.01, 2790.11]
    ],
    line: [
      2715.33, 2728.91, 2720.15, 2745.88, 2730.42, 2755.11, 2768.00,
      2759.21, 2740.77, 2735.19, 2722.68, 2705.81, 2719.99, 2733.14,
      2749.50, 2760.18, 2751.72, 2768.33, 2780.94, 2775.43, 2763.81,
      2755.90, 2748.12, 2761.40, 2777.65, 2789.10, 2781.25, 2770.98,
      2775.28, 2785.49
    ],
  };

  const combinedDailyData = {
    categories: [...dailyData.categories, ...existingAugustData.categories],
    candlestick: [...dailyData.candlestick, ...existingAugustData.candlestick],
    line: [...dailyData.line, ...existingAugustData.line],
  };

  // --- 5분 단위 데이터 생성부 ---
  const intradayData: {
    categories: string[];
    candlestick: number[][];
    line: number[];
  } = {
    categories: [],
    candlestick: [],
    line: [],
  };
  
  const lastDayData = existingAugustData.candlestick[existingAugustData.candlestick.length - 1];
  let intra_lastClose = lastDayData[0]; // 시가로 시작
  const intra_startDate = new Date('2025-08-30T09:00:00');
  const intra_endDate = new Date('2025-08-30T15:30:00');
  let intra_currentDate = new Date(intra_startDate);

  while (intra_currentDate <= intra_endDate) {
    const open = intra_lastClose;
    const changePercent = Math.random() * 0.001 - 0.0005; // -0.05% ~ +0.05% 변동
    const close = open * (1 + changePercent);
    const high = Math.max(open, close) * (1 + Math.random() * 0.0005);
    const low = Math.min(open, close) * (1 - Math.random() * 0.0005);

    const hours = String(intra_currentDate.getHours()).padStart(2, '0');
    const minutes = String(intra_currentDate.getMinutes()).padStart(2, '0');

    intradayData.categories.push(`${hours}:${minutes}`);
    intradayData.candlestick.push([
      parseFloat(open.toFixed(2)),
      parseFloat(close.toFixed(2)),
      parseFloat(low.toFixed(2)),
      parseFloat(high.toFixed(2))
    ]);
    intradayData.line.push(parseFloat(close.toFixed(2)));

    intra_lastClose = close;
    intra_currentDate.setMinutes(intra_currentDate.getMinutes() + 5);
  }
  
  // --- 최종 데이터 객체 반환 ---
  return {
    indices: [
      { name: '코스피', value: 2785.49, change: 10.21, changePercent: 0.37, flag: '🇰🇷' },
      { name: '코스닥', value: 854.12, change: -2.55, changePercent: -0.30, flag: '🇰🇷' },
      { name: '나스닥', value: 17688.88, change: 21.32, changePercent: 0.12, flag: '🇺🇸' },
      { name: 'S&P 500', value: 5477.90, change: 4.77, changePercent: 0.09, flag: '🇺🇸' },
    ],
    chart: {
      daily: combinedDailyData,
      intraday: intradayData,
    }
  };
})();
