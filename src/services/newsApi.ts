// services/newsApi.ts
// 뉴스 API 통합 서비스 - 병렬 처리, 캐싱, 에러 처리 최적화

// ============================================================================
// 타입 정의
// ============================================================================

export interface MarketNewsItem {
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

export interface FinancialNewsItem {
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

export interface SentimentNewsItem {
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

export type NewsItem = MarketNewsItem | FinancialNewsItem | SentimentNewsItem;

export interface NewsFilters {
  selectedApi: "all" | "market" | "financial" | "sentiment";
  selectedCategory: "all" | "crypto" | "forex" | "merger" | "general";
  selectedSource: string;
  searchQuery: string;
  sortBy: "recent" | "sentiment" | "relevance";
}

export interface NewsResponse {
  items: NewsItem[];
  stats: {
    market: number;
    financial: number;
    sentiment: number;
    total: number;
  };
  sources: string[];
  hasMore: boolean;
}

export interface PaginationParams {
  page: number;
  limit: number;
  monthIndex: number;
}

// ============================================================================
// API 클라이언트 클래스
// ============================================================================

class NewsApiClient {
  private baseUrl: string;
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private pendingRequests = new Map<string, Promise<any>>();

  constructor() {
    this.baseUrl = this.getAPIBaseURL();
  }

  private getAPIBaseURL(): string {
    // 환경변수 우선 확인
    if (typeof window !== 'undefined') {
      const envApiBase = (import.meta as any)?.env?.VITE_API_BASE_URL;
      if (envApiBase) {
        console.log("🌐 환경변수에서 API URL 사용:", envApiBase);
        return envApiBase;
      }
    }

    // 🔒 HTTPS 사용 (SSL 인증서 발급 완료)
    console.log("🔒 HTTPS API URL 사용: https://api.investment-assistant.site/api/v1");
    return 'https://api.investment-assistant.site/api/v1';
  }

  // =========================================================================
  // 캐싱 관리
  // =========================================================================

  private getCacheKey(endpoint: string, params: Record<string, any>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((acc, key) => ({ ...acc, [key]: params[key] }), {});
    return `${endpoint}-${JSON.stringify(sortedParams)}`;
  }

  private getFromCache<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const now = Date.now();
    if (now - cached.timestamp > cached.ttl) {
      this.cache.delete(key);
      return null;
    }

    console.log(`📦 캐시에서 데이터 반환: ${key}`);
    return cached.data;
  }

  private setCache<T>(key: string, data: T, ttlMs: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs
    });
    console.log(`💾 캐시에 데이터 저장: ${key} (TTL: ${ttlMs}ms)`);
  }

  // =========================================================================
  // HTTP 요청 관리
  // =========================================================================

  private async makeRequest<T>(
    endpoint: string, 
    params: Record<string, any> = {},
    cacheTtl: number = 30000 // 기본 30초 캐시
  ): Promise<T> {
    const cacheKey = this.getCacheKey(endpoint, params);
    
    const cached = this.getFromCache<T>(cacheKey);
    if (cached) return cached;

    
    if (this.pendingRequests.has(cacheKey)) {
      console.log(`⏳ 중복 요청 대기 중: ${endpoint}`);
      return this.pendingRequests.get(cacheKey);
    }

    // 실제 요청
    const requestPromise = this.executeRequest<T>(endpoint, params, cacheTtl, cacheKey);
    this.pendingRequests.set(cacheKey, requestPromise);

    try {
      const result = await requestPromise;
      return result;
    } finally {
      this.pendingRequests.delete(cacheKey);
    }
  }

  private async executeRequest<T>(
    endpoint: string,
    params: Record<string, any>,
    cacheTtl: number,
    cacheKey: string
  ): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10초 타임아웃

