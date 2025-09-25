// services/TopGainersService.ts
// TopGainers HTTP 폴링 전용 서비스

import { BaseService } from './BaseService';
import { TopGainersData, TopGainersCategoryStats } from './types';

export class TopGainersService extends BaseService {
  private pollingInterval: NodeJS.Timeout | null = null;
  private ongoingRequest: Promise<void> | null = null;
  private categories: Map<string, TopGainersData[]> = new Map();
  private categoryStats: TopGainersCategoryStats | null = null;

  protected getServiceName(): string {
    return 'TopGainersService';
  }

  protected getDataMode(): 'websocket' | 'api' {
    return 'api';
  }

  public initialize(): void {
    if (this.isInitialized) {
      console.log('✅ TopGainersService 이미 초기화됨 - 기존 폴링 유지');
      return;
    }

    if (this.isShutdown) {
      console.log('⚠️ TopGainersService가 종료된 상태입니다. 재시작이 필요합니다.');
      return;
    }

    console.log('🚀 TopGainersService 초기화 시작');
    
    // 카테고리 초기화
    this.categories.set('top_gainers', []);
    this.categories.set('top_losers', []);
    this.categories.set('most_actively_traded', []);
    
    this.startApiPolling();
    this.loadCategoryStats();
    this.isInitialized = true;
    console.log('✅ TopGainersService 초기화 완료');
  }

  public reconnect(): void {
    console.log('🔄 TopGainersService 수동 재연결 시도');
    this.consecutiveErrors = 0;
    this.startApiPolling();
  }

  public shutdown(): void {
    if (this.isShutdown) {
      console.log('⚠️ TopGainersService 이미 종료된 상태입니다.');
      return;
    }

    console.log('🛑 TopGainersService 종료 시작');
    this.isShutdown = true;

    // 폴링 중단
    this.stopApiPolling();

    // 상태 초기화
    this.setConnectionStatus('disconnected');
    this.subscribers.clear();
    this.lastDataCache = [];
    this.categories.clear();
    this.categoryStats = null;
    this.isInitialized = false;

    console.log('✅ TopGainersService 종료 완료');
  }

  // 데이터 수동 새로고침
  public refreshData(): void {
    console.log('🔄 TopGainers 데이터 수동 새로고침');
    
    // 즉시 fetch 실행
    this.fetchDataFromApi().catch(error => {
      console.error('❌ TopGainers 데이터 새로고침 실패:', error);
    });
  }

  // 카테고리별 데이터 조회
  public getDataByCategory(category: 'top_gainers' | 'top_losers' | 'most_actively_traded'): TopGainersData[] {
    return this.categories.get(category) || [];
  }

  public getAllCategories(): Record<string, TopGainersData[]> {
    return {
      top_gainers: this.getDataByCategory('top_gainers'),
      top_losers: this.getDataByCategory('top_losers'),
      most_actively_traded: this.getDataByCategory('most_actively_traded')
    };
  }

  public getCategoryStats(): TopGainersCategoryStats | null {
    return this.categoryStats;
  }

