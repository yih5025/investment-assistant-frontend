// hooks/useMarketData.ts
// 페이지 독립적 마켓 데이터 관리 훅

import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  webSocketManager,
  CryptoData, 
  SP500Data, 
  ETFData,
  ConnectionStatus, 
  WebSocketType,
  DataMode 
} from '../services/WebSocketManager';
import { MarketTimeManager } from '../utils/marketTime';
import { formatVolume } from '../utils/formatters';

// ============================================================================
// 공통 마켓 아이템 인터페이스
// ============================================================================

export interface MarketItem {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: string;
  type: 'crypto' | 'stock' | 'etf';
  marketCap?: string;
  sector?: string;
}

// ============================================================================
// 유틸리티 함수들
// ============================================================================

const formatPrice = (price: number, type: 'crypto' | 'stock' | 'etf'): string => {
  if (type === 'crypto') {
    if (price >= 1000000) return `₩${(price / 1000000).toFixed(1)}M`;
    if (price >= 1000) return `₩${price.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}`;
    return `₩${price.toFixed(2)}`;
  } else {
    // stock or etf
    return `$${price.toFixed(2)}`;
  }
};

// ============================================================================
// 🎯 앱 수준 연결 상태 관리 훅 (페이지 독립적)
// ============================================================================

export function useWebSocketConnection() {
  const [connectionStatuses, setConnectionStatuses] = useState<Record<WebSocketType, { status: ConnectionStatus; mode: DataMode }>>(() => {
    // 🎯 서비스가 이미 초기화되어 있으면 현재 상태 사용
    if (webSocketManager.getStatus().initialized) {
      return webSocketManager.getAllConnectionStatuses();
    }
    
    // 초기 상태
    return {
      crypto: { status: 'disconnected', mode: 'websocket' },  
      sp500: { status: 'disconnected', mode: 'api' },
      topgainers: { status: 'disconnected', mode: 'api' },
      etf: { status: 'disconnected', mode: 'api' },
    };
  });

  const [marketTimeManager] = useState(() => new MarketTimeManager());

  useEffect(() => {
    // 🎯 서비스가 아직 초기화되지 않은 경우에만 초기화
    if (!webSocketManager.getStatus().initialized) {
      console.log('🚀 앱 수준에서 WebSocketManager 초기화 중...');
      webSocketManager.initialize();
    } else {
      console.log('✅ WebSocketManager 이미 초기화됨 - 기존 연결 활용');
    }

    // 현재 연결 상태 동기화
    setConnectionStatuses(webSocketManager.getAllConnectionStatuses());

    const unsubscribe = webSocketManager.subscribe('connection_change', (data) => {
      setConnectionStatuses(prev => ({
        ...prev,
        [data.type]: { status: data.status, mode: data.mode }
      }));
    });

    // 🎯 컴포넌트 언마운트 시 연결을 끊지 않음 - 앱 수준에서 관리
    return () => {
      unsubscribe();
      console.log('📦 useWebSocketConnection 언마운트 - 연결 유지');
      // webSocketManager.shutdown() 호출하지 않음!
    };
  }, []); // 🎯 빈 의존성 배열 - 한 번만 실행

  const reconnect = useCallback((type: WebSocketType) => {
    console.log(`🔄 사용자 요청: ${type} 재연결`);
    webSocketManager.reconnect(type);
  }, []);

  const reconnectAll = useCallback(() => {
    console.log('🔄 사용자 요청: 전체 재연결');
    webSocketManager.reconnectAll();
  }, []);

  const isConnected = useCallback((type: WebSocketType) => {
    const connectionInfo = connectionStatuses[type];
    return connectionInfo.status === 'connected' || connectionInfo.status === 'api_mode';
  }, [connectionStatuses]);

  const isAnyConnected = useMemo(() => {
    return Object.values(connectionStatuses).some(info => 
      info.status === 'connected' || info.status === 'api_mode'
    );
  }, [connectionStatuses]);

  const getOverallStatus = useMemo((): ConnectionStatus => {
    const statuses = Object.values(connectionStatuses).map(info => info.status);
    
    if (statuses.every(status => status === 'connected' || status === 'api_mode')) return 'connected';
    if (statuses.some(status => status === 'connecting' || status === 'reconnecting')) return 'connecting';
    if (statuses.every(status => status === 'disconnected')) return 'disconnected';
    
    return 'connecting';
  }, [connectionStatuses]);

  return {
    connectionStatuses,
    isConnected,
    isAnyConnected,
    overallStatus: getOverallStatus,
    reconnect,
    reconnectAll,
    marketTimeManager,
  };
}

