// utils/formatters.ts
// 모든 포맷팅 함수를 통합한 유틸리티 (개선된 버전)

/**
 * 안전한 숫자 파싱 함수
 */
export function safeParseFloat(value: string | number | null | undefined, defaultValue: number = 0): number {
  if (value === null || value === undefined || value === '') return defaultValue;
  
  if (typeof value === 'number') {
    return isNaN(value) || !isFinite(value) ? defaultValue : value;
  }
  
  if (typeof value === 'string') {
    const parsed = parseFloat(value.replace(/[^\d.-]/g, ''));
    return isNaN(parsed) || !isFinite(parsed) ? defaultValue : parsed;
  }
  
  return defaultValue;
}

/**
 * 숫자가 유효한지 확인
 */
export function isValidNumber(value: any): boolean {
  return typeof value === 'number' && !isNaN(value) && isFinite(value);
}

/**
 * 통합 화폐 포맷터 (USD)
 * 소액 암호화폐(PEPE, SHIB 등)를 위한 정밀한 소수점 처리
 */
export function formatCurrency(value: number | string, decimals?: number): string {
  const numValue = safeParseFloat(value);
  if (!isValidNumber(numValue)) return '$0';
  
  const abs = Math.abs(numValue);
  const sign = numValue < 0 ? '-' : '';
  
  // 커스텀 소수점이 지정된 경우
  if (decimals !== undefined) {
    // 축약 단위 처리 시에도 커스텀 소수점 적용
    if (abs >= 1000000000000) {
      return `${sign}$${(abs / 1000000000000).toFixed(decimals)}T`;
    } else if (abs >= 1000000000) {
      return `${sign}$${(abs / 1000000000).toFixed(decimals)}B`;
    } else if (abs >= 1000000) {
      return `${sign}$${(abs / 1000000).toFixed(decimals)}M`;
    } else if (abs >= 1000) {
      return `${sign}$${(abs / 1000).toFixed(decimals)}K`;
    } else {
      return `${sign}$${abs.toFixed(decimals)}`;
    }
  }
  
  // 소액 암호화폐 처리 (0.01달러 미만)
  if (abs < 0.01) {
    if (abs < 0.000001) {
      // 1 마이크로달러 미만 (8자리 소수점)
      return `${sign}$${abs.toFixed(8)}`;
    } else if (abs < 0.0001) {
      // 0.0001달러 미만 (6자리 소수점)
      return `${sign}$${abs.toFixed(6)}`;
    } else {
      // 0.01달러 미만 (4자리 소수점)
      return `${sign}$${abs.toFixed(4)}`;
    }
  }
  
  // 일반적인 가격 처리
  if (abs < 1) {
    return `${sign}$${abs.toFixed(3)}`;
  } else if (abs < 1000) {
    return `${sign}$${abs.toFixed(2)}`;
  } else if (abs >= 1000000000000) {
    return `${sign}$${(abs / 1000000000000).toFixed(2)}T`;
  } else if (abs >= 1000000000) {
    return `${sign}$${(abs / 1000000000).toFixed(2)}B`;
  } else if (abs >= 1000000) {
    return `${sign}$${(abs / 1000000).toFixed(2)}M`;
  } else if (abs >= 1000) {
    return `${sign}$${(abs / 1000).toFixed(1)}K`;
  }
  
  return `${sign}$${abs.toLocaleString()}`;
}

/**
 * 원화 포맷터 (KRW) - 개선된 버전
 * 달러와 같은 방식으로 소수점 동적 처리 + 한국식 단위 (조/억/만)
 */
