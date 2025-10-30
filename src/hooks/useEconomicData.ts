// hooks/useEconomicData.ts
// React Query를 활용한 경제 데이터 관리 훅

import { useQuery, useQueryClient } from 'react-query';
import { useState, useMemo, useCallback } from 'react';
import { economicApi, EconomicDataResponse, EconomicIndicatorRow, APITestResult } from '../services/economicApi';

// ============================================================================
// 타입 정의
// ============================================================================

export interface UseEconomicDataOptions {
  enabled?: boolean;
  refetchInterval?: number;
  staleTime?: number;
  cacheTime?: number;
}

export interface EconomicIndicator {
  key: string;
  name: string;
  unit: string;
  color: string;
  description: string;
  impact: string;
}

export interface CorrelationPair {
  first: string;
  second: string;
  description: string;
}

export interface UseEconomicDataReturn {
  // 데이터
  economicData: EconomicIndicatorRow[];
  chartData: any[];
  stats: EconomicDataResponse['stats'] | null;
  sources: string[];
  
  // 상태
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  isFetching: boolean;
  apiConnectionStatus: 'unknown' | 'checking' | 'success' | 'failed';
  
  // 선택된 지표
  selectedIndicator: string;
  setSelectedIndicator: (indicator: string) => void;
  currentIndicator: EconomicIndicator | undefined;
  
  // 상관관계 모드
  correlationMode: boolean;
  setCorrelationMode: (enabled: boolean) => void;
  correlationPair: CorrelationPair;
  setCorrelationPair: (pair: CorrelationPair) => void;
  
  // 지표 데이터
  indicators: EconomicIndicator[];
  correlationPairs: CorrelationPair[];
  getLatestPair: (key: string) => { value?: number; prev?: number };
  
  // API 테스트
  apiTestResults: APITestResult[];
  isTestRunning: boolean;
  showAPITest: boolean;
  setShowAPITest: (show: boolean) => void;
  runAPITest: () => Promise<void>;
  
  // 액션
  refetch: () => void;
  clearCache: () => void;
  
  // 디버깅 (개발환경)
  debug?: {
    totalDataPoints: number;
    cacheStats: any;
    queryKey: string;
    baseUrl: string;
  };
}

// ============================================================================
// 기본값 및 상수
// ============================================================================

const DEFAULT_OPTIONS: UseEconomicDataOptions = {
  enabled: true,
  refetchInterval: 300000,     // 5분마다 자동 새로고침 (경제 데이터는 자주 변하지 않음)
  staleTime: 300000,          // 5분 동안 fresh 상태 유지
  cacheTime: 1800000          // 30분 동안 캐시 보관
};

const INDICATORS: EconomicIndicator[] = [
  {
    key: "treasuryRate",
    name: "미국 국채 10년",
    unit: "%",
    color: "#3b82f6",
    description: "장기 금리 동향을 나타내는 핵심 지표",
    impact: "높아지면 대출금리 상승, 주식보다 채권 매력도 증가"
  },
  {
    key: "fedRate",
    name: "연준 기준금리",
    unit: "%",
    color: "#10b981",
    description: "미국 연방준비제도의 기준 금리",
    impact: "경기 과열시 올리고, 침체시 낮춰서 경기 조절"
  },
  {
    key: "inflation",
    name: "인플레이션율",
    unit: "%",
    color: "#f59e0b",
    description: "물가 상승률을 나타내는 지표",
    impact: "높아지면 돈의 가치 하락, 연준이 금리 인상 고려"
  },
  {
    key: "cpi",
    name: "소비자물가지수",
    unit: "pt",
    color: "#8b5cf6",
    description: "소비자가 구매하는 상품과 서비스의 가격 수준",
    impact: "CPI 상승률이 인플레이션율과 직결됨"
  }
];

const CORRELATION_PAIRS: CorrelationPair[] = [
  { 
    first: "fedRate", 
    second: "treasuryRate", 
    description: "연준 금리와 국채 수익률은 강한 양의 상관관계" 
  },
  { 
    first: "inflation", 
    second: "fedRate", 
    description: "인플레이션 상승 시 연준이 금리를 올리는 패턴" 
  },
  { 
    first: "cpi", 
    second: "inflation", 
    description: "CPI 변화율이 인플레이션을 직접 반영" 
  },
  { 
    first: "treasuryRate", 
    second: "inflation", 
    description: "인플레이션 기대가 장기 금리에 반영됨" 
  }
];

// ============================================================================
// 메인 훅
// ============================================================================

