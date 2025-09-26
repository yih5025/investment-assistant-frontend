// services/SP500Service.ts
// SP500 HTTP 폴링 전용 서비스

import { BaseService } from './BaseService';
import { SP500Data } from './types';

export class SP500Service extends BaseService {
  private pollingInterval: NodeJS.Timeout | null = null;
  private ongoingRequest: Promise<void> | null = null;
  
  // SP500 페이징 상태 관리
  private paginationState = {
    offset: 0,
    limit: 50,
    hasMore: true,
    isLoading: false,
    totalCount: 0,
    allData: [] as SP500Data[]
  };

  protected getServiceName(): string {
    return 'SP500Service';
  }

  protected getDataMode(): 'websocket' | 'api' {
    return 'api';
  }

  public initialize(): void {
    if (this.isInitialized) {
      console.log('✅ SP500Service 이미 초기화됨 - 기존 폴링 유지');
      return;
    }

    if (this.isShutdown) {
      console.log('⚠️ SP500Service가 종료된 상태입니다. 재시작이 필요합니다.');
      return;
    }

    console.log('🚀 SP500Service 초기화 시작');
    this.startApiPolling();
    this.isInitialized = true;
    console.log('✅ SP500Service 초기화 완료');
  }

  public reconnect(): void {
    console.log('🔄 SP500Service 수동 재연결 시도');
    this.consecutiveErrors = 0;
    this.startApiPolling();
  }

  public shutdown(): void {
    if (this.isShutdown) {
      console.log('⚠️ SP500Service 이미 종료된 상태입니다.');
      return;
    }

    console.log('🛑 SP500Service 종료 시작');
    this.isShutdown = true;

    // 폴링 중단
    this.stopApiPolling();

    // 상태 초기화
    this.setConnectionStatus('disconnected');
    this.subscribers.clear();
    this.lastDataCache = [];
    this.paginationState = {
      offset: 0,
      limit: 50,
      hasMore: true,
      isLoading: false,
      totalCount: 0,
      allData: []
    };
    this.isInitialized = false;

    console.log('✅ SP500Service 종료 완료');
  }