export function formatCurrencyKRW(value: number | string, decimals?: number): string {
  const numValue = safeParseFloat(value);
  if (!isValidNumber(numValue)) return '₩0';
  
  const abs = Math.abs(numValue);
  const sign = numValue < 0 ? '-' : '';
  
  // 커스텀 소수점이 지정된 경우
  if (decimals !== undefined) {
    // 축약 단위 처리 시에도 커스텀 소수점 적용
    if (abs >= 1000000000000) {
      return `${sign}₩${(abs / 1000000000000).toFixed(decimals)}조`;
    } else if (abs >= 100000000) {
      return `${sign}₩${(abs / 100000000).toFixed(decimals)}억`;
    } else if (abs >= 10000) {
      return `${sign}₩${(abs / 10000).toFixed(decimals)}만`;
    } else {
      return `${sign}₩${abs.toFixed(decimals)}`;
    }
  }
  
  // 소액 암호화폐 처리 (1원 미만) - 달러와 동일한 로직
  if (abs < 1) {
    if (abs < 0.000001) {
      // 1 마이크로원 미만 (8자리 소수점)
      return `${sign}₩${abs.toFixed(8)}`;
    } else if (abs < 0.0001) {
      // 0.0001원 미만 (6자리 소수점)
      return `${sign}₩${abs.toFixed(6)}`;
    } else if (abs < 0.01) {
      // 0.01원 미만 (4자리 소수점)
      return `${sign}₩${abs.toFixed(4)}`;
    } else {
      // 1원 미만 (3자리 소수점)
      return `${sign}₩${abs.toFixed(3)}`;
    }
  }
  
  // 일반적인 가격 처리
  if (abs < 10) {
    // 10원 미만 (2자리 소수점)
    return `${sign}₩${abs.toFixed(2)}`;
  } else if (abs < 10000) {
    // 1만원 미만 (소수점 없음)
    return `${sign}₩${abs.toFixed(0)}`;
  } else if (abs >= 1000000000000) {
    // 1조원 이상
    return `${sign}₩${(abs / 1000000000000).toFixed(1)}조`;
  } else if (abs >= 100000000) {
    // 1억원 이상
    return `${sign}₩${(abs / 100000000).toFixed(1)}억`;
  } else if (abs >= 10000) {
    // 1만원 이상
    return `${sign}₩${(abs / 10000).toFixed(1)}만`;
  }
  
  return `${sign}₩${abs.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}`;
}

/**
 * 원화 포맷터 (정밀 모드) - 축약 없이 모든 소수점 표시
 * 거래소에서 정확한 가격 표시가 필요한 경우 사용
 */
export function formatCurrencyKRWPrecise(value: number | string, maxDecimals: number = 8): string {
  const numValue = safeParseFloat(value);
  if (!isValidNumber(numValue)) return '₩0';
  
  const abs = Math.abs(numValue);
  const sign = numValue < 0 ? '-' : '';
  
  // 의미있는 소수점 자리 계산
  let decimals = 0;
  if (abs < 0.000001) {
    decimals = Math.min(8, maxDecimals);
  } else if (abs < 0.0001) {
    decimals = Math.min(6, maxDecimals);
  } else if (abs < 0.01) {
    decimals = Math.min(4, maxDecimals);
  } else if (abs < 1) {
    decimals = Math.min(3, maxDecimals);
  } else if (abs < 10) {
    decimals = Math.min(2, maxDecimals);
  } else if (abs < 1000) {
    decimals = Math.min(1, maxDecimals);
  }
  
  return `${sign}₩${abs.toFixed(decimals)}`;
}

/**
 * 퍼센트 포맷터
 */
export function formatPercent(value: number | string, decimals: number = 2): string {
  const numValue = safeParseFloat(value);
  if (!isValidNumber(numValue)) return '0%';
  
  const sign = numValue > 0 ? '+' : '';
  return `${sign}${numValue.toFixed(decimals)}%`;
}

/**
 * 거래량/공급량 포맷터
 */
export function formatVolume(value: number | string): string {
  const numValue = safeParseFloat(value);
  if (!isValidNumber(numValue)) return '0';
  
  const abs = Math.abs(numValue);
  const sign = numValue < 0 ? '-' : '';
  
  if (abs >= 1000000000000) {
    return `${sign}${(abs / 1000000000000).toFixed(2)}T`;
  } else if (abs >= 1000000000) {
    return `${sign}${(abs / 1000000000).toFixed(2)}B`;
  } else if (abs >= 1000000) {
    return `${sign}${(abs / 1000000).toFixed(2)}M`;
  } else if (abs >= 1000) {
    return `${sign}${(abs / 1000).toFixed(1)}K`;
  }
  
  return `${sign}${abs.toLocaleString()}`;
}

/**
 * 공급량 포맷터 (암호화폐 수량)
 */
export function formatSupply(value: number | string): string {
  return formatVolume(value);
}

/**
 * 숫자 포맷터 (일반 숫자)
 */
export function formatNumber(value: number | string, decimals: number = 0): string {
  const numValue = safeParseFloat(value);
  if (!isValidNumber(numValue)) return '0';
  
  if (decimals > 0) {
    return numValue.toFixed(decimals);
  }
  
  return numValue.toLocaleString();
}

/**
 * 가격 포맷터 (타입에 따라 화폐 단위 자동 선택)
 */
export function formatPrice(price: number | string, type: 'crypto' | 'stock', precise: boolean = false): string {
  if (type === 'crypto') {
    // 암호화폐는 원화 표시 (빗썸 데이터)
    return precise ? formatCurrencyKRWPrecise(price) : formatCurrencyKRW(price);
  } else {
    // 주식은 달러 표시 (미국 주식)
    return formatCurrency(price);
  }
}

/**
 * 날짜 포맷팅
 */