    try {
      const queryString = new URLSearchParams(
        Object.entries(params).reduce((acc, [key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            acc[key] = String(value);
          }
          return acc;
        }, {} as Record<string, string>)
      ).toString();

      // 🔧 슬래시 리다이렉트 방지: URL 끝에 슬래시 추가
      const baseUrlWithSlash = `${this.baseUrl}${endpoint}${endpoint.endsWith('/') ? '' : '/'}`;
      const finalUrl = `${baseUrlWithSlash}${queryString ? `?${queryString}` : ''}`;
      
      console.log(`🚀 API 요청: ${finalUrl}`);

      const response = await fetch(finalUrl, {
        signal: controller.signal,

        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      // 캐시에 저장
      this.setCache(cacheKey, data, cacheTtl);
      
      console.log(`✅ API 응답 성공: ${endpoint}`);
      return data;

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('요청 시간 초과 (10초)');
      }
      console.error(`❌ API 요청 실패: ${endpoint}`, error);
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // =========================================================================
  // 날짜 관리
  // =========================================================================

  private getMonthDateRange(monthIndex: number) {
    const now = new Date();
    const end = new Date(now.getTime() - monthIndex * 30 * 24 * 60 * 60 * 1000);
    const start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
    return {
      startIso: start.toISOString(),
      endIso: end.toISOString()
    };
  }

  // =========================================================================
  // 개별 API 호출 메서드
  // =========================================================================

  async fetchMarketNews(
    filters: Pick<NewsFilters, 'selectedSource'>,
    pagination: PaginationParams
  ): Promise<MarketNewsItem[]> {
    const { startIso, endIso } = this.getMonthDateRange(pagination.monthIndex);
    
    const params: Record<string, any> = {
      page: pagination.page,
      limit: pagination.limit,
      start_date: startIso,
      end_date: endIso
    };

    if (filters.selectedSource !== 'all') {
      params.sources = filters.selectedSource;
    }

    const response = await this.makeRequest<any>('/market-news', params, 30000);
    const items = response.items || [];
    
    return items.map((item: any) => ({
      ...item,
      type: "market" as const
    }));
  }

  async fetchFinancialNews(
    filters: Pick<NewsFilters, 'selectedCategory' | 'selectedSource'>,
    pagination: PaginationParams
  ): Promise<FinancialNewsItem[]> {
    const { startIso, endIso } = this.getMonthDateRange(pagination.monthIndex);
    
    const params: Record<string, any> = {
      page: pagination.page,
      limit: pagination.limit,
      start_date: startIso,
      end_date: endIso
    };

    if (filters.selectedCategory !== 'all') {
      params.categories = filters.selectedCategory;
    }
    if (filters.selectedSource !== 'all') {
      params.sources = filters.selectedSource;
    }

    const response = await this.makeRequest<any>('/financial-news', params, 30000);
    const items = response.items || [];
    
    return items.map((item: any) => ({
      ...item,
      type: "financial" as const
    }));
  }

  async fetchSentimentNews(
    pagination: PaginationParams
  ): Promise<SentimentNewsItem[]> {
    const sentimentOffset = pagination.monthIndex * pagination.limit;
    
    const params = {
      days: 30,
      limit: pagination.limit,
      offset: sentimentOffset,
      sort_by: 'time_published',
      order: 'desc'
    };

    const response = await this.makeRequest<any>('/market-news-sentiment', params, 30000);
    const news = response.news || [];
    
    return news.map((item: any) => ({
      ...item,
      type: "sentiment" as const
    }));
  }

  // =========================================================================
  // 통합 뉴스 로딩 (핵심 메서드)
  // =========================================================================

  async fetchAllNews(
    filters: NewsFilters,
    pagination: PaginationParams
  ): Promise<NewsResponse> {
    console.log('🚀 통합 뉴스 로딩 시작...', { filters, pagination });

    try {
      let results: NewsItem[] = [];

      if (filters.selectedApi === "all") {
        // 병렬로 모든 API 호출
        console.log('📡 모든 API 병렬 호출 중...');
        const [marketNews, financialNews, sentimentNews] = await Promise.all([
          this.fetchMarketNews(filters, pagination),
          this.fetchFinancialNews(filters, pagination),
          this.fetchSentimentNews(pagination)
        ]);

        results = [...marketNews, ...financialNews, ...sentimentNews];
        console.log(`✅ 병렬 로딩 완료: Market(${marketNews.length}) + Financial(${financialNews.length}) + Sentiment(${sentimentNews.length})`);
      } else {
        // 특정 API만 호출
        console.log(`📡 ${filters.selectedApi} API 호출 중...`);
        switch (filters.selectedApi) {
          case "market":
            results = await this.fetchMarketNews(filters, pagination);
            break;
          case "financial":
            results = await this.fetchFinancialNews(filters, pagination);
            break;
          case "sentiment":
            results = await this.fetchSentimentNews(pagination);
            break;
        }
        console.log(`✅ ${filters.selectedApi} 로딩 완료: ${results.length}개`);
      }

      // 통계 계산
      const stats = {
        market: results.filter(n => n.type === "market").length,
        financial: results.filter(n => n.type === "financial").length,
        sentiment: results.filter(n => n.type === "sentiment").length,
        total: results.length
      };

      // 소스 목록 추출
      const sources = [...new Set(
        results
          .map(item => item.source)
          .filter(Boolean)
      )];

      console.log(`📊 최종 결과: ${stats.total}개 뉴스, ${sources.length}개 소스`);

      return {
        items: results,
        stats,
        sources,
        hasMore: results.length > 0
      };

    } catch (error) {
      console.error('❌ 통합 뉴스 로딩 실패:', error);
      throw new Error(
        error instanceof Error 
          ? `뉴스 로딩 실패: ${error.message}` 
          : '뉴스를 불러오는데 실패했습니다'
      );
    }
  }

  // =========================================================================
  // 캐시 관리 메서드
  // =========================================================================

  clearCache(): void {
    this.cache.clear();
    this.pendingRequests.clear();
    console.log('🗑️ 캐시 초기화 완료');
  }

  getCacheStats() {
    return {
      cacheSize: this.cache.size,
      pendingRequests: this.pendingRequests.size
    };
  }
}

// ============================================================================
// 싱글톤 인스턴스 export
// ============================================================================

export const newsApi = new NewsApiClient();

// 개발환경에서 디버깅용
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).newsApi = newsApi;
}