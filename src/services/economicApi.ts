// services/economicApi.ts
// 경제 데이터 API 통합 서비스 - 병렬 처리, 캐싱, 에러 처리 최적화

// ============================================================================
// 타입 정의
// ============================================================================

export interface FederalFundsRateData {
    date: string;
    rate: number;
  }
  
  export interface InflationData {
    date: string;
    inflation_rate: number;
  }
  
  export interface CPIData {
    date: string;
    cpi_value: number;
  }
  
  export interface TreasuryYieldData {
    date: string;
    yield?: number;
    yield_value?: number;
    rate?: number;
    value?: number;
    maturity: string;
  }
  
  export interface APIResponse<T> {
    total_count?: number;
    items: T[];
  }
  
  export interface EconomicIndicatorRow {
    year: number;
    period: string; // 'YYYY-MM'
    treasuryRate?: number;
    fedRate?: number;
    cpi?: number;
    inflation?: number;
  }
  
  export interface EconomicDataResponse {
    data: EconomicIndicatorRow[];
    stats: {
      totalDataPoints: number;
      dateRange: {
        start: string;
        end: string;
      };
      dataAvailability: {
        fedRate: number;
        treasuryRate: number;
        cpi: number;
        inflation: number;
      };
    };
    sources: string[];
    lastUpdated: string;
  }
  
  export interface APITestResult {
    name: string;
    url: string;
    status: 'loading' | 'success' | 'error';
    statusCode?: number;
    data?: any;
    error?: string;
    responseTime?: number;
  }
  
  // ============================================================================
  // 경제 API 클라이언트 클래스
  // ============================================================================
  
  class EconomicApiClient {
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
  
      // 스마트 환경 감지
      if (typeof window !== 'undefined') {
        const hostname = window.location.hostname;
        
        console.log("🔍 현재 환경 분석:", { hostname });
  
        // Vercel 배포 환경
        if (hostname.includes('vercel.app')) {
          console.log("🌐 Vercel 환경 감지 → 외부 API 사용");
          return 'https://api.investment-assistant.site/api/v1';
        }
        
        // 로컬 개발 환경
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
          console.log("🌐 로컬 환경 감지 → 로컬 API 사용");
          return 'http://localhost:8888/api/v1';
        }
        
        // K8s 내부 환경
        if (hostname.includes('192.168.') || hostname.includes('10.') || hostname.includes('172.')) {
          console.log("🌐 K8s 환경 감지 → 내부 프록시 사용");
          return '/api/v1';
        }
      }
  
      // 기본값: HTTPS 사용
      console.log("🌐 기본 HTTPS API URL 사용: https://api.investment-assistant.site/api/v1");
      return 'https://api.investment-assistant.site/api/v1';
    }
  
    // =========================================================================
    // 캐싱 관리
    // =========================================================================
  
    private getCacheKey(endpoint: string, params: Record<string, any>): string {
      const sortedParams = Object.keys(params)
        .sort()
        .reduce((acc, key) => ({ ...acc, [key]: params[key] }), {});
      return `economic-${endpoint}-${JSON.stringify(sortedParams)}`;
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
      cacheTtl: number = 300000 // 기본 5분 캐시 (경제 데이터는 자주 변하지 않음)
    ): Promise<T> {
      const cacheKey = this.getCacheKey(endpoint, params);
      
      // 캐시 확인
      const cached = this.getFromCache<T>(cacheKey);
      if (cached) return cached;
  
      // 중복 요청 방지
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
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15초 타임아웃
  
      try {
        const queryString = new URLSearchParams(
          Object.entries(params).reduce((acc, [key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
              acc[key] = String(value);
            }
            return acc;
          }, {} as Record<string, string>)
        ).toString();
  
        // 올바른 슬래시 위치: 경로 뒤, 쿼리 파라미터 앞
        const baseUrlWithSlash = `${this.baseUrl}${endpoint}${endpoint.endsWith('/') ? '' : '/'}`;
        const finalUrl = `${baseUrlWithSlash}${queryString ? `?${queryString}` : ''}`;
        
        console.log(`🚀 경제 API 요청: ${finalUrl}`);
  
        const response = await fetch(finalUrl, {
          signal: controller.signal,
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        });
  
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
  
        const data = await response.json();
        
        // 캐시에 저장
        this.setCache(cacheKey, data, cacheTtl);
        
        console.log(`✅ 경제 API 응답 성공: ${endpoint}`);
        return data;
  
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          throw new Error('요청 시간 초과 (15초)');
        }
        console.error(`❌ 경제 API 요청 실패: ${endpoint}`, error);
        throw error;
      } finally {
        clearTimeout(timeoutId);
      }
    }
  
    // =========================================================================
    // 데이터 변환 유틸리티
    // =========================================================================
  
    private extractNumber(item: any, fields: string[]): number | undefined {
      for (const field of fields) {
        const value = item[field];
        if (typeof value === 'number' && !isNaN(value)) return value;
        if (typeof value === 'string') {
          const parsed = parseFloat(value);
          if (!isNaN(parsed)) return parsed;
        }
      }
      return undefined;
    }
  
    private formatPeriod(dateStr: string): string {
      const date = new Date(dateStr);
      const year = date.getFullYear();
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      return `${year}-${month}`;
    }
  
    private combineEconomicData(
      fedData: FederalFundsRateData[],
      inflationData: InflationData[],
      cpiData: CPIData[],
      treasuryData: TreasuryYieldData[]
    ): EconomicIndicatorRow[] {
      const monthlyData = new Map<string, EconomicIndicatorRow>();
  
      // 연방기금금리 데이터 처리
      fedData.forEach(item => {
        if (item.date && typeof item.rate === 'number') {
          const period = this.formatPeriod(item.date);
          const year = parseInt(period.split('-')[0]);
          
          if (!monthlyData.has(period)) {
            monthlyData.set(period, { year, period });
          }
          
          const existing = monthlyData.get(period)!;
          existing.fedRate = item.rate;
        }
      });
  
      // 국채수익률 데이터 처리
      treasuryData.forEach(item => {
        if (item.date) {
          const period = this.formatPeriod(item.date);
          const year = parseInt(period.split('-')[0]);
          
          const yieldValue = this.extractNumber(item, ['yield', 'yield_value', 'yield_rate', 'rate', 'value']);
          
          if (yieldValue !== undefined) {
            if (!monthlyData.has(period)) {
              monthlyData.set(period, { year, period });
            }
            
            const existing = monthlyData.get(period)!;
            existing.treasuryRate = yieldValue;
          }
        }
      });
  
      // 인플레이션 데이터 처리
      inflationData.forEach(item => {
        if (item.date && typeof item.inflation_rate === 'number') {
          const date = new Date(item.date);
          const year = date.getFullYear();
          
          for (let month = 1; month <= 12; month++) {
            const period = `${year}-${month.toString().padStart(2, '0')}`;
            
            if (!monthlyData.has(period)) {
              monthlyData.set(period, { year, period });
            }
            
            const existing = monthlyData.get(period)!;
            existing.inflation = item.inflation_rate;
          }
        }
      });
  
      // CPI 데이터 처리
      cpiData.forEach(item => {
        if (item.date && typeof item.cpi_value === 'number') {
          const period = this.formatPeriod(item.date);
          const year = parseInt(period.split('-')[0]);
          
          if (!monthlyData.has(period)) {
            monthlyData.set(period, { year, period });
          }
          
          const existing = monthlyData.get(period)!;
          existing.cpi = item.cpi_value;
        }
      });
  
      return Array.from(monthlyData.values())
        .filter(item => item.year >= 2014)
        .sort((a, b) => a.period.localeCompare(b.period));
    }
  
    // =========================================================================
    // 개별 API 호출 메서드
    // =========================================================================
  
    async fetchFederalFundsRate(): Promise<FederalFundsRateData[]> {
      const response = await this.makeRequest<APIResponse<FederalFundsRateData>>('/federal-funds-rate');
      return response.items || [];
    }
  
    async fetchInflationData(): Promise<InflationData[]> {
      const response = await this.makeRequest<APIResponse<InflationData>>('/inflation');
      return response.items || [];
    }
  
    async fetchCPIData(): Promise<CPIData[]> {
      const response = await this.makeRequest<APIResponse<CPIData>>('/cpi');
      return response.items || [];
    }
  
    async fetchTreasuryYieldData(): Promise<TreasuryYieldData[]> {
      const response = await this.makeRequest<APIResponse<TreasuryYieldData>>('/treasury-yield', {
        maturity: '10year',
        size: 1000
      });
      return response.items || [];
    }
  
    // =========================================================================
    // 통합 경제 데이터 로딩 (핵심 메서드)
    // =========================================================================
  
    async fetchEconomicData(): Promise<EconomicDataResponse> {
      console.log('🚀 경제 데이터 통합 로딩 시작...');
  
      try {
        // 병렬로 모든 API 호출
        console.log('📡 4개 경제 API 병렬 호출 중...');
        const [fedData, inflationData, cpiData, treasuryData] = await Promise.all([
          this.fetchFederalFundsRate(),
          this.fetchInflationData(),
          this.fetchCPIData(),
          this.fetchTreasuryYieldData()
        ]);
  
        console.log(`✅ 병렬 로딩 완료: Fed(${fedData.length}) + Inflation(${inflationData.length}) + CPI(${cpiData.length}) + Treasury(${treasuryData.length})`);
  
        // 데이터 결합
        const combinedData = this.combineEconomicData(fedData, inflationData, cpiData, treasuryData);
  
        // 통계 계산
        const stats = {
          totalDataPoints: combinedData.length,
          dateRange: {
            start: combinedData.length > 0 ? combinedData[0].period : '',
            end: combinedData.length > 0 ? combinedData[combinedData.length - 1].period : ''
          },
          dataAvailability: {
            fedRate: combinedData.filter(d => d.fedRate !== undefined).length,
            treasuryRate: combinedData.filter(d => d.treasuryRate !== undefined).length,
            cpi: combinedData.filter(d => d.cpi !== undefined).length,
            inflation: combinedData.filter(d => d.inflation !== undefined).length
          }
        };
  
        // 소스 목록
        const sources = ['Federal Reserve', 'Bureau of Labor Statistics', 'Treasury Department'];
  
        console.log(`📊 최종 결과: ${stats.totalDataPoints}개 데이터 포인트`);
  
        return {
          data: combinedData,
          stats,
          sources,
          lastUpdated: new Date().toISOString()
        };
  
      } catch (error) {
        console.error('❌ 경제 데이터 로딩 실패:', error);
        throw new Error(
          error instanceof Error 
            ? `경제 데이터 로딩 실패: ${error.message}` 
            : '경제 데이터를 불러오는데 실패했습니다'
        );
      }
    }
  
    // =========================================================================
    // API 테스트 기능
    // =========================================================================
  
    async runAPITests(): Promise<APITestResult[]> {
      const tests: Omit<APITestResult, 'status'>[] = [
        { name: "🌐 기본 연결", url: `${this.baseUrl.replace('/api/v1', '')}/health/` },
        { name: "📊 API 정보", url: `${this.baseUrl}/` },
        { name: "💰 연방기금금리", url: `${this.baseUrl}/federal-funds-rate/?limit=3` },
        { name: "📈 인플레이션", url: `${this.baseUrl}/inflation/?limit=3` },
        { name: "🛒 CPI", url: `${this.baseUrl}/cpi/?limit=3` },
        { name: "🏛️ 국채수익률", url: `${this.baseUrl}/treasury-yield/?limit=3` }
      ];
  
      const results: APITestResult[] = tests.map(test => ({ ...test, status: 'loading' }));
  
      for (let i = 0; i < tests.length; i++) {
        const test = tests[i];
        const startTime = Date.now();
        
        try {
          const response = await this.makeRequest<any>(test.url.replace(this.baseUrl, ''), {}, 0); // 캐시 비활성화
          const responseTime = Date.now() - startTime;
          
          results[i] = {
            ...test,
            status: 'success',
            statusCode: 200,
            data: response,
            responseTime
          };
          
        } catch (error: any) {
          const responseTime = Date.now() - startTime;
          
          results[i] = {
            ...test,
            status: 'error',
            error: error.message,
            responseTime
          };
        }
      }
      
      return results;
    }
  
    // =========================================================================
    // 캐시 관리 메서드
    // =========================================================================
  
    clearCache(): void {
      this.cache.clear();
      this.pendingRequests.clear();
      console.log('🗑️ 경제 데이터 캐시 초기화 완료');
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
  
  export const economicApi = new EconomicApiClient();
  
  // 개발환경에서 디버깅용
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    (window as any).economicApi = economicApi;
  }