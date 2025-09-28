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

  private getApiUrl(offset: number = 0, limit: number = 50): string {
    const BASE_URL = 'https://api.investment-assistant.site/api/v1';
    return `${BASE_URL}/etf/polling?limit=${limit}&sort_by=price&order=desc`;
  }

  // 수정 2: 폴링 시작 로직 개선 (즉시 데이터 로드 보장)
  private startApiPolling(): void {
    this.stopApiPolling();

    const baseInterval = this.getPollingInterval();
    const priorityOffset = this.getPriorityOffset('etf');
    const finalInterval = baseInterval;

    console.log(`🔄 ETF API 폴링 시작 (${finalInterval}ms 간격, 오프셋: ${priorityOffset}ms)`);

    const pollData = async () => {
      if (this.isInitialized && !this.isShutdown) {
        await this.fetchDataFromApi();
      }
    };

    // 핵심 수정: 즉시 한 번 실행 후 api_mode 설정
    this.loadWithCachePriority(pollData);
    this.setConnectionStatus('api_mode');
    
    // 우선순위 오프셋 적용하여 정기 폴링 시작
    setTimeout(() => {
      this.pollingInterval = setInterval(pollData, finalInterval);
    }, priorityOffset);
  }

  // 기존 메서드들 모두 유지 (수정 없음)
  public shutdown(): void {
    if (this.isShutdown) {
      console.log('⚠️ ETFService 이미 종료된 상태입니다.');
      return;
    }

    console.log('🛑 ETFService 종료 시작');
    this.isShutdown = true;

    this.stopApiPolling();
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
        this.paginationState.limit = nextLimit;
        this.paginationState.allData = result.data;
        this.paginationState.totalCount = result.metadata?.total_available || result.data.length;
        this.paginationState.hasMore = nextLimit < this.paginationState.totalCount;
        
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

  public getPaginationState() {
    return {
      ...this.paginationState,
      currentCount: this.paginationState.allData.length
    };
  }

  public refreshData(): void {
    console.log('🔄 ETF 데이터 수동 새로고침');
    
    this.fetchDataFromApi().catch(error => {
      console.error('❌ ETF 데이터 새로고침 실패:', error);
    });
  }

  // 기존 메서드들 모두 유지 (수정 없음)
  private async fetchDataFromApi(): Promise<void> {
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
    
    if (this.isCacheValid()) {
      console.log(`🏦 ETF 캐시 데이터 사용 (${Math.round((now - this.dataTimestamp) / 1000)}초 전)`);
      
      this.emitEvent('etf_update', this.lastDataCache);
      
      setTimeout(() => fetchFn().catch(console.error), 100);
      return;
    }

    await fetchFn();
  }

  private async performApiRequest(): Promise<void> {
    try {
      const result = await this.fetchETFData(
        this.paginationState.offset, 
        this.paginationState.limit
      );
      
      // API 응답 구조 디버깅
      console.log('🏦 ETF API 응답 구조:', {
        hasData: !!result.data,
        hasEtfs: !!result.etfs,
        hasItems: !!result.items,
        keys: Object.keys(result),
        dataLength: result.data?.length || result.etfs?.length || result.items?.length || 0
      });
      
      // 다양한 응답 구조 처리
      let apiData: any[] = [];
      let totalCount = 0;
      
      if (result.data && Array.isArray(result.data)) {
        // 예상되는 구조: { data: [...], metadata: {...} }
        apiData = result.data;
        totalCount = result.metadata?.total_available || result.data.length;
      } else if (result.etfs && Array.isArray(result.etfs)) {
        // 대안 구조: { etfs: [...], total_count: ... }
        apiData = result.etfs;
        totalCount = result.total_count || result.etfs.length;
      } else if (result.items && Array.isArray(result.items)) {
        // 또 다른 구조: { items: [...] }
        apiData = result.items;
        totalCount = result.items.length;
      } else if (Array.isArray(result)) {
        // 직접 배열인 경우
        apiData = result;
        totalCount = result.length;
      } else {
        console.warn('🏦 ETF API 응답 구조를 인식할 수 없음:', result);
        return;
      }
      
      if (apiData.length > 0) {
        // 페이징 상태 업데이트
        this.paginationState.allData = apiData;
        this.paginationState.totalCount = totalCount;
        this.paginationState.hasMore = this.paginationState.limit < totalCount;

        const data = this.transformApiData(apiData);
        this.updateCache(data);
        this.emitEvent('etf_update', data);
        
        console.log(`🏦 ETF 데이터 로드 성공: ${apiData.length}개 (전체: ${totalCount}개)`);
      } else {
        console.warn('🏦 ETF API에서 빈 데이터 배열 반환');
      }
      
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
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        mode: 'cors',
        credentials: 'omit',
        signal: AbortSignal.timeout(30000)
      });

      if (!response.ok) {
        throw new Error(`ETF API 요청 실패: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      // 응답 데이터 로깅 (디버깅용)
      console.log('🏦 ETF API 응답 샘플:', {
        status: response.status,
        dataType: typeof data,
        isArray: Array.isArray(data),
        keys: typeof data === 'object' ? Object.keys(data) : [],
        firstItem: Array.isArray(data) ? data[0] : typeof data === 'object' && data.data ? data.data[0] : null
      });
      
      return data;
      
    } catch (error) {
      console.error('🏦 ETF API 네트워크 오류:', error);
      throw error;
    }
  }

  private transformApiData(apiData: any[]): ETFData[] {
    return apiData.map((item, index) => {
      // 다양한 필드명 처리
      const symbol = item.symbol || item.ticker || '';
      const name = item.name || item.etf_name || item.description || symbol;
      const currentPrice = item.current_price || item.price || item.last_price || 0;
      const changeAmount = item.change_amount || item.change || item.price_change || 0;
      const changePercentage = item.change_percentage || item.change_percent || item.percent_change || 0;
      const volume = item.volume || item.trading_volume || 0;
      
      // 디버깅: 첫 번째 아이템 구조 로깅
      if (index === 0) {
        console.log('🏦 ETF 데이터 변환 샘플:', {
          original: item,
          transformed: {
            symbol,
            name,
            currentPrice,
            changeAmount,
            changePercentage,
            volume
          }
        });
      }
      
      return {
        symbol,
        name,
        current_price: currentPrice,
        change_amount: changeAmount,
        change_percentage: changePercentage,
        volume,
        previous_close: item.previous_close || item.prev_close,
        is_positive: item.is_positive ?? (changeAmount > 0),
        change_color: item.change_color || (changeAmount > 0 ? 'green' : changeAmount < 0 ? 'red' : 'gray'),
        last_updated: item.last_updated || item.updated_at,
        rank: item.rank || index + 1
      };
    });
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
    
    setTimeout(() => {
      if (this.consecutiveErrors < this.config.maxConsecutiveErrors) {
        console.log('🏦 ETF 에러 복구 시도');
        this.fetchDataFromApi();
      }
    }, this.config.errorBackoffInterval);
  }
}