export const useEconomicData = (options: UseEconomicDataOptions = {}): UseEconomicDataReturn => {
  const queryClient = useQueryClient();
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };

  // =========================================================================
  // 지표 선택 상태 관리
  // =========================================================================

  const [selectedIndicator, setSelectedIndicator] = useState<string>("treasuryRate");
  const [correlationMode, setCorrelationMode] = useState<boolean>(false);
  const [correlationPair, setCorrelationPair] = useState<CorrelationPair>(CORRELATION_PAIRS[0]);

  // =========================================================================
  // API 테스트 상태 관리
  // =========================================================================

  const [apiTestResults, setApiTestResults] = useState<APITestResult[]>([]);
  const [isTestRunning, setIsTestRunning] = useState<boolean>(false);
  const [showAPITest, setShowAPITest] = useState<boolean>(false);

  // =========================================================================
  // React Query 설정
  // =========================================================================

  const queryKey = ['economic-data'];

  const {
    data,
    isLoading,
    isError,
    error,
    isFetching,
    refetch
  } = useQuery({
    queryKey,
    queryFn: async () => {
      return economicApi.fetchEconomicData();
    },
    enabled: mergedOptions.enabled,
    staleTime: mergedOptions.staleTime,
    cacheTime: mergedOptions.cacheTime,
    refetchInterval: mergedOptions.refetchInterval,
    onError: (error) => {
      console.error('🚨 경제 데이터 로딩 에러:', error);
    },
    onSuccess: (data) => {
      // console.log('✅ 경제 데이터 로딩 성공:', {
        dataPoints: data.data.length,
        dateRange: data.stats.dateRange
      });
    }
  });

  // =========================================================================
  // 데이터 가공
  // =========================================================================

  const economicData = useMemo(() => {
    return data?.data || [];
  }, [data]);

  const stats = useMemo(() => {
    return data?.stats || null;
  }, [data]);

  const sources = useMemo(() => {
    return data?.sources || [];
  }, [data]);

  // API 연결 상태 자동 감지
  const apiConnectionStatus = useMemo((): 'unknown' | 'checking' | 'success' | 'failed' => {
    if (isLoading || isFetching) return 'checking';
    if (isError) return 'failed';
    if (data && economicData.length > 0) return 'success';
    return 'unknown';
  }, [isLoading, isFetching, isError, data, economicData.length]);

  // 현재 선택된 지표 정보
  const currentIndicator = useMemo(() => {
    return INDICATORS.find(ind => ind.key === selectedIndicator);
  }, [selectedIndicator]);

  // =========================================================================
  // 차트 데이터 생성
  // =========================================================================

  const chartData = useMemo(() => {
    if (correlationMode) {
      // 상관관계 차트 데이터
      const firstKey = correlationPair.first as keyof EconomicIndicatorRow;
      const secondKey = correlationPair.second as keyof EconomicIndicatorRow;
      
      return economicData.filter(r => 
        (r as any)[firstKey] != null && (r as any)[secondKey] != null
      ).map(r => ({
        period: r.period,
        year: r.year,
        [firstKey]: (r as any)[firstKey],
        [secondKey]: (r as any)[secondKey]
      }));
    }
    
    // 개별 지표 차트 데이터
    return economicData
      .filter((r) => (r as any)[selectedIndicator] != null)
      .map((r) => ({
        year: r.year,
        period: r.period,
        treasuryRate: r.treasuryRate,
        fedRate: r.fedRate,
        cpi: r.cpi,
        inflation: r.inflation,
      }));
  }, [economicData, selectedIndicator, correlationMode, correlationPair]);

  // =========================================================================
  // 지표 분석 함수
  // =========================================================================

  const getLatestPair = useCallback((key: string): { value?: number; prev?: number } => {
    const available = economicData.filter(r => (r as any)[key] != null && r.period);
    if (available.length === 0) return { value: undefined, prev: undefined };
    
    const last = available[available.length - 1];
    const period = last.period as string;
    const [yy, mm] = period.split('-').map(n => parseInt(n, 10));
    const prevPeriod = `${yy - 1}-${mm < 10 ? `0${mm}` : `${mm}`}`;
    
    const periodMap = new Map(economicData.filter(r => r.period).map(r => [r.period as string, r]));
    const prevRow = periodMap.get(prevPeriod);
    
    return {
      value: (last as any)[key] as number | undefined,
      prev: prevRow ? ((prevRow as any)[key] as number | undefined) : undefined,
    };
  }, [economicData]);

  // =========================================================================
  // API 테스트 기능
  // =========================================================================

  const runAPITest = useCallback(async () => {
    setIsTestRunning(true);
    setShowAPITest(true);
    
    try {
      const results = await economicApi.runAPITests();
      setApiTestResults(results);
    } catch (error) {
      console.error('🚨 API 테스트 실행 실패:', error);
      setApiTestResults([]);
    } finally {
      setIsTestRunning(false);
    }
  }, []);

  // =========================================================================
  // 액션 함수들
  // =========================================================================

  const clearCache = useCallback(() => {
    queryClient.invalidateQueries(queryKey);
    economicApi.clearCache();
  }, [queryClient, queryKey]);

  // =========================================================================
  // 디버깅 정보 (개발환경)
  // =========================================================================

  const debug = useMemo(() => {
    if (process.env.NODE_ENV !== 'development') return undefined;

    return {
      totalDataPoints: economicData.length,
      cacheStats: economicApi.getCacheStats(),
      queryKey: JSON.stringify(queryKey),
      baseUrl: economicApi['baseUrl'] || 'unknown'
    };
  }, [economicData.length, queryKey]);

  // =========================================================================
  // 반환값
  // =========================================================================

  return {
    // 데이터
    economicData,
    chartData,
    stats,
    sources,
    
    // 상태
    isLoading,
    isError,
    error: error as Error | null,
    isFetching,
    apiConnectionStatus,
    
    // 선택된 지표
    selectedIndicator,
    setSelectedIndicator,
    currentIndicator,
    
    // 상관관계 모드
    correlationMode,
    setCorrelationMode,
    correlationPair,
    setCorrelationPair,
    
    // 지표 데이터
    indicators: INDICATORS,
    correlationPairs: CORRELATION_PAIRS,
    getLatestPair,
    
    // API 테스트
    apiTestResults,
    isTestRunning,
    showAPITest,
    setShowAPITest,
    runAPITest,
    
    // 액션
    refetch,
    clearCache,
    
    // 디버깅
    debug
  };
};