  // SP500 더보기 기능
  public async loadMoreData(): Promise<boolean> {
    if (this.paginationState.isLoading || !this.paginationState.hasMore) {
      console.log('📊 SP500 더보기 불가:', {
        isLoading: this.paginationState.isLoading,
        hasMore: this.paginationState.hasMore
      });
      return false;
    }

    this.paginationState.isLoading = true;

    try {
      const apiUrl = this.getApiUrl(this.paginationState.offset, this.paginationState.limit);
      const response = await fetch(apiUrl, {
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
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.data && Array.isArray(result.data)) {
        // 기존 데이터에 새 데이터 추가
        this.paginationState.allData = [...this.paginationState.allData, ...result.data];
        this.paginationState.hasMore = result.pagination?.has_next || false;
        this.paginationState.offset += this.paginationState.limit;

        // 전체 데이터를 변환하여 업데이트
        const allTransformedData = this.transformApiData(this.paginationState.allData);
        this.updateCache(allTransformedData);
        this.emitEvent('sp500_update', allTransformedData);
        
        console.log(`📊 SP500 더보기 로드: +${result.data.length}개, 총 ${this.paginationState.allData.length}개`);
        return true;
      }

      return false;

    } catch (error) {
      console.error('❌ SP500 더보기 로드 실패:', error);
      this.handleError(error instanceof Error ? error.message : String(error));
      return false;
    } finally {
      this.paginationState.isLoading = false;
    }
  }

  // SP500 페이징 상태 조회
  public getPaginationState() {
    return {
      offset: this.paginationState.offset,
      limit: this.paginationState.limit,
      hasMore: this.paginationState.hasMore,
      isLoading: this.paginationState.isLoading,
      totalCount: this.paginationState.totalCount,
      currentCount: this.paginationState.allData.length
    };
  }

  // 데이터 수동 새로고침
  public refreshData(): void {
    console.log('🔄 SP500 데이터 수동 새로고침');
    
    // 페이징 상태 초기화
    this.paginationState.offset = 0;
    this.paginationState.allData = [];
    this.paginationState.hasMore = true;
    
    // 즉시 fetch 실행
    this.fetchDataFromApi().catch(error => {
      console.error('❌ SP500 데이터 새로고침 실패:', error);
    });
  }

  private startApiPolling(): void {
    this.stopApiPolling();

    // 우선순위 기반 폴링 간격 결정
    const baseInterval = this.getPollingInterval();
    const priorityOffset = this.getPriorityOffset('sp500');
    const finalInterval = baseInterval - 5000; // SP500은 55초 간격 (최우선)

    console.log(`🔄 SP500 API 폴링 시작 (${finalInterval}ms 간격, 우선순위: 최우선)`);

    const pollData = async () => {
      try {
        await this.fetchDataFromApi();
      } catch (error) {
        console.error('❌ SP500 API 폴링 오류:', error);
      }
    };

    // 즉시 한 번 실행 후 주기적 폴링
    this.loadWithCachePriority(pollData);
    this.setConnectionStatus('api_mode');
    
    // 우선순위 오프셋 적용
    setTimeout(() => {
      this.pollingInterval = setInterval(pollData, finalInterval);
    }, priorityOffset);
  }

  private stopApiPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
      console.log('⏹️ SP500 API 폴링 중단');
    }
  }

  private async loadWithCachePriority(fetchFn: () => Promise<void>): Promise<void> {
    const now = Date.now();

    if (this.isCacheValid()) {
      console.log(`📦 SP500 캐시 데이터 사용 (${Math.round((now - this.dataTimestamp) / 1000)}초 전)`);
      
      // 즉시 캐시된 데이터 emit
      this.emitEvent('sp500_update', this.lastDataCache as SP500Data[]);
      
      // 백그라운드에서 최신 데이터 가져오기
      setTimeout(() => fetchFn(), 100);
    } else {
      console.log('🆕 SP500 새 데이터 fetch');
      await fetchFn();
    }
  }

  private async fetchDataFromApi(): Promise<void> {
    // 중복 요청 방지
    if (this.ongoingRequest) {
      console.log('⏳ SP500 요청이 이미 진행 중입니다. 대기...');
      await this.ongoingRequest;
      return;
    }

    // 새 요청 시작
    this.ongoingRequest = this.performApiRequest();

    try {
      await this.ongoingRequest;
    } finally {
      // 요청 완료 후 정리
      this.ongoingRequest = null;
    }
  }

  private async performApiRequest(): Promise<void> {
    try {
      // 첫 페이지만 가져오기 (초기 로딩용)
      const apiUrl = this.getApiUrl(0, this.paginationState.limit);
      const response = await fetch(apiUrl, {
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
        if (response.status === 524) {
          console.warn('⚠️ SP500 CloudFlare 타임아웃 - 다음 폴링에서 재시도');
          return;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.data && Array.isArray(result.data)) {
        // 페이징 상태 업데이트
        this.paginationState.allData = result.data;
        this.paginationState.totalCount = result.pagination?.total_count || result.data.length;
        this.paginationState.hasMore = result.pagination?.has_next || false;
        this.paginationState.offset = this.paginationState.limit; // 다음 페이지를 위한 offset

        const data = this.transformApiData(result.data);
        this.updateCache(data);
        this.emitEvent('sp500_update', data);
        
        console.log(`📊 SP500 첫 페이지 로드: ${result.data.length}개 (전체: ${this.paginationState.totalCount}개)`);
      }

    } catch (error) {
      this.handleError(error instanceof Error ? error.message : String(error));
      
      if (this.consecutiveErrors >= this.config.maxConsecutiveErrors) {
        console.warn('⚠️ SP500 연속 에러 - 백오프 적용');
        this.applyErrorBackoff();
      }
    }
  }

  private applyErrorBackoff(): void {
    this.stopApiPolling();
    
    setTimeout(() => {
      console.log('🔄 SP500 백오프 완료 - 폴링 재시작');
      this.consecutiveErrors = 0;
      this.startApiPolling();
    }, this.config.errorBackoffInterval);
  }

  private getApiUrl(offset: number = 0, limit: number = 50): string {
    const BASE_URL = 'https://api.investment-assistant.site/api/v1';
    return `${BASE_URL}/stocks/sp500/polling?limit=${limit}&offset=${offset}&sort_by=volume&order=desc`;
  }

  private transformApiData(apiData: any[]): SP500Data[] {
    return apiData.map(item => ({
      symbol: item.symbol,
      price: item.current_price || item.price || 0,
      volume: item.volume || 0,
      timestamp_ms: item.timestamp_ms || Date.now(),
      category: item.category,
      source: 'api_fallback',
      company_name: item.company_name,
      current_price: item.current_price || item.price || 0,
      previous_close: item.previous_close,
      change_amount: item.change_amount,
      change_percentage: item.change_percentage,
      is_positive: item.is_positive,
      change_color: item.change_color
    }));
  }
}
