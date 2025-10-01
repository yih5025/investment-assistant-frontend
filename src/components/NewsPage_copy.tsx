// components/OptimizedNewsPage.tsx
// 최적화된 뉴스 페이지 - services와 hooks로 완전 분리

import React, { useCallback } from 'react';
import { 
  Search, TrendingUp, TrendingDown, Target, ExternalLink, 
  Newspaper, RefreshCw, ChevronDown, AlertCircle, BarChart 
} from 'lucide-react';
import { useNews } from '../hooks/useNews';
import { NewsItem } from '../services/newsApi';

// ============================================================================
// 타입 정의
// ============================================================================

interface OptimizedNewsPageProps {
  isLoggedIn: boolean;
  onLoginPrompt: () => void;
  onNewsClick?: (newsItem: NewsItem) => void;
}

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

const formatTimestamp = (timestamp: string): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / 3600000);
  
  if (diffHours < 1) return "방금 전";
  if (diffHours < 24) return `${diffHours}시간 전`;
  return date.toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
};

const getSentimentColor = (score: number): string => {
  if (score > 0.3) return "text-green-400";
  if (score < -0.3) return "text-red-400";
  return "text-yellow-400";
};

const getSentimentIcon = (score: number) => {
  if (score > 0.3) return <TrendingUp size={16} />;
  if (score < -0.3) return <TrendingDown size={16} />;
  return <Target size={16} />;
};

const getApiColor = (type: string): string => {
  switch (type) {
    case "market": return "bg-blue-500/20 text-blue-400";
    case "financial": return "bg-green-500/20 text-green-400";
    case "sentiment": return "bg-orange-500/20 text-orange-400";
    default: return "bg-gray-500/20 text-gray-400";
  }
};

const getCategoryColor = (category: string): string => {
  switch (category) {
    case "crypto": return "bg-orange-500/20 text-orange-400";
    case "forex": return "bg-green-500/20 text-green-400";
    case "merger": return "bg-purple-500/20 text-purple-400";
    case "general": return "bg-blue-500/20 text-blue-400";
    default: return "bg-gray-500/20 text-gray-400";
  }
};

// ============================================================================
// 메인 컴포넌트
// ============================================================================

