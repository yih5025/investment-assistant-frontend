// src/hooks/useSNS.ts

import { useState, useCallback, useMemo } from 'react';
import { useSWRApi } from './useApi';
import { snsApiService, type SNSPost, type SNSListParams } from '../services/SNSService';

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

  // SWR 키 생성
  const swrKey = useMemo(() => {
    if (!autoFetch) return null;
    return `sns-posts-${JSON.stringify(params)}`;
  }, [params, autoFetch]);

  // SWR을 사용한 데이터 페칭
  const {
    data: posts,
    error,
    isLoading,
    mutate: refetch
  } = useSWRApi(
    swrKey,
    () => snsApiService.getPosts(params),
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000, // 1분간 중복 요청 방지
    }
  );

  // 필터 업데이트
  const updateFilter = useCallback((newParams: Partial<SNSListParams>) => {
    setParams(prev => ({
      ...prev,
      ...newParams,
      skip: newParams.skip !== undefined ? newParams.skip : 0 // 필터 변경시 첫 페이지로
    }));
  }, []);

  // 페이지네이션
  const loadMore = useCallback(() => {
    if (posts && posts.length > 0) {
      setParams(prev => ({
        ...prev,
        skip: (prev.skip || 0) + (prev.limit || 20)
      }));
    }
  }, [posts]);

  // 검색
  const search = useCallback((searchParams: SNSListParams) => {
    setParams(prev => ({
      ...prev,
      ...searchParams,
      skip: 0
    }));
  }, []);

  // 새로고침
  const refresh = useCallback(() => {
    setParams(prev => ({ ...prev, skip: 0 }));
    refetch();
  }, [refetch]);

  return {
    // 데이터
    posts: posts || [],
    loading: isLoading,
    error,
    
    // 필터 상태
    params,
    
    // 액션
    updateFilter,
    loadMore,
    search,
    refresh,
    refetch,
    
    // 계산된 값
    hasMore: posts ? posts.length >= (params.limit || 20) : false,
    totalLoaded: posts?.length || 0
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
    return {
      post_source: filter.platform === 'all' ? undefined : filter.platform,
      // TODO: 검색과 정렬은 백엔드 API에서 지원할 때 추가
    };
  }, [filter]);

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
// SNS 차트 데이터 처리 훅
// ============================================================================

export function useSNSChartData(post: SNSPost | null, symbol: string) {
  // 가격 차트 데이터 생성
  const priceChartData = useMemo(() => {
    if (!post?.analysis.market_data?.[symbol]?.price_timeline) return [];

    const timeline = post.analysis.market_data[symbol].price_timeline;
    const postTime = new Date(post.analysis.post_timestamp);

    return timeline.map((point, index) => {
      const pointTime = new Date(point.timestamp);
      const timeDiff = (pointTime.getTime() - postTime.getTime()) / (1000 * 60); // 분 단위
      
      let timeLabel: string;
      if (timeDiff < -60) {
        timeLabel = `${Math.abs(Math.round(timeDiff / 60))}시간 전`;
      } else if (timeDiff < 0) {
        timeLabel = `${Math.abs(Math.round(timeDiff))}분 전`;
      } else if (timeDiff === 0) {
        timeLabel = '게시 시점';
      } else if (timeDiff < 60) {
        timeLabel = `${Math.round(timeDiff)}분 후`;
      } else {
        timeLabel = `${Math.round(timeDiff / 60)}시간 후`;
      }

      return {
        time: timeLabel,
        price: point.price,
        volume: point.volume,
        timestamp: point.timestamp,
        isPostTime: Math.abs(timeDiff) < 5 // 게시 시점 근처 5분 이내
      };
    }).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }, [post, symbol]);

  // 거래량 차트 데이터 생성
  const volumeChartData = useMemo(() => {
    return priceChartData.map(point => ({
      time: point.time,
      volume: point.volume,
      isPostTime: point.isPostTime
    }));
  }, [priceChartData]);

  // 가격 변화 통계
  const priceStats = useMemo(() => {
    if (!post?.analysis.price_analysis?.[symbol]) return null;

    const priceData = post.analysis.price_analysis[symbol];
    return {
      basePrice: priceData.base_price || 0,
      change1h: priceData["1h_change"] || 0,
      change12h: priceData["12h_change"] || 0,
      change24h: priceData["24h_change"] || 0
    };
  }, [post, symbol]);

  // 거래량 통계
  const volumeStats = useMemo(() => {
    if (!post?.analysis.volume_analysis?.[symbol]) return null;

    const volumeData = post.analysis.volume_analysis[symbol];
    return {
      beforeVolume: volumeData.volume_in_prior_hour || 0,
      afterVolume: volumeData.volume_in_post_hour || 0,
      spikeRatio: volumeData.volume_spike_ratio_1h || 0
    };
  }, [post, symbol]);

  return {
    priceChartData,
    volumeChartData,
    priceStats,
    volumeStats,
    hasData: priceChartData.length > 0
  };
}