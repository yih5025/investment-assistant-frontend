// src/hooks/useSNS.ts

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useSWRApi } from './useApi';
import { snsApiService, type SNSPost, type SNSListParams, type OHLCVData } from '../services/SNSService';

// ============================================================================
// SNS 목록 조회 훅
// ============================================================================

export interface UseSNSListOptions {
  initialParams?: SNSListParams;
  autoFetch?: boolean;
}

export function useSNSList(options: UseSNSListOptions = {}) {
  const { initialParams = {}, autoFetch = true } = options;
  
  const [params, setParams] = useState<SNSListParams>({
    skip: 0,
    limit: 20,
    post_source: 'all',
    ...initialParams
  });

  const [allPosts, setAllPosts] = useState<SNSPost[]>([]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadedPages, setLoadedPages] = useState<Set<number>>(new Set());

  // 새 코드:
  const swrKey = useMemo(() => {
    if (!autoFetch) return null;
    return `sns-posts-${params.post_source}`;
  }, [params.post_source, autoFetch]);

  // SWR을 사용한 데이터 페칭 - 첫 페이지만
  const {
    data: firstPagePosts,
    error,
    isLoading: isInitialLoading,
    mutate: refetch
  } = useSWRApi(
    swrKey,
    async () => {
      // console.log('🚀 SWR fetcher:', params.post_source);
      const result = await snsApiService.getPosts({ 
        skip: 0, 
        limit: 20,
        post_source: params.post_source 
      });
      return result;
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000, // 1분간 중복 요청 방지
      revalidateOnMount: true, // 마운트 시 항상 재검증
      refreshInterval: 0, // 자동 새로고침 비활성화
      onError: (error) => {
        console.error('❌ SWR error:', error);
      },
      onSuccess: (data) => {
        // console.log('✅ SWR success:', data);
      }
    }
  );

  useEffect(() => {
    if (!isInitialLoading && firstPagePosts) {
      // console.log('✅ 첫 페이지 데이터 설정:', firstPagePosts.length);
      setAllPosts(firstPagePosts);
      setLoadedPages(new Set([0]));
      setIsLoadingMore(false);
    }
  }, [firstPagePosts, isInitialLoading]);

  const updateFilter = useCallback((newParams: Partial<SNSListParams>) => {
    // console.log('🔄 필터 업데이트:', newParams);
    
    setParams(prev => {
      if (prev.post_source === newParams.post_source) {
        // console.log('⚠️ 동일한 필터 - 업데이트 스킵');
        return prev;
      }
      
      return {
        ...prev,
        ...newParams,
        skip: 0
      };
    });
    
    setAllPosts([]);
    setLoadedPages(new Set());
    setIsLoadingMore(false);
  }, []);

  const loadMore = useCallback(async () => {
    if (isLoadingMore) return;
    
    const nextPage = Math.floor(allPosts.length / 20);
    if (loadedPages.has(nextPage)) return;
    
    setIsLoadingMore(true);
    
    try {
      const nextPagePosts = await snsApiService.getPosts({
        ...params,
        skip: nextPage * 20,
        limit: 20
      });
      
      if (nextPagePosts && nextPagePosts.length > 0) {
        setAllPosts(prev => [...prev, ...nextPagePosts]);
        setLoadedPages(prev => new Set([...prev, nextPage]));
      }
    } catch (error) {
      console.error('더보기 로드 실패:', error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [allPosts.length, loadedPages, isLoadingMore, params.post_source]);
  
  const refresh = useCallback(() => {
    // console.log('🔄 새로고침');
    setAllPosts([]);
    setLoadedPages(new Set());
    setIsLoadingMore(false);
    refetch();
  }, [refetch]);

  return {
    // 데이터
    posts: allPosts,
    loading: isInitialLoading || (isLoadingMore && params.skip === 0),
    error,
    
    // 필터 상태
    params,
    
    // 액션
    updateFilter,
    loadMore,
    refresh,
    refetch,
    
    // 계산된 값
    hasMore: allPosts.length > 0 && allPosts.length % 20 === 0, // 20의 배수일 때 더 있을 가능성
    totalLoaded: allPosts.length,
    isLoadingMore
  };
}

// ============================================================================
// SNS 상세 조회 훅
// ============================================================================

export interface UseSNSDetailOptions {
  postSource: string;
  postId: string;
  autoFetch?: boolean;
}

export function useSNSDetail({ postSource, postId, autoFetch = true }: UseSNSDetailOptions) {
  const swrKey = autoFetch ? `sns-detail-${postSource}-${postId}` : null;

  const {
    data: post,
    error,
    isLoading,
    mutate: refetch
  } = useSWRApi(
    swrKey,
    () => snsApiService.getPostDetail(postSource, postId),
    {
      revalidateOnFocus: false,
      dedupingInterval: 300000, // 5분간 중복 요청 방지
    }
  );


  // 영향받은 자산 목록 (가격 데이터가 있는 것만)
  const affectedAssets = useMemo(() => {
    if (!post?.analysis.affected_assets) return [];
    
    return post.analysis.affected_assets.filter(asset => {
      const priceData = post.analysis.price_analysis?.[asset.symbol];
      return priceData && priceData.base_price;
    });
  }, [post]);

  // 외부 링크 생성
  const externalLink = useMemo(() => {
    return post ? snsApiService.generateSNSLink(post) : '#';
  }, [post]);

  return {
    // 데이터
    post,
    loading: isLoading,
    error,
    
    // 계산된 값
    affectedAssets,
    externalLink,
    
    // 액션
    refetch,
    
    // 헬퍼 함수들
    formatPrice: (price: number, symbol: string) => snsApiService.formatPrice(price, symbol),
    formatTime: (timestamp: string) => snsApiService.formatRelativeTime(timestamp),
    formatNumber: (num: number) => snsApiService.formatNumber(num),
    getChangeColor: (change: number) => snsApiService.getChangeColorClass(change),
    getPlatformName: (source: string) => snsApiService.getPlatformName(source)
  };
}

// ============================================================================
// SNS 필터 관리 훅
// ============================================================================

export interface SNSFilter {
  platform: 'all' | 'x' | 'truth_social_posts';
  sortBy: 'recent' | 'impact' | 'engagement';
  searchQuery: string;
}

export function useSNSFilter(initialFilter: Partial<SNSFilter> = {}) {
  const [filter, setFilter] = useState<SNSFilter>({
    platform: 'all',
    sortBy: 'recent',
    searchQuery: '',
    ...initialFilter
  });

  const updatePlatform = useCallback((platform: SNSFilter['platform']) => {
    setFilter(prev => ({ ...prev, platform }));
  }, []);

  const updateSortBy = useCallback((sortBy: SNSFilter['sortBy']) => {
    setFilter(prev => ({ ...prev, sortBy }));
  }, []);

  const updateSearchQuery = useCallback((searchQuery: string) => {
    setFilter(prev => ({ ...prev, searchQuery }));
  }, []);

  const resetFilter = useCallback(() => {
    setFilter({
      platform: 'all',
      sortBy: 'recent',
      searchQuery: ''
    });
  }, []);

  // 필터를 API 파라미터로 변환
  const toApiParams = useCallback((): SNSListParams => {
    const apiParams = {
      post_source: filter.platform === 'all' ? 'all' : filter.platform,
      // TODO: 검색과 정렬은 백엔드 API에서 지원할 때 추가
    };
    // console.log('🔄 Converting filter to API params:', { filter, apiParams });
    return apiParams;
  }, [filter.platform]); // 필요한 속성만 의존성으로 설정

  return {
    filter,
    updatePlatform,
    updateSortBy,
    updateSearchQuery,
    resetFilter,
    toApiParams
  };
}

// ============================================================================
// SNS 차트 데이터 처리 훅 (대폭 개선)
// ============================================================================

// src/hooks/useSNS.ts

export function useSNSChartData(post: SNSPost | null, symbol: string) {
  const postTimestamp = post ? new Date(post.analysis.post_timestamp) : null;
  const ohlcvData = post?.analysis.market_data?.[symbol]?.price_timeline || [];

  // 🔴 추가: 5분봉 집계 함수
  const aggregate5MinCandles = useCallback((data: OHLCVData[]) => {
    if (data.length === 0) return [];
    
    const interval = 5;
    const aggregated: OHLCVData[] = [];
    
    for (let i = 0; i < data.length; i += interval) {
      const chunk = data.slice(i, Math.min(i + interval, data.length));
      if (chunk.length === 0) continue;
      
      aggregated.push({
        timestamp: chunk[0].timestamp,
        open: chunk[0].open,
        high: Math.max(...chunk.map(d => d.high)),
        low: Math.min(...chunk.map(d => d.low)),
        close: chunk[chunk.length - 1].close,
        volume: chunk.reduce((sum, d) => sum + d.volume, 0)
      });
    }
    
    return aggregated;
  }, []);

  // 🔴 수정: 5분봉 데이터 생성
  const ohlcv5Min = useMemo(() => aggregate5MinCandles(ohlcvData), [ohlcvData, aggregate5MinCandles]);

  // 1. 볼린저 밴드 계산 - 🔴 5분봉 사용
  const bollingerBandData = useMemo(() => {
    if (ohlcv5Min.length === 0) return [];

    const period = Math.min(20, ohlcv5Min.length);
    
    return ohlcv5Min.map((point, index) => {
      if (index < period - 1) {
        return {
          timestamp: point.timestamp,
          close: point.close,
          upper: null,
          middle: null,
          lower: null,
          isPostTime: postTimestamp ? 
            Math.abs(new Date(point.timestamp).getTime() - postTimestamp.getTime()) < 300000 : false // 5분 = 300초
        };
      }

      const recentCloses = ohlcv5Min
        .slice(Math.max(0, index - period + 1), index + 1)
        .map(d => d.close);
      
      const sma = recentCloses.reduce((sum, val) => sum + val, 0) / recentCloses.length;
      const squaredDiffs = recentCloses.map(val => Math.pow(val - sma, 2));
      const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / recentCloses.length;
      const stdDev = Math.sqrt(variance);
      
      return {
        timestamp: point.timestamp,
        close: point.close,
        upper: sma + (stdDev * 2),
        middle: sma,
        lower: sma - (stdDev * 2),
        isPostTime: postTimestamp ? 
          Math.abs(new Date(point.timestamp).getTime() - postTimestamp.getTime()) < 300000 : false
      };
    });
  }, [ohlcv5Min, postTimestamp]);

  // 2. 듀얼 축 차트 데이터 - 🔴 5분봉 사용
  const dualAxisData = useMemo(() => {
    if (ohlcv5Min.length === 0) return [];

    return ohlcv5Min.map(point => ({
      timestamp: point.timestamp,
      price: point.close,
      volume: point.volume,
      isPostTime: postTimestamp ? 
        Math.abs(new Date(point.timestamp).getTime() - postTimestamp.getTime()) < 300000 : false
    }));
  }, [ohlcv5Min, postTimestamp]);

  // 3. 캔들스틱 데이터 - 🔴 5분봉 사용
  const candlestickData = useMemo(() => {
    if (ohlcv5Min.length === 0) return [];
    
    return ohlcv5Min.map(point => ({
      timestamp: point.timestamp,
      open: point.open,
      high: point.high,
      low: point.low,
      close: point.close,
      volume: point.volume,
      isPostTime: postTimestamp ? 
        Math.abs(new Date(point.timestamp).getTime() - postTimestamp.getTime()) < 300000 : false
    }));
  }, [ohlcv5Min, postTimestamp]);

  // 4. 가격 변화 요약 - 1분봉 유지 (정확한 게시 시점 찾기 위해)
  const priceChangeSummary = useMemo(() => {
    if (!postTimestamp || ohlcvData.length === 0) return null;

    const postIndex = ohlcvData.findIndex(point => 
      Math.abs(new Date(point.timestamp).getTime() - postTimestamp.getTime()) < 60000
    );

    if (postIndex === -1) return null;

    const postPrice = ohlcvData[postIndex].close;
    const afterPost = ohlcvData.slice(postIndex);
    const maxPrice = Math.max(...afterPost.map(d => d.high));
    const minPrice = Math.min(...afterPost.map(d => d.low));
    const maxPricePoint = afterPost.find(d => d.high === maxPrice);
    const minPricePoint = afterPost.find(d => d.low === minPrice);
    const currentPrice = ohlcvData[ohlcvData.length - 1].close;

    return {
      postPrice,
      maxPrice,
      minPrice,
      currentPrice,
      maxPriceTime: maxPricePoint ? maxPricePoint.timestamp : null,
      minPriceTime: minPricePoint ? minPricePoint.timestamp : null,
      maxPriceChange: ((maxPrice - postPrice) / postPrice) * 100,
      minPriceChange: ((minPrice - postPrice) / postPrice) * 100,
      currentPriceChange: ((currentPrice - postPrice) / postPrice) * 100
    };
  }, [ohlcvData, postTimestamp]);

  // 5. 거래량 변화 요약 - 1분봉 유지
  const volumeChangeSummary = useMemo(() => {
    if (!postTimestamp || ohlcvData.length === 0) return null;

    const postIndex = ohlcvData.findIndex(point => 
      Math.abs(new Date(point.timestamp).getTime() - postTimestamp.getTime()) < 60000
    );

    if (postIndex === -1) return null;

    const beforePost = ohlcvData.slice(Math.max(0, postIndex - 60), postIndex);
    const avgVolumeBefore = beforePost.length > 0 
      ? beforePost.reduce((sum, d) => sum + d.volume, 0) / beforePost.length 
      : 0;

    const afterPost = ohlcvData.slice(postIndex, Math.min(ohlcvData.length, postIndex + 60));
    const avgVolumeAfter = afterPost.length > 0
      ? afterPost.reduce((sum, d) => sum + d.volume, 0) / afterPost.length
      : 0;

    const maxVolume = Math.max(...afterPost.map(d => d.volume));
    const maxVolumePoint = afterPost.find(d => d.volume === maxVolume);

    return {
      avgVolumeBefore,
      avgVolumeAfter,
      maxVolume,
      maxVolumeTime: maxVolumePoint ? maxVolumePoint.timestamp : null,
      volumeIncreaseRatio: avgVolumeBefore > 0 ? avgVolumeAfter / avgVolumeBefore : 0
    };
  }, [ohlcvData, postTimestamp]);

  // 6. 가격대별 거래 분포 - 1분봉 유지 (더 정확한 분포)
  const priceDistribution = useMemo(() => {
    if (ohlcvData.length === 0) return [];

    const allPrices = ohlcvData.flatMap(d => [d.high, d.low]);
    const minPrice = Math.min(...allPrices);
    const maxPrice = Math.max(...allPrices);
    
    const binCount = 5;
    const binSize = (maxPrice - minPrice) / binCount;
    
    const bins = Array.from({ length: binCount }, (_, i) => ({
      rangeStart: minPrice + (binSize * i),
      rangeEnd: minPrice + (binSize * (i + 1)),
      volume: 0,
      label: `$${(minPrice + binSize * i).toFixed(2)}-${(minPrice + binSize * (i + 1)).toFixed(2)}`
    }));

    ohlcvData.forEach(point => {
      const avgPrice = (point.high + point.low) / 2;
      const binIndex = Math.min(
        binCount - 1, 
        Math.floor((avgPrice - minPrice) / binSize)
      );
      bins[binIndex].volume += point.volume;
    });

    return bins;
  }, [ohlcvData]);

  // 7. 시간대별 변동폭 - 1분봉 유지
  const volatilityData = useMemo(() => {
    if (!postTimestamp || ohlcvData.length === 0) return { before: [], after: [], avgBefore: 0, avgAfter: 0 };

    const postIndex = ohlcvData.findIndex(point => 
      Math.abs(new Date(point.timestamp).getTime() - postTimestamp.getTime()) < 60000
    );

    if (postIndex === -1) return { before: [], after: [], avgBefore: 0, avgAfter: 0 };

    const calculateVolatility = (data: OHLCVData[]) => {
      return data.map(point => ({
        timestamp: point.timestamp,
        volatility: point.open > 0 ? ((point.high - point.low) / point.open) * 100 : 0
      }));
    };

    const before = calculateVolatility(ohlcvData.slice(Math.max(0, postIndex - 60), postIndex));
    const after = calculateVolatility(ohlcvData.slice(postIndex, Math.min(ohlcvData.length, postIndex + 60)));

    const avgBefore = before.length > 0 
      ? before.reduce((sum, d) => sum + d.volatility, 0) / before.length 
      : 0;
    const avgAfter = after.length > 0 
      ? after.reduce((sum, d) => sum + d.volatility, 0) / after.length 
      : 0;

    return {
      before,
      after,
      avgBefore,
      avgAfter
    };
  }, [ohlcvData, postTimestamp]);

  return {
    bollingerBandData,
    dualAxisData,
    priceChangeSummary,
    volumeChangeSummary,
    candlestickData,
    priceDistribution,
    volatilityData,
    hasData: ohlcvData.length > 0,
    totalDataPoints: ohlcvData.length,
    postTimestamp: postTimestamp?.toISOString() || null
  };
}