// ============================================================================
// 🎯 페이지 독립적 데이터 훅들
// ============================================================================

export function useCryptoData() {
  // 🎯 캐시된 데이터로 초기화 - 페이지 전환 시 즉시 표시
  const [cryptoData, setCryptoData] = useState<MarketItem[]>(() => {
    const cachedData = webSocketManager.getLastCachedData('crypto');
    if (cachedData && cachedData.length > 0) {
      console.log('📦 Crypto 캐시된 데이터로 즉시 초기화:', cachedData.length, '개');
      return cachedData.map(crypto => {
        const marketCode = (crypto as any).market_code || crypto.market || '';
        const symbol = (crypto as any).symbol || marketCode.replace('KRW-', '');
        const name = (crypto as any).korean_name || (crypto as any).crypto_name || marketCode;
        const volume24h = crypto.acc_trade_volume_24h || crypto.trade_volume || 0;
        
        return {
          symbol,
          name,
          price: (crypto as any).price || crypto.trade_price || 0,
          change: (crypto as any).change_24h || crypto.signed_change_price || 0,
          changePercent: parseFloat(((crypto as any).change_rate_24h || '0%').replace('%', '')) || (crypto.signed_change_rate || 0) * 100,
          volume: formatVolume((crypto as any).volume || volume24h),
          type: 'crypto' as const,
          marketCap: formatVolume((crypto as any).acc_trade_value_24h || crypto.acc_trade_volume_24h || ((crypto.trade_price || 0) * 21000000))
        };
      });
    }
    return [];
  });

  const [lastUpdated, setLastUpdated] = useState<Date | null>(() => {
    const cachedData = webSocketManager.getLastCachedData('crypto');
    return cachedData && cachedData.length > 0 ? new Date() : null;
  });

  useEffect(() => {
    const unsubscribe = webSocketManager.subscribe('crypto_update', (data: CryptoData[]) => {
      const items: MarketItem[] = data.map(crypto => {
        const marketCode = (crypto as any).market_code || crypto.market || '';
        const symbol = (crypto as any).symbol || marketCode.replace('KRW-', '');
        const name = (crypto as any).korean_name || (crypto as any).crypto_name || marketCode;
        const volume24h = crypto.acc_trade_volume_24h || crypto.trade_volume || 0;
        
        return {
          symbol,
          name,
          price: (crypto as any).price || crypto.trade_price || 0,
          change: (crypto as any).change_24h || crypto.signed_change_price || 0,
          changePercent: parseFloat(((crypto as any).change_rate_24h || '0%').replace('%', '')) || (crypto.signed_change_rate || 0) * 100,
          volume: formatVolume((crypto as any).volume || volume24h),
          type: 'crypto' as const,
          marketCap: formatVolume((crypto as any).acc_trade_value_24h || crypto.acc_trade_volume_24h || ((crypto.trade_price || 0) * 21000000))
        };
      });

      setCryptoData(items);
      setLastUpdated(new Date());
    });

    return unsubscribe;
  }, []); // 🎯 빈 의존성 배열 - 한 번만 구독

  return {
    cryptoData,
    lastUpdated,
    isEmpty: cryptoData.length === 0,
  };
}