  private async loadCategoryStats(): Promise<void> {
    try {
      const response = await fetch('https://api.investment-assistant.site/api/v1/stocks/topgainers/categories', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        mode: 'cors',
        credentials: 'omit'
      });
      
      if (response.ok) {
        const stats = await response.json();
        this.categoryStats = stats;
        this.emitEvent('topgainers_category_stats', stats);
        console.log('📊 TopGainers 카테고리 통계 로드 완료');
      }
    } catch (error) {
      console.warn('⚠️ TopGainers 카테고리 통계 로드 실패:', error);
    }
  }

  private startApiPolling(): void {
    this.stopApiPolling();

    const marketStatus = this.marketTimeManager.getCurrentMarketStatus();
    const interval = marketStatus.isOpen 
      ? this.config.apiPollingInterval 
      : this.config.marketClosedPollingInterval;

    console.log(`🔄 TopGainers API 폴링 시작 (${interval}ms 간격)`);

    const pollData = async () => {
      try {
        await this.fetchDataFromApi();
      } catch (error) {
        console.error('❌ TopGainers API 폴링 오류:', error);
      }
    };

    // 즉시 한 번 실행 후 주기적 폴링
    this.loadWithCachePriority(pollData);
    this.setConnectionStatus('api_mode');
    
    this.pollingInterval = setInterval(pollData, interval);
  }

  private stopApiPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
      console.log('⏹️ TopGainers API 폴링 중단');
    }
  }

  private async loadWithCachePriority(fetchFn: () => Promise<void>): Promise<void> {
    const now = Date.now();

    if (this.isCacheValid()) {
      console.log(`📦 TopGainers 캐시 데이터 사용 (${Math.round((now - this.dataTimestamp) / 1000)}초 전)`);
      
      // 즉시 캐시된 데이터 emit
      this.emitEvent('topgainers_update', this.lastDataCache as TopGainersData[]);
      
      // 백그라운드에서 최신 데이터 가져오기
      setTimeout(() => fetchFn(), 100);
    } else {
      console.log('🆕 TopGainers 새 데이터 fetch');
      await fetchFn();
    }
  }

  private async fetchDataFromApi(): Promise<void> {
    // 중복 요청 방지
    if (this.ongoingRequest) {
      console.log('⏳ TopGainers 요청이 이미 진행 중입니다. 대기...');
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
      const apiUrl = this.getApiUrl();
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
          console.warn('⚠️ TopGainers CloudFlare 타임아웃 - 다음 폴링에서 재시도');
          return;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.data && Array.isArray(result.data)) {
        const data = this.transformApiData(result.data);
        this.updateCategories(data);
        this.updateCache(data);
        this.emitEvent('topgainers_update', data);
        
        console.log(`📊 TopGainers API 데이터 업데이트: ${data.length}개`);
      }

    } catch (error) {
      this.handleError(error instanceof Error ? error.message : String(error));
      
      if (this.consecutiveErrors >= this.config.maxConsecutiveErrors) {
        console.warn('⚠️ TopGainers 연속 에러 - 백오프 적용');
        this.applyErrorBackoff();
      }
    }
  }

  private applyErrorBackoff(): void {
    this.stopApiPolling();
    
    setTimeout(() => {
      console.log('🔄 TopGainers 백오프 완료 - 폴링 재시작');
      this.consecutiveErrors = 0;
      this.startApiPolling();
    }, this.config.errorBackoffInterval);
  }

  private getApiUrl(): string {
    const BASE_URL = 'https://api.investment-assistant.site/api/v1';
    return `${BASE_URL}/stocks/topgainers/polling?limit=50`;
  }

  private transformApiData(apiData: any[]): TopGainersData[] {
    return apiData.map(item => {
      let changePercent = 0;
      if (typeof item.change_percentage === 'number') {
        changePercent = item.change_percentage;
      } else if (item.change_percentage) {
        const match = item.change_percentage.toString().match(/-?\d+\.?\d*/);
        changePercent = match ? parseFloat(match[0]) : 0;
      }

      return {
        batch_id: item.batch_id || 0,
        symbol: item.symbol,
        category: item.category,
        last_updated: item.last_updated || new Date().toISOString(),
        rank_position: item.rank_position,
        price: item.price || item.current_price,
        change_amount: item.change_amount,
        change_percentage: changePercent,
        volume: item.volume,
        created_at: item.created_at,
        name: item.company_name || `${item.symbol} Inc.`,
        change_percent: changePercent
      };
    });
  }

  private updateCategories(data: TopGainersData[]): void {
    const categorizedData = {
      top_gainers: data.filter(item => item.category === 'top_gainers'),
      top_losers: data.filter(item => item.category === 'top_losers'),
      most_actively_traded: data.filter(item => item.category === 'most_actively_traded')
    };

    Object.entries(categorizedData).forEach(([category, items]) => {
      this.categories.set(category, items);
    });
  }
}
