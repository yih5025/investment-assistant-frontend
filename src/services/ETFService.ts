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
  private pollingInterval: NodeJS.Timeout | null = null;
  private ongoingRequest: Promise<void> | null = null;
  protected consecutiveErrors = 0;
  
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

  protected getServiceName(): string {
    return 'ETFService';
  }

  protected getDataMode(): 'websocket' | 'api' {
    return 'api';
  }

  public initialize(): void {
    if (this.isInitialized) {
      console.log('✅ ETFService 이미 초기화됨 - 기존 폴링 유지');
      return;
    }

    if (this.isShutdown) {
      console.log('⚠️ ETFService가 종료된 상태입니다. 재시작이 필요합니다.');
      return;
    }

    console.log('🚀 ETFService 초기화 시작');
    this.startApiPolling();
    this.isInitialized = true;
    console.log('✅ ETFService 초기화 완료');
  }

  public shutdown(): void {
    if (this.isShutdown) {
      console.log('⚠️ ETFService 이미 종료된 상태입니다.');
      return;
    }

    console.log('🛑 ETFService 종료 시작');
    this.isShutdown = true;

    // 폴링 중단
    this.stopApiPolling();

    // 상태 초기화
    this.setConnectionStatus('disconnected');
    this.subscribers.clear();
    this.lastDataCache = [];
    this.resetPaginationState();
    this.isInitialized = false;

    console.log('✅ ETFService 종료 완료');
  }

  public reconnect(): void {
    console.log('🔄 ETFService 수동 재연결 시도');
    this.consecutiveErrors = 0;
    this.startApiPolling();
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


  // 데이터 수동 새로고침
  public refreshData(): void {
    console.log('🔄 ETF 데이터 수동 새로고침');
    
    // 즉시 fetch 실행
    this.fetchDataFromApi().catch(error => {
      console.error('❌ ETF 데이터 새로고침 실패:', error);
    });
  }

  private async fetchDataFromApi(): Promise<void> {
    // 이미 요청이 진행 중이면 중복 요청 방지
    if (this.ongoingRequest) {
      console.log('🔄 ETF 데이터 요청이 이미 진행 중입니다. 중복 요청 방지');
      return this.ongoingRequest;
    }

    this.ongoingRequest = this.performApiRequest();
    
    try {
      await this.ongoingRequest;
    } finally {
      this.ongoingRequest = null;
    }
  }

  private async loadWithCachePriority(fetchFn: () => Promise<void>): Promise<void> {
    const now = Date.now();
    
    // 🎯 캐시가 유효하면 즉시 emit 후 백그라운드 업데이트
    if (this.isCacheValid()) {
      console.log(`🏦 ETF 캐시 데이터 사용 (${Math.round((now - this.dataTimestamp) / 1000)}초 전)`);
      
      // 즉시 캐시된 데이터 emit
      this.emitEvent('etf_update', this.lastDataCache);
      
      // 백그라운드에서 최신 데이터 가져오기
      setTimeout(() => fetchFn().catch(console.error), 100);
      return;
    }

    // 캐시가 없거나 오래된 경우 즉시 새 데이터 가져오기
    await fetchFn();
  }

  private async performApiRequest(): Promise<void> {
    try {
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
        
        console.log(`🏦 ETF 데이터 로드: ${result.data.length}개 (전체: ${this.paginationState.totalCount}개)`);
      }
      
      // 🎯 상태 변경 제거 - api_mode는 폴링 시작 시 한 번만 설정
      this.consecutiveErrors = 0;
      
    } catch (error) {
      console.error('🏦 ETF 데이터 로드 실패:', error);
      this.handleError(`ETF 데이터 로드 실패: ${error}`);
      this.consecutiveErrors++;
      
      if (this.consecutiveErrors >= this.config.maxConsecutiveErrors) {
        this.setConnectionStatus('disconnected');
        this.stopApiPolling();
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

  private startApiPolling(): void {
    this.stopApiPolling();

    // 우선순위 기반 폴링 간격 결정
    const baseInterval = this.getPollingInterval();
    const priorityOffset = this.getPriorityOffset('etf');
    const finalInterval = baseInterval; // ETF는 기본 60초 간격 유지

    console.log(`🔄 ETF API 폴링 시작 (${finalInterval}ms 간격, 우선순위: 중간, 오프셋: ${priorityOffset}ms)`);

    const pollData = async () => {
      if (this.isInitialized && !this.isShutdown) {
        await this.fetchDataFromApi();
      }
    };

    // 즉시 한 번 실행 후 api_mode 설정
    this.loadWithCachePriority(pollData);
    this.setConnectionStatus('api_mode');
    
    // 우선순위 오프셋 적용 (서버 부하 분산)
    setTimeout(() => {
      this.pollingInterval = setInterval(pollData, finalInterval);
    }, priorityOffset);
  }

  private stopApiPolling(): void {
    if (this.pollingInterval) {
      console.log('🏦 ETF 폴링 중지');
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
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

  protected handleError(error: string): void {
    console.error('🏦 ETF 서비스 오류:', error);
    this.emitEvent('error', { type: 'etf' as const, error });
    
    // 에러 백오프
    setTimeout(() => {
      if (this.consecutiveErrors < this.config.maxConsecutiveErrors) {
        console.log('🏦 ETF 에러 복구 시도');
        this.fetchDataFromApi();
      }
    }, this.config.errorBackoffInterval);
  }
}