export function useSP500Data() {
  // 🎯 캐시된 데이터로 초기화
  const [sp500Data, setSP500Data] = useState<MarketItem[]>(() => {
    const cachedData = webSocketManager.getLastCachedData('sp500');
    if (cachedData && cachedData.length > 0) {
      console.log('📦 SP500 캐시된 데이터로 즉시 초기화:', cachedData.length, '개');
      return cachedData.map(stock => {
        const name = stock.company_name || `${stock.symbol} Inc.`;
        const currentPrice = stock.current_price || stock.price || 0;
        const changeAmount = stock.change_amount || 0;
        const changePercent = stock.change_percentage || 0;
        
        return {
          symbol: stock.symbol,
          name,
          price: currentPrice,
          change: changeAmount,
          changePercent,
          volume: formatVolume(stock.volume || 0),
          type: 'stock' as const,
        };
      });
    }
    return [];
  });

  const [lastUpdated, setLastUpdated] = useState<Date | null>(() => {
    const cachedData = webSocketManager.getLastCachedData('sp500');
    return cachedData && cachedData.length > 0 ? new Date() : null;
  });

  useEffect(() => {
    const unsubscribe = webSocketManager.subscribe('sp500_update', (data: SP500Data[]) => {
      const items: MarketItem[] = data.map(stock => {
        const name = stock.company_name || `${stock.symbol} Inc.`;
        const currentPrice = stock.current_price || stock.price || 0;
        const changeAmount = stock.change_amount || 0;
        const changePercent = stock.change_percentage || 0;
        
        return {
          symbol: stock.symbol,
          name,
          price: currentPrice,
          change: changeAmount,
          changePercent,
          volume: formatVolume(stock.volume || 0),
          type: 'stock' as const,
        };
      });

      setSP500Data(items);
      setLastUpdated(new Date());
    });

    return unsubscribe;
  }, []); // 🎯 빈 의존성 배열 - 한 번만 구독

  return {
    sp500Data,
    lastUpdated,
    isEmpty: sp500Data.length === 0,
  };
}

export function useETFData() {
  // 🎯 캐시된 데이터로 초기화
  const [etfData, setETFData] = useState<MarketItem[]>(() => {
    const cachedData = webSocketManager.getLastCachedData('etf');
    if (cachedData && cachedData.length > 0) {
      console.log('📦 ETF 캐시된 데이터로 즉시 초기화:', cachedData.length, '개');
      return cachedData.map(etf => {
        const name = etf.name || `${etf.symbol} ETF`;
        const currentPrice = etf.current_price || etf.price || 0;
        const changeAmount = etf.change_amount || 0;
        const changePercent = etf.change_percentage || 0;
        
        return {
          symbol: etf.symbol,
          name,
          price: currentPrice,
          change: changeAmount,
          changePercent,
          volume: formatVolume(etf.volume || 0),
          type: 'etf' as const,
        };
      });
    }
    return [];
  });

  const [lastUpdated, setLastUpdated] = useState<Date | null>(() => {
    const cachedData = webSocketManager.getLastCachedData('etf');
    return cachedData && cachedData.length > 0 ? new Date() : null;
  });

  useEffect(() => {
    const unsubscribe = webSocketManager.subscribe('etf_update', (data: ETFData[]) => {
      const items: MarketItem[] = data.map(etf => {
        const name = etf.name || `${etf.symbol} ETF`;
        const currentPrice = etf.current_price || 0;
        const changeAmount = etf.change_amount || 0;
        const changePercent = etf.change_percentage || 0;
        
        return {
          symbol: etf.symbol,
          name,
          price: currentPrice,
          change: changeAmount,
          changePercent,
          volume: formatVolume(etf.volume || 0),
          type: 'etf' as const,
        };
      });

      setETFData(items);
      setLastUpdated(new Date());
      
      console.log('🏦 ETF 데이터 업데이트:', items.length, '개');
    });

    return unsubscribe;
  }, []); // 🎯 빈 의존성 배열 - 한 번만 구독

  return {
    etfData,
    lastUpdated,
    isEmpty: etfData.length === 0,
  };
}

// ============================================================================
// 🎯 통합 마켓 데이터 훅 (최적화됨)
// ============================================================================

