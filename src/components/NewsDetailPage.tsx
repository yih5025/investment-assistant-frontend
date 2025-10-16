// components/NewsDetailPage.tsx
import { useState, useEffect } from "react";
import { 
  ArrowLeft, ExternalLink, TrendingUp, TrendingDown, Target, 
  Calendar, User, Clock, Tag, BarChart3, Bookmark, Share2, 
  Eye, Sparkles, ChevronDown, Award, Activity 
} from "lucide-react";
import { Badge } from "./ui/badge";
import { motion } from "motion/react";
import { NewsItem } from '../services/newsApi';

interface NewsDetailPageProps {
  newsItem: NewsItem;
  onBack: () => void;
}

export function NewsDetailPage({ newsItem, onBack }: NewsDetailPageProps) {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isBookmarked, setIsBookmarked] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = (scrollTop / docHeight) * 100;
      setScrollProgress(Math.min(progress, 100));
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // 유틸리티 함수들
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString("ko-KR", { 
      year: "numeric",
      month: "long", 
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const formatRelativeTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / 3600000);
    
    if (diffHours < 1) return "방금 전";
    if (diffHours < 24) return `${diffHours}시간 전`;
    return date.toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
  };

  const getReadTime = (content: string | undefined) => {
    if (!content) return "1분";
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
    if (score > 0.3) return <TrendingUp size={20} />;
    if (score < -0.3) return <TrendingDown size={20} />;
    return <Target size={20} />;
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "crypto": return "badge-category-crypto";
      case "forex": return "badge-category-forex";
      case "merger": return "badge-category-merger";
      default: return "badge-category-default";
    }
  };

  const getTitle = () => {
    switch (newsItem.type) {
      case "market": return newsItem.title;
      case "financial": return newsItem.headline;
      case "sentiment": return newsItem.title;
    }
  };

  const getDescription = () => {
    switch (newsItem.type) {
      case "market": return newsItem.description || "내용이 제공되지 않았습니다.";
      case "financial": return newsItem.summary || "내용이 제공되지 않았습니다.";
      case "sentiment": return newsItem.summary || "내용이 제공되지 않았습니다.";
    }
  };

  const getTimestamp = () => {
    switch (newsItem.type) {
      case "market": return newsItem.published_at;
      case "financial": return newsItem.datetime;
      case "sentiment": return newsItem.time_published;
    }
  };

  // 타입별 렌더링 함수
  const renderMarketNews = (item: typeof newsItem & { type: "market" }) => (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="space-y-6"
    >
      {/* 저자 & 메타 카드 */}
      <div className="glass-card rounded-2xl p-5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/10 to-purple-500/10 rounded-full blur-3xl" />
        
        <div className="relative space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full glass-strong flex items-center justify-center">
                <User size={20} className="text-primary" />
              </div>
              <div>
                <div className="font-medium">{item.author || item.source}</div>
                <div className="text-xs text-foreground/60">작성자</div>
              </div>
            </div>
            <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">시장 뉴스</Badge>
          </div>
          
          <div className="flex items-center gap-6 text-sm text-foreground/70">
            <div className="flex items-center gap-2">
              <Clock size={14} />
              <span>{formatRelativeTime(item.published_at)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Eye size={14} />
              <span>{getReadTime(item.description)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 본문 */}
      <div className="glass-card rounded-2xl p-8 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-primary via-purple-500 to-blue-500" />
        
        <div className="prose prose-invert max-w-none">
          <p className="text-lg leading-relaxed text-foreground/95 first-letter:text-3xl first-letter:font-bold first-letter:text-primary first-letter:mr-1 first-letter:float-left">
            {item.description}
          </p>
          
          {item.content && item.content !== item.description && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mt-6 p-5 glass-subtle rounded-xl border-l-4 border-primary/50"
            >
              <div className="flex items-center gap-2 mb-3">
                <Activity size={16} className="text-primary" />
                <h4 className="font-medium">상세 내용</h4>
              </div>
              <p className="text-sm text-foreground/85 leading-relaxed">{item.content}</p>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );

  const renderFinancialNews = (item: typeof newsItem & { type: "financial" }) => (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="space-y-6"
    >
      {/* 카테고리 Hero */}
      <div className="glass-card rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-green-500/10 via-purple-500/10 to-blue-500/10 rounded-full blur-3xl" />
        
        <div className="relative space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-14 h-14 rounded-2xl ${getCategoryColor(item.category)} flex items-center justify-center`}>
                <Tag size={24} />
              </div>
              <div>
                <Badge className={`${getCategoryColor(item.category)} text-base px-3 py-1`}>
                  {item.category}
                </Badge>
                <div className="text-xs text-foreground/50 mt-1">금융 뉴스</div>
              </div>
            </div>
            
            {item.image && (
              <div className="flex items-center gap-2 px-3 py-1 rounded-full glass-subtle">
                <Sparkles size={14} className="text-green-400" />
                <span className="text-xs text-green-400">이미지 포함</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2 text-sm text-foreground/70">
            <Clock size={14} />
            <span>{formatRelativeTime(item.datetime)}</span>
          </div>
        </div>
      </div>

      {/* 이미지 */}
      {item.image && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="glass-card rounded-2xl overflow-hidden"
        >
          <img
            src={item.image}
            alt={item.headline}
            className="w-full h-64 object-cover"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        </motion.div>
      )}

      {/* 관련 심볼 */}
      {item.related && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
          className="glass-card rounded-2xl p-5 relative overflow-hidden"
        >
          <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-primary/5 to-transparent" />
          
          <div className="relative">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg glass-strong flex items-center justify-center">
                <BarChart3 size={16} className="text-green-400" />
              </div>
              <h4 className="font-medium">관련 종목</h4>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {item.related.split(',').map((symbol, index) => (
                <Badge 
                  key={index}
                  variant="outline" 
                  className="text-sm px-3 py-1 hover:bg-primary/20 hover:border-primary/50 transition-colors cursor-pointer"
                >
                  {symbol.trim()}
                </Badge>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* 본문 */}
      <div className="glass-card rounded-2xl p-8 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-green-500 via-blue-500 to-purple-500" />
        
        <div className="prose prose-invert max-w-none">
          <p className="text-lg leading-relaxed text-foreground/95 first-letter:text-3xl first-letter:font-bold first-letter:text-primary first-letter:mr-1 first-letter:float-left">
            {item.summary}
          </p>
        </div>
      </div>
    </motion.div>
  );

  const renderSentimentNews = (item: typeof newsItem & { type: "sentiment" }) => {
    const sentimentPercentage = Math.abs(item.overall_sentiment_score * 100);
    const isBullish = item.overall_sentiment_score > 0;

    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="space-y-6"
      >
        {/* 감성 분석 Hero */}
        <div className="glass-card rounded-2xl p-6 relative overflow-hidden">
          <div className={`absolute top-0 right-0 w-56 h-56 ${isBullish ? 'bg-gradient-to-br from-green-500/15 via-blue-500/10' : 'bg-gradient-to-br from-red-500/15 via-orange-500/10'} to-transparent rounded-full blur-3xl`} />
          
          <div className="relative space-y-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${getSentimentColor(item.overall_sentiment_score)} bg-current/10 relative`}>
                  {getSentimentIcon(item.overall_sentiment_score)}
                  <div className={`absolute inset-0 rounded-2xl ${getSentimentColor(item.overall_sentiment_score)} bg-current/20 animate-pulse`} />
                </div>
                <div>
                  <div className="font-bold text-2xl">{item.overall_sentiment_label}</div>
                  <div className={`text-lg ${getSentimentColor(item.overall_sentiment_score)} flex items-center gap-2 mt-1`}>
                    <span className="font-bold">{sentimentPercentage.toFixed(1)}%</span>
                    {item.sentiment_emoji && <span className="text-2xl">{item.sentiment_emoji}</span>}
                  </div>
                </div>
              </div>
            </div>

            {/* 감성 프로그레스 바 */}
            <div className="space-y-2">
              <div className="h-3 bg-white/5 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${sentimentPercentage}%` }}
                  transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
                  className={`h-full rounded-full ${isBullish ? 'bg-gradient-to-r from-green-500 to-blue-500' : 'bg-gradient-to-r from-red-500 to-orange-500'}`}
                />
              </div>
              <div className="flex items-center justify-between text-xs text-foreground/60">
                <span>중립</span>
                <span>{isBullish ? '강세' : '약세'}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-4 pt-3 border-t border-white/10 text-sm text-foreground/70">
              <div className="flex items-center gap-2">
                <Clock size={14} />
                <span>{formatRelativeTime(item.time_published)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 관련 티커 */}
        {item.ticker_sentiment && item.ticker_sentiment.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            className="glass-card rounded-2xl p-5 relative overflow-hidden"
          >
            <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-primary/5 to-transparent" />
            
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg glass-strong flex items-center justify-center">
                    <BarChart3 size={16} className="text-primary" />
                  </div>
                  <h4 className="font-medium">종목별 감성 분석</h4>
                </div>
                <Badge>{item.ticker_sentiment.length}개</Badge>
              </div>
              
              <div className="space-y-3">
                {item.ticker_sentiment.map((ticker, index) => {
                  const tickerScore = parseFloat(ticker.ticker_sentiment_score);
                  return (
                    <motion.div 
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 + index * 0.1 }}
                      className="glass-subtle rounded-xl p-4 hover:glass-card transition-all cursor-pointer"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold ${getSentimentColor(tickerScore)} bg-current/10`}>
                            {ticker.ticker.charAt(0)}
                          </div>
                          <span className="font-bold text-lg">{ticker.ticker}</span>
                        </div>
                        <Badge className={`${getSentimentColor(tickerScore)} bg-current/20`}>
                          {ticker.ticker_sentiment_label}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <div className="text-xs text-foreground/50 mb-1">연관성</div>
                          <div className="font-medium">{(parseFloat(ticker.relevance_score) * 100).toFixed(1)}%</div>
                          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden mt-1">
                            <div 
                              className="h-full bg-blue-500 rounded-full"
                              style={{ width: `${parseFloat(ticker.relevance_score) * 100}%` }}
                            />
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-foreground/50 mb-1">감성 점수</div>
                          <div className={`font-medium ${getSentimentColor(tickerScore)}`}>
                            {(tickerScore * 100).toFixed(1)}%
                          </div>
                          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden mt-1">
                            <div 
                              className={`h-full rounded-full ${tickerScore > 0 ? 'bg-green-500' : 'bg-red-500'}`}
                              style={{ width: `${Math.abs(tickerScore) * 100}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}

        {/* 관련 토픽 */}
        {item.topics && item.topics.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6 }}
            className="glass-card rounded-2xl p-5 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-purple-500/10 to-transparent rounded-full blur-2xl" />
            
            <div className="relative">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg glass-strong flex items-center justify-center">
                  <Tag size={16} className="text-purple-400" />
                </div>
                <h4 className="font-medium">주요 토픽</h4>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {item.topics.map((topic, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.7 + index * 0.05 }}
                    className="glass-subtle rounded-full px-4 py-2 hover:glass-card transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{topic.topic}</span>
                      <span className="text-xs text-primary font-medium">
                        {(parseFloat(topic.relevance_score) * 100).toFixed(0)}%
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* 본문 */}
        <div className="glass-card rounded-2xl p-8 relative overflow-hidden">
          <div className={`absolute top-0 left-0 w-1 h-full bg-gradient-to-b ${isBullish ? 'from-green-500 via-blue-500' : 'from-red-500 via-orange-500'} to-purple-500`} />
          
          <div className="space-y-4">
            <div className="flex items-center gap-3 pb-4 border-b border-white/10">
              <div className="w-10 h-10 rounded-full glass-strong flex items-center justify-center">
                <User size={18} />
              </div>
              <div>
                <div className="text-sm font-medium">{item.authors}</div>
                <div className="text-xs text-foreground/50">분석가</div>
              </div>
            </div>
            
            <div className="prose prose-invert max-w-none">
              <p className="text-lg leading-relaxed text-foreground/95 first-letter:text-3xl first-letter:font-bold first-letter:text-primary first-letter:mr-1 first-letter:float-left">
                {item.summary}
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="space-y-6 relative">
      {/* 읽기 진행률 바 */}
      <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-white/5">
        <motion.div 
          className="h-full bg-gradient-to-r from-primary via-purple-500 to-blue-500"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      {/* 헤더 */}
      <div className="flex items-center justify-between sticky top-0 z-40 py-3 glass-strong rounded-2xl px-4 backdrop-blur-xl">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 glass-subtle rounded-xl hover:glass-card transition-all"
        >
          <ArrowLeft size={16} />
          <span className="text-sm font-medium">뒤로가기</span>
        </button>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsBookmarked(!isBookmarked)}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
              isBookmarked ? 'glass-card text-yellow-400' : 'glass-subtle hover:glass-card'
            }`}
          >
            <Bookmark size={16} fill={isBookmarked ? "currentColor" : "none"} />
          </button>
          
          <button
            onClick={() => {
              navigator.share?.({ 
                title: getTitle(), 
                url: newsItem.url 
              }).catch(() => {
                navigator.clipboard.writeText(newsItem.url);
              });
            }}
            className="w-9 h-9 rounded-xl glass-subtle hover:glass-card transition-all flex items-center justify-center"
          >
            <Share2 size={16} />
          </button>
          
          <button
            onClick={() => window.open(newsItem.url, '_blank')}
            className="flex items-center gap-2 px-4 py-2 glass-card rounded-xl hover:glass-strong transition-all"
          >
            <ExternalLink size={16} />
            <span className="text-sm font-medium">원문</span>
          </button>
        </div>
      </div>

      {/* Hero 타이틀 섹션 */}
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="glass-card rounded-3xl p-8 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-primary/10 via-purple-500/10 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-blue-500/10 to-transparent rounded-full blur-3xl" />
        
        <div className="relative space-y-5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl glass-strong flex items-center justify-center">
                <Sparkles size={20} className="text-primary" />
              </div>
              <div>
                <div className="font-bold text-lg">{newsItem.source}</div>
                <div className="text-xs text-foreground/50">
                  {formatRelativeTime(getTimestamp())}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Badge className="bg-primary/20 text-primary border-primary/30 px-3 py-1">
                {newsItem.type === "sentiment" ? "감성분석" : 
                 newsItem.type === "financial" ? "금융뉴스" : "시장뉴스"}
              </Badge>
              
              <div className="flex items-center gap-1 px-3 py-1 rounded-full glass-subtle text-xs">
                <Eye size={12} />
                <span>{getReadTime(getDescription())}</span>
              </div>
            </div>
          </div>

          <h1 className="text-3xl font-bold leading-tight bg-gradient-to-br from-white via-white to-white/80 bg-clip-text">
            {getTitle()}
          </h1>

          <p className="text-lg text-foreground/85 leading-relaxed border-l-4 border-primary/50 pl-4">
            {getDescription()}
          </p>

          <div className="flex items-center gap-4 pt-4 border-t border-white/10 text-sm text-foreground/60">
            <div className="flex items-center gap-2">
              <Calendar size={14} />
              <span>{formatTimestamp(getTimestamp())}</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* 타입별 상세 내용 */}
      {newsItem.type === "market" && renderMarketNews(newsItem)}
      {newsItem.type === "financial" && renderFinancialNews(newsItem)}
      {newsItem.type === "sentiment" && renderSentimentNews(newsItem)}

      {/* 메타 정보 푸터 */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="glass-subtle rounded-2xl p-5"
      >
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="text-xs text-foreground/50">발행 시간</div>
            <div className="text-sm font-medium">{formatTimestamp(getTimestamp())}</div>
          </div>
          
          <div className="space-y-1">
            <div className="text-xs text-foreground/50">컨텐츠 타입</div>
            <div className="text-sm font-medium capitalize">{newsItem.type}</div>
          </div>
          
          <div className="space-y-1">
            <div className="text-xs text-foreground/50">예상 읽기 시간</div>
            <div className="text-sm font-medium">{getReadTime(getDescription())}</div>
          </div>
          
          <div className="space-y-1">
            <div className="text-xs text-foreground/50">출처</div>
            <div className="text-sm font-medium">{newsItem.source}</div>
          </div>
        </div>
      </motion.div>

      {/* 스크롤 힌트 */}
      {scrollProgress < 5 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1, repeat: Infinity, repeatType: "reverse", duration: 1.5 }}
          className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-40 flex flex-col items-center gap-2 text-xs text-foreground/50"
        >
          <span>스크롤하여 계속 읽기</span>
          <ChevronDown size={16} />
        </motion.div>
      )}
    </div>
  );
}