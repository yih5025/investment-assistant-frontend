// components/NewsPage.tsx
import React, { useCallback } from 'react';
import { 
  Search, TrendingUp, TrendingDown, Target, ExternalLink, 
  Newspaper, RefreshCw, AlertCircle, BarChart, 
  Flame, Sparkles, Clock, ChevronRight, Bookmark, Share2, Info
} from 'lucide-react';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { motion } from 'motion/react';
import { useNews } from '../hooks/useNews';
import { NewsItem } from '../services/newsApi';

interface NewsPageProps {
  isLoggedIn: boolean;
  onLoginPrompt: () => void;
  onNewsClick?: (newsItem: NewsItem) => void;
}

export default function NewsPage({ isLoggedIn, onLoginPrompt, onNewsClick }: NewsPageProps) {
  const {
    filteredNews,
    stats,
    isLoading,
    isError,
    error,
    isFetching,
    hasMore,
    filters,
    refetch,
    loadMore,
  } = useNews({
    refetchInterval: 60000,
    staleTime: 30000,
    cacheTime: 300000
  });

  // 유틸리티 함수들
  const formatTimestamp = useCallback((timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / 3600000);
    
    if (diffHours < 1) return "방금 전";
    if (diffHours < 24) return `${diffHours}시간 전`;
    return date.toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
  }, []);

  const getReadTime = (content: string) => {
    const words = content.split(' ').length;
    const minutes = Math.ceil(words / 200);
    return `${minutes}분`;
  };

  const getSentimentColor = (score: number) => {
    if (score > 0.3) return "text-green-400";
    if (score < -0.3) return "text-red-400";
    return "text-yellow-400";
  };

  const getSentimentIcon = (score: number) => {
    if (score > 0.3) return <TrendingUp size={16} />;
    if (score < -0.3) return <TrendingDown size={16} />;
    return <Target size={16} />;
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "sentiment": return "bg-blue-500/20 text-blue-400";
      case "financial": return "bg-green-500/20 text-green-400";
      case "market": return "bg-orange-500/20 text-orange-400";
      default: return "bg-gray-500/20 text-gray-400";
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "crypto": return "bg-orange-500/20 text-orange-400";
      case "forex": return "bg-green-500/20 text-green-400";
      case "merger": return "bg-purple-500/20 text-purple-400";
      default: return "bg-blue-500/20 text-blue-400";
    }
  };

  const handleNewsClick = useCallback((item: NewsItem) => {
    if (onNewsClick) {
      onNewsClick(item);
    } else {
      window.open(item.url, '_blank');
    }
  }, [onNewsClick]);

  const getTitle = (item: NewsItem) => {
    switch (item.type) {
      case "market": return item.title;
      case "financial": return item.headline;
      case "sentiment": return item.title;
    }
  };

  const getSummary = (item: NewsItem) => {
    switch (item.type) {
      case "market": return item.description;
      case "financial": return item.summary;
      case "sentiment": return item.summary;
    }
  };

  const getTimestamp = (item: NewsItem) => {
    switch (item.type) {
      case "market": return item.published_at;
      case "financial": return item.datetime;
      case "sentiment": return item.time_published;
    }
  };

  // Featured 뉴스 카드
  const renderFeaturedNews = (item: NewsItem, index: number) => {
    const isPriority = item.type === "sentiment" && Math.abs(item.overall_sentiment_score) > 0.5;
    
    return (
      <motion.article
        key={`featured-${index}`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.1 }}
        className="relative glass-card rounded-2xl overflow-hidden cursor-pointer group"
        onClick={() => handleNewsClick(item)}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        
        {isPriority && (
          <div className="absolute top-4 right-4 z-10">
            <div className="flex items-center gap-1 px-2 py-1 rounded-full glass-strong backdrop-blur-xl">
              <Flame size={12} className="text-orange-400" />
              <span className="text-xs">HOT</span>
            </div>
          </div>
        )}

        <div className="relative p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full glass flex items-center justify-center">
                <Sparkles size={14} className="text-primary" />
              </div>
              <div>
                <div className="font-medium text-sm">{item.source}</div>
                <div className="text-xs text-foreground/50">
                  {formatTimestamp(getTimestamp(item))} · {getReadTime(getSummary(item))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={`text-xs ${getTypeColor(item.type)}`}>
              {item.type === "sentiment" ? "감성분석" : 
               item.type === "financial" ? "금융뉴스" : "시장뉴스"}
            </Badge>
            
            {item.type === "financial" && (
              <Badge className={`text-xs ${getCategoryColor(item.category)}`}>
                {item.category}
              </Badge>
            )}

            {item.type === "sentiment" && (
              <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full glass text-xs ${getSentimentColor(item.overall_sentiment_score)}`}>
                {getSentimentIcon(item.overall_sentiment_score)}
                <span className="font-medium">
                  {(item.overall_sentiment_score * 100).toFixed(0)}%
                </span>
              </div>
            )}
          </div>

          <h2 className="text-xl leading-tight group-hover:text-primary transition-colors">
            {getTitle(item)}
          </h2>

          <p className="text-sm text-foreground/80 leading-relaxed line-clamp-3">
            {getSummary(item)}
          </p>

          <div className="flex items-center justify-between pt-3 border-t border-white/10">
            <div className="flex items-center gap-3 text-xs text-foreground/60">
              {item.type === "sentiment" && item.ticker_sentiment?.length > 0 && (
                <div className="flex gap-1">
                  {item.ticker_sentiment.slice(0, 3).map((ticker, idx) => (
                    <span key={idx} className="px-2 py-0.5 rounded glass-subtle">
                      {ticker.ticker}
                    </span>
                  ))}
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-1 text-sm group-hover:text-primary transition-colors">
              <span>자세히 보기</span>
              <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>

        <div className="absolute inset-0 border-2 border-primary/0 group-hover:border-primary/20 rounded-2xl transition-colors pointer-events-none" />
      </motion.article>
    );
  };

  // Magazine 스타일 카드
  const renderMagazineCard = (item: NewsItem, index: number) => {
    return (
      <motion.article
        key={`magazine-${index}`}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.05 }}
        className="glass-card rounded-xl overflow-hidden cursor-pointer hover:glass transition-all group"
        onClick={() => handleNewsClick(item)}
      >
        <div className="flex gap-4 p-4">
          <div className="flex-shrink-0 flex flex-col items-center gap-2">
            <div className="w-10 h-10 rounded-xl glass-strong flex items-center justify-center group-hover:scale-110 transition-transform">
              {item.type === "sentiment" ? (
                <TrendingUp size={18} className="text-primary" />
              ) : (
                <BarChart size={18} className="text-green-400" />
              )}
            </div>
            <div className="w-1 flex-1 rounded-full glass-subtle" />
          </div>

          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1">
                <div className="font-medium text-sm">{item.source}</div>
                <div className="flex items-center gap-2 text-xs text-foreground/50">
                  <Clock size={12} />
                  <span>{formatTimestamp(getTimestamp(item))}</span>
                </div>
              </div>
            </div>

            <h3 className="font-medium line-clamp-2 group-hover:text-primary transition-colors leading-tight">
              {getTitle(item)}
            </h3>

            <p className="text-sm text-foreground/70 line-clamp-2 leading-snug">
              {getSummary(item)}
            </p>

            <div className="flex items-center gap-2 pt-2">
              {item.type === "sentiment" && (
                <div className={`flex items-center gap-1 text-xs ${getSentimentColor(item.overall_sentiment_score)}`}>
                  {getSentimentIcon(item.overall_sentiment_score)}
                  <span>{(item.overall_sentiment_score * 100).toFixed(0)}%</span>
                </div>
              )}
              
              {item.type === "financial" && (
                <Badge className={`text-xs ${getCategoryColor(item.category)}`}>
                  {item.category}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </motion.article>
    );
  };

  // Compact 카드
  const renderCompactCard = (item: NewsItem, index: number) => {
    return (
      <motion.article
        key={`compact-${index}`}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: index * 0.03 }}
        className="glass-subtle rounded-lg p-3 cursor-pointer hover:glass-card transition-all group border border-white/5 hover:border-primary/20"
        onClick={() => handleNewsClick(item)}
      >
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-foreground/80">{item.source}</span>
            <span className="text-xs text-foreground/40">{formatTimestamp(getTimestamp(item))}</span>
          </div>

          <h4 className="text-sm font-medium line-clamp-2 group-hover:text-primary transition-colors leading-snug">
            {getTitle(item)}
          </h4>

          <div className="flex items-center gap-2">
            <Badge className={`text-xs py-0 ${getTypeColor(item.type)}`}>
              {item.type}
            </Badge>
            
            {item.type === "sentiment" && (
              <span className={`text-xs ${getSentimentColor(item.overall_sentiment_score)}`}>
                {item.sentiment_emoji}
              </span>
            )}
          </div>
        </div>
      </motion.article>
    );
  };

  return (
    <div className="space-y-6">
      {/* 페이지 설명 섹션 */}
      <div className="glass-card rounded-2xl p-4">
        <h3 className="text-base font-bold mb-3 flex items-center">
          <Newspaper size={18} className="mr-2 text-blue-400" />
          금융 뉴스 통합 피드
        </h3>
        
        <div className="space-y-3">
          <p className="text-sm text-foreground/80 leading-relaxed">
            여러 뉴스 API에서 실시간으로 수집한 금융 뉴스를 한곳에서 확인하세요. 
            시장 뉴스, 금융 분석, 감성 평가까지 투자 판단에 필요한 정보를 빠르게 파악할 수 있어요.
          </p>
          
          <div className="grid grid-cols-3 gap-3">
            <div className="glass rounded-xl p-3">
              <div className="text-orange-400 mb-1">📰</div>
              <h4 className="font-semibold text-xs mb-1">시장 뉴스</h4>
              <p className="text-xs text-foreground/70">실시간 시장 동향</p>
            </div>
            
            <div className="glass rounded-xl p-3">
              <div className="text-green-400 mb-1">💼</div>
              <h4 className="font-semibold text-xs mb-1">금융 뉴스</h4>
              <p className="text-xs text-foreground/70">기업 & 산업 분석</p>
            </div>
            
            <div className="glass rounded-xl p-3">
              <div className="text-blue-400 mb-1">📊</div>
              <h4 className="font-semibold text-xs mb-1">감성 분석</h4>
              <p className="text-xs text-foreground/70">시장 심리 파악</p>
            </div>
          </div>
          
          <div className="glass rounded-xl p-3 border border-amber-500/30">
            <div className="flex items-start space-x-2">
              <div className="text-amber-400 mt-0.5">💡</div>
              <p className="text-xs text-foreground/70 leading-relaxed">
                <span className="font-medium text-amber-400">데이터 특성상</span> 일부 정보가 
                지연되거나 중복될 수 있어요. 중요한 투자 결정은 여러 출처를 참고하세요!
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 검색 및 필터 */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-foreground/50" size={18} />
          <Input
            placeholder="뉴스 검색..."
            value={filters.searchQuery}
            onChange={(e) => filters.setSearchQuery(e.target.value)}
            className="pl-12 pr-4 py-3 glass-card border-white/20 placeholder:text-foreground/50 rounded-xl"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <select
            value={filters.selectedApi}
            onChange={(e) => filters.setSelectedApi(e.target.value as any)}
            className="px-4 py-2 rounded-xl glass-card text-sm bg-transparent border border-white/10 hover:border-primary/30 transition-colors min-w-[110px] cursor-pointer"
          >
            <option value="all">전체</option>
            <option value="market">시장뉴스</option>
            <option value="financial">금융뉴스</option>
            <option value="sentiment">감성분석</option>
          </select>

          <button
            onClick={refetch}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 glass-card rounded-xl hover:glass transition-all disabled:opacity-50"
          >
            <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
            <span className="text-sm">새로고침</span>
          </button>
        </div>

        <div className="glass-subtle rounded-xl p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-sm font-medium">{filteredNews.length}개 뉴스</span>
          </div>
          <div className="flex gap-4 text-xs text-foreground/60">
            <div className="flex items-center gap-1">
              <TrendingUp size={12} className="text-green-400" />
              <span>감성 {stats.sentiment}</span>
            </div>
            <div className="flex items-center gap-1">
              <BarChart size={12} className="text-blue-400" />
              <span>금융 {stats.financial}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 에러 표시 */}
      {isError && error && (
        <div className="glass-card p-4 rounded-xl border border-red-500/30 bg-red-500/10">
          <div className="flex items-center space-x-2 text-red-400">
            <AlertCircle size={20} />
            <span className="font-medium">😅 뉴스를 불러올 수 없어요</span>
          </div>
          <p className="text-sm text-red-300 mt-2">{error.message}</p>
          <button
            onClick={refetch}
            className="mt-3 px-3 py-1 text-xs bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
          >
            🔄 다시 시도
          </button>
        </div>
      )}

      {/* 로딩 표시 */}
      {isLoading && (
        <div className="glass-card p-8 text-center rounded-xl">
          <RefreshCw size={48} className="mx-auto mb-4 text-primary animate-spin" />
          <p className="text-foreground/70">📰 뉴스를 불러오는 중이에요...</p>
        </div>
      )}

      {/* 뉴스 목록 */}
      {filteredNews.length === 0 && !isLoading ? (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass-card p-12 text-center rounded-2xl"
        >
          <BarChart size={56} className="mx-auto mb-4 text-foreground/20" />
          <h3 className="font-medium mb-2">😔 검색 결과가 없어요</h3>
          <p className="text-sm text-foreground/60">다른 검색어나 필터를 시도해보세요!</p>
        </motion.div>
      ) : (
        <>
          {/* Featured 섹션 */}
          {filteredNews.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 px-1">
                <Flame size={18} className="text-orange-400" />
                <h3 className="font-medium">주요 뉴스</h3>
              </div>
              {renderFeaturedNews(filteredNews[0], 0)}
            </div>
          )}

          {/* Trending 섹션 */}
          {filteredNews.filter(n => n.type === "sentiment").length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <TrendingUp size={18} className="text-primary" />
                  <h3 className="font-medium">트렌딩 분석</h3>
                </div>
                <Badge className="text-xs bg-primary/20 text-primary">
                  {filteredNews.filter(n => n.type === "sentiment").length}개
                </Badge>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                {filteredNews
                  .filter(n => n.type === "sentiment")
                  .slice(0, 4)
                  .map((item, index) => renderCompactCard(item, index))}
              </div>
            </div>
          )}

          {/* 금융 뉴스 섹션 */}
          {filteredNews.filter(n => n.type === "financial").length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <BarChart size={18} className="text-green-400" />
                  <h3 className="font-medium">금융 뉴스</h3>
                </div>
                <Badge className="text-xs bg-green-500/20 text-green-400">
                  {filteredNews.filter(n => n.type === "financial").length}개
                </Badge>
              </div>
              
              <div className="space-y-3">
                {filteredNews
                  .filter(n => n.type === "financial")
                  .slice(0, 3)
                  .map((item, index) => renderMagazineCard(item, index))}
              </div>
            </div>
          )}

          {/* 최신 업데이트 */}
          {filteredNews.length > 1 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <Clock size={18} className="text-blue-400" />
                  <h3 className="font-medium">최신 업데이트</h3>
                </div>
              </div>
              
              <div className="space-y-3">
                {filteredNews
                  .slice(1)
                  .map((item, index) => renderMagazineCard(item, index))}
              </div>
            </div>
          )}

          {/* 더보기 버튼 */}
          {hasMore && !isFetching && filteredNews.length > 0 && (
            <div className="flex justify-center pt-4">
              <button
                onClick={loadMore}
                className="px-8 py-3 glass-card rounded-xl hover:glass-strong transition-all group flex items-center gap-2"
              >
                <span>더 많은 뉴스 불러오기</span>
                <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          )}

          {/* 추가 로딩 */}
          {isFetching && filteredNews.length > 0 && (
            <div className="flex justify-center pt-4">
              <div className="flex items-center space-x-2 text-foreground/60">
                <RefreshCw size={16} className="animate-spin" />
                <span className="text-sm">📄 추가 뉴스 불러오는 중...</span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export { NewsPage };