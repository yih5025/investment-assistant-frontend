import { useState, useEffect, useCallback } from 'react';
import { ETFDetailData } from '../services/types';

interface ETFDetailState {
  data: ETFDetailData | null;
  loading: boolean;
  error: string | null;
  chartLoading: boolean;
}

interface UseETFDetailReturn extends ETFDetailState {
  fetchETFDetail: (symbol: string, timeframe?: string) => Promise<void>;
  fetchChartData: (timeframe: '1D' | '1W' | '1M') => Promise<void>;
  clearError: () => void;
  refreshData: () => Promise<void>;
}

/**
 * ETF 개별 상세 정보 관리 훅
 * 
 * ETF 기본 정보, 프로필, 차트 데이터, 섹터 구성, 보유종목 등을 관리합니다.
 * SP500Detail과 유사한 패턴이지만 ETF 특성에 맞게 최적화되었습니다.
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

  // ETF 상세 정보 조회
  const fetchETFDetail = useCallback(async (symbol: string, timeframe: string = '1D') => {
    if (!symbol) {
      console.warn('🏦 ETF 심볼이 제공되지 않았습니다');
      return;
    }

    console.log(`🏦 ETF 상세 정보 조회 시작: ${symbol} (${timeframe})`);
    
    setState(prev => ({ 
      ...prev, 
      loading: true, 
      error: null 
    }));
    
    setCurrentSymbol(symbol);
    setCurrentTimeframe(timeframe);

    try {
      const response = await fetch(`/api/etf/symbol/${symbol}?timeframe=${timeframe}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.error) {
        throw new Error(result.error);
      }

      // ETF 상세 데이터 구조 변환
      const etfDetailData: ETFDetailData = {
        symbol: result.basic_info?.symbol || symbol,
        name: result.basic_info?.name || symbol,
        current_price: result.basic_info?.current_price || 0,
        change_amount: result.basic_info?.change_amount || 0,
        change_percentage: result.basic_info?.change_percentage || 0,
        volume: result.basic_info?.volume || 0,
        previous_close: result.basic_info?.previous_close,
        is_positive: result.basic_info?.is_positive,
        change_color: result.basic_info?.change_amount > 0 ? 'green' : 
                     result.basic_info?.change_amount < 0 ? 'red' : 'gray',
        last_updated: result.basic_info?.last_updated,
        
        // ETF 특화 데이터
        profile: result.profile,
        chart_data: result.chart_data || [],
        sector_chart_data: result.sector_chart_data || [],
        holdings_chart_data: result.holdings_chart_data || [],
        key_metrics: result.key_metrics,
        timeframe: result.timeframe || timeframe,
        market_status: result.basic_info?.market_status
      };

      setState(prev => ({
        ...prev,
        data: etfDetailData,
        loading: false,
        error: null
      }));

      console.log(`🏦 ETF 상세 정보 조회 성공: ${symbol}`);
      
    } catch (error) {
      console.error(`🏦 ETF 상세 정보 조회 실패 (${symbol}):`, error);
      
      setState(prev => ({
        ...prev,
        data: null,
        loading: false,
        error: error instanceof Error ? error.message : 'ETF 정보를 불러오는데 실패했습니다'
      }));
    }
  }, []);

  // 차트 데이터만 별도 조회 (timeframe 변경 시)
  const fetchChartData = useCallback(async (timeframe: '1D' | '1W' | '1M') => {
    if (!currentSymbol) {
      console.warn('🏦 현재 ETF 심볼이 없습니다');
      return;
    }

    console.log(`🏦 ETF 차트 데이터 조회: ${currentSymbol} (${timeframe})`);
    
    setState(prev => ({ ...prev, chartLoading: true }));
    setCurrentTimeframe(timeframe);

    try {
      const chartResponse = await fetch(`/api/etf/symbol/${currentSymbol}/chart?timeframe=${timeframe}`);
      
      if (!chartResponse.ok) {
        console.warn(`Chart API error! status: ${chartResponse.status}`);
        // 차트 에러는 전체 상태에 영향주지 않음
        setState(prev => ({ ...prev, chartLoading: false }));
        return;
      }

      const chartResult = await chartResponse.json();
      
      if (chartResult.error) {
        console.warn(`Chart data error: ${chartResult.error}`);
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

      console.log(`🏦 ETF 차트 데이터 업데이트 완료: ${currentSymbol} (${timeframe})`);
      
    } catch (error) {
      console.error(`🏦 ETF 차트 데이터 조회 실패:`, error);
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
      console.log(`🏦 ETF 데이터 새로고침: ${currentSymbol}`);
      await fetchETFDetail(currentSymbol, currentTimeframe);
    }
  }, [currentSymbol, currentTimeframe, fetchETFDetail]);

  // 초기 데이터 로드
  useEffect(() => {
    if (initialSymbol) {
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

// ETF 검색 훅 (옵션)
export function useETFSearch() {
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const searchETFs = useCallback(async (query: string, limit: number = 20) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    console.log(`🏦 ETF 검색: "${query}"`);
    setSearchLoading(true);
    setSearchError(null);

    try {
      const response = await fetch(`/api/etf/search?q=${encodeURIComponent(query)}&limit=${limit}`);
      
      if (!response.ok) {
        throw new Error(`Search API error: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.error) {
        throw new Error(result.error);
      }

      setSearchResults(result.results || []);
      console.log(`🏦 ETF 검색 완료: ${result.results?.length || 0}개 결과`);
      
    } catch (error) {
      console.error('🏦 ETF 검색 실패:', error);
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
