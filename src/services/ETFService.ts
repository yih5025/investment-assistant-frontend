// services/ETFService.ts
import { BaseService } from './BaseService';
import { ETFData, ServiceConfig } from './types';

/**
 * ETF 데이터 관리 서비스
 * 
 * SP500Service와 유사한 패턴으로 ETF 데이터를 HTTP 폴링 방식으로 관리합니다.
 * 페이징 지원, 실시간 업데이트, 캐싱 등의 기능을 제공합니다.
 */
export class ETFService extends BaseService {
  private pollingInterval: number | null = null;
  private isPolling = false;
  private consecutiveErrors = 0;
  
  // 페이징 상태 관리
  private paginationState = {
    offset: 0,
    limit: 50,
    hasMore: true,
    isLoading: false,
    totalCount: 0,
    allData: [] as any[]
  };

  constructor(customConfig?: Partial<ServiceConfig>) {
    super(customConfig);
    console.log('🏦 ETFService 초기화');
  }

  public initialize(): void {
    if (this.isInitialized) {
      console.log('🏦 ETFService 이미 초기화됨');
      return;
    }

    console.log('🏦 ETFService 초기화 시작');
    this.setConnectionStatus('connecting');
    this.isInitialized = true;
    
    // 초기 데이터 로드
    this.loadInitialData();
    
    // 정기 폴링 시작
    this.startPolling();
    
    console.log('🏦 ETFService 초기화 완료');
  }

  public shutdown(): void {
    console.log('🏦 ETFService 종료');
    this.stopPolling();
    this.resetPaginationState();
    this.isInitialized = false;
    this.setConnectionStatus('disconnected');
  }

  public reconnect(): void {
    console.log('🏦 ETFService 재연결 시도');
    this.shutdown();
    setTimeout(() => {
      this.initialize();
    }, 1000);
  }

