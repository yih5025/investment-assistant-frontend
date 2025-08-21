// hooks/useMarketData.ts
// 마켓 데이터 관련 훅들

import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  webSocketService, 
  CryptoData, 
  SP500Data, 
  TopGainersData, 
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
// 이름 매핑 (실제로는 API에서 가져와야 함)
// ============================================================================

const cryptoNames: Record<string, string> = {
  'KRW-BTC': 'Bitcoin',
  'KRW-ETH': 'Ethereum',
  'KRW-ADA': 'Cardano',
  'KRW-XRP': 'Ripple',
  'KRW-DOT': 'Polkadot',
  'KRW-DOGE': 'Dogecoin',
  'KRW-SOL': 'Solana',
  'KRW-AVAX': 'Avalanche',
  'KRW-MATIC': 'Polygon',
  'KRW-LINK': 'Chainlink',
};

const stockNames: Record<string, string> = {
  'AAPL': 'Apple Inc.',
  'MSFT': 'Microsoft Corporation',
  'GOOGL': 'Alphabet Inc.',
  'AMZN': 'Amazon.com Inc.',
  'TSLA': 'Tesla Inc.',
  'META': 'Meta Platforms Inc.',
  'NVDA': 'NVIDIA Corporation',
  'NFLX': 'Netflix Inc.',
  'GOOG': 'Alphabet Inc.',
  'BRK.B': 'Berkshire Hathaway',
};

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
// 1. Enhanced WebSocket 연결 상태 관리 훅
// ============================================================================

