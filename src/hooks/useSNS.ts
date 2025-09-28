// src/hooks/useSNS.ts

import { useState, useCallback, useMemo, useEffect } from 'react';
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

  const [allPosts, setAllPosts] = useState<SNSPost[]>([]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadedPages, setLoadedPages] = useState<Set<number>>(new Set());

  // SWR 키 생성 - 첫 페이지는 항상 캐시
  const swrKey = useMemo(() => {
    if (!autoFetch) return null;
    return `sns-posts-${JSON.stringify({ ...params, skip: 0, limit: 20 })}`;
  }, [params.post_source, autoFetch]); // skip과 limit 제외하고 필터만 고려

  // SWR을 사용한 데이터 페칭 - 첫 페이지만
  const {
    data: firstPagePosts,
    error,
    isLoading: isInitialLoading,
    mutate: refetch
  } = useSWRApi(
    swrKey,
    () => snsApiService.getPosts({ ...params, skip: 0, limit: 20 }),
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000, // 1분간 중복 요청 방지
      revalidateOnMount: true, // 마운트 시 항상 재검증
    }
  );

  // 첫 페이지 데이터 초기화
  useEffect(() => {
    if (firstPagePosts && firstPagePosts.length > 0) {
      setAllPosts(firstPagePosts);
      setLoadedPages(new Set([0]));
      setIsLoadingMore(false);
    }
  }, [firstPagePosts]);

  // 필터 변경 시 초기화
  useEffect(() => {
    setAllPosts([]);
    setLoadedPages(new Set());
  }, [params.post_source]);

  // 필터 업데이트
  const updateFilter = useCallback((newParams: Partial<SNSListParams>) => {
    setParams(prev => ({
      ...prev,
      ...newParams,
      skip: newParams.skip !== undefined ? newParams.skip : 0 // 필터 변경시 첫 페이지로
    }));
    setAllPosts([]); // 필터 변경시 기존 데이터 클리어
    setLoadedPages(new Set()); // 로드된 페이지도 초기화
    
    // 필터 변경 시 SWR 재검증 트리거
    setTimeout(() => {
      refetch();
    }, 100);
  }, [refetch]);

  // 페이지네이션 - 직접 API 호출
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
  }, [allPosts.length, loadedPages, isLoadingMore, params]);

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
    setAllPosts([]);
    setParams(prev => ({ ...prev, skip: 0 }));
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
    search,
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
    return {
      post_source: filter.platform === 'all' ? 'all' : filter.platform,
      // TODO: 검색과 정렬은 백엔드 API에서 지원할 때 추가
    };
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

export function useSNSChartData(post: SNSPost | null, symbol: string) {
  // 가격 차트 데이터 생성 (강력한 필터링)
  const priceChartData = useMemo(() => {
    if (!post?.analysis.market_data?.[symbol]?.price_timeline) return [];

    const timeline = post.analysis.market_data[symbol].price_timeline;
    const postTime = new Date(post.analysis.post_timestamp);

    // 시간순 정렬
    const sortedTimeline = timeline
      .map((point, index) => {
        const pointTime = new Date(point.timestamp);
        const timeDiff = (pointTime.getTime() - postTime.getTime()) / (1000 * 60); // 분 단위
        
        return {
          ...point,
          timeDiff,
          originalIndex: index
        };
      })
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    // 스마트 데이터 샘플링 (최대 12개 포인트)
    const getSmartSample = (data: any[]) => {
      if (data.length <= 12) return data;

      const keyPoints: any[] = [];
      const postTimeIndex = data.findIndex(point => Math.abs(point.timeDiff) < 5);
      
      // 1. 게시 시점 (필수)
      if (postTimeIndex >= 0) {
        keyPoints.push({ ...data[postTimeIndex], isPostTime: true });
      }

      // 2. 시간 구간별로 대표 포인트 선택 (총 10-11개)
      const timeSegments = [
        { start: -Infinity, end: -180, count: 1, label: '게시 전' }, // 3시간 이전
        { start: -180, end: -60, count: 2, label: '게시 3-1시간 전' },
        { start: -60, end: -10, count: 2, label: '게시 1시간-10분 전' },
        { start: 10, end: 60, count: 2, label: '게시 10분-1시간 후' },
        { start: 60, end: 360, count: 2, label: '게시 1-6시간 후' },
        { start: 360, end: Infinity, count: 2, label: '게시 6시간 후' }
      ];

      timeSegments.forEach(segment => {
        const segmentPoints = data.filter(point => 
          point.timeDiff >= segment.start && point.timeDiff < segment.end
        );
        
        if (segmentPoints.length > 0) {
          // 구간 내에서 균등하게 샘플링
          const step = Math.max(1, Math.floor(segmentPoints.length / segment.count));
          
          for (let i = 0; i < segment.count && i * step < segmentPoints.length; i++) {
            const selectedPoint = segmentPoints[i * step];
            if (!keyPoints.find((p: any) => p.timestamp === selectedPoint.timestamp)) {
              keyPoints.push({ ...selectedPoint, isPostTime: false });
            }
          }
        }
      });

      // 시간순으로 정렬하고 최대 12개로 제한
      return keyPoints
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
        .slice(0, 12);
    };

    const sampledPoints = getSmartSample(sortedTimeline);

    return sampledPoints.map((point, index) => {
      const timeDiff = point.timeDiff;
      
      // 간단하고 명확한 시간 라벨
      let timeLabel: string;
      if (timeDiff < -120) {
        timeLabel = `${Math.abs(Math.round(timeDiff / 60))}h전`;
      } else if (timeDiff < -10) {
        timeLabel = `${Math.abs(Math.round(timeDiff))}m전`;
      } else if (Math.abs(timeDiff) <= 10) {
        timeLabel = '게시시점';
      } else if (timeDiff < 120) {
        timeLabel = `+${Math.round(timeDiff)}m`;
      } else {
        timeLabel = `+${Math.round(timeDiff / 60)}h`;
      }

      return {
        time: timeLabel,
        price: point.price,
        volume: point.volume,
        timestamp: point.timestamp,
        isPostTime: point.isPostTime || Math.abs(timeDiff) <= 10,
        index: index // 차트에서 간격 조정용
      };
    });
  }, [post, symbol]);

  // 거래량 차트 데이터 생성
  const volumeChartData = useMemo(() => {
    return priceChartData.map(point => ({
      time: point.time,
      volume: point.volume,
      isPostTime: point.isPostTime,
      index: point.index
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
    hasData: priceChartData.length > 0,
    totalDataPoints: post?.analysis.market_data?.[symbol]?.price_timeline?.length || 0,
    filteredDataPoints: priceChartData.length
  };
}