export function useMarketData() {
  const { cryptoData } = useCryptoData();
  const { sp500Data } = useSP500Data();
  const { etfData } = useETFData();
  const { connectionStatuses, isConnected, isAnyConnected, overallStatus } = useWebSocketConnection();

  const allMarketData = useMemo(() => {
    return [...cryptoData, ...sp500Data, ...etfData];
  }, [cryptoData, sp500Data, etfData]);

  const filterByType = useCallback((type: 'all' | 'crypto' | 'stock' | 'etf') => {
    if (type === 'all') return allMarketData;
    return allMarketData.filter(item => item.type === type);
  }, [allMarketData]);

  const searchItems = useCallback((query: string, items: MarketItem[] = allMarketData) => {
    if (!query.trim()) return items;
    
    const lowerQuery = query.toLowerCase();
    return items.filter(item => 
      item.name.toLowerCase().includes(lowerQuery) ||
      item.symbol.toLowerCase().includes(lowerQuery)
    );
  }, [allMarketData]);

  // 🎯 최적화된 새로고침 - 연결 끊지 않고 데이터만 갱신
  const refreshData = useCallback(() => {
    console.log('🔄 데이터 수동 새로고침 - 기존 연결 유지');
    webSocketManager.refreshData();
  }, []);

  // SP500 더보기 기능
  const loadMoreSP500 = useCallback(async () => {
    console.log('🔄 SP500 더보기 요청');
    return await webSocketManager.loadMoreSP500Data();
  }, []);

  // SP500 페이징 상태 조회
  const getSP500PaginationState = useCallback(() => {
    return webSocketManager.getSP500PaginationState();
  }, []);

  // ETF 더보기 로드
  const loadMoreETF = useCallback(async () => {
    console.log('🔄 ETF 더보기 요청');
    return await webSocketManager.loadMoreETFData();
  }, []);

  // ETF 페이징 상태 조회
  const getETFPaginationState = useCallback(() => {
    return webSocketManager.getETFPaginationState();
  }, []);

  // ETF 서비스 즉시 초기화
  const ensureETFInitialized = useCallback(() => {
    webSocketManager.ensureETFInitialized();
  }, []);

  // 🎯 불필요한 초기화 로직 제거 - App.tsx에서 이미 처리됨
  // useEffect 없음: 페이지 마운트/언마운트와 독립적

  return {
    allMarketData,
    cryptoData,
    sp500Data,
    etfData,
    connectionStatuses,
    isConnected,
    isAnyConnected,
    overallStatus,
    filterByType,
    searchItems,
    formatPrice,
    refreshData,
    loadMoreSP500,
    getSP500PaginationState,
    loadMoreETF,
    getETFPaginationState,
    ensureETFInitialized,
    isEmpty: allMarketData.length === 0,
    cryptoCount: cryptoData.length,
    stockCount: sp500Data.length,
    etfCount: etfData.length,
    totalCount: allMarketData.length,
  };
}

// ============================================================================
// 🎯 페이지 독립적 관심종목 관리 훅
// ============================================================================

export function useWatchlist(initialWatchlist: string[] = ['AAPL', 'BTC']) {
  const [watchlist, setWatchlist] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('investment-assistant-watchlist');
      return saved ? JSON.parse(saved) : initialWatchlist;
    } catch (error) {
      console.error('관심종목 불러오기 실패:', error);
      return initialWatchlist;
    }
  });

  // 🎯 디바운스된 localStorage 저장
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      try {
        localStorage.setItem('investment-assistant-watchlist', JSON.stringify(watchlist));
      } catch (error) {
        console.error('관심종목 저장 실패:', error);
      }
    }, 500); // 500ms 디바운스

    return () => clearTimeout(timeoutId);
  }, [watchlist]);

  const addToWatchlist = useCallback((symbol: string) => {
    setWatchlist(prev => {
      if (prev.includes(symbol)) return prev;
      return [...prev, symbol];
    });
  }, []);

  const removeFromWatchlist = useCallback((symbol: string) => {
    setWatchlist(prev => prev.filter(s => s !== symbol));
  }, []);

  const toggleWatchlist = useCallback((symbol: string) => {
    setWatchlist(prev => 
      prev.includes(symbol) 
        ? prev.filter(s => s !== symbol)
        : [...prev, symbol]
    );
  }, []);

  const isInWatchlist = useCallback((symbol: string) => {
    return watchlist.includes(symbol);
  }, [watchlist]);

  const clearWatchlist = useCallback(() => {
    setWatchlist([]);
  }, []);

  return {
    watchlist,
    addToWatchlist,
    removeFromWatchlist,
    toggleWatchlist,
    isInWatchlist,
    clearWatchlist,
    count: watchlist.length,
  };
}

