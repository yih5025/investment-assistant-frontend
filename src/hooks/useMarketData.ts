// hooks/useMarketData.ts
// 마켓 데이터 관리를 위한 훅 모음 (Hybrid: Crypto WebSocket + US Stocks HTTP Polling)

import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  webSocketService, 
  CryptoData, 
  SP500Data, 
  ConnectionStatus, 
  WebSocketType,
  DataMode 
} from '../services/websocketService';
import { MarketTimeManager } from '../utils/marketTime';

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
  type: 'crypto' | 'stock';
  marketCap?: string;
  sector?: string;
}

// ============================================================================
// 유틸리티 함수들
// ============================================================================

const formatVolume = (volume: number): string => {
  if (volume >= 1e12) return `${(volume / 1e12).toFixed(1)}T`;
  if (volume >= 1e9) return `${(volume / 1e9).toFixed(1)}B`;
  if (volume >= 1e6) return `${(volume / 1e6).toFixed(1)}M`;
  if (volume >= 1e3) return `${(volume / 1e3).toFixed(1)}K`;
  return volume.toFixed(0);
};

const formatPrice = (price: number, type: 'crypto' | 'stock'): string => {
  if (type === 'crypto') {
    if (price >= 1000000) return `₩${(price / 1000000).toFixed(1)}M`;
    if (price >= 1000) return `₩${price.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}`;
    return `₩${price.toFixed(2)}`;
  } else {
    return `$${price.toFixed(2)}`;
  }
};

// ============================================================================
// 1. WebSocket 연결 상태 관리 훅
// ============================================================================

