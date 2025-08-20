// hooks/useNews.ts
// React Query를 활용한 뉴스 데이터 관리 훅

import { useQuery, useInfiniteQuery, useQueryClient } from 'react-query';
import { useState, useMemo, useCallback } from 'react';
import { newsApi, NewsItem, NewsFilters, NewsResponse, PaginationParams } from '../services/newsApi';

// ============================================================================
// 타입 정의
// ============================================================================

export interface UseNewsOptions {
  enabled?: boolean;
  refetchInterval?: number;
  staleTime?: number;
  cacheTime?: number;
}

export interface NewsFiltersState extends NewsFilters {
  setSelectedApi: (api: NewsFilters['selectedApi']) => void;
  setSelectedCategory: (category: NewsFilters['selectedCategory']) => void;
  setSelectedSource: (source: string) => void;
  setSearchQuery: (query: string) => void;
  setSortBy: (sortBy: NewsFilters['sortBy']) => void;
  resetFilters: () => void;
}

export interface UseNewsReturn {
  // 데이터
  news: NewsItem[];
  filteredNews: NewsItem[];
  stats: NewsResponse['stats'];
  sources: string[];
  
  // 상태
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  isFetching: boolean;
  hasMore: boolean;
  
  // 필터링
  filters: NewsFiltersState;
  
  // 액션
  refetch: () => void;
  loadMore: () => void;
  clearCache: () => void;
  
  // 디버깅 (개발환경)
  debug?: {
    totalItems: number;
    filteredItems: number;
    cacheStats: any;
    queryKey: string;
  };
}

// ============================================================================
// 기본값
// ============================================================================

const DEFAULT_FILTERS: NewsFilters = {
  selectedApi: "all",
  selectedCategory: "all", 
  selectedSource: "all",
  searchQuery: "",
  sortBy: "recent"
};

const DEFAULT_OPTIONS: UseNewsOptions = {
  enabled: true,
  refetchInterval: 60000,  // 1분마다 자동 새로고침
  staleTime: 30000,        // 30초 동안 fresh 상태 유지
  cacheTime: 300000        // 5분 동안 캐시 보관
};

// ============================================================================
// 유틸리티 함수들
// ============================================================================

const getTimestamp = (item: NewsItem): string => {
  switch (item.type) {
    case "market": return item.published_at;
    case "financial": return item.datetime;
    case "sentiment": return item.time_published;
    default: return "";
  }
};

const safeLower = (value: unknown): string => {
  return typeof value === "string" ? value.toLowerCase() : "";
};

// ============================================================================
// 메인 훅
// ============================================================================

