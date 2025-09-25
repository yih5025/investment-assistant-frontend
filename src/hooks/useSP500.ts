// hooks/useSP500.ts
// SP500 전용 훅 (TopGainers 패턴 적용한 HTTP 폴링 방식)

import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  webSocketManager, 
  SP500Data,
  ConnectionStatus,
  DataMode
} from '../services/WebSocketManager';
import { MarketTimeManager } from '../utils/marketTime';

// ============================================================================
// SP500 리스트용 데이터 인터페이스
// ============================================================================

export interface SP500Item {
  symbol: string;
  name: string;
  price: number;
  change_amount: number;
  change_percent: number;
  volume: number;
  sector?: string;
  market_cap?: string;
  previous_close?: number;
  is_positive?: boolean;
  change_color?: string;
}

export interface SP500Stats {
  total_count: number;
  positive_count: number;
  negative_count: number;
  neutral_count: number;
  avg_change_percent: number;
  total_volume: number;
  last_updated: string;
  market_status: 'OPEN' | 'CLOSED';
  data_source: 'redis' | 'database';
}

// ============================================================================
// 1. SP500 연결 상태 관리 훅
// ============================================================================

export function useSP500Connection() {
  const [connectionStatus, setConnectionStatus] = useState<{ status: ConnectionStatus; mode: DataMode }>({
    status: 'disconnected',
    mode: 'api'  // HTTP 폴링 모드로 고정
  });

  const [marketTimeManager] = useState(() => new MarketTimeManager());

  useEffect(() => {
    // SP500 연결 상태 구독
    const unsubscribe = webSocketManager.subscribe('connection_change', ({ type, status, mode }) => {
      if (type === 'sp500') {
        setConnectionStatus({ status, mode });
      }
    });

    // 초기 상태 설정
    const allStatuses = webSocketManager.getAllConnectionStatuses();
    setConnectionStatus(allStatuses.sp500);

    return unsubscribe;
  }, []);

  const reconnect = useCallback(() => {
    webSocketManager.reconnect('sp500');
  }, []);

  const isConnected = useMemo(() => {
    return connectionStatus.status === 'connected' || connectionStatus.status === 'api_mode';
  }, [connectionStatus.status]);

  const isRealtime = useMemo(() => {
    const marketStatus = marketTimeManager.getCurrentMarketStatus();
    // HTTP 폴링 모드에서도 실시간으로 간주 (5초 간격)
    return marketStatus.isOpen && (connectionStatus.status === 'connected' || connectionStatus.status === 'api_mode');
  }, [connectionStatus.status, marketTimeManager]);

  return {
    connectionStatus,
    isConnected,
    isRealtime,
    reconnect,
    marketTimeManager,
  };
}

// ============================================================================
// 2. SP500 통계 훅
// ============================================================================

export function useSP500Stats() {
  const [stats, setStats] = useState<SP500Stats | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    // SP500 통계 구독 (데이터 업데이트 시 자동 계산)
    const unsubscribe = webSocketManager.subscribe('sp500_update', (data: SP500Data[]) => {
      if (data.length > 0) {
        const calculatedStats = calculateSP500Stats(data);
        setStats(calculatedStats);
        setLastUpdated(new Date());
      }
    });

    return unsubscribe;
  }, []);

  return {
    stats,
    lastUpdated,
    isEmpty: !stats,
  };
}

// SP500 통계 계산 함수
function calculateSP500Stats(data: SP500Data[]): SP500Stats {
  let positiveCount = 0;
  let negativeCount = 0;
  let totalVolume = 0;
  let totalChangePercent = 0;

  data.forEach(item => {
    const changePercent = item.change_percentage || 0;
    totalChangePercent += changePercent;
    totalVolume += item.volume || 0;

    if (changePercent > 0) positiveCount++;
    else if (changePercent < 0) negativeCount++;
  });

  const neutralCount = data.length - positiveCount - negativeCount;
  const avgChangePercent = data.length > 0 ? totalChangePercent / data.length : 0;

  return {
    total_count: data.length,
    positive_count: positiveCount,
    negative_count: negativeCount,
    neutral_count: neutralCount,
    avg_change_percent: avgChangePercent,
    total_volume: totalVolume,
    last_updated: new Date().toISOString(),
    market_status: 'OPEN', // 실제로는 MarketTimeManager에서 가져와야 함
    data_source: 'redis'
  };
}

// ============================================================================
// 3. SP500 메인 데이터 훅
// ============================================================================

