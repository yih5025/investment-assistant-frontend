import { useState, useEffect, useCallback } from 'react';

// ETF Detail 데이터 타입 정의
interface ETFDetailData {
  symbol: string;
  name: string;
  current_price: number;
  change_amount: number;
  change_percentage: number;
  volume: number;
  volume_24h?: number;
  previous_close?: number;
  is_positive?: boolean;
  change_color: string;
  last_updated?: string;
  
  // ETF 특화 데이터
  profile?: {
    net_assets?: number;
    net_expense_ratio?: number;
    portfolio_turnover?: number;
    dividend_yield?: number;
    inception_date?: string;
    leveraged?: string;
    sectors?: Array<{
      sector: string;
      weight: number;
    }>;
    holdings?: Array<{
      symbol: string;
      description: string;
      weight: number;
    }>;
  };
  chart_data?: Array<{
    timestamp: string;
    price: number;
    volume?: number;
    datetime: string;
    raw_timestamp?: number;
  }>;
  sector_chart_data?: Array<{
    name: string;
    value: number;
    color?: string;
  }>;
  holdings_chart_data?: Array<{
    symbol: string;
    name: string;
    weight: number;
  }>;
  key_metrics?: {
    net_assets?: string;
    net_expense_ratio?: string;
    dividend_yield?: string;
    inception_year?: string;
  };
  timeframe?: string;
  market_status?: {
    is_open: boolean;
    status: string;
    current_time_et?: string;
    timezone?: string;
  };
}

interface ETFDetailState {
  data: ETFDetailData | null;
  loading: boolean;
  error: string | null;
  chartLoading: boolean;
}

interface UseETFDetailReturn extends ETFDetailState {
  fetchETFDetail: (symbol: string, timeframe?: string) => Promise<void>;
  fetchChartData: (timeframe: '1D' | '1W' | '1M', symbolOverride?: string) => Promise<void>;
  clearError: () => void;
  refreshData: () => Promise<void>;
}

/**
 * ETF 개별 상세 정보 관리 훅
 * 
 * ETF 기본 정보, 프로필, 차트 데이터, 섹터 구성, 보유종목 등을 관리합니다.
 * 백엔드 API 엔드포인트와 정확히 매칭되도록 설계되었습니다.
 */
