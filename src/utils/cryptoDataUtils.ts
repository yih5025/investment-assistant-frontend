// utils/cryptoDataUtils.ts

/**
 * 백엔드에서 오는 문자열 숫자를 안전하게 number로 변환
 * 
 * 왜 이 함수가 필요한가:
 * - 백엔드에서 "110925.00000000" 같은 문자열로 숫자 전송
 * - parseFloat는 NaN을 반환할 수 있어서 기본값 처리 필요
 * - null, undefined, 빈 문자열 등 edge case 처리 필요
 */
export function safeParseFloat(value: string | null | undefined, defaultValue: number = 0): number {
    if (!value || value === '') return defaultValue;
    
    const parsed = parseFloat(value);
    return isNaN(parsed) ? defaultValue : parsed;
  }
  
  /**
   * 통화 포맷팅 (달러)
   * 
   * 단위별 축약 처리: $1.23T, $456.7B, $89.1M, $12.3K
   */
  export function formatCurrency(value: number, currency: string = 'USD'): string {
    if (value === 0) return '$0';
    
    const abs = Math.abs(value);
    const sign = value < 0 ? '-' : '';
    
    if (abs >= 1000000000000) {
      return `${sign}$${(abs / 1000000000000).toFixed(2)}T`;
    }
    if (abs >= 1000000000) {
      return `${sign}$${(abs / 1000000000).toFixed(2)}B`;
    }
    if (abs >= 1000000) {
      return `${sign}$${(abs / 1000000).toFixed(2)}M`;
    }
    if (abs >= 1000) {
      return `${sign}$${(abs / 1000).toFixed(1)}K`;
    }
    
    return `${sign}$${abs.toLocaleString()}`;
  }
  
  /**
   * 퍼센트 포맷팅
   * 
   * +/- 부호 포함, 소수점 자리수 제어
   */
  export function formatPercent(value: number, decimals: number = 1): string {
    if (value === 0) return '0%';
    
    const sign = value > 0 ? '+' : '';
    return `${sign}${value.toFixed(decimals)}%`;
  }
  
  /**
   * 공급량 포맷팅 (암호화폐 수량)
   * 
   * 21M BTC, 100B DOGE 같은 형태
   */
  export function formatSupply(value: number): string {
    if (value === 0) return '0';
    
    const abs = Math.abs(value);
    const sign = value < 0 ? '-' : '';
    
    if (abs >= 1000000000000) {
      return `${sign}${(abs / 1000000000000).toFixed(2)}T`;
    }
    if (abs >= 1000000000) {
      return `${sign}${(abs / 1000000000).toFixed(2)}B`;
    }
    if (abs >= 1000000) {
      return `${sign}${(abs / 1000000).toFixed(2)}M`;
    }
    if (abs >= 1000) {
      return `${sign}${(abs / 1000).toFixed(1)}K`;
    }
    
    return `${sign}${abs.toLocaleString()}`;
  }
  
  /**
   * 날짜 포맷팅
   * 
   * ISO 문자열을 사용자 친화적 형태로 변환
   */
  export function formatDate(dateString: string): string {
    try {
      const date = new Date(dateString);
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
   * 
   * "3시간 전", "2일 전" 같은 형태
   */
  export function formatTimeAgo(dateString: string): string {
    try {
      const date = new Date(dateString);
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
      
      return formatDate(dateString);
    } catch {
      return '알 수 없음';
    }
  }
  
  /**
   * 김치프리미엄 색상 결정
   * 
   * 프리미엄 수치에 따른 색상 클래스 반환
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
  export function getMarketSentimentColor(sentiment: string): string {
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
  export function getRiskLevelStyle(riskLevel: string): { color: string; bgColor: string } {
    switch (riskLevel) {
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
   * 숫자 범위에 따른 점수/등급 계산
   * 
   * GitHub 스타, 커밋 수 등을 등급으로 변환
   */
  export function getGradeFromNumber(value: number, thresholds: number[]): string {
    const grades = ['D', 'C', 'B-', 'B', 'B+', 'A-', 'A', 'A+'];
    
    for (let i = thresholds.length - 1; i >= 0; i--) {
      if (value >= thresholds[i]) {
        return grades[Math.min(i + 1, grades.length - 1)];
      }
    }
    
    return grades[0]; // 최저 등급
  }
  
  /**
   * GitHub 활동도 등급 계산
   * 
   * 커밋 수, 스타 수 등을 종합하여 등급 산출
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
   * 
   * 수치에 따른 시장 심리 텍스트 및 색상 반환
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
   * 
   * 김치프리미엄에서 거래비용을 뺀 순수익 계산
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
   * 
   * 현재가가 최고점/최저점으로부터 얼마나 떨어져 있는지 계산
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
   * 
   * 문자열 숫자들을 number로 변환하고 기본값 처리
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
   * 
   * InvestmentAPIResponse의 문자열 숫자들을 일괄 변환
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
   * 
   * 김치프리미엄 거래소 비교 데이터 정렬용
   */
  export const sortingFunctions = {
    premium_desc: (a: any, b: any) => b.premium_percentage - a.premium_percentage,
    premium_asc: (a: any, b: any) => a.premium_percentage - b.premium_percentage,
    volume_desc: (a: any, b: any) => Math.max(b.korean_volume_usd, b.global_volume_usd) - Math.max(a.korean_volume_usd, a.global_volume_usd),
    volume_asc: (a: any, b: any) => Math.max(a.korean_volume_usd, a.global_volume_usd) - Math.max(b.korean_volume_usd, b.global_volume_usd),
  };
  
  /**
   * 디바운스 헬퍼
   * 
   * 검색이나 필터링에서 과도한 API 호출 방지
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