// ============================================================================
// 🎯 최적화된 마켓 필터링 훅
// ============================================================================

export interface MarketFilters {
  search: string;
  type: 'all' | 'crypto' | 'stock';
  sortBy: 'symbol' | 'price' | 'change' | 'changePercent' | 'volume';
  sortOrder: 'asc' | 'desc';
}

export function useMarketFilter(marketData: MarketItem[], initialFilters?: Partial<MarketFilters>) {
  const [filters, setFilters] = useState<MarketFilters>({
    search: '',
    type: 'all',
    sortBy: 'changePercent',
    sortOrder: 'desc',
    ...initialFilters,
  });

  // 🎯 메모이제이션으로 필터링 성능 최적화
  const filteredData = useMemo(() => {
    let result = [...marketData];

    // 검색 필터
    if (filters.search.trim()) {
      const query = filters.search.toLowerCase();
      result = result.filter(item => 
        item.name.toLowerCase().includes(query) ||
        item.symbol.toLowerCase().includes(query)
      );
    }

    // 타입 필터
    if (filters.type !== 'all') {
      result = result.filter(item => item.type === filters.type);
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
        case 'price':
          aValue = a.price;
          bValue = b.price;
          break;
        case 'change':
          aValue = a.change;
          bValue = b.change;
          break;
        case 'changePercent':
          aValue = a.changePercent;
          bValue = b.changePercent;
          break;
        case 'volume':
          aValue = parseFloat(a.volume.replace(/[^\d.-]/g, ''));
          bValue = parseFloat(b.volume.replace(/[^\d.-]/g, ''));
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
  }, [marketData, filters]);

  const updateSearch = useCallback((search: string) => {
    setFilters(prev => ({ ...prev, search }));
  }, []);

  const updateType = useCallback((type: MarketFilters['type']) => {
    setFilters(prev => ({ ...prev, type }));
  }, []);

  const updateSort = useCallback((sortBy: MarketFilters['sortBy'], sortOrder?: MarketFilters['sortOrder']) => {
    setFilters(prev => ({
      ...prev,
      sortBy,
      sortOrder: sortOrder || (prev.sortBy === sortBy && prev.sortOrder === 'desc' ? 'asc' : 'desc')
    }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({
      search: '',
      type: 'all',
      sortBy: 'changePercent',
      sortOrder: 'desc',
    });
  }, []);

  return {
    filters,
    filteredData,
    updateSearch,
    updateType,
    updateSort,
    resetFilters,
    resultCount: filteredData.length,
    isEmpty: filteredData.length === 0,
  };
}

// ============================================================================
// 🎯 간소화된 에러 처리 훅
// ============================================================================

export interface WebSocketError {
  type: WebSocketType;
  error: string;
  timestamp: Date;
}

export function useWebSocketErrors() {
  const [errors, setErrors] = useState<WebSocketError[]>([]);

  useEffect(() => {
    const unsubscribe = webSocketManager.subscribe('error', (data) => {
      const errorObj: WebSocketError = {
        type: data.type,
        error: data.error,
        timestamp: new Date(),
      };

      setErrors(prev => [...prev.slice(-9), errorObj]); // 최대 10개 에러만 유지
    });

    return unsubscribe;
  }, []);

  const clearErrors = useCallback(() => {
    setErrors([]);
  }, []);

  const getLatestError = useCallback(() => {
    return errors[errors.length - 1] || null;
  }, [errors]);

  const getErrorsByType = useCallback((type: WebSocketType) => {
    return errors.filter(error => error.type === type);
  }, [errors]);

  return {
    errors,
    latestError: getLatestError(),
    clearErrors,
    getErrorsByType,
    hasErrors: errors.length > 0,
  };
}