// SP500 데이터 변환 함수
const transformSP500Data = (data: SP500Data[]): SP500Item[] => {
  return data.map(item => ({
    symbol: item.symbol,
    name: item.company_name || `${item.symbol} Inc.`,
    price: item.current_price || item.price || 0,
    change_amount: item.change_amount || 0,
    change_percent: typeof item.change_percentage === 'number' 
      ? item.change_percentage 
      : parseFloat(String(item.change_percentage || 0)),
    volume: item.volume || 0,
    sector: undefined, // 향후 company_overview 테이블에서 가져올 예정
    market_cap: undefined,
    previous_close: item.previous_close,
    is_positive: item.is_positive,
    change_color: item.change_color
  }));
};

export function useSP500Data() {
  // 초기값으로 WebSocket 서비스의 캐시된 데이터 사용
  const [allSP500Data, setAllSP500Data] = useState<SP500Item[]>(() => {
    const cachedData = webSocketManager.getLastCachedData('sp500');
    return cachedData ? transformSP500Data(cachedData) : [];
  });
  
  const [lastUpdated, setLastUpdated] = useState<Date | null>(() => {
    const cachedData = webSocketManager.getLastCachedData('sp500');
    return cachedData && cachedData.length > 0 ? new Date() : null;
  });

  useEffect(() => {
    const unsubscribe = webSocketManager.subscribe('sp500_update', (data: SP500Data[]) => {
      console.log('SP500 데이터 수신:', data.length, '개 항목');
      
      const transformedData = transformSP500Data(data);
      setAllSP500Data(transformedData);
      setLastUpdated(new Date());
      
      console.log('SP500 데이터 업데이트 완료:', transformedData.length, '개 항목');
    });

    return unsubscribe;
  }, []);

  // 가격대별 필터링
  const getByPriceRange = useCallback((minPrice: number, maxPrice?: number) => {
    return allSP500Data.filter(item => {
      if (maxPrice) {
        return item.price >= minPrice && item.price <= maxPrice;
      }
      return item.price >= minPrice;
    });
  }, [allSP500Data]);

  // 변화율별 필터링
  const getByChangeRange = useCallback((minChange: number, maxChange?: number) => {
    return allSP500Data.filter(item => {
      if (maxChange !== undefined) {
        return item.change_percent >= minChange && item.change_percent <= maxChange;
      }
      return item.change_percent >= minChange;
    });
  }, [allSP500Data]);

  // 섹터별 필터링 (향후 확장 예정)
  const getBySector = useCallback((sector: string) => {
    return allSP500Data.filter(item => item.sector === sector);
  }, [allSP500Data]);

  // 상승/하락/보합 필터링
  const getByMovement = useCallback((movement: 'positive' | 'negative' | 'neutral') => {
    return allSP500Data.filter(item => {
      if (movement === 'positive') return item.change_percent > 0;
      if (movement === 'negative') return item.change_percent < 0;
      return item.change_percent === 0;
    });
  }, [allSP500Data]);

  // 상위 N개 종목
  const getTopMovers = useCallback((count: number = 20, type: 'gainers' | 'losers' = 'gainers') => {
    const sorted = [...allSP500Data].sort((a, b) => {
      return type === 'gainers' 
        ? b.change_percent - a.change_percent 
        : a.change_percent - b.change_percent;
    });
    return sorted.slice(0, count);
  }, [allSP500Data]);

  // 거래량 상위 종목
  const getByVolume = useCallback((count: number = 20) => {
    return [...allSP500Data]
      .sort((a, b) => b.volume - a.volume)
      .slice(0, count);
  }, [allSP500Data]);

  // 데이터 요약
  const summary = useMemo(() => {
    const positiveItems = allSP500Data.filter(item => item.change_percent > 0);
    const negativeItems = allSP500Data.filter(item => item.change_percent < 0);
    const neutralItems = allSP500Data.filter(item => item.change_percent === 0);

    return {
      totalCount: allSP500Data.length,
      positiveCount: positiveItems.length,
      negativeCount: negativeItems.length,
      neutralCount: neutralItems.length,
      avgChangePercent: allSP500Data.length > 0 
        ? allSP500Data.reduce((sum, item) => sum + item.change_percent, 0) / allSP500Data.length 
        : 0,
      totalVolume: allSP500Data.reduce((sum, item) => sum + item.volume, 0),
      priceRange: {
        min: Math.min(...allSP500Data.map(item => item.price)),
        max: Math.max(...allSP500Data.map(item => item.price))
      }
    };
  }, [allSP500Data]);

  return {
    allSP500Data,
    lastUpdated,
    isEmpty: allSP500Data.length === 0,
    getByPriceRange,
    getByChangeRange,
    getBySector,
    getByMovement,
    getTopMovers,
    getByVolume,
    summary,
  };
}