export function formatDate(dateString: string | Date): string {
  try {
    const date = dateString instanceof Date ? dateString : new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch {
    return '날짜 없음';
  }
}

/**
 * 상대 시간 표시
 */
export function formatTimeAgo(dateString: string | Date): string {
  try {
    const date = dateString instanceof Date ? dateString : new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffMinutes < 60) {
      return diffMinutes <= 1 ? '방금 전' : `${diffMinutes}분 전`;
    }
    if (diffHours < 24) {
      return `${diffHours}시간 전`;
    }
    if (diffDays < 30) {
      return `${diffDays}일 전`;
    }
    
    return formatDate(date);
  } catch {
    return '알 수 없음';
  }
}

/**
 * 타임스탬프 포맷터 (다양한 형식 지원)
 */
export function formatTimestamp(timestamp: string | number | Date): string {
  try {
    let date: Date;
    
    if (timestamp instanceof Date) {
      date = timestamp;
    } else if (typeof timestamp === 'number') {
      // Unix timestamp (초 단위) 또는 milliseconds 자동 감지
      date = new Date(timestamp > 1000000000000 ? timestamp : timestamp * 1000);
    } else {
      date = new Date(timestamp);
    }
    
    return formatTimeAgo(date);
  } catch {
    return '알 수 없음';
  }
}

/**
 * 김치프리미엄 색상 결정
 */
export function getKimchiPremiumColor(premium: number): string {
  if (premium > 3) return 'text-green-500';
  if (premium > 1) return 'text-green-400';
  if (premium > -1) return 'text-yellow-400';
  if (premium > -3) return 'text-red-400';
  return 'text-red-500';
}

/**
 * 시장 심리에 따른 색상
 */
export function getMarketSentimentColor(sentiment: string | null | undefined): string {
  if (!sentiment) {
    return 'text-gray-400';
  }
  
  switch (sentiment.toLowerCase()) {
    case '강세':
    case 'bullish':
      return 'text-green-400';
    case '약세':
    case 'bearish':
      return 'text-red-400';
    case '중립':
    case 'neutral':
    default:
      return 'text-yellow-400';
  }
}

/**
 * 위험도에 따른 색상 및 배지 스타일
 */
export function getRiskLevelStyle(riskLevel: string | null | undefined): { color: string; bgColor: string } {
  if (!riskLevel) {
    return { color: 'text-gray-400', bgColor: 'bg-gray-500/20' };
  }
  
  switch (riskLevel.toLowerCase()) {
    case '높음':
    case 'high':
      return { color: 'text-red-400', bgColor: 'bg-red-500/20' };
    case '보통':
    case 'medium':
      return { color: 'text-yellow-400', bgColor: 'bg-yellow-500/20' };
    case '낮음':
    case 'low':
    default:
      return { color: 'text-green-400', bgColor: 'bg-green-500/20' };
  }
}

/**
 * GitHub 활동도 등급 계산
 */
export function getGitHubActivityGrade(commits: number, stars: number): { grade: string; color: string } {
  // 가중 점수 계산 (커밋이 더 중요)
  const score = (commits * 0.7) + (Math.log10(stars + 1) * 30);
  
  if (score >= 200) return { grade: 'A+', color: 'text-green-400 bg-green-500/20' };
  if (score >= 150) return { grade: 'A', color: 'text-green-400 bg-green-500/20' };
  if (score >= 100) return { grade: 'A-', color: 'text-green-400 bg-green-500/20' };
  if (score >= 70) return { grade: 'B+', color: 'text-blue-400 bg-blue-500/20' };
  if (score >= 50) return { grade: 'B', color: 'text-blue-400 bg-blue-500/20' };
  if (score >= 30) return { grade: 'B-', color: 'text-blue-400 bg-blue-500/20' };
  if (score >= 15) return { grade: 'C+', color: 'text-yellow-400 bg-yellow-500/20' };
  if (score >= 5) return { grade: 'C', color: 'text-yellow-400 bg-yellow-500/20' };
  
  return { grade: 'D', color: 'text-red-400 bg-red-500/20' };
}

/**
 * 펀딩비 해석
 */
export function interpretFundingRate(rate: number): { text: string; color: string; intensity: string } {
  if (rate > 0.01) {
    return { text: "기관들이 강한 Long 우세", color: "text-green-400", intensity: "높음" };
  }
  if (rate > 0.005) {
    return { text: "기관들이 약한 Long 우세", color: "text-green-400", intensity: "보통" };
  }
  if (rate > -0.005) {
    return { text: "중립적 포지션", color: "text-yellow-400", intensity: "낮음" };
  }
  if (rate > -0.01) {
    return { text: "기관들이 약한 Short 우세", color: "text-red-400", intensity: "보통" };
  }
  
  return { text: "기관들이 강한 Short 우세", color: "text-red-400", intensity: "높음" };
}