export const useNews = (options: UseNewsOptions = {}): UseNewsReturn => {
  const queryClient = useQueryClient();
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };

  // =========================================================================
  // 필터 상태 관리
  // =========================================================================

  const [filters, setFilters] = useState<NewsFilters>(DEFAULT_FILTERS);

  const filtersState: NewsFiltersState = {
    ...filters,
    setSelectedApi: useCallback((selectedApi: NewsFilters['selectedApi']) => {
      setFilters(prev => ({ ...prev, selectedApi }));
    }, []),
    setSelectedCategory: useCallback((selectedCategory: NewsFilters['selectedCategory']) => {
      setFilters(prev => ({ ...prev, selectedCategory }));
    }, []),
    setSelectedSource: useCallback((selectedSource: string) => {
      setFilters(prev => ({ ...prev, selectedSource }));
    }, []),
    setSearchQuery: useCallback((searchQuery: string) => {
      setFilters(prev => ({ ...prev, searchQuery }));
    }, []),
    setSortBy: useCallback((sortBy: NewsFilters['sortBy']) => {
      setFilters(prev => ({ ...prev, sortBy }));
    }, []),
    resetFilters: useCallback(() => {
      setFilters(DEFAULT_FILTERS);
    }, [])
  };

  // =========================================================================
  // React Query 설정
  // =========================================================================

  const queryKey = ['news', filters.selectedApi, filters.selectedCategory, filters.selectedSource];

  // 무한 스크롤을 위한 useInfiniteQuery
  const {
    data,
    isLoading,
    isError,
    error,
    isFetching,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useInfiniteQuery({
    queryKey,
    queryFn: async ({ pageParam = 0 }) => {
      const pagination: PaginationParams = {
        page: 1,
        limit: 100,
        monthIndex: pageParam
      };

      return newsApi.fetchAllNews(filters, pagination);
    },
    getNextPageParam: (lastPage, allPages) => {
      // 더 많은 데이터가 있으면 다음 monthIndex 반환
      return lastPage.hasMore ? allPages.length : undefined;
    },
    enabled: mergedOptions.enabled,
    staleTime: mergedOptions.staleTime,
    cacheTime: mergedOptions.cacheTime,
    refetchInterval: mergedOptions.refetchInterval,
    onError: (error) => {
      console.error('🚨 뉴스 로딩 에러:', error);
    },
    onSuccess: (data) => {
      console.log('✅ 뉴스 로딩 성공:', {
        pages: data.pages.length,
        totalItems: data.pages.reduce((acc, page) => acc + page.items.length, 0)
      });
    }
  });

  // =========================================================================
  // 데이터 가공
  // =========================================================================

  const processedData = useMemo(() => {
    if (!data?.pages) {
      return {
        allNews: [],
        stats: { market: 0, financial: 0, sentiment: 0, total: 0 },
        sources: []
      };
    }

    // 모든 페이지의 뉴스 병합
    const allNews: NewsItem[] = data.pages.flatMap(page => page.items);
    
    // 최신 페이지의 통계 사용 (또는 전체 재계산)
    const latestPage = data.pages[data.pages.length - 1];
    const stats = latestPage?.stats || { market: 0, financial: 0, sentiment: 0, total: 0 };
    
    // 모든 페이지의 소스 병합
    const sources = [...new Set(data.pages.flatMap(page => page.sources))];

    return { allNews, stats, sources };
  }, [data]);

  // =========================================================================
  // 클라이언트 사이드 필터링 및 정렬
  // =========================================================================

  const filteredNews = useMemo(() => {
    let filtered = processedData.allNews.filter(item => {
      // 검색어 필터
      const matchesSearch = (() => {
        const query = filters.searchQuery.toLowerCase();
        if (!query) return true;

        switch (item.type) {
          case "market":
            return [item.title, item.description, item.source]
              .some(v => safeLower(v).includes(query));
          case "financial":
            return [item.headline, item.summary, item.source]
              .some(v => safeLower(v).includes(query));
          case "sentiment":
            return [item.title, item.summary, item.source]
              .some(v => safeLower(v).includes(query));
          default:
            return false;
        }
      })();

      return matchesSearch;
    });

    // 정렬 적용
    filtered.sort((a, b) => {
      switch (filters.sortBy) {
        case "sentiment":
          const aSentiment = a.type === "sentiment" ? a.overall_sentiment_score : 0;
          const bSentiment = b.type === "sentiment" ? b.overall_sentiment_score : 0;
          return Math.abs(bSentiment) - Math.abs(aSentiment);
          
        case "relevance":
          // 티커가 있는 뉴스를 우선순위로
          const aHasTicker = a.type === "sentiment" ? 1 : 0;
          const bHasTicker = b.type === "sentiment" ? 1 : 0;
          return bHasTicker - aHasTicker;
          
        default: // recent
          const aTime = new Date(getTimestamp(a)).getTime();
          const bTime = new Date(getTimestamp(b)).getTime();
          return bTime - aTime;
      }
    });

    // 뉴스 타입 인터리빙 (전체 보기 + 최신순일 때)
    if (filters.selectedApi === "all" && filters.sortBy === "recent") {
      const byType: Record<string, NewsItem[]> = {
        market: filtered.filter(item => item.type === "market"),
        financial: filtered.filter(item => item.type === "financial"),
        sentiment: filtered.filter(item => item.type === "sentiment")
      };

      const interleaved: NewsItem[] = [];
      const indices = { market: 0, financial: 0, sentiment: 0 };
      const maxLength = Math.max(...Object.values(byType).map(arr => arr.length));

      for (let i = 0; i < maxLength; i++) {
        ['market', 'financial', 'sentiment'].forEach(type => {
          const typeArray = byType[type];
          const index = indices[type as keyof typeof indices];
          if (index < typeArray.length) {
            interleaved.push(typeArray[index]);
            indices[type as keyof typeof indices]++;
          }
        });
      }

      return interleaved;
    }

    return filtered;
  }, [processedData.allNews, filters]);

  // =========================================================================
  // 액션 함수들
  // =========================================================================

  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const clearCache = useCallback(() => {
    queryClient.invalidateQueries(queryKey);
    newsApi.clearCache();
  }, [queryClient, queryKey]);

  // =========================================================================
  // 디버깅 정보 (개발환경)
  // =========================================================================

  const debug = useMemo(() => {
    if (process.env.NODE_ENV !== 'development') return undefined;

    return {
      totalItems: processedData.allNews.length,
      filteredItems: filteredNews.length,
      cacheStats: newsApi.getCacheStats(),
      queryKey: JSON.stringify(queryKey)
    };
  }, [processedData.allNews.length, filteredNews.length, queryKey]);

  // =========================================================================
  // 반환값
  // =========================================================================

  return {
    // 데이터
    news: processedData.allNews,
    filteredNews,
    stats: processedData.stats,
    sources: processedData.sources,
    
    // 상태
    isLoading,
    isError,
    error: error as Error | null,
    isFetching: isFetching || isFetchingNextPage,
    hasMore: Boolean(hasNextPage),
    
    // 필터링
    filters: filtersState,
    
    // 액션
    refetch,
    loadMore,
    clearCache,
    
    // 디버깅
    debug
  };
};

// ============================================================================
// 추가 훅들
// ============================================================================

// 특정 타입의 뉴스만 가져오는 훅
export const useMarketNews = (options?: UseNewsOptions) => {
  return useNews({
    ...options,
    // 초기 필터를 market으로 설정하는 방법은 현재 구조상 제한적
    // 필요시 별도 구현 가능
  });
};

// 뉴스 검색 전용 훅
export const useNewsSearch = (searchQuery: string, options?: UseNewsOptions) => {
  const newsHook = useNews(options);
  
  // 검색어 자동 적용
  useState(() => {
    newsHook.filters.setSearchQuery(searchQuery);
  });

  return newsHook;
};

// 캐시 프리워밍 훅
export const useNewsPreloader = () => {
  const queryClient = useQueryClient();

  const preloadNews = useCallback(async () => {
    // 백그라운드에서 뉴스 데이터 미리 로드
    await queryClient.prefetchQuery({
      queryKey: ['news', 'all', 'all', 'all'],
      queryFn: () => newsApi.fetchAllNews(DEFAULT_FILTERS, { page: 1, limit: 100, monthIndex: 0 }),
      staleTime: 30000
    });
  }, [queryClient]);

  return { preloadNews };
};