export default function OptimizedNewsPage({ 
  isLoggedIn, 
  onLoginPrompt, 
  onNewsClick 
}: OptimizedNewsPageProps) {
  
  // =========================================================================
  // 뉴스 데이터 및 상태 관리 (단일 훅으로 처리)
  // =========================================================================
  
  const {
    filteredNews,
    stats,
    sources,
    isLoading,
    isError,
    error,
    isFetching,
    hasMore,
    filters,
    refetch,
    loadMore,
    clearCache,
    debug
  } = useNews({
    refetchInterval: 60000,  // 1분마다 자동 새로고침
    staleTime: 30000,        // 30초 캐시
    cacheTime: 300000        // 5분 보관
  });

  // =========================================================================
  // 이벤트 핸들러들
  // =========================================================================

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const handleLoadMore = useCallback(() => {
    if (!isFetching && hasMore) {
      loadMore();
    }
  }, [loadMore, isFetching, hasMore]);

  const handleNewsClick = useCallback((item: NewsItem) => {
    if (onNewsClick) {
      onNewsClick(item);
    } else {
      // 기본 동작: 새 탭에서 열기
      let url = "";
      switch (item.type) {
        case "market":
        case "financial":
        case "sentiment":
          url = item.url;
          break;
      }
      if (url) {
        window.open(url, '_blank');
      }
    }
  }, [onNewsClick]);

  // =========================================================================
  // 렌더링 함수들
  // =========================================================================

  const renderNewsItem = useCallback((item: NewsItem, index: number) => {
    // 제목 추출
    const getTitle = () => {
      switch (item.type) {
        case "market": return item.title;
        case "financial": return item.headline;
        case "sentiment": return item.title;
        default: return "";
      }
    };

    // 요약 추출
    const getSummary = () => {
      switch (item.type) {
        case "market": return item.description;
        case "financial": return item.summary;
        case "sentiment": return item.summary;
        default: return "";
      }
    };

    // 이미지 추출
    const getImage = () => {
      switch (item.type) {
        case "financial": return item.image;
        default: return null;
      }
    };

    // 안정적인 키 생성
    const key = `${item.type}-${item.url}-${getTimestamp(item)}-${index}`;

    return (
      <article
        key={key}
        className="glass-card p-4 rounded-xl cursor-pointer hover:glass transition-all group"
        onClick={() => handleNewsClick(item)}
      >
        <div className="flex gap-3">
          {/* 이미지 */}
          {getImage() && (
            <div className="flex-shrink-0">
              <img
                src={getImage()!}
                alt=""
                className="w-16 h-16 object-cover rounded-lg"
                loading="lazy"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          )}

          {/* 콘텐츠 */}
          <div className="flex-1 min-w-0">
            {/* 헤더 */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-foreground/90">
                  {item.source}
                </span>
                
                {/* API 타입 배지 */}
                <span className={`px-2 py-1 rounded text-xs ${getApiColor(item.type)}`}>
                  {item.type}
                </span>
                
                {/* 카테고리 배지 */}
                {item.type === "financial" && (
                  <span className={`px-2 py-1 rounded text-xs ${getCategoryColor(item.category)}`}>
                    {item.category}
                  </span>
                )}
                
                {/* 감성 이모지 */}
                {item.type === "sentiment" && item.sentiment_emoji && (
                  <span className="text-sm">{item.sentiment_emoji}</span>
                )}
              </div>
              
              <span className="text-xs text-foreground/50 flex-shrink-0">
                {formatTimestamp(getTimestamp(item))}
              </span>
            </div>

            {/* 제목 */}
            <h3 className="font-medium mb-2 line-clamp-2 group-hover:text-primary transition-colors leading-tight">
              {getTitle()}
            </h3>

            {/* 요약 */}
            <p className="text-sm text-foreground/70 line-clamp-2 mb-3 leading-snug">
              {getSummary()}
            </p>

            {/* 하단 정보 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-wrap">
                {/* 감성 점수 */}
                {item.type === "sentiment" && (
                  <div className={`flex items-center gap-1 text-xs ${getSentimentColor(item.overall_sentiment_score)}`}>
                    {getSentimentIcon(item.overall_sentiment_score)}
                    <span className="font-medium">
                      {(item.overall_sentiment_score * 100).toFixed(0)}%
                    </span>
                  </div>
                )}

                {/* 티커 감성 */}
                {item.type === "sentiment" && item.ticker_sentiment?.length > 0 && (
                  <div className="flex gap-1">
                    {item.ticker_sentiment.slice(0, 2).map((ticker, idx) => (
                      <span 
                        key={idx} 
                        className={`px-1.5 py-0.5 rounded text-xs ${getSentimentColor(parseFloat(ticker.ticker_sentiment_score))}`}
                      >
                        {ticker.ticker}
                      </span>
                    ))}
                  </div>
                )}

                {/* 관련 토픽 */}
                {item.type === "sentiment" && item.topics?.length > 0 && (
                  <span className="px-2 py-1 rounded text-xs bg-gray-500/20 text-gray-400 border border-gray-500/30">
                    {item.topics[0].topic}
                  </span>
                )}
              </div>

              <div className="text-xs text-foreground/50 flex-shrink-0">
                자세히 보기 →
              </div>
            </div>
          </div>
        </div>
      </article>
    );
  }, [handleNewsClick]);

  // =========================================================================
  // 메인 렌더링
  // =========================================================================

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Newspaper size={24} className="text-primary" />
          <h2 className="text-xl font-bold">통합 뉴스</h2>
          <span className="text-sm text-foreground/60">
            ({stats.total}개 뉴스)
          </span>
          {isFetching && (
            <div className="flex items-center space-x-1">
              <RefreshCw size={12} className="animate-spin text-primary" />
              <span className="text-xs text-foreground/50">업데이트 중</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="flex items-center space-x-2 px-3 py-2 glass-card rounded-lg hover:glass transition-all disabled:opacity-50"
          >
            <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
            <span className="text-sm">새로고침</span>
          </button>
          
          {/* 캐시 클리어 버튼 (개발환경) */}
          {process.env.NODE_ENV === 'development' && (
            <button
              onClick={clearCache}
              className="px-2 py-2 text-xs glass-card rounded-lg hover:glass transition-all"
              title="캐시 클리어"
            >
              🗑️
            </button>
          )}
        </div>
      </div>

      {/* API 통계 필터 버튼 */}
      <div className="grid grid-cols-4 gap-3">
        <button
          onClick={() => filters.setSelectedApi("all")}
          className={`glass-card p-3 rounded-lg text-center transition-all ${
            filters.selectedApi === 'all' 
              ? 'ring-2 ring-primary/50 bg-primary/10' 
              : 'hover:glass'
          }`}
        >
          <div className="text-lg font-bold text-primary">{stats.total}</div>
          <div className="text-xs text-foreground/60">전체</div>
        </button>
        
        <button
          onClick={() => filters.setSelectedApi("market")}
          className={`glass-card p-3 rounded-lg text-center transition-all ${
            filters.selectedApi === 'market' 
              ? 'ring-2 ring-blue-400/50 bg-blue-500/10' 
              : 'hover:glass'
          }`}
        >
          <div className="text-lg font-bold text-blue-400">{stats.market}</div>
          <div className="text-xs text-foreground/60">시장뉴스</div>
        </button>
        
        <button
          onClick={() => filters.setSelectedApi("financial")}
          className={`glass-card p-3 rounded-lg text-center transition-all ${
            filters.selectedApi === 'financial' 
              ? 'ring-2 ring-green-400/50 bg-green-500/10' 
              : 'hover:glass'
          }`}
        >
          <div className="text-lg font-bold text-green-400">{stats.financial}</div>
          <div className="text-xs text-foreground/60">금융뉴스</div>
        </button>
        
        <button
          onClick={() => filters.setSelectedApi("sentiment")}
          className={`glass-card p-3 rounded-lg text-center transition-all ${
            filters.selectedApi === 'sentiment' 
              ? 'ring-2 ring-orange-400/50 bg-orange-500/10' 
              : 'hover:glass'
          }`}
        >
          <div className="text-lg font-bold text-orange-400">{stats.sentiment}</div>
          <div className="text-xs text-foreground/60">감성분석</div>
        </button>
      </div>

      {/* 검색바 */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-foreground/50" size={18} />
        <input
          type="text"
          placeholder="뉴스 검색..."
          value={filters.searchQuery}
          onChange={(e) => filters.setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-3 glass-card border-white/20 rounded-lg bg-transparent placeholder:text-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>

      {/* 에러 표시 */}
      {isError && error && (
        <div className="glass-card p-4 rounded-xl border border-red-500/30 bg-red-500/10">
          <div className="flex items-center space-x-2 text-red-400">
            <AlertCircle size={20} />
            <span className="font-medium">오류 발생</span>
          </div>
          <p className="text-sm text-red-300 mt-2">{error.message}</p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleRefresh}
              className="px-3 py-1 text-xs bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
            >
              다시 시도
            </button>
            <button
              onClick={clearCache}
              className="px-3 py-1 text-xs bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
            >
              캐시 클리어
            </button>
          </div>
        </div>
      )}

      {/* 로딩 표시 */}
      {isLoading && (
        <div className="glass-card p-8 text-center rounded-xl">
          <RefreshCw size={48} className="mx-auto mb-4 text-primary animate-spin" />
          <p className="text-foreground/70">뉴스를 불러오는 중...</p>
        </div>
      )}

      {/* 뉴스 목록 */}
      <div className="space-y-3">
        {filteredNews.length === 0 && !isLoading ? (
          <div className="glass-card p-8 text-center rounded-xl">
            <BarChart size={48} className="mx-auto mb-4 text-foreground/30" />
            <p className="text-foreground/70">
              {filters.searchQuery ? "검색 결과가 없습니다" : "뉴스를 불러올 수 없습니다"}
            </p>
            {filters.searchQuery && (
              <button
                onClick={() => filters.setSearchQuery("")}
                className="mt-3 px-4 py-2 text-sm glass-card rounded-lg hover:glass transition-all"
              >
                검색어 지우기
              </button>
            )}
          </div>
        ) : (
          <>
            {filteredNews.map((item, index) => renderNewsItem(item, index))}

            {/* 더보기 버튼 */}
            {hasMore && !isFetching && filteredNews.length > 0 && (
              <div className="flex justify-center pt-4">
                <button
                  onClick={handleLoadMore}
                  className="px-6 py-3 glass-card rounded-xl hover:glass transition-all flex items-center space-x-2"
                >
                  <span>더 많은 뉴스 불러오기</span>
                  <ChevronDown size={16} />
                </button>
              </div>
            )}

            {/* 추가 로딩 표시 */}
            {isFetching && filteredNews.length > 0 && (
              <div className="flex justify-center pt-4">
                <div className="flex items-center space-x-2 text-foreground/60">
                  <RefreshCw size={16} className="animate-spin" />
                  <span className="text-sm">추가 뉴스 로딩 중...</span>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* 디버깅 정보 (개발환경) */}
      {debug && (
        <div className="glass-card p-4 rounded-lg space-y-2 text-xs text-foreground/60">
          <div className="font-medium">🔧 디버깅 정보:</div>
          <div>전체 뉴스: {debug.totalItems}개</div>
          <div>필터된 뉴스: {debug.filteredItems}개</div>
          <div>캐시 크기: {debug.cacheStats.cacheSize}</div>
          <div>진행 중인 요청: {debug.cacheStats.pendingRequests}</div>
          <div>Query Key: {debug.queryKey}</div>
          <div>로딩 상태: {isLoading ? "로딩중" : "완료"}</div>
          <div>더보기 가능: {hasMore ? "예" : "아니오"}</div>
        </div>
      )}
    </div>
  );
}

// 기존 컴포넌트와 호환성을 위한 export
export { OptimizedNewsPage as NewsPage };