  // ETF 더보기 로드
  public async loadMoreData(): Promise<boolean> {
    if (this.paginationState.isLoading || !this.paginationState.hasMore) {
      console.log('🏦 ETF 더보기: 로딩 중이거나 더 이상 데이터 없음');
      return false;
    }

    console.log('🏦 ETF 더보기 로드 시작:', {
      현재오프셋: this.paginationState.offset,
      현재리밋: this.paginationState.limit,
      총데이터: this.paginationState.allData.length
    });

    this.paginationState.isLoading = true;
    
    try {
      const nextLimit = this.paginationState.limit + 50;
      const result = await this.fetchETFData(0, nextLimit);
      
      if (result && result.data && Array.isArray(result.data)) {
        // 새로운 limit으로 전체 데이터 업데이트
        this.paginationState.limit = nextLimit;
        this.paginationState.allData = result.data;
        this.paginationState.totalCount = result.metadata?.total_available || result.data.length;
        this.paginationState.hasMore = nextLimit < this.paginationState.totalCount;
        
        // 전체 데이터를 변환하여 업데이트
        const allTransformedData = this.transformApiData(this.paginationState.allData);
        this.updateCache(allTransformedData);
        this.emitEvent('etf_update', allTransformedData);
        
        console.log(`🏦 ETF 더보기 로드: +${result.data.length - (this.paginationState.limit - 50)}개, 총 ${this.paginationState.allData.length}개`);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('🏦 ETF 더보기 로드 실패:', error);
      return false;
    } finally {
      this.paginationState.isLoading = false;
    }
  }

  // 페이징 상태 조회
  public getPaginationState() {
    return {
      ...this.paginationState,
      currentCount: this.paginationState.allData.length
    };
  }

  // 데이터 새로고침
  public refreshData(): void {
    console.log('🏦 ETF 데이터 수동 새로고침');
    this.resetPaginationState();
    this.loadInitialData();
  }

  private async loadInitialData(): Promise<void> {
    console.log('🏦 ETF 초기 데이터 로드 시작');
    
    // 캐시된 데이터가 있고 신선하면 사용
    if (this.isCacheValid()) {
      console.log(`🏦 ETF 캐시 데이터 사용 (${Math.round((Date.now() - this.dataTimestamp) / 1000)}초 전)`);
      
      // 즉시 캐시된 데이터 emit
      this.emitEvent('etf_update', this.lastDataCache as ETFData[]);
      
      // 백그라운드에서 최신 데이터 가져오기
      setTimeout(() => this.fetchAndEmitData(), 100);
      return;
    }

    // 캐시가 없거나 오래된 경우 즉시 새 데이터 가져오기
    await this.fetchAndEmitData();
  }

  private async fetchAndEmitData(): Promise<void> {
    try {
      this.setConnectionStatus('connecting');
      
      const result = await this.fetchETFData(
        this.paginationState.offset, 
        this.paginationState.limit
      );
      
      if (result && result.data && Array.isArray(result.data)) {
        // 페이징 상태 업데이트
        this.paginationState.allData = result.data;
        this.paginationState.totalCount = result.metadata?.total_available || result.data.length;
        this.paginationState.hasMore = this.paginationState.limit < this.paginationState.totalCount;

        const data = this.transformApiData(result.data);
        this.updateCache(data);
        this.emitEvent('etf_update', data);
        
        console.log(`🏦 ETF 첫 페이지 로드: ${result.data.length}개 (전체: ${this.paginationState.totalCount}개)`);
      }
      
      this.setConnectionStatus('connected');
      this.consecutiveErrors = 0;
      
    } catch (error) {
      console.error('🏦 ETF 데이터 로드 실패:', error);
      this.handleError(`ETF 데이터 로드 실패: ${error}`);
      this.consecutiveErrors++;
      
      if (this.consecutiveErrors >= this.config.maxConsecutiveErrors) {
        this.setConnectionStatus('disconnected');
        this.stopPolling();
      }
    }
  }

  private async fetchETFData(offset: number = 0, limit: number = 50): Promise<any> {
    const url = this.getApiUrl(offset, limit);
    console.log('🏦 ETF API 요청:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`ETF API 요청 실패: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  private getApiUrl(offset: number = 0, limit: number = 50): string {
    const BASE_URL = 'https://api.investment-assistant.site/api/v1';
    return `${BASE_URL}/etf/polling?limit=${limit}&sort_by=price&order=desc`;
  }

  private transformApiData(apiData: any[]): ETFData[] {
    return apiData.map(item => ({
      symbol: item.symbol || '',
      name: item.name || item.symbol || '',
      current_price: item.current_price || item.price || 0,
      change_amount: item.change_amount || 0,
      change_percentage: item.change_percentage || 0,
      volume: item.volume || 0,
      previous_close: item.previous_close,
      is_positive: item.is_positive,
      change_color: item.change_color || (item.change_amount > 0 ? 'green' : item.change_amount < 0 ? 'red' : 'gray'),
      last_updated: item.last_updated,
      rank: item.rank
    }));
  }

  private startPolling(): void {
    if (this.pollingInterval || this.isPolling) {
      console.log('🏦 ETF 폴링 이미 실행 중');
      return;
    }

    console.log('🏦 ETF 폴링 시작');
    this.isPolling = true;

    const pollInterval = this.config.apiPollingInterval;
    this.pollingInterval = window.setInterval(() => {
      if (this.isInitialized) {
        this.fetchAndEmitData();
      }
    }, pollInterval);
  }

  private stopPolling(): void {
    if (this.pollingInterval) {
      console.log('🏦 ETF 폴링 중지');
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
      this.isPolling = false;
    }
  }

  private resetPaginationState(): void {
    this.paginationState = {
      offset: 0,
      limit: 50,
      hasMore: true,
      isLoading: false,
      totalCount: 0,
      allData: []
    };
  }

  private handleError(error: string): void {
    console.error('🏦 ETF 서비스 오류:', error);
    this.emitEvent('error', { type: 'etf' as const, error });
    
    // 에러 백오프
    setTimeout(() => {
      if (this.consecutiveErrors < this.config.maxConsecutiveErrors) {
        console.log('🏦 ETF 에러 복구 시도');
        this.fetchAndEmitData();
      }
    }, this.config.errorBackoffInterval);
  }
}