export function useETFDetail(initialSymbol?: string): UseETFDetailReturn {
  const [state, setState] = useState<ETFDetailState>({
    data: null,
    loading: false,
    error: null,
    chartLoading: false
  });

  const [currentSymbol, setCurrentSymbol] = useState<string | null>(initialSymbol || null);
  const [currentTimeframe, setCurrentTimeframe] = useState<string>('1D');

  // ETF 상세 정보 조회 - 백엔드 /api/v1/etf/symbol/{symbol} 엔드포인트 호출 (차트 제외)
  const fetchETFDetail = useCallback(async (symbol: string, timeframe: string = '1D') => {
    if (!symbol) {
      console.warn('ETF 심볼이 제공되지 않았습니다');
      return;
    }

    // console.log(`ETF 상세 정보 조회 시작: ${symbol} (차트 제외)`);
    
    setState(prev => ({ 
      ...prev, 
      loading: true, 
      error: null 
    }));
    
    setCurrentSymbol(symbol);
    setCurrentTimeframe(timeframe);

    try {
      // 백엔드 엔드포인트: GET /api/v1/etf/symbol/{symbol} (차트 데이터 제외)
      const response = await fetch(`https://api.investment-assistant.site/api/v1/etf/symbol/${symbol.toUpperCase()}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`ETF ${symbol}을(를) 찾을 수 없습니다`);
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      // 백엔드 에러 응답 처리
      if (result.error_type || result.error) {
        throw new Error(result.message || result.error || 'ETF 정보 조회 실패');
      }

      // 백엔드 응답 구조에 맞춰 데이터 변환 (차트 데이터는 빈 배열로 초기화)
      const etfDetailData: ETFDetailData = {
        // 기본 정보 (백엔드 basic_info 필드)
        symbol: result.basic_info?.symbol || symbol,
        name: result.basic_info?.name || symbol,
        current_price: result.basic_info?.current_price || 0,
        change_amount: result.basic_info?.change_amount || 0,
        change_percentage: result.basic_info?.change_percentage || 0,
        volume: result.basic_info?.volume || 0,
        volume_24h: result.basic_info?.volume_24h || result.basic_info?.volume || 0,
        previous_close: result.basic_info?.previous_close,
        is_positive: result.basic_info?.is_positive,
        change_color: result.basic_info?.change_amount > 0 ? 'green' : 
                     result.basic_info?.change_amount < 0 ? 'red' : 'gray',
        last_updated: result.basic_info?.last_updated,
        
        // ETF 특화 데이터 (차트 제외)
        profile: result.profile,
        chart_data: [], // 초기에는 빈 배열
        sector_chart_data: result.sector_chart_data || [],
        holdings_chart_data: result.holdings_chart_data || [],
        key_metrics: result.key_metrics,
        timeframe: timeframe,
        market_status: result.basic_info?.market_status
      };

      setState(prev => ({
        ...prev,
        data: etfDetailData,
        loading: false,
        error: null
      }));

      // console.log(`ETF 상세 정보 조회 성공: ${symbol} (차트 제외)`, etfDetailData);
      
      // 상세 정보 로드 완료 후 별도로 차트 데이터 로드
      if (timeframe) {
        await fetchChartData(timeframe as '1D' | '1W' | '1M', symbol);
      }
      
    } catch (error) {
      console.error(`ETF 상세 정보 조회 실패 (${symbol}):`, error);
      
      setState(prev => ({
        ...prev,
        data: null,
        loading: false,
        error: error instanceof Error ? error.message : 'ETF 정보를 불러오는데 실패했습니다'
      }));
    }
  }, []);

  // 차트 데이터만 별도 조회 - 백엔드 /api/v1/etf/symbol/{symbol}/chart 엔드포인트 호출
  const fetchChartData = useCallback(async (timeframe: '1D' | '1W' | '1M', symbolOverride?: string) => {
    const symbolToUse = symbolOverride || currentSymbol;
    
    if (!symbolToUse) {
      console.warn('현재 ETF 심볼이 없습니다');
      return;
    }

    // console.log(`ETF 차트 데이터 조회: ${symbolToUse} (${timeframe})`);
    
    setState(prev => ({ ...prev, chartLoading: true }));
    setCurrentTimeframe(timeframe);

    try {
      // 백엔드 엔드포인트: GET /api/v1/etf/symbol/{symbol}/chart?timeframe={timeframe}
      const chartResponse = await fetch(`https://api.investment-assistant.site/api/v1/etf/symbol/${symbolToUse.toUpperCase()}/chart?timeframe=${timeframe}`);
      
      if (!chartResponse.ok) {
        console.warn(`Chart API 오류! status: ${chartResponse.status}`);
        setState(prev => ({ ...prev, chartLoading: false }));
        return;
      }

      const chartResult = await chartResponse.json();
      
      // 백엔드 에러 응답 처리
      if (chartResult.error_type || chartResult.error) {
        console.warn(`Chart data 오류: ${chartResult.message || chartResult.error}`);
        setState(prev => ({ ...prev, chartLoading: false }));
        return;
      }

      // 기존 데이터에 차트 데이터만 업데이트
      setState(prev => ({
        ...prev,
        data: prev.data ? {
          ...prev.data,
          chart_data: chartResult.chart_data || [],
          timeframe: timeframe
        } : prev.data,
        chartLoading: false
      }));

      // console.log(`ETF 차트 데이터 업데이트 완료: ${symbolToUse} (${timeframe})`, chartResult.chart_data?.length || 0, '개 포인트');
      
    } catch (error) {
      console.error(`ETF 차트 데이터 조회 실패:`, error);
      setState(prev => ({ ...prev, chartLoading: false }));
    }
  }, [currentSymbol]);

  // 에러 클리어
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // 데이터 새로고침
  const refreshData = useCallback(async () => {
    if (currentSymbol) {
      // console.log(`ETF 데이터 새로고침: ${currentSymbol}`);
      await fetchETFDetail(currentSymbol, currentTimeframe);
    }
  }, [currentSymbol, currentTimeframe, fetchETFDetail]);

  // 초기 데이터 로드
  useEffect(() => {
    if (initialSymbol) {
      // console.log(`ETF Detail 훅 초기화: ${initialSymbol}`);
      fetchETFDetail(initialSymbol);
    }
  }, [initialSymbol, fetchETFDetail]);

  return {
    data: state.data,
    loading: state.loading,
    error: state.error,
    chartLoading: state.chartLoading,
    fetchETFDetail,
    fetchChartData,
    clearError,
    refreshData
  };
}

// ETF 검색 훅
export function useETFSearch() {
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const searchETFs = useCallback(async (query: string, limit: number = 20) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    // console.log(`ETF 검색: "${query}"`);
    setSearchLoading(true);
    setSearchError(null);

    try {
      // 백엔드 엔드포인트: GET /api/v1/etf/search?q={query}&limit={limit}
      const response = await fetch(`https://api.investment-assistant.site/api/v1/etf/search?q=${encodeURIComponent(query)}&limit=${limit}`);
      
      if (!response.ok) {
        throw new Error(`Search API 오류: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      
      // 백엔드 에러 응답 처리
      if (result.error_type || result.error) {
        throw new Error(result.message || result.error || 'ETF 검색 실패');
      }

      setSearchResults(result.results || []);
      // console.log(`ETF 검색 완료: ${result.results?.length || 0}개 결과`);
      
    } catch (error) {
      console.error('ETF 검색 실패:', error);
      setSearchError(error instanceof Error ? error.message : 'ETF 검색에 실패했습니다');
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  const clearSearch = useCallback(() => {
    setSearchResults([]);
    setSearchError(null);
  }, []);

  return {
    searchResults,
    searchLoading,
    searchError,
    searchETFs,
    clearSearch
  };
}

// ETF 기본 정보만 조회하는 훅 (빠른 응답용)
export function useETFBasicInfo() {
  const [basicInfo, setBasicInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBasicInfo = useCallback(async (symbol: string) => {
    if (!symbol) return;

    // console.log(`ETF 기본 정보 조회: ${symbol}`);
    setLoading(true);
    setError(null);

    try {
      // 백엔드 엔드포인트: GET /api/v1/etf/symbol/{symbol}/basic
      const response = await fetch(`https://api.investment-assistant.site/api/v1/etf/symbol/${symbol.toUpperCase()}/basic`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.error_type || result.error) {
        throw new Error(result.message || result.error || 'ETF 기본 정보 조회 실패');
      }

      setBasicInfo(result);
      // console.log(`ETF 기본 정보 조회 성공: ${symbol}`);
      
    } catch (error) {
      console.error(`ETF 기본 정보 조회 실패 (${symbol}):`, error);
      setError(error instanceof Error ? error.message : 'ETF 기본 정보를 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    basicInfo,
    loading,
    error,
    fetchBasicInfo,
    clearError: () => setError(null)
  };
}