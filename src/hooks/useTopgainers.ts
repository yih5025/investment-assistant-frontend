// hooks/useTopGainers.ts
// TopGainers 전용 훅 (HTTP 폴링 방식)

import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  webSocketManager, 
  TopGainersData,
  TopGainersCategoryStats,
  ConnectionStatus,
  DataMode
} from '../services/WebSocketManager';
import { MarketTimeManager } from '../utils/marketTime';

// ============================================================================
// TopGainers 배너용 데이터 인터페이스
// ============================================================================

export interface TopGainerBannerItem {
  symbol: string;
  name: string;
  price: number;
  change_amount: number;
  change_percent: number;
  volume: number;
  category: 'top_gainers' | 'top_losers' | 'most_actively_traded';
  rank_position?: number;
}

export interface TopGainersCategoryData {
  top_gainers: TopGainerBannerItem[];
  top_losers: TopGainerBannerItem[];
  most_actively_traded: TopGainerBannerItem[];
}

// ============================================================================
// 1. TopGainers 연결 상태 관리 훅
// ============================================================================

export function useTopGainersConnection() {
  const [connectionStatus, setConnectionStatus] = useState<{ status: ConnectionStatus; mode: DataMode }>({
    status: 'disconnected',
    mode: 'api'  // HTTP 폴링 모드로 변경
  });

  const [marketTimeManager] = useState(() => new MarketTimeManager());

  useEffect(() => {
    // TopGainers 연결 상태 구독
    const unsubscribe = webSocketManager.subscribe('connection_change', ({ type, status, mode }) => {
      if (type === 'topgainers') {
        setConnectionStatus({ status, mode });
      }
    });

    // 초기 상태 설정
    const allStatuses = webSocketManager.getAllConnectionStatuses();
    setConnectionStatus(allStatuses.topgainers);

    return unsubscribe;
  }, []);

  const reconnect = useCallback(() => {
    webSocketManager.reconnect('topgainers');
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
// 2. TopGainers 카테고리 통계 훅
// ============================================================================

export function useTopGainersCategoryStats() {
  const [categoryStats, setCategoryStats] = useState<TopGainersCategoryStats | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    // 카테고리 통계 구독
    const unsubscribe = webSocketManager.subscribe('topgainers_category_stats', (stats: TopGainersCategoryStats) => {
      setCategoryStats(stats);
      setLastUpdated(new Date());
    });

    // 초기 데이터 로드
    const initialStats = webSocketManager.getTopGainersCategoryStats();
    if (initialStats) {
      setCategoryStats(initialStats);
      setLastUpdated(new Date());
    }

    return unsubscribe;
  }, []);

  return {
    categoryStats,
    lastUpdated,
    isEmpty: !categoryStats,
  };
}

// ============================================================================
// 3. TopGainers 메인 데이터 훅
// ============================================================================

// 카테고리별 데이터 분류 함수 (컴포넌트 외부에서 정의)
const categorizeTopGainersData = (data: TopGainersData[]): TopGainersCategoryData => {
  const categorized: TopGainersCategoryData = {
    top_gainers: [],
    top_losers: [],
    most_actively_traded: []
  };

  data.forEach(item => {
    const bannerItem: TopGainerBannerItem = {
      symbol: item.symbol,
      name: item.name || `${item.symbol} Corp.`,
      price: item.price || 0,
      change_amount: item.change_amount || 0,
      change_percent: item.change_percent || 0,
      volume: item.volume || 0,
      category: item.category,
      rank_position: item.rank_position
    };

    if (categorized[item.category]) {
      categorized[item.category].push(bannerItem);
    }
  });

  // 각 카테고리를 순위별로 정렬
  Object.keys(categorized).forEach(category => {
    categorized[category as keyof TopGainersCategoryData].sort((a, b) => {
      if (a.rank_position && b.rank_position) {
        return a.rank_position - b.rank_position;
      }
      return b.change_percent - a.change_percent;
    });
  });

  return categorized;
};

export function useTopGainersData() {
  // 초기값으로 WebSocket 서비스의 캐시된 데이터 사용
  const [allTopGainersData, setAllTopGainersData] = useState<TopGainersData[]>(() => {
    const cachedData = webSocketManager.getLastCachedData('topgainers');
    return cachedData || [];
  });
  
  const [categorizedData, setCategorizedData] = useState<TopGainersCategoryData>(() => {
    const cachedData = webSocketManager.getLastCachedData('topgainers');
    if (cachedData && cachedData.length > 0) {
      return categorizeTopGainersData(cachedData);
    }
    return {
      top_gainers: [],
      top_losers: [],
      most_actively_traded: []
    };
  });
  
  const [lastUpdated, setLastUpdated] = useState<Date | null>(() => {
    const cachedData = webSocketManager.getLastCachedData('topgainers');
    return cachedData && cachedData.length > 0 ? new Date() : null;
  });

  useEffect(() => {
    const unsubscribe = webSocketManager.subscribe('topgainers_update', (data: TopGainersData[]) => {
      setAllTopGainersData(data);
      const categorized = categorizeTopGainersData(data);
      setCategorizedData(categorized);
      setLastUpdated(new Date());
    });

    return unsubscribe;
  }, []);

  // 카테고리별 데이터 가져오기
  const getByCategory = useCallback((category: 'top_gainers' | 'top_losers' | 'most_actively_traded') => {
    return categorizedData[category] || [];
  }, [categorizedData]);

  // 특정 개수만큼 가져오기
  const getTopGainers = useCallback((count: number = 10) => {
    return categorizedData.top_gainers.slice(0, count);
  }, [categorizedData.top_gainers]);

  const getTopLosers = useCallback((count: number = 10) => {
    return categorizedData.top_losers.slice(0, count);
  }, [categorizedData.top_losers]);

  const getMostActive = useCallback((count: number = 10) => {
    return categorizedData.most_actively_traded.slice(0, count);
  }, [categorizedData.most_actively_traded]);

  // 전체 데이터 요약
  const summary = useMemo(() => {
    return {
      totalCount: allTopGainersData.length,
      topGainersCount: categorizedData.top_gainers.length,
      topLosersCount: categorizedData.top_losers.length,
      mostActiveCount: categorizedData.most_actively_traded.length,
      categories: Object.keys(categorizedData),
    };
  }, [allTopGainersData.length, categorizedData]);

  return {
    allTopGainersData,
    categorizedData,
    lastUpdated,
    isEmpty: allTopGainersData.length === 0,
    getByCategory,
    getTopGainers,
    getTopLosers,
    getMostActive,
    summary,
  };
}

// ============================================================================
// 4. TopGainers 배너 슬라이딩 훅
// ============================================================================

export interface SliderState {
  currentIndex: number;
  isTransitioning: boolean;
  direction: 'up' | 'down';
}

export function useTopGainersSlider(
  items: TopGainerBannerItem[], 
  intervalMs: number = 4000,
  isMarketOpen: boolean = true
) {
  const [sliderState, setSliderState] = useState<SliderState>({
    currentIndex: 0,
    isTransitioning: false,
    direction: 'up'
  });

  // 시장 상태에 따른 슬라이딩 간격 조정
  const actualInterval = useMemo(() => {
    return isMarketOpen ? intervalMs : intervalMs * 2; // 장 마감 시 2배 느리게
  }, [intervalMs, isMarketOpen]);

  useEffect(() => {
    if (items.length === 0) return;

    const interval = setInterval(() => {
      setSliderState(prev => ({
        ...prev,
        isTransitioning: true
      }));

      setTimeout(() => {
        setSliderState(prev => {
          const nextIndex = (prev.currentIndex + 1) % items.length;
          return {
            currentIndex: nextIndex,
            isTransitioning: false,
            direction: 'up' // 항상 위로 슬라이딩
          };
        });
      }, 300); // 0.3초 전환 애니메이션

    }, actualInterval);

    return () => clearInterval(interval);
  }, [items.length, actualInterval]);

  // 수동으로 다음/이전 아이템으로 이동
  const goToNext = useCallback(() => {
    if (items.length === 0) return;
    
    setSliderState(prev => ({
      currentIndex: (prev.currentIndex + 1) % items.length,
      isTransitioning: false,
      direction: 'up'
    }));
  }, [items.length]);

  const goToPrevious = useCallback(() => {
    if (items.length === 0) return;
    
    setSliderState(prev => ({
      currentIndex: prev.currentIndex === 0 ? items.length - 1 : prev.currentIndex - 1,
      isTransitioning: false,
      direction: 'down'
    }));
  }, [items.length]);

  const goToIndex = useCallback((index: number) => {
    if (items.length === 0 || index < 0 || index >= items.length) return;
    
    setSliderState(prev => ({
      currentIndex: index,
      isTransitioning: false,
      direction: index > prev.currentIndex ? 'up' : 'down'
    }));
  }, [items.length]);

  // 현재 아이템
  const currentItem = useMemo(() => {
    return items.length > 0 ? items[sliderState.currentIndex] : null;
  }, [items, sliderState.currentIndex]);

  return {
    sliderState,
    currentItem,
    goToNext,
    goToPrevious,
    goToIndex,
    hasItems: items.length > 0,
    totalItems: items.length,
  };
}

// ============================================================================
// 5. TopGainers 통합 훅 (배너 컴포넌트용)
// ============================================================================

export function useTopGainersBanner() {
  const { connectionStatus, isConnected, isRealtime, reconnect } = useTopGainersConnection();
  const { categorizedData, lastUpdated, isEmpty, getByCategory } = useTopGainersData();
  const { categoryStats } = useTopGainersCategoryStats();

  // 배너별 슬라이더 상태
  const topGainersItems = getByCategory('top_gainers');
  const topLosersItems = getByCategory('top_losers');
  const mostActiveItems = getByCategory('most_actively_traded');

  const topGainersSlider = useTopGainersSlider(topGainersItems, 4000, isRealtime);
  const topLosersSlider = useTopGainersSlider(topLosersItems, 4500, isRealtime);
  const mostActiveSlider = useTopGainersSlider(mostActiveItems, 5000, isRealtime);

  // 시장 상태 정보
  const [marketTimeManager] = useState(() => new MarketTimeManager());
  const marketStatus = useMemo(() => {
    return marketTimeManager.getCurrentMarketStatus();
  }, [marketTimeManager]);

  // 배너 클릭 핸들러
  const handleBannerClick = useCallback((item: TopGainerBannerItem) => {
    // 마켓 페이지로 네비게이션
    window.dispatchEvent(new CustomEvent('navigateToMarkets', { 
      detail: { symbol: item.symbol } 
    }));
  }, []);

  // 데이터 소스 메시지 (HTTP 폴링 방식)
  const getDataSourceMessage = useCallback(() => {
    if (marketStatus.isOpen) {
      return isConnected ? 'HTTP 폴링 (5초 간격)' : '연결 중...';
    } else {
      return '최종 거래가 기준 (30초 간격)';
    }
  }, [marketStatus.isOpen, isConnected]);

  // 배너 설정
  const bannerConfigs = useMemo(() => [
    {
      title: "급상승",
      category: 'top_gainers' as const,
      color: "text-green-400",
      bgColor: "bg-gradient-to-br from-green-500/10 to-green-600/5",
      borderColor: "border-green-500/20",
      items: topGainersItems,
      slider: topGainersSlider,
      icon: 'TrendingUp'
    },
    {
      title: "급하락",
      category: 'top_losers' as const,
      color: "text-red-400",
      bgColor: "bg-gradient-to-br from-red-500/10 to-red-600/5",
      borderColor: "border-red-500/20",
      items: topLosersItems,
      slider: topLosersSlider,
      icon: 'TrendingDown'
    },
    {
      title: "거래량",
      category: 'most_actively_traded' as const,
      color: "text-blue-400",
      bgColor: "bg-gradient-to-br from-blue-500/10 to-blue-600/5",
      borderColor: "border-blue-500/20",
      items: mostActiveItems,
      slider: mostActiveSlider,
      icon: 'Activity'
    }
  ], [topGainersItems, topLosersItems, mostActiveItems, topGainersSlider, topLosersSlider, mostActiveSlider]);

  return {
    // 연결 상태
    connectionStatus,
    isConnected,
    isRealtime,
    reconnect,
    
    // 데이터
    categorizedData,
    lastUpdated,
    isEmpty,
    categoryStats,
    
    // 시장 상태
    marketStatus,
    
    // 배너 설정
    bannerConfigs,
    
    // 유틸리티
    handleBannerClick,
    getDataSourceMessage,
    
    // 개별 카테고리 데이터
    topGainersItems,
    topLosersItems,
    mostActiveItems,
  };
}

// ============================================================================
// 6. TopGainers 성능 모니터링 훅
// ============================================================================

export function useTopGainersPerformance() {
  const [updateCount, setUpdateCount] = useState(0);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
  const [averageUpdateInterval, setAverageUpdateInterval] = useState<number>(0);

  useEffect(() => {
    let updateTimes: number[] = [];

    const unsubscribe = webSocketManager.subscribe('topgainers_update', () => {
      const now = Date.now();
      
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
    });

    return unsubscribe;
  }, []);

  const resetCounters = useCallback(() => {
    setUpdateCount(0);
    setLastUpdateTime(null);
    setAverageUpdateInterval(0);
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
    getUpdateFrequency,
    resetCounters,
  };
}

// ============================================================================
// 7. TopGainers 에러 처리 훅
// ============================================================================

export function useTopGainersErrors() {
  const [errors, setErrors] = useState<Array<{ error: string; timestamp: Date }>>([]);

  useEffect(() => {
    const unsubscribe = webSocketManager.subscribe('error', ({ type, error }) => {
      if (type === 'topgainers') {
        const errorObj = {
          error,
          timestamp: new Date(),
        };

        setErrors(prev => [...prev.slice(-4), errorObj]); // 최대 5개 에러 보관
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
// 8. TopGainers 디버깅 훅
// ============================================================================

export function useTopGainersDebug() {
  const [isDebugMode, setIsDebugMode] = useState(() => {
    return localStorage.getItem('topgainers-debug') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('topgainers-debug', isDebugMode.toString());
  }, [isDebugMode]);

  const getServiceStatus = useCallback(() => {
    return {
      service: webSocketManager.getStatus(),
      topgainersCategories: webSocketManager.getAllTopGainersCategories(),
      categoryStats: webSocketManager.getTopGainersCategoryStats(),
    };
  }, []);

  const logServiceStatus = useCallback(() => {
    console.log('TopGainers Service Status:', getServiceStatus());
  }, [getServiceStatus]);

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