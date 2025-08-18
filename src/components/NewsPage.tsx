import React, { useState, useEffect } from 'react';
import { Search, Filter, TrendingUp, TrendingDown, Clock, Target, ExternalLink, BarChart, Newspaper, RefreshCw, Calendar, Building, Zap, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';

// ============================================================================
// 타입 정의 (제공된 백엔드 API 구조에 맞춤)
// ============================================================================

// 1. Market News API (/api/v1/market-news)
interface MarketNewsItem {
  type: "market";
  source: string;
  url: string;
  author: string;
  title: string;
  description: string;
  content: string;
  published_at: string;
  short_description?: string;
  fetched_at?: string;
}

// 2. Financial News API (/api/v1/financial-news)  
interface FinancialNewsItem {
  type: "financial";
  category: "crypto" | "forex" | "merger" | "general";
  news_id: number;
  datetime: string;
  headline: string;
  image: string;
  related: string;
  source: string;
  summary: string;
  url: string;
  published_at?: string;
  short_headline?: string;
  has_image?: boolean;
  related_symbols?: string[];
  category_display_name?: string;
  fetched_at?: string;
}

// 3. Company News API (/api/v1/company-news)
interface CompanyNewsItem {
  type: "company";
  symbol: string;
  category: string;
  rank_position?: number;
  price?: number;
  change_percentage?: string;
  volume?: number;
  news_count: number;
  news: Array<{
    article_id: number;
    headline: string;
    image: string;
    related: string;
    source: string;
    summary: string;
    url: string;
    published_at: string;
  }>;
}

// 4. Market News Sentiment API (/api/v1/market-news-sentiment)
interface SentimentNewsItem {
  type: "sentiment";
  title: string;
  url: string;
  time_published: string;
  authors: string;
  summary: string;
  source: string;
  overall_sentiment_score: number;
  overall_sentiment_label: string;
  ticker_sentiment: Array<{
    ticker: string;
    relevance_score: string;
    ticker_sentiment_label: string;
    ticker_sentiment_score: string;
  }>;
  topics: Array<{
    topic: string;
    relevance_score: string;
  }>;
  query_type: string;
  query_params: string;
  batch_id?: number;
  created_at?: string;
  sentiment_interpretation?: string;
  sentiment_emoji?: string;
}

export type NewsItem = MarketNewsItem | FinancialNewsItem | CompanyNewsItem | SentimentNewsItem;

// API 응답 타입들
interface ApiResponse<T> {
  total?: number;
  total_count?: number;
  items?: T[];
  news?: T[];
  stocks?: T[];
  batch_info?: any;
  categories?: any;
}

interface NewsPageProps {
  isLoggedIn: boolean;
  onLoginPrompt: () => void;
  onNewsClick?: (newsItem: NewsItem) => void;
}

// ============================================================================
// 메인 뉴스 페이지 컴포넌트
// ============================================================================

export default function IntegratedNewsPage({ isLoggedIn, onLoginPrompt, onNewsClick }: NewsPageProps) {
  // =========================================================================
  // State 관리
  // =========================================================================
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [allNews, setAllNews] = useState<NewsItem[]>([]);
  
  // 검색 및 필터
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedApi, setSelectedApi] = useState<"all" | "market" | "financial" | "sentiment">("all");
  const [selectedCategory, setSelectedCategory] = useState<"all" | "crypto" | "forex" | "merger" | "general">("all");
  const [selectedSource, setSelectedSource] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"recent" | "sentiment" | "relevance">("recent");
  
  // 페이징
  const [currentPage, setCurrentPage] = useState(1);
  const [limit] = useState(100);
  const [hasMore, setHasMore] = useState(true);
  
  // 통계
  const [apiStats, setApiStats] = useState({
    market: 0,
    financial: 0,
    sentiment: 0,
    total: 0
  });

  // 사용 가능한 소스 목록
  const [availableSources, setAvailableSources] = useState<string[]>([]);

  // =========================================================================
  // API 호출 함수들
  // =========================================================================

  // EconomicDashboard와 동일한 방식으로 API Base URL 결정
  const getAPIBaseURL = () => {
    // 1) 명시적 환경변수 우선
    if (typeof window !== 'undefined') {
      const envApiBase = (import.meta as any)?.env?.VITE_API_BASE_URL;
      if (envApiBase) {
        console.log("🌐 환경변수에서 API URL 사용:", envApiBase);
        return envApiBase;
      }
    }

    // 2) 기본: 항상 백엔드 도메인 사용 (로컬 포함)
    console.log("🌐 기본 외부 API URL 사용: https://api.investment-assistant.site/api/v1");
    return 'https://api.investment-assistant.site/api/v1';
  };

  const API_BASE_URL = getAPIBaseURL();

  // 월별 창으로 조회하기 위한 인덱스 상태 (0=최근 30일, 1=그 이전 30일 ...)
  const [monthIndex, setMonthIndex] = useState(0);

  const getMonthDateRange = (index: number) => {
    const now = new Date();
    const end = new Date(now.getTime() - index * 30 * 24 * 60 * 60 * 1000);
    const start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
    return {
      startIso: start.toISOString(),
      endIso: end.toISOString()
    };
  };

  // 1. Market News API 호출 (기간 기반)
  const fetchMarketNews = async (startIso: string, endIso: string, limit = 100, page = 1) => {
    try {
      console.log('🔄 Market News API 호출 중...');
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        start_date: startIso,
        end_date: endIso
      });
      if (selectedSource !== 'all') {
        params.append('sources', selectedSource);
      }

      const response = await fetch(`${API_BASE_URL}/market-news/?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`Market News API 오류: ${response.status}`);
      }

      const data: ApiResponse<any> = await response.json();
      console.log('✅ Market News 응답:', data);
      
      const items = data.items || [];
      return items.map((item: any) => ({
        ...item,
        type: "market" as const
      }));
    } catch (error) {
      console.error('❌ Market News API 오류:', error);
      return [];
    }
  };

  // 2. Financial News API 호출 (기간 기반)
  const fetchFinancialNews = async (startIso: string, endIso: string, limit = 100, page = 1) => {
    try {
      console.log('🔄 Financial News API 호출 중...');
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        start_date: startIso,
        end_date: endIso
      });
      if (selectedCategory !== 'all') {
        params.append('categories', selectedCategory);
      }
      if (selectedSource !== 'all') {
        params.append('sources', selectedSource);
      }

      const response = await fetch(`${API_BASE_URL}/financial-news/?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`Financial News API 오류: ${response.status}`);
      }

      const data: ApiResponse<any> = await response.json();
      console.log('✅ Financial News 응답:', data);
      
      const items = data.items || [];
      return items.map((item: any) => ({
        ...item,
        type: "financial" as const
      }));
    } catch (error) {
      console.error('❌ Financial News API 오류:', error);
      return [];
    }
  };

  // 3. Market News Sentiment API 호출 (30일 윈도우, 오프셋 증가)
  const fetchSentimentNews = async (days = 30, limit = 100, offset = 0) => {
    try {
      console.log('🔄 Sentiment News API 호출 중...');
      const params = new URLSearchParams({
        days: days.toString(),
        limit: limit.toString(),
        offset: offset.toString(),
        sort_by: 'time_published',
        order: 'desc'
      });

      const response = await fetch(`${API_BASE_URL}/market-news-sentiment/?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`Sentiment News API 오류: ${response.status}`);
      }

      const data: ApiResponse<any> = await response.json();
      console.log('✅ Sentiment News 응답:', data);
      
      const news = data.news || [];
      return news.map((item: any) => ({
        ...item,
        type: "sentiment" as const
      }));
    } catch (error) {
      console.error('❌ Sentiment News API 오류:', error);
      return [];
    }
  };

  // =========================================================================
  // 통합 데이터 로딩
  // =========================================================================

  const loadAllNewsData = async (refresh = false) => {
    setLoading(true);
    setError(null);
    
    if (refresh) {
      setAllNews([]);
      setCurrentPage(1);
    }

    try {
      console.log('🚀 모든 뉴스 API 호출 시작...');
      
      const monthIdx = refresh ? 0 : (currentPage - 1);
      const { startIso, endIso } = getMonthDateRange(monthIdx);
      const sentimentOffset = monthIdx * 100;
      
      // 선택된 API에 따라 호출
      let results: NewsItem[] = [];
      
      if (selectedApi === "all") {
        // Market, Financial: 최근 30일, Sentiment: 30일 창 + offset 페이징
        const [marketNews, financialNews, sentimentNews] = await Promise.all([
          fetchMarketNews(startIso, endIso, 100, 1),
          fetchFinancialNews(startIso, endIso, 100, 1),
          fetchSentimentNews(30, 100, sentimentOffset)
        ]);
        
        results = [...marketNews, ...financialNews, ...sentimentNews];
      } else {
        // 특정 API만 호출
        switch (selectedApi) {
          case "market":
            results = await fetchMarketNews(startIso, endIso, 100, 1);
            break;
          case "financial":
            results = await fetchFinancialNews(startIso, endIso, 100, 1);
            break;
          case "sentiment":
            results = await fetchSentimentNews(30, 100, sentimentOffset);
            break;
        }
      }

      console.log(`✅ 총 ${results.length}개 뉴스 로드됨`);

      // 데이터 업데이트
      if (refresh) {
        setAllNews(results);
      } else {
        setAllNews(prev => [...prev, ...results]);
      }

      // 소스 목록 업데이트
      const sources = [...new Set(results.map(item => getItemSourceLabel(item)).filter(Boolean))] as string[];
      setAvailableSources(prev => [...new Set([...prev, ...sources])]);

      // 통계 업데이트
      updateStats(refresh ? results : [...allNews, ...results]);

      // 더 보기 여부 결정 (해당 월에 결과가 있으면 더보기 노출)
      setHasMore(results.length > 0);

    } catch (error) {
      console.error('❌ 뉴스 로딩 오류:', error);
      setError(error instanceof Error ? error.message : '뉴스를 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  // 통계 업데이트
  const updateStats = (newsData: NewsItem[]) => {
    const stats = {
      market: newsData.filter(n => n.type === "market").length,
      financial: newsData.filter(n => n.type === "financial").length,
      sentiment: newsData.filter(n => n.type === "sentiment").length,
      total: newsData.filter(n => n.type !== "company").length
    };
    setApiStats(stats);
  };

  // =========================================================================
  // 유틸리티 함수들 (TDZ 방지를 위해 먼저 선언)
  // =========================================================================

  function getTimestamp(item: NewsItem): string {
    switch (item.type) {
      case "market": return item.published_at;
      case "financial": return item.datetime;
      case "company": return ""; // company 뉴스는 제외
      case "sentiment": return item.time_published;
      default: return "";
    }
  }

  function getItemSourceLabel(item: NewsItem): string {
    switch (item.type) {
      case "company":
        return ""; // 제외
      case "market":
      case "financial":
      case "sentiment":
        return item.source;
    }
  }

  function safeLower(value: unknown): string {
    return typeof value === "string" ? value.toLowerCase() : "";
  }

  // =========================================================================
  // 필터링 및 정렬
  // =========================================================================

  const filteredNews = React.useMemo(() => {
    let filtered = allNews.filter(item => {
      // 검색어 필터
      const matchesSearch = (() => {
        const query = searchQuery.toLowerCase();
        switch (item.type) {
          case "market":
            return [item.title, item.description, item.source]
              .some(v => safeLower(v).includes(query));
          case "financial":
            return [item.headline, item.summary, item.source]
              .some(v => safeLower(v).includes(query));
          case "company":
            return safeLower(item.symbol).includes(query) ||
                   (item.news?.some(n =>
                     [n.headline, n.summary, n.source].some(v => safeLower(v).includes(query))
                   ) ?? false);
          case "sentiment":
            return [item.title, item.summary, item.source]
              .some(v => safeLower(v).includes(query));
          default:
            return false;
        }
      })();

      // API 타입 필터
      const matchesApi = selectedApi === "all" || item.type === selectedApi;
      
      // 카테고리 필터 (Financial News만 해당)
      const matchesCategory = selectedCategory === "all" || 
        (item.type === "financial" && item.category === selectedCategory);

      // 소스 필터 (Company 타입 고려)
      const matchesSource = selectedSource === "all" || getItemSourceLabel(item) === selectedSource;

      return matchesSearch && matchesApi && matchesCategory && matchesSource;
    });

    // 정렬
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "sentiment":
          const aSentiment = a.type === "sentiment" ? a.overall_sentiment_score : 0;
          const bSentiment = b.type === "sentiment" ? b.overall_sentiment_score : 0;
          return Math.abs(bSentiment) - Math.abs(aSentiment);
        case "relevance":
          // 티커가 있는 뉴스를 우선순위로
          const aHasTicker = (a.type === "company" || a.type === "sentiment") ? 1 : 0;
          const bHasTicker = (b.type === "company" || b.type === "sentiment") ? 1 : 0;
          return bHasTicker - aHasTicker;
        default: // recent
          const aTime = new Date(getTimestamp(a)).getTime();
          const bTime = new Date(getTimestamp(b)).getTime();
          return bTime - aTime;
      }
    });

    // 뉴스 타입 섞기 (전체 보기 + 최신순일 때 적용)
    if (selectedApi === "all" && sortBy === "recent") {
      const byType: Record<string, NewsItem[]> = {
        market: [], financial: [], sentiment: []
      };
      for (const item of filtered) {
        if (item.type in byType) byType[item.type].push(item);
      }
      // 각 타입은 이미 최신순으로 정렬되어 있음
      const order: Array<keyof typeof byType> = ["market", "financial", "sentiment"];
      const indices: Record<string, number> = { market: 0, financial: 0, sentiment: 0 };
      const totalLen = filtered.length;
      const interleaved: NewsItem[] = [];
      let cursor = 0;
      while (interleaved.length < totalLen && cursor < totalLen * 3) {
        for (const key of order) {
          const arr = byType[key];
          const idx = indices[key];
          if (arr && idx < arr.length) {
            interleaved.push(arr[idx]);
            indices[key] = idx + 1;
          }
        }
        cursor++;
      }
      return interleaved;
    }

    return filtered;
  }, [allNews, searchQuery, selectedApi, selectedCategory, selectedSource, sortBy]);

  // =========================================================================
  // 유틸리티 함수들
  // =========================================================================

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / 3600000);
    
    if (diffHours < 1) {
      return "방금 전";
    } else if (diffHours < 24) {
      return `${diffHours}시간 전`;
    } else {
      return date.toLocaleDateString("ko-KR", { 
        month: "short", 
        day: "numeric"
      });
    }
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

  const getApiColor = (type: string) => {
    switch (type) {
      case "market": return "bg-blue-500/20 text-blue-400";
      case "financial": return "bg-green-500/20 text-green-400";
      case "company": return "bg-purple-500/20 text-purple-400";
      case "sentiment": return "bg-orange-500/20 text-orange-400";
      default: return "bg-gray-500/20 text-gray-400";
    }
  };

  // 공통 소스 라벨 (상단에서 함수 선언으로 정의됨)

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "crypto": return "bg-orange-500/20 text-orange-400";
      case "forex": return "bg-green-500/20 text-green-400";
      case "merger": return "bg-purple-500/20 text-purple-400";
      case "general": return "bg-blue-500/20 text-blue-400";
      default: return "bg-gray-500/20 text-gray-400";
    }
  };

  // =========================================================================
  // 이벤트 핸들러
  // =========================================================================

  const handleRefresh = () => {
    loadAllNewsData(true);
  };

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const handleNewsClick = (item: NewsItem) => {
    if (onNewsClick) {
      onNewsClick(item);
    } else {
      // 뉴스 URL 결정
      let url = "";
      switch (item.type) {
        case "market":
        case "financial":
        case "sentiment":
          url = item.url;
          break;
        case "company":
          url = item.news?.[0]?.url || "";
          break;
      }
      if (url) {
        window.open(url, '_blank');
      }
    }
  };

  // =========================================================================
  // 생명주기
  // =========================================================================

  useEffect(() => {
    loadAllNewsData(true);
  }, [selectedApi, selectedCategory, selectedSource]);

  useEffect(() => {
    if (currentPage > 1) {
      loadAllNewsData(false);
    }
  }, [currentPage]);

  // =========================================================================
  // 렌더링 함수들
  // =========================================================================

  const renderNewsItem = (item: NewsItem, index: number) => {
    const getTitle = () => {
      switch (item.type) {
        case "market": return item.title;
        case "financial": return item.headline;
        case "company": return `${item.symbol} - ${item.news?.[0]?.headline || '뉴스'}`;
        case "sentiment": return item.title;
      }
    };

    const getSummary = () => {
      switch (item.type) {
        case "market": return item.description;
        case "financial": return item.summary;
        case "company": return item.news?.[0]?.summary || `${item.news_count}개 뉴스`;
        case "sentiment": return item.summary;
      }
    };

    const getImage = () => {
      switch (item.type) {
        case "financial": return item.image;
        case "company": return item.news?.[0]?.image;
        default: return null;
      }
    };

    // 안정적인 키 생성을 위해 URL/타임스탬프/인덱스 조합 사용
    const key = (() => {
      switch (item.type) {
        case "market":
        case "financial":
        case "sentiment":
          return `${item.type}-${item.url}-${getTimestamp(item)}-${index}`;
        default:
          return `${item.type}-${getTimestamp(item)}-${index}`;
      }
    })();

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
                <span className="text-sm font-medium text-foreground/90">{getItemSourceLabel(item)}</span>
                
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
                
                 {/* company 타입은 제외 */}

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
                    {item.ticker_sentiment.slice(0, 2).map((ticker, index) => (
                      <span 
                        key={index} 
                        className={`px-1.5 py-0.5 rounded text-xs ${getSentimentColor(parseFloat(ticker.ticker_sentiment_score))}`}
                      >
                        {ticker.ticker}
                      </span>
                    ))}
                  </div>
                )}

                {/* company 타입은 제외 */}

                {/* 관련 토픽 */}
                {item.type === "sentiment" && item.topics?.length > 0 && (
                  <span className="px-2 py-1 rounded text-xs bg-gray-500/20 text-gray-400 border border-gray-500/30">
                    {item.topics[0].topic}
                  </span>
                )}
              </div>

              <div className="text-xs text-foreground/50 flex-shrink-0">자세히 보기 →</div>
            </div>
          </div>
        </div>
      </article>
    );
  };

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
            ({apiStats.total}개 뉴스)
          </span>
        </div>
        
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="flex items-center space-x-2 px-3 py-2 glass-card rounded-lg hover:glass transition-all disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          <span className="text-sm">새로고침</span>
        </button>
      </div>

      {/* API 통계 (버튼화) */}
      <div className="grid grid-cols-4 gap-3">
        <button
          onClick={() => setSelectedApi("all")}
          className={`glass-card p-3 rounded-lg text-center transition-all ${selectedApi === 'all' ? 'ring-2 ring-primary/50 bg-primary/10' : 'hover:glass'}`}
        >
          <div className="text-lg font-bold text-primary">{apiStats.total}</div>
          <div className="text-xs text-foreground/60">전체</div>
        </button>
        <button
          onClick={() => setSelectedApi("market")}
          className={`glass-card p-3 rounded-lg text-center transition-all ${selectedApi === 'market' ? 'ring-2 ring-blue-400/50 bg-blue-500/10' : 'hover:glass'}`}
        >
          <div className="text-lg font-bold text-blue-400">{apiStats.market}</div>
          <div className="text-xs text-foreground/60">시장뉴스</div>
        </button>
        <button
          onClick={() => setSelectedApi("financial")}
          className={`glass-card p-3 rounded-lg text-center transition-all ${selectedApi === 'financial' ? 'ring-2 ring-green-400/50 bg-green-500/10' : 'hover:glass'}`}
        >
          <div className="text-lg font-bold text-green-400">{apiStats.financial}</div>
          <div className="text-xs text-foreground/60">금융뉴스</div>
        </button>
        <button
          onClick={() => setSelectedApi("sentiment")}
          className={`glass-card p-3 rounded-lg text-center transition-all ${selectedApi === 'sentiment' ? 'ring-2 ring-orange-400/50 bg-orange-500/10' : 'hover:glass'}`}
        >
          <div className="text-lg font-bold text-orange-400">{apiStats.sentiment}</div>
          <div className="text-xs text-foreground/60">감성분석</div>
        </button>
      </div>

      {/* 검색 */}
      <div className="space-y-3">
        {/* 검색바 */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-foreground/50" size={18} />
          <input
            type="text"
            placeholder="뉴스 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 glass-card border-white/20 rounded-lg bg-transparent placeholder:text-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        {/* 필터 패널 제거: 상단 통계 버튼으로 필터링 */}
      </div>

      {/* 에러 표시 */}
      {error && (
        <div className="glass-card p-4 rounded-xl border border-red-500/30 bg-red-500/10">
          <div className="flex items-center space-x-2 text-red-400">
            <AlertCircle size={20} />
            <span className="font-medium">오류 발생</span>
          </div>
          <p className="text-sm text-red-300 mt-2">{error}</p>
          <button
            onClick={() => setError(null)}
            className="mt-3 px-3 py-1 text-xs bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
          >
            닫기
          </button>
        </div>
      )}

      {/* 로딩 표시 */}
      {loading && (
        <div className="glass-card p-8 text-center rounded-xl">
          <RefreshCw size={48} className="mx-auto mb-4 text-primary animate-spin" />
          <p className="text-foreground/70">뉴스를 불러오는 중...</p>
        </div>
      )}

      {/* 뉴스 목록 */}
      <div className="space-y-3">
        {filteredNews.length === 0 && !loading ? (
          <div className="glass-card p-8 text-center rounded-xl">
            <BarChart size={48} className="mx-auto mb-4 text-foreground/30" />
            <p className="text-foreground/70">
              {searchQuery ? "검색 결과가 없습니다" : "뉴스를 불러올 수 없습니다"}
            </p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
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
            {hasMore && !loading && filteredNews.length > 0 && (
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

            {/* 로딩 중 표시 (더보기) */}
            {loading && filteredNews.length > 0 && (
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

      {/* 디버깅 정보 (개발환경에서만) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="glass-card p-4 rounded-lg space-y-2 text-xs text-foreground/60">
          <div className="font-medium">디버깅 정보:</div>
          <div>API Base URL: {API_BASE_URL}</div>
          <div>현재 페이지: {currentPage}</div>
          <div>로딩 상태: {loading ? "로딩중" : "완료"}</div>
          <div>더보기 가능: {hasMore ? "예" : "아니오"}</div>
          <div>전체 뉴스: {allNews.length}개</div>
          <div>필터된 뉴스: {filteredNews.length}개</div>
          <div>사용 가능한 소스: {availableSources.length}개</div>
        </div>
      )}
    </div>
  );
}

// App.tsx에서 named import 호환을 위해 동일 컴포넌트를 별칭으로도 export
export const NewsPage = IntegratedNewsPage;