/**
 * 차익거래 수익성 계산
 */
export function calculateArbitrageProfit(
  koreanPrice: number, 
  globalPrice: number, 
  transactionCostPercent: number = 0.5
): {
  grossProfit: number;
  transactionCost: number;
  netProfit: number;
  profitability: boolean;
  profitabilityText: string;
} {
  const grossProfit = koreanPrice - globalPrice;
  const transactionCost = koreanPrice * (transactionCostPercent / 100);
  const netProfit = grossProfit - transactionCost;
  const profitability = netProfit > 0;
  
  let profitabilityText = '';
  if (netProfit > koreanPrice * 0.02) {
    profitabilityText = '높은 수익성';
  } else if (netProfit > koreanPrice * 0.01) {
    profitabilityText = '보통 수익성';
  } else if (netProfit > 0) {
    profitabilityText = '낮은 수익성';
  } else {
    profitabilityText = '수익성 없음';
  }
  
  return {
    grossProfit,
    transactionCost,
    netProfit,
    profitability,
    profitabilityText
  };
}

/**
 * ATH/ATL 거리 계산
 */
export function calculatePriceDistances(currentPrice: number, ath: number, atl: number): {
  athDistance: number;
  atlDistance: number;
  athDistanceText: string;
  atlDistanceText: string;
} {
  const athDistance = ((ath - currentPrice) / ath) * 100;
  const atlDistance = ((currentPrice - atl) / atl) * 100;
  
  const athDistanceText = athDistance > 50 ? '매우 낮음' : 
                         athDistance > 20 ? '낮음' : 
                         athDistance > 5 ? '약간 낮음' : '최고점 근처';
                         
  const atlDistanceText = atlDistance > 1000 ? '매우 높음' : 
                         atlDistance > 500 ? '높음' : 
                         atlDistance > 100 ? '보통' : '최저점 근처';
  
  return {
    athDistance,
    atlDistance,
    athDistanceText,
    atlDistanceText
  };
}

/**
 * 백엔드 API 응답을 UI 친화적 형태로 변환
 */
export function transformAPIResponse<T>(data: any, transformations: Record<string, (value: any) => any>): T {
  const result = { ...data };
  
  Object.entries(transformations).forEach(([key, transformer]) => {
    if (key in result) {
      try {
        result[key] = transformer(result[key]);
      } catch (error) {
        console.warn(`Failed to transform field ${key}:`, error);
        // 변환 실패시 원본 값 유지
      }
    }
  });
  
  return result as T;
}

/**
 * 투자 분석 데이터 변환 헬퍼
 */
export function transformInvestmentData(data: any) {
  return transformAPIResponse(data, {
    'market_data.current_price_usd': (val: string) => safeParseFloat(val),
    'market_data.current_price_krw': (val: string) => safeParseFloat(val),
    'market_data.price_change_percentage_24h': (val: string) => safeParseFloat(val),
    'market_data.price_change_percentage_7d': (val: string) => safeParseFloat(val),
    'market_data.price_change_percentage_30d': (val: string) => safeParseFloat(val),
    'market_data.ath_usd': (val: string) => safeParseFloat(val),
    'market_data.ath_change_percentage': (val: string) => safeParseFloat(val),
    'market_data.atl_usd': (val: string) => safeParseFloat(val),
    'market_data.atl_change_percentage': (val: string) => safeParseFloat(val),
    'kimchi_premium.korean_price_usd': (val: string) => safeParseFloat(val),
    'kimchi_premium.global_avg_price_usd': (val: string) => safeParseFloat(val),
    'kimchi_premium.kimchi_premium_percent': (val: string) => safeParseFloat(val),
    'kimchi_premium.price_diff_usd': (val: string) => safeParseFloat(val),
    'derivatives.avg_funding_rate': (val: string) => safeParseFloat(val),
    'derivatives.total_open_interest': (val: string) => safeParseFloat(val),
    'derivatives.volume_24h_usd': (val: string) => safeParseFloat(val),
  });
}

/**
 * 정렬 함수들
 */
export const sortingFunctions = {
  premium_desc: (a: any, b: any) => b.premium_percentage - a.premium_percentage,
  premium_asc: (a: any, b: any) => a.premium_percentage - b.premium_percentage,
  volume_desc: (a: any, b: any) => Math.max(b.korean_volume_usd || 0, b.global_volume_usd || 0) - Math.max(a.korean_volume_usd || 0, a.global_volume_usd || 0),
  volume_asc: (a: any, b: any) => Math.max(a.korean_volume_usd || 0, a.global_volume_usd || 0) - Math.max(b.korean_volume_usd || 0, b.global_volume_usd || 0),
};

/**
 * 디바운스 헬퍼
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}