// ============================================================================
// 추가 유틸리티 훅들
// ============================================================================

// 차트 데이터 포맷팅 훅
export const useChartFormatters = () => {
  const formatTooltipValue = useCallback((value: any, name: string) => {
    const indicator = INDICATORS.find(ind => ind.key === name);
    return [`${value}${indicator?.unit || ""}`, indicator?.name || name];
  }, []);

  const formatPeriodLabel = useCallback((period: string) => {
    return period.replace('-', '년 ') + '월';
  }, []);

  const formatAxisLabel = useCallback((value: any, unit?: string) => {
    return `${value}${unit || ""}`;
  }, []);

  return {
    formatTooltipValue,
    formatPeriodLabel,
    formatAxisLabel
  };
};

// 지표 비교 분석 훅
export const useIndicatorAnalysis = (economicData: EconomicIndicatorRow[]) => {
  const getChangeAnalysis = useCallback((key: string) => {
    const available = economicData.filter(r => (r as any)[key] != null);
    if (available.length < 2) return null;

    const recent = available.slice(-12); // 최근 12개월
    const values = recent.map(r => (r as any)[key] as number);
    
    const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
    const latest = values[values.length - 1];
    const trend = latest > avg ? 'increasing' : 'decreasing';
    
    return {
      latest,
      average: avg,
      trend,
      volatility: Math.sqrt(values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / values.length)
    };
  }, [economicData]);

  const getCorrelationStrength = useCallback((key1: string, key2: string) => {
    const validData = economicData.filter(r => 
      (r as any)[key1] != null && (r as any)[key2] != null
    );
    
    if (validData.length < 3) return null;

    const values1 = validData.map(r => (r as any)[key1] as number);
    const values2 = validData.map(r => (r as any)[key2] as number);
    
    const mean1 = values1.reduce((sum, val) => sum + val, 0) / values1.length;
    const mean2 = values2.reduce((sum, val) => sum + val, 0) / values2.length;
    
    let numerator = 0;
    let sumSq1 = 0;
    let sumSq2 = 0;
    
    for (let i = 0; i < values1.length; i++) {
      const diff1 = values1[i] - mean1;
      const diff2 = values2[i] - mean2;
      numerator += diff1 * diff2;
      sumSq1 += diff1 * diff1;
      sumSq2 += diff2 * diff2;
    }
    
    const correlation = numerator / Math.sqrt(sumSq1 * sumSq2);
    
    return {
      correlation: isNaN(correlation) ? 0 : correlation,
      strength: Math.abs(correlation) > 0.7 ? 'strong' : 
                Math.abs(correlation) > 0.4 ? 'moderate' : 'weak',
      dataPoints: validData.length
    };
  }, [economicData]);

  return {
    getChangeAnalysis,
    getCorrelationStrength
  };
};