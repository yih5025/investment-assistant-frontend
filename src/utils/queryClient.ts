// utils/queryClient.ts
// React Query 클라이언트 설정

import { QueryClient } from 'react-query';

// ============================================================================
// React Query 클라이언트 설정
// ============================================================================

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 기본 캐싱 설정
      staleTime: 30000,        // 30초 동안 fresh 상태
      cacheTime: 300000,       // 5분 동안 캐시 보관
      
      // 재시도 설정
      retry: (failureCount, error) => {
        // 404, 401, 403은 재시도하지 않음
        if (error && typeof error === 'object' && 'status' in error) {
          const status = (error as any).status;
          if ([404, 401, 403].includes(status)) {
            return false;
          }
        }
        // 최대 2번 재시도
        return failureCount < 2;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      
      // 윈도우 포커스 시 자동 새로고침
      refetchOnWindowFocus: true,
      
      // 네트워크 재연결 시 자동 새로고침
      refetchOnReconnect: true,
      
      // 백그라운드 새로고침 간격 (5분)
      refetchInterval: 300000,
      
      // 에러 시 자동 새로고침 중지
      refetchOnMount: 'always',
    },
    mutations: {
      // 뮤테이션 재시도 설정
      retry: 1,
      retryDelay: 1000,
    }
  }
});

// ============================================================================
// 개발환경 디버깅
// ============================================================================

if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    // React Query DevTools를 위한 글로벌 설정
    (window as any).__REACT_QUERY_CLIENT__ = queryClient;
    
    // 캐시 디버깅 유틸리티
    (window as any).debugQueryCache = () => {
      const cache = queryClient.getQueryCache();
      console.table(
        cache.getAll().map(query => ({
          queryKey: JSON.stringify(query.queryKey),
          status: query.state.status,
          dataUpdatedAt: new Date(query.state.dataUpdatedAt).toLocaleTimeString(),
          error: query.state.error instanceof Error ? query.state.error.message : 
                 query.state.error ? String(query.state.error) : 'None'
        }))
      );
    };
    
    // 캐시 클리어 유틸리티
    (window as any).clearQueryCache = () => {
      queryClient.clear();
      // console.log('🗑️ React Query 캐시 클리어됨');
    };
  }