// ============================================================================
// 4. SP500 필터링 및 정렬 훅
// ============================================================================

export interface SP500Filters {
  search: string;
  priceMin?: number;
  priceMax?: number;
  changeMin?: number;
  changeMax?: number;
  movement: 'all' | 'positive' | 'negative' | 'neutral';
  sortBy: 'symbol' | 'name' | 'price' | 'change_amount' | 'change_percent' | 'volume';
  sortOrder: 'asc' | 'desc';
}

export function useSP500Filter(sp500Data: SP500Item[], initialFilters?: Partial<SP500Filters>) {
  const [filters, setFilters] = useState<SP500Filters>({
    search: '',
    movement: 'all',
    sortBy: 'change_percent',
    sortOrder: 'desc',
    ...initialFilters,
  });

  const filteredData = useMemo(() => {
    let result = [...sp500Data];

    // 텍스트 검색
    if (filters.search.trim()) {
      const query = filters.search.toLowerCase();
      result = result.filter(item => 
        item.name.toLowerCase().includes(query) ||
        item.symbol.toLowerCase().includes(query)
      );
    }

    // 가격 범위 필터
    if (filters.priceMin !== undefined) {
      result = result.filter(item => item.price >= filters.priceMin!);
    }
    if (filters.priceMax !== undefined) {
      result = result.filter(item => item.price <= filters.priceMax!);
    }

    // 변화율 범위 필터
    if (filters.changeMin !== undefined) {
      result = result.filter(item => item.change_percent >= filters.changeMin!);
    }
    if (filters.changeMax !== undefined) {
      result = result.filter(item => item.change_percent <= filters.changeMax!);
    }

    // 상승/하락 필터
    if (filters.movement !== 'all') {
      result = result.filter(item => {
        if (filters.movement === 'positive') return item.change_percent > 0;
        if (filters.movement === 'negative') return item.change_percent < 0;
        return item.change_percent === 0;
      });
    }

    // 정렬
    result.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (filters.sortBy) {
        case 'symbol':
          aValue = a.symbol;
          bValue = b.symbol;
          break;
        case 'name':
          aValue = a.name;
          bValue = b.name;
          break;
        case 'price':
          aValue = a.price;
          bValue = b.price;
          break;
        case 'change_amount':
          aValue = a.change_amount;
          bValue = b.change_amount;
          break;
        case 'change_percent':
          aValue = a.change_percent;
          bValue = b.change_percent;
          break;
        case 'volume':
          aValue = a.volume;
          bValue = b.volume;
          break;
        default:
          aValue = a.symbol;
          bValue = b.symbol;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const comparison = aValue.localeCompare(bValue);
        return filters.sortOrder === 'asc' ? comparison : -comparison;
      } else {
        const comparison = aValue - bValue;
        return filters.sortOrder === 'asc' ? comparison : -comparison;
      }
    });

    return result;
  }, [sp500Data, filters]);

  const updateSearch = useCallback((search: string) => {
    setFilters(prev => ({ ...prev, search }));
  }, []);

  const updatePriceRange = useCallback((priceMin?: number, priceMax?: number) => {
    setFilters(prev => ({ ...prev, priceMin, priceMax }));
  }, []);

  const updateChangeRange = useCallback((changeMin?: number, changeMax?: number) => {
    setFilters(prev => ({ ...prev, changeMin, changeMax }));
  }, []);

  const updateMovement = useCallback((movement: SP500Filters['movement']) => {
    setFilters(prev => ({ ...prev, movement }));
  }, []);

  const updateSort = useCallback((sortBy: SP500Filters['sortBy'], sortOrder?: SP500Filters['sortOrder']) => {
    setFilters(prev => ({
      ...prev,
      sortBy,
      sortOrder: sortOrder || (prev.sortBy === sortBy && prev.sortOrder === 'desc' ? 'asc' : 'desc')
    }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({
      search: '',
      movement: 'all',
      sortBy: 'change_percent',
      sortOrder: 'desc',
    });
  }, []);

  return {
    filters,
    filteredData,
    updateSearch,
    updatePriceRange,
    updateChangeRange,
    updateMovement,
    updateSort,
    resetFilters,
    resultCount: filteredData.length,
    isEmpty: filteredData.length === 0,
  };
}

// ============================================================================
// 5. SP500 성능 모니터링 훅
// ============================================================================

export function useSP500Performance() {
  const [updateCount, setUpdateCount] = useState(0);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
  const [averageUpdateInterval, setAverageUpdateInterval] = useState<number>(0);
  const [apiCallDuration, setApiCallDuration] = useState<number>(0);

  useEffect(() => {
    let updateTimes: number[] = [];
    let apiStartTime: number = 0;

    const unsubscribe = webSocketManager.subscribe('sp500_update', (data) => {
      const now = Date.now();
      
      // API 응답 시간 계산 (실제로는 webSocketManager에서 측정해야 하지만 여기서 근사치 계산)
      if (apiStartTime > 0) {
        setApiCallDuration(now - apiStartTime);
      }
      
      setUpdateCount(prev => prev + 1);
      setLastUpdateTime(new Date());
      
      // 업데이트 간격 계산
      updateTimes.push(now);
      if (updateTimes.length > 10) {
        updateTimes = updateTimes.slice(-10); // 최근 10개만 유지
      }
      
      if (updateTimes.length > 1) {
        const intervals = [];
        for (let i = 1; i < updateTimes.length; i++) {
          intervals.push(updateTimes[i] - updateTimes[i - 1]);
        }
        const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
        setAverageUpdateInterval(avgInterval);
      }

      console.log(`SP500 성능 - 업데이트 ${updateCount + 1}회, 데이터 ${data.length}개, 간격 ${averageUpdateInterval}ms`);
    });

    return unsubscribe;
  }, [updateCount, averageUpdateInterval]);

  const resetCounters = useCallback(() => {
    setUpdateCount(0);
    setLastUpdateTime(null);
    setAverageUpdateInterval(0);
    setApiCallDuration(0);
  }, []);

  const getUpdateFrequency = useCallback(() => {
    if (!lastUpdateTime || updateCount === 0) return 0;
    
    const now = new Date();
    const diffMinutes = (now.getTime() - lastUpdateTime.getTime()) / (1000 * 60);
    
    return updateCount / Math.max(diffMinutes, 1); // 분당 업데이트 수
  }, [updateCount, lastUpdateTime]);

  return {
    updateCount,
    lastUpdateTime,
    averageUpdateInterval,
    apiCallDuration,
    getUpdateFrequency,
    resetCounters,
  };
}

// ============================================================================
// 6. SP500 에러 처리 훅
// ============================================================================

export function useSP500Errors() {
  const [errors, setErrors] = useState<Array<{ error: string; timestamp: Date }>>([]);

  useEffect(() => {
    const unsubscribe = webSocketManager.subscribe('error', ({ type, error }) => {
      if (type === 'sp500') {
        const errorObj = {
          error,
          timestamp: new Date(),
        };

        setErrors(prev => [...prev.slice(-4), errorObj]); // 최대 5개 에러 보관
        console.error('SP500 에러 발생:', error);
      }
    });

    return unsubscribe;
  }, []);

  const clearErrors = useCallback(() => {
    setErrors([]);
  }, []);

  const getLatestError = useCallback(() => {
    return errors[errors.length - 1] || null;
  }, [errors]);

  return {
    errors,
    latestError: getLatestError(),
    clearErrors,
    hasErrors: errors.length > 0,
  };
}

// ============================================================================
// 7. SP500 통합 훅 (마켓 리스트 컴포넌트용)
// ============================================================================

export function useSP500Market() {
  const { connectionStatus, isConnected, isRealtime, reconnect } = useSP500Connection();
  const { allSP500Data, lastUpdated, isEmpty, getByMovement, getTopMovers, getByVolume, summary } = useSP500Data();
  const { stats } = useSP500Stats();
  const { errors, latestError, clearErrors } = useSP500Errors();

  // 시장 상태 정보
  const [marketTimeManager] = useState(() => new MarketTimeManager());
  const marketStatus = useMemo(() => {
    return marketTimeManager.getCurrentMarketStatus();
  }, [marketTimeManager]);

  // 아이템 클릭 핸들러
  const handleItemClick = useCallback((item: SP500Item) => {
    // MarketDetail 페이지로 네비게이션
    window.dispatchEvent(new CustomEvent('navigateToMarketDetail', { 
      detail: { symbol: item.symbol, type: 'stock' } 
    }));
  }, []);

  // 데이터 소스 메시지
  const getDataSourceMessage = useCallback(() => {
    if (marketStatus.isOpen) {
      return isConnected ? 'HTTP 폴링 (5초 간격)' : '연결 중...';
    } else {
      return '최종 거래가 기준 (30초 간격)';
    }
  }, [marketStatus.isOpen, isConnected]);

  // 시장 상태 요약
  const getMarketSummary = useCallback(() => {
    const positive = getByMovement('positive');
    const negative = getByMovement('negative');
    
    return {
      totalStocks: allSP500Data.length,
      advancing: positive.length,
      declining: negative.length,
      unchanged: allSP500Data.length - positive.length - negative.length,
      advanceDeclineRatio: negative.length > 0 ? positive.length / negative.length : 0,
      marketSentiment: positive.length > negative.length ? 'bullish' : 'bearish'
    };
  }, [allSP500Data, getByMovement]);

  return {
    // 연결 상태
    connectionStatus,
    isConnected,
    isRealtime,
    reconnect,
    
    // 데이터
    allSP500Data,
    lastUpdated,
    isEmpty,
    stats,
    summary,
    
    // 시장 상태
    marketStatus,
    
    // 필터링 메서드
    getByMovement,
    getTopMovers,
    getByVolume,
    
    // 에러 처리
    errors,
    latestError,
    clearErrors,
    
    // 유틸리티
    handleItemClick,
    getDataSourceMessage,
    getMarketSummary,
  };
}

// ============================================================================
// 8. SP500 페이징 훅
// ============================================================================

export interface PaginationConfig {
  initialPage: number;
  itemsPerPage: number;
  maxPagesToShow: number;
}

export function useSP500Pagination(
  data: SP500Item[], 
  config: PaginationConfig = { 
    initialPage: 1, 
    itemsPerPage: 50, 
    maxPagesToShow: 5 
  }
) {
  const [currentPage, setCurrentPage] = useState(config.initialPage);

  // 데이터 변경 시 첫 페이지로 리셋
  useEffect(() => {
    setCurrentPage(config.initialPage);
  }, [data.length, config.initialPage]);

  const totalPages = useMemo(() => {
    return Math.ceil(data.length / config.itemsPerPage);
  }, [data.length, config.itemsPerPage]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * config.itemsPerPage;
    const endIndex = startIndex + config.itemsPerPage;
    return data.slice(startIndex, endIndex);
  }, [data, currentPage, config.itemsPerPage]);

  const pageNumbers = useMemo(() => {
    const start = Math.max(1, currentPage - Math.floor(config.maxPagesToShow / 2));
    const end = Math.min(totalPages, start + config.maxPagesToShow - 1);
    
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }, [currentPage, totalPages, config.maxPagesToShow]);

  const goToPage = useCallback((page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  }, [totalPages]);

  const goToNext = useCallback(() => {
    if (currentPage < totalPages) {
      setCurrentPage(prev => prev + 1);
    }
  }, [currentPage, totalPages]);

  const goToPrevious = useCallback(() => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
  }, [currentPage]);

  const goToFirst = useCallback(() => {
    setCurrentPage(1);
  }, []);

  const goToLast = useCallback(() => {
    setCurrentPage(totalPages);
  }, [totalPages]);

  return {
    currentPage,
    totalPages,
    paginatedData,
    pageNumbers,
    goToPage,
    goToNext,
    goToPrevious,
    goToFirst,
    goToLast,
    hasNext: currentPage < totalPages,
    hasPrevious: currentPage > 1,
    itemsPerPage: config.itemsPerPage,
    totalItems: data.length,
    startIndex: (currentPage - 1) * config.itemsPerPage + 1,
    endIndex: Math.min(currentPage * config.itemsPerPage, data.length),
  };
}