export function useWebSocketConnection() {
  const [connectionStatuses, setConnectionStatuses] = useState<Record<WebSocketType, { status: ConnectionStatus; mode: DataMode }>>({
    crypto: { status: 'disconnected', mode: 'websocket' },
    sp500: { status: 'disconnected', mode: 'websocket' },
    topgainers: { status: 'disconnected', mode: 'websocket' },
  });

  const [marketTimeManager] = useState(() => new MarketTimeManager());

  useEffect(() => {
    // Enhanced WebSocket 서비스 초기화
    webSocketService.initialize();

    // 초기 상태 설정
    setConnectionStatuses(webSocketService.getAllConnectionStatuses());

    // 연결 상태 변경 구독
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
    
    return 'connecting'; // 일부 연결됨
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
  const [cryptoData, setCryptoData] = useState<MarketItem[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    const unsubscribe = webSocketService.subscribe('crypto_update', (data: CryptoData[]) => {
      const items: MarketItem[] = data.map(crypto => {
        const symbol = crypto.market.replace('KRW-', '');
        const name = cryptoNames[crypto.market] || symbol;
        
        return {
          symbol,
          name,
          price: crypto.trade_price || 0,
          change: crypto.signed_change_price || 0,
          changePercent: (crypto.signed_change_rate || 0) * 100,
          volume: formatVolume(crypto.acc_trade_volume_24h || 0),
          type: 'crypto' as const,
          marketCap: formatVolume((crypto.trade_price || 0) * 21000000) // 임시 시총 계산
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

export function useSP500Data() {
  const [sp500Data, setSP500Data] = useState<MarketItem[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [previousPrices, setPreviousPrices] = useState<Record<string, number>>({});

  useEffect(() => {
    const unsubscribe = webSocketService.subscribe('sp500_update', (data: SP500Data[]) => {
      const items: MarketItem[] = data.map(stock => {
        const name = stockNames[stock.symbol] || `${stock.symbol} Corp.`;
        const prevPrice = previousPrices[stock.symbol] || stock.price;
        const change = stock.price - prevPrice;
        const changePercent = prevPrice !== 0 ? (change / prevPrice) * 100 : 0;
        
        return {
          symbol: stock.symbol,
          name,
          price: stock.price || 0,
          change,
          changePercent,
          volume: formatVolume(stock.volume || 0),
          type: 'stock' as const,
        };
      });

      // 이전 가격 업데이트 (변화량 계산용)
      const newPreviousPrices: Record<string, number> = {};
      data.forEach(stock => {
        newPreviousPrices[stock.symbol] = stock.price;
      });
      setPreviousPrices(prev => ({ ...prev, ...newPreviousPrices }));

      setSP500Data(items);
      setLastUpdated(new Date());
    });

    return unsubscribe;
  }, [previousPrices]);

  return {
    sp500Data,
    lastUpdated,
    isEmpty: sp500Data.length === 0,
  };
}

// ============================================================================
// 4. Top Gainers 데이터 훅 (홈 페이지용)
// ============================================================================

export function useTopGainersData() {
  const [topGainersData, setTopGainersData] = useState<TopGainersData[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    const unsubscribe = webSocketService.subscribe('topgainers_update', (data: TopGainersData[]) => {
      setTopGainersData(data);
      setLastUpdated(new Date());
    });

    return unsubscribe;
  }, []);

  // 상위 N개 항목 가져오기
  const getTopGainers = useCallback((count: number = 10) => {
    return topGainersData
      .sort((a, b) => b.change_percent - a.change_percent)
      .slice(0, count);
  }, [topGainersData]);

  // 상위 상승률 종목들
  const topByPercent = useMemo(() => getTopGainers(5), [getTopGainers]);

  return {
    topGainersData,
    topByPercent,
    lastUpdated,
    isEmpty: topGainersData.length === 0,
    getTopGainers,
  };
}

// ============================================================================
// 5. 통합 마켓 데이터 훅 (MarketPage용)
// ============================================================================

export function useMarketData() {
  const { cryptoData } = useCryptoData();
  const { sp500Data } = useSP500Data();
  const { connectionStatuses, isConnected, isAnyConnected, overallStatus } = useWebSocketConnection();

  // 통합 마켓 데이터
  const allMarketData = useMemo(() => {
    return [...cryptoData, ...sp500Data];
  }, [cryptoData, sp500Data]);

  // 타입별 필터링
  const filterByType = useCallback((type: 'all' | 'crypto' | 'stock') => {
    if (type === 'all') return allMarketData;
    return allMarketData.filter(item => item.type === type);
  }, [allMarketData]);

  // 검색 기능
  const searchItems = useCallback((query: string, items: MarketItem[] = allMarketData) => {
    if (!query.trim()) return items;
    
    const lowerQuery = query.toLowerCase();
    return items.filter(item => 
      item.name.toLowerCase().includes(lowerQuery) ||
      item.symbol.toLowerCase().includes(lowerQuery)
    );
  }, [allMarketData]);

  return {
    // 데이터
    allMarketData,
    cryptoData,
    sp500Data,
    
    // 연결 상태
    connectionStatuses,
    isConnected,
    isAnyConnected,
    overallStatus,
    
    // 유틸리티 함수
    filterByType,
    searchItems,
    formatPrice,
    formatVolume,
    
    // 상태
    isEmpty: allMarketData.length === 0,
    cryptoCount: cryptoData.length,
    stockCount: sp500Data.length,
    totalCount: allMarketData.length,
  };
}

// ============================================================================
// 6. 관심종목 관리 훅
// ============================================================================

export function useWatchlist(initialWatchlist: string[] = ['AAPL', 'BTC']) {
  const [watchlist, setWatchlist] = useState<string[]>(initialWatchlist);

  // localStorage에서 관심종목 불러오기
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

  // localStorage에 관심종목 저장
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
// 7. 마켓 필터링 훅
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

  // 필터링된 데이터
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
          // 볼륨은 문자열이므로 숫자로 변환
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

  // 필터 업데이트 함수들
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
// 8. 에러 처리 훅
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

      setErrors(prev => [...prev.slice(-9), errorObj]); // 최대 10개 에러 보관
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

// ============================================================================
// 9. 성능 모니터링 훅
// ============================================================================

export function useWebSocketPerformance() {
  const [updateCounts, setUpdateCounts] = useState<Record<WebSocketType, number>>({
    crypto: 0,
    sp500: 0,
    topgainers: 0,
  });

  const [lastUpdateTimes, setLastUpdateTimes] = useState<Record<WebSocketType, Date | null>>({
    crypto: null,
    sp500: null,
    topgainers: null,
  });

  useEffect(() => {
    const unsubscribeCrypto = webSocketService.subscribe('crypto_update', () => {
      setUpdateCounts(prev => ({ ...prev, crypto: prev.crypto + 1 }));
      setLastUpdateTimes(prev => ({ ...prev, crypto: new Date() }));
    });

    const unsubscribeSP500 = webSocketService.subscribe('sp500_update', () => {
      setUpdateCounts(prev => ({ ...prev, sp500: prev.sp500 + 1 }));
      setLastUpdateTimes(prev => ({ ...prev, sp500: new Date() }));
    });

    const unsubscribeTopGainers = webSocketService.subscribe('topgainers_update', () => {
      setUpdateCounts(prev => ({ ...prev, topgainers: prev.topgainers + 1 }));
      setLastUpdateTimes(prev => ({ ...prev, topgainers: new Date() }));
    });

    return () => {
      unsubscribeCrypto();
      unsubscribeSP500();
      unsubscribeTopGainers();
    };
  }, []);

  const resetCounters = useCallback(() => {
    setUpdateCounts({
      crypto: 0,
      sp500: 0,
      topgainers: 0,
    });
  }, []);

  const getUpdateFrequency = useCallback((type: WebSocketType) => {
    const lastUpdate = lastUpdateTimes[type];
    const count = updateCounts[type];
    
    if (!lastUpdate || count === 0) return 0;
    
    const now = new Date();
    const diffMinutes = (now.getTime() - lastUpdate.getTime()) / (1000 * 60);
    
    return count / Math.max(diffMinutes, 1); // 분당 업데이트 수
  }, [updateCounts, lastUpdateTimes]);

  return {
    updateCounts,
    lastUpdateTimes,
    getUpdateFrequency,
    resetCounters,
    totalUpdates: Object.values(updateCounts).reduce((sum, count) => sum + count, 0),
  };
}

// ============================================================================
// 10. 디버깅 훅
// ============================================================================

export function useWebSocketDebug() {
  const [isDebugMode, setIsDebugMode] = useState(() => {
    return localStorage.getItem('websocket-debug') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('websocket-debug', isDebugMode.toString());
  }, [isDebugMode]);

  const getServiceStatus = useCallback(() => {
    return webSocketService.getStatus();
  }, []);

  const logServiceStatus = useCallback(() => {
    console.log('WebSocket Service Status:', webSocketService.getStatus());
  }, []);

  const toggleDebugMode = useCallback(() => {
    setIsDebugMode(prev => !prev);
  }, []);

  return {
    isDebugMode,
    toggleDebugMode,
    getServiceStatus,
    logServiceStatus,
  };
}