export function useWebSocketConnection() {
  const [connectionStatuses, setConnectionStatuses] = useState<Record<WebSocketType, { status: ConnectionStatus; mode: DataMode }>>({
    crypto: { status: 'disconnected', mode: 'websocket' },    // 암호화폐: WebSocket
    sp500: { status: 'disconnected', mode: 'api' },           // 미국 주식: HTTP 폴링
    topgainers: { status: 'disconnected', mode: 'api' },      // TopGainers: HTTP 폴링
  });

  const [marketTimeManager] = useState(() => new MarketTimeManager());

  useEffect(() => {
    webSocketService.initialize();
    setConnectionStatuses(webSocketService.getAllConnectionStatuses());

    const unsubscribe = webSocketService.subscribe('connection_change', ({ type, status, mode }) => {
      setConnectionStatuses(prev => ({
        ...prev,
        [type]: { status, mode }
      }));
    });

    return () => {
      unsubscribe();
      webSocketService.shutdown();
    };
  }, []);

  const reconnect = useCallback((type: WebSocketType) => {
    webSocketService.reconnect(type);
  }, []);

  const reconnectAll = useCallback(() => {
    webSocketService.reconnectAll();
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
// 2. 암호화폐 데이터 훅
// ============================================================================

export function useCryptoData() {
  // 🎯 캐시된 데이터로 초기화
  const [cryptoData, setCryptoData] = useState<MarketItem[]>(() => {
    const cachedData = webSocketService.getLastCachedData('crypto');
    if (cachedData && cachedData.length > 0) {
      console.log('📦 Crypto 캐시된 데이터로 초기화:', cachedData.length, '개');
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
    const cachedData = webSocketService.getLastCachedData('crypto');
    return cachedData && cachedData.length > 0 ? new Date() : null;
  });

  useEffect(() => {
    const unsubscribe = webSocketService.subscribe('crypto_update', (data: CryptoData[]) => {
      const items: MarketItem[] = data.map(crypto => {
        // 새로운 스키마 필드 사용 (market_code, symbol, korean_name)
        const marketCode = (crypto as any).market_code || crypto.market || '';
        const symbol = (crypto as any).symbol || marketCode.replace('KRW-', '');
        const name = (crypto as any).korean_name || (crypto as any).crypto_name || marketCode;
        
        // 24시간 거래량 사용 (원화 기준)
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
  }, []);

  return {
    cryptoData,
    lastUpdated,
    isEmpty: cryptoData.length === 0,
  };
}

// ============================================================================
// 3. S&P 500 데이터 훅
// ============================================================================

// SP500 데이터 훅에서 company_name 직접 사용
export function useSP500Data() {
  // 🎯 캐시된 데이터로 초기화
  const [sp500Data, setSP500Data] = useState<MarketItem[]>(() => {
    const cachedData = webSocketService.getLastCachedData('sp500');
    if (cachedData && cachedData.length > 0) {
      console.log('📦 SP500 캐시된 데이터로 초기화:', cachedData.length, '개');
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
    const cachedData = webSocketService.getLastCachedData('sp500');
    return cachedData && cachedData.length > 0 ? new Date() : null;
  });

  useEffect(() => {
      const unsubscribe = webSocketService.subscribe('sp500_update', (data: SP500Data[]) => {
          //console.log('📊 SP500 데이터 수신:', data.length, '개 항목');
          
          const items: MarketItem[] = data.map(stock => {
              // 백엔드에서 제공하는 company_name 직접 사용
              const name = stock.company_name || `${stock.symbol} Inc.`;
              
              // 🎯 변화율 데이터 우선 사용
              const currentPrice = stock.current_price || stock.price || 0;
              const changeAmount = stock.change_amount || 0;
              const changePercent = stock.change_percentage || 0;
              
              //console.log(`📈 ${stock.symbol}: $${currentPrice}, 변화: ${changeAmount} (${changePercent}%)`);
              
              return {
                  symbol: stock.symbol,
                  name, // 백엔드 데이터 직접 사용
                  price: currentPrice,
                  change: changeAmount,
                  changePercent,
                  volume: formatVolume(stock.volume || 0),
                  type: 'stock' as const,
              };
          });

          setSP500Data(items);
          setLastUpdated(new Date());
          
          //console.log(`✅ SP500 데이터 업데이트 완료: ${items.length}개 항목`);
      });

      return unsubscribe;
  }, []);

  return {
      sp500Data,
      lastUpdated,
      isEmpty: sp500Data.length === 0,
  };
}

// ============================================================================
// 4. 통합 마켓 데이터 훅
// ============================================================================

export function useMarketData() {
  const { cryptoData } = useCryptoData();
  const { sp500Data } = useSP500Data();
  const { connectionStatuses, isConnected, isAnyConnected, overallStatus } = useWebSocketConnection();

  const allMarketData = useMemo(() => {
    return [...cryptoData, ...sp500Data];
  }, [cryptoData, sp500Data]);

  const filterByType = useCallback((type: 'all' | 'crypto' | 'stock') => {
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

  // 수동 새로고침 함수 (즉시 로딩 최적화)
  const refreshData = useCallback(() => {
    //console.log('🔄 마켓 데이터 수동 새로고침 - 즉시 시작');
    webSocketService.reconnectAll();
  }, []);

  // 🎯 초기 데이터 로딩 최적화: 서비스 초기화 시 바로 시작
  useEffect(() => {
    if (!webSocketService.getStatus().initialized) {
      console.log('🚀 WebSocket 서비스 초기화 및 즉시 데이터 로딩 시작');
      webSocketService.initialize();
    } else {
      console.log('🔄 WebSocket 서비스 이미 초기화됨 - 연결 상태 확인');
      // 서비스가 이미 초기화되었지만 데이터가 없으면 재연결 시도
      const sp500Status = webSocketService.getAllConnectionStatuses().sp500;
      const cryptoStatus = webSocketService.getAllConnectionStatuses().crypto;
      
      if (sp500Status.status !== 'connected' && sp500Status.status !== 'api_mode') {
        console.log('🔧 SP500 연결 상태 이상 - 재연결 시도');
        webSocketService.reconnect('sp500');
      }
      if (cryptoStatus.status !== 'connected' && cryptoStatus.status !== 'api_mode') {
        console.log('🔧 Crypto 연결 상태 이상 - 재연결 시도');
        webSocketService.reconnect('crypto');
      }
    }
  }, []);

  return {
    allMarketData,
    cryptoData,
    sp500Data,
    connectionStatuses,
    isConnected,
    isAnyConnected,
    overallStatus,
    filterByType,
    searchItems,
    formatPrice,
    formatVolume,
    refreshData, // 새로고침 함수 추가
    isEmpty: allMarketData.length === 0,
    cryptoCount: cryptoData.length,
    stockCount: sp500Data.length,
    totalCount: allMarketData.length,
  };
}

// ============================================================================
// 5. 관심종목 관리 훅
// ============================================================================

export function useWatchlist(initialWatchlist: string[] = ['AAPL', 'BTC']) {
  const [watchlist, setWatchlist] = useState<string[]>(initialWatchlist);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('investment-assistant-watchlist');
      if (saved) {
        setWatchlist(JSON.parse(saved));
      }
    } catch (error) {
      console.error('관심종목 불러오기 실패:', error);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('investment-assistant-watchlist', JSON.stringify(watchlist));
    } catch (error) {
      console.error('관심종목 저장 실패:', error);
    }
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
// 6. 마켓 필터링 훅
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

  const filteredData = useMemo(() => {
    let result = [...marketData];

    if (filters.search.trim()) {
      const query = filters.search.toLowerCase();
      result = result.filter(item => 
        item.name.toLowerCase().includes(query) ||
        item.symbol.toLowerCase().includes(query)
      );
    }

    if (filters.type !== 'all') {
      result = result.filter(item => item.type === filters.type);
    }

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
// 7. 에러 처리 훅
// ============================================================================

export interface WebSocketError {
  type: WebSocketType;
  error: string;
  timestamp: Date;
}

export function useWebSocketErrors() {
  const [errors, setErrors] = useState<WebSocketError[]>([]);

  useEffect(() => {
    const unsubscribe = webSocketService.subscribe('error', ({ type, error }) => {
      const errorObj: WebSocketError = {
        type,
        error,
        timestamp: new Date(),
      };

      setErrors(prev => [...prev.slice(-9), errorObj]);
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