// ============================================================================
// 9. SP500 디버깅 훅
// ============================================================================

export function useSP500Debug() {
  const [isDebugMode, setIsDebugMode] = useState(() => {
    return localStorage.getItem('sp500-debug') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('sp500-debug', isDebugMode.toString());
  }, [isDebugMode]);

  const getServiceStatus = useCallback(() => {
    return {
      service: webSocketManager.getStatus(),
      sp500Stats: webSocketManager.getAllConnectionStatuses().sp500,
    };
  }, []);

  const logServiceStatus = useCallback(() => {
    console.log('SP500 Service Status:', getServiceStatus());
  }, [getServiceStatus]);

  const toggleDebugMode = useCallback(() => {
    setIsDebugMode(prev => !prev);
  }, []);

  const logDataSample = useCallback((data: SP500Item[]) => {
    if (isDebugMode && data.length > 0) {
      console.log('SP500 데이터 샘플:', {
        totalCount: data.length,
        firstItem: data[0],
        lastItem: data[data.length - 1],
        priceRange: {
          min: Math.min(...data.map(item => item.price)),
          max: Math.max(...data.map(item => item.price))
        },
        changeRange: {
          min: Math.min(...data.map(item => item.change_percent)),
          max: Math.max(...data.map(item => item.change_percent))
        }
      });
    }
  }, [isDebugMode]);

  return {
    isDebugMode,
    toggleDebugMode,
    getServiceStatus,
    logServiceStatus,
    logDataSample,
  };
}