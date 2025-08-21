// hooks/useMarketData.ts
// 마켓 데이터 관리를 위한 훅 모음

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
// 이름 매핑
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
// 1. WebSocket 연결 상태 관리 훅
// ============================================================================

export function useWebSocketConnection() {
  const [connectionStatuses, setConnectionStatuses] = useState<Record<WebSocketType, { status: ConnectionStatus; mode: DataMode }>>({
    crypto: { status: 'disconnected', mode: 'websocket' },
    sp500: { status: 'disconnected', mode: 'websocket' },
    topgainers: { status: 'disconnected', mode: 'websocket' },
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
          marketCap: formatVolume((crypto.trade_price || 0) * 21000000)
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