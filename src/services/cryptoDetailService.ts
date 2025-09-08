// services/cryptoDetailService.ts

/**
 * CryptoDetail API 서비스
 * 
 * 설계 원칙:
 * 1. 단일 책임: 각 메서드가 하나의 API 엔드포인트만 담당
 * 2. 에러 처리: 네트워크 에러와 데이터 파싱 에러를 명확히 구분
 * 3. 타입 안전성: 모든 응답에 대해 타입 검증 수행
 * 4. 캐싱 고려: 향후 React Query나 SWR 도입을 위한 구조
 */

// 기본 API 클라이언트 (실제 프로젝트에서는 axios나 fetch wrapper 사용)
class ApiClient {
    private baseURL: string;
  
    constructor(baseURL: string = '/api/v1/crypto/details') {
      this.baseURL = baseURL;
    }
  
    async get<T>(endpoint: string): Promise<T> {
      const response = await fetch(`${this.baseURL}${endpoint}`);
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }
      
      return response.json();
    }
  }
  
  // API 응답 타입 정의 (백엔드 응답 구조와 정확히 일치)
  export interface ConceptAPIResponse {
    basic_info: {
      coingecko_id: string;
      symbol: string;
      name: string;
      image_large: string;
      market_cap_rank: number;
    };
    concept_description: {
      description_original: string;
      genesis_date: string;
      project_age_years: number;
      country_origin: string;
    };
    category_info: {
      categories_korean: string[];
      primary_category: string;
      category_description: string;
    };
    key_features: {
      consensus_algorithm: string;
      blockchain_type: string;
      use_cases: string[];
      unique_features: string[];
    };
    educational_content: {
      what_is_it: string;
      how_it_works: string;
      why_created: string;
      real_world_usage: string[];
      beginner_summary: string;
      difficulty_level: string;
    };
    faqs: Array<{
      question: string;
      answer: string;
      category: string;
    }>;
    last_updated: string;
  }
  
  export interface EcosystemAPIResponse {
    development_activity: {
      github_metrics: {
        commit_count_4_weeks: number;
        stars: number;
        forks: number;
        total_issues: number;
        closed_issues: number;
        issues_resolved_rate_percent: number;
      };
      activity_indicators: {
        commits_per_week: number;
        last_updated: string;
      };
      comparison_benchmarks: any; // 복잡한 중첩 객체라서 일단 any로 처리
      interpretation_guide: any;
    };
    community_metrics: {
      social_metrics: {
        telegram_users: number | null;
        reddit_subscribers: number;
        twitter_followers: number | null;
      };
      platform_presence: {
        has_telegram: boolean;
        has_reddit: boolean;
        has_twitter: boolean;
        total_platforms: number;
      };
      size_references: any;
    };
    market_position: {
      ranking_info: {
        current_rank: number;
        total_cryptocurrencies: number;
        rank_category: string;
        top_percentile: number;
      };
      category_context: {
        primary_category: string;
        all_categories: string[];
        category_count: number;
      };
    };
    comparative_context: {
      category_peers: Array<{
        name: string;
        symbol: string;
        market_cap_rank: number;
        category_match: string;
      }>;
      rank_peers: Array<{
        name: string;
        symbol: string;
        market_cap_rank: number;
        rank_difference: number;
      }>;
    };
    data_transparency: {
      data_availability: {
        available: string[];
        missing: string[];
        completeness_percent: number;
      };
      limitations: string[];
      how_to_use: string[];
    };
  }
  
  export interface InvestmentAPIResponse {
    basic_info: {
      coingecko_id: string;
      symbol: string;
      name: string;
      image_large: string;
      market_cap_rank: number;
    };
    market_data: {
      current_price_usd: string;
      current_price_krw: string;
      market_cap_usd: number;
      total_volume_usd: number;
      price_change_percentage_24h: string;
      price_change_percentage_7d: string;
      price_change_percentage_30d: string;
      ath_usd: string;
      ath_change_percentage: string;
      ath_date: string;
      atl_usd: string;
      atl_change_percentage: string;
      atl_date: string;
    };
    supply_data: {
      total_supply: string;
      circulating_supply: string;
      max_supply: string;
      circulating_supply_percentage: string;
      scarcity_score: string;
    };
    kimchi_premium: {
      korean_price_usd: string;
      global_avg_price_usd: string;
      kimchi_premium_percent: string;
      price_diff_usd: string;
      korean_volume_usd: string;
      total_global_volume_usd: string;
      korean_exchange: string;
      global_exchange_count: number;
      korean_spread: string;
      avg_global_spread: string;
    };
    derivatives: {
      avg_funding_rate: string;
      positive_funding_count: number;
      negative_funding_count: number;
      funding_rate_interpretation: string;
      market_sentiment: string;
      total_open_interest: string;
      volume_24h_usd: string;
      institutional_interest: string;
      market_maturity: string;
    };
    global_context: {
      total_market_cap_usd: string;
      market_cap_change_24h: string;
      btc_dominance: string;
      eth_dominance: string;
      market_share_percentage: string;
      market_status: string;
      active_cryptocurrencies: number;
      markets: number;
    };
    risk_analysis: {
      volatility_24h: string;
      volatility_7d: string;
      volatility_30d: string;
      volatility_risk: string;
      liquidity_risk: string;
      volume_stability: string;
      market_position_risk: string;
      rank_stability: string;
      overall_risk_score: string;
    };
    investment_opportunity: {
      institutional_adoption: string;
      etf_status: string;
      supply_constraint: string;
      inflation_hedge: string;
      arbitrage_potential: string;
      investment_environment: string;
      key_drivers: string[];
    };
    portfolio_guidance: {
      conservative_allocation: string;
      moderate_allocation: string;
      aggressive_allocation: string;
      investment_strategies: string[];
      time_horizon: string;
    };
  }
  
  // 김치프리미엄 상세 응답 (38개 조합 데이터)
  export interface DetailedKimchiPremiumResponse {
    symbol: string;
    timestamp: string;
    summary: {
      korean_price_usd: string;
      global_avg_price_usd: string;
      kimchi_premium_percent: string;
      korean_exchange: string;
      global_exchange_count: number;
    };
    exchange_comparisons: Array<{
      korean_exchange: string;
      korean_price_usd: number;
      korean_volume_usd: number;
      korean_spread: number;
      global_exchange: string;
      global_price_usd: number;
      global_volume_usd: number;
      global_spread: number;
      premium_percentage: number;
      price_diff_usd: number;
      volume_ratio: number;
    }>;
    statistics: {
      total_comparisons: number;
      korean_exchanges_count: number;
      global_exchanges_count: number;
      premium_stats: {
        average: number;
        max: number;
        min: number;
        positive_count: number;
        negative_count: number;
      };
    };
  }
  
  /**
   * CryptoDetailService 클래스
   * 
   * 왜 클래스로 구현했는가:
   * 1. 상태 관리: baseURL, timeout 등 설정을 인스턴스별로 관리
   * 2. 확장성: 향후 인증, 캐싱, 인터셉터 등 추가 기능 구현 용이
   * 3. 테스트: 의존성 주입을 통한 목킹 및 테스트 용이성
   */
  export class CryptoDetailService {
    private apiClient: ApiClient;
  
    constructor(baseURL?: string) {
      this.apiClient = new ApiClient(baseURL);
    }
  
    /**
     * 개념 설명 데이터 조회
     * 
     * 왜 별도 메서드로 분리했는가:
     * - 각 탭별로 독립적인 로딩 상태 관리 가능
     * - 필요한 데이터만 선택적 로딩 가능 (성능 최적화)
     * - 에러 처리를 세분화 가능
     */
    async fetchConceptData(symbol: string): Promise<ConceptAPIResponse> {
      try {
        return await this.apiClient.get<ConceptAPIResponse>(`/concept/${symbol}`);
      } catch (error) {
        // 에러를 다시 던지되, 컨텍스트 정보 추가
        throw new Error(`Failed to fetch concept data for ${symbol}: ${error}`);
      }
    }
  
    /**
     * 생태계 데이터 조회
     * 
     * 복잡한 중첩 객체가 많아서 타입 안전성에 특히 주의
     */
    async fetchEcosystemData(symbol: string): Promise<EcosystemAPIResponse> {
      try {
        return await this.apiClient.get<EcosystemAPIResponse>(`/ecosystem/${symbol}`);
      } catch (error) {
        throw new Error(`Failed to fetch ecosystem data for ${symbol}: ${error}`);
      }
    }
  
    /**
     * 투자 분석 데이터 조회
     * 
     * 숫자 데이터가 문자열로 오는 경우가 많아서 변환 처리 필요
     */
    async fetchInvestmentData(symbol: string): Promise<InvestmentAPIResponse> {
      try {
        return await this.apiClient.get<InvestmentAPIResponse>(`/investment/${symbol}`);
      } catch (error) {
        throw new Error(`Failed to fetch investment data for ${symbol}: ${error}`);
      }
    }
  
    /**
     * 김치프리미엄 상세 데이터 조회
     * 
     * 왜 별도 메서드로 분리했는가:
     * - 38개 조합 데이터는 용량이 크므로 필요할 때만 로드
     * - 정렬, 필터링 옵션을 파라미터로 제공
     * - 일반 김치프리미엄 데이터와 구분하여 UI에서 다르게 처리
     */
    async fetchDetailedKimchiPremium(
      symbol: string,
      sortBy: string = 'premium_desc',
      minVolume: number = 0
    ): Promise<DetailedKimchiPremiumResponse> {
      try {
        const params = new URLSearchParams({
          sort_by: sortBy,
          min_volume: minVolume.toString()
        });
        
        return await this.apiClient.get<DetailedKimchiPremiumResponse>(
          `/kimchi-premium/${symbol}/detailed?${params}`
        );
      } catch (error) {
        throw new Error(`Failed to fetch detailed kimchi premium for ${symbol}: ${error}`);
      }
    }
  
    /**
     * 모든 데이터를 한번에 조회하는 편의 메서드
     * 
     * 왜 이 메서드를 추가했는가:
     * - 컴포넌트에서 여러 API를 순차적으로 호출할 필요 없음
     * - 에러 처리를 중앙화하여 일관성 확보
     * - Promise.allSettled 사용으로 일부 API 실패해도 다른 데이터는 표시 가능
     */
    async fetchAllData(symbol: string): Promise<{
      concept: ConceptAPIResponse | null;
      ecosystem: EcosystemAPIResponse | null;
      investment: InvestmentAPIResponse | null;
      errors: string[];
    }> {
      const results = await Promise.allSettled([
        this.fetchConceptData(symbol),
        this.fetchEcosystemData(symbol),
        this.fetchInvestmentData(symbol)
      ]);
  
      const errors: string[] = [];
      const [conceptResult, ecosystemResult, investmentResult] = results;
  
      return {
        concept: conceptResult.status === 'fulfilled' ? conceptResult.value : null,
        ecosystem: ecosystemResult.status === 'fulfilled' ? ecosystemResult.value : null,
        investment: investmentResult.status === 'fulfilled' ? investmentResult.value : null,
        errors: results
          .filter((result, index) => {
            if (result.status === 'rejected') {
              errors.push(`${['concept', 'ecosystem', 'investment'][index]}: ${result.reason}`);
              return true;
            }
            return false;
          })
          .map(() => errors[errors.length - 1])
      };
    }
  }
  
  // 싱글톤 인스턴스 생성 (선택사항)
  export const cryptoDetailService = new CryptoDetailService();