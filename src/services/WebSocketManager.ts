// services/WebSocketManager.ts
// 모든 서비스를 관리하는 통합 매니저

import { CryptoService } from './CryptoService';
import { SP500Service } from './SP500Service';
import { TopGainersService } from './TopGainersService';
import { ETFService } from './ETFService';
import { MarketTimeManager } from '../utils/marketTime';
import { 
  ConnectionStatus, 
  WebSocketType, 
  DataMode, 
  ServiceConfig,
  EventCallback,
  Unsubscribe,
  ServiceEvents,
  CryptoData,
  SP500Data,
  TopGainersData,
  TopGainersCategoryStats,
  ETFData
} from './types';

// Re-export types for external use
export type {
  ConnectionStatus,
  WebSocketType,
  DataMode,
  ServiceConfig,
  EventCallback,
  Unsubscribe,
  ServiceEvents,
  CryptoData,
  SP500Data,
  TopGainersData,
  TopGainersCategoryStats,
  ETFData
} from './types';

export class WebSocketManager {
  private cryptoService: CryptoService;
  private sp500Service: SP500Service;
  private topGainersService: TopGainersService;
  private etfService: ETFService;
  private marketTimeManager = new MarketTimeManager();
  
  private isInitialized = false;
  private isShutdown = false;
  private subscribers: Map<string, EventCallback[]> = new Map();
  private backgroundLoadingState = {
    isActive: false,
    completed: 0,
    total: 0,
    services: [] as WebSocketType[]
  };

  constructor(customConfig?: Partial<ServiceConfig>) {
    const optimizedConfig = {
      ...customConfig,
      apiPollingInterval: 60000, // 1분
      marketClosedPollingInterval: 600000, // 10분
      weekendPollingInterval: 1800000, // 30분
      cacheMaxAge: 180000, // 3분
      priorityPollingOffsets: {
        sp500: 0,
        topgainers: 5000, // 5초 시차
        etf: 0
      },
      backgroundLoadingDelays: {
        crypto: 0,
        topgainers: 500,
        earnings_calendar: 1000,
        earnings_news: 1500,
        sp500: 3000,
        etf: 1500 // 1.5초로 통일
      }
    };

    this.cryptoService = new CryptoService(optimizedConfig);
    this.sp500Service = new SP500Service(optimizedConfig);
    this.topGainersService = new TopGainersService(optimizedConfig);
    this.etfService = new ETFService(optimizedConfig);

    this.setupEventForwarding();
    console.log('🚀 WebSocketManager 초기화: 최적화된 폴링 간격 및 백그라운드 로딩');
  }

  // ============================================================================
  // 초기화 및 종료
  // ============================================================================

  public initialize(): void {
    if (this.isInitialized) {
      console.log('✅ WebSocketManager 이미 초기화됨 - 기존 연결 유지');
      return;
    }

    if (this.isShutdown) {
      console.log('⚠️ WebSocketManager가 종료된 상태입니다. 재시작이 필요합니다.');
      return;
    }

    console.log('🚀 WebSocketManager 초기화 시작 (분리된 서비스)');
    
    this.startMarketStatusMonitoring();
    this.initializeServices();

    this.isInitialized = true;
    console.log('✅ WebSocketManager 초기화 완료 - 모든 서비스 실행 중');
  }

  public shutdown(): void {
    if (this.isShutdown) {
      console.log('⚠️ WebSocketManager 이미 종료된 상태입니다.');
      return;
    }

    console.log('🛑 WebSocketManager 종료 시작');
    this.isShutdown = true;

    // 모든 서비스 종료
    this.cryptoService.shutdown();
    this.sp500Service.shutdown();
    this.topGainersService.shutdown();
    this.etfService.shutdown();

    // 이벤트 구독자 정리
    this.subscribers.clear();

    this.isInitialized = false;
    console.log('✅ WebSocketManager 종료 완료');
  }

  private async initializeServices(): Promise<void> {
    console.log('🔄 최적화된 서비스 초기화 시작');
    
    // 백그라운드 로딩 상태 초기화
    this.backgroundLoadingState = {
      isActive: true,
      completed: 0,
      total: 4, // crypto, topgainers, sp500, etf
      services: ['crypto', 'topgainers', 'sp500', 'etf']
    };
    
    this.emitEvent('background_loading_start', { 
      services: this.backgroundLoadingState.services 
    });
    
    // 우선순위 기반 순차 초기화
    const config = this.cryptoService['config'] || {};
    const delays = config.backgroundLoadingDelays || {
      crypto: 0,
      topgainers: 500,
      sp500: 1000,
      etf: 1500 // 6초에서 1.5초로 단축
    };
    
    // 1. Crypto (즉시 시작 - WebSocket)
    console.log('🚀 1순위: Crypto WebSocket 연결 시작');
    const cryptoStart = Date.now();
    this.cryptoService.initialize();
    this.completeBackgroundLoading('crypto', Date.now() - cryptoStart);
    
    // 2. TopGainers (홈페이지 메인 데이터)
    setTimeout(async () => {
      console.log('🚀 2순위: TopGainers 데이터 로딩 시작');
      const topGainersStart = Date.now();
      this.topGainersService.initialize();
      this.completeBackgroundLoading('topgainers', Date.now() - topGainersStart);
    }, delays.topgainers);
    
    // 3. SP500 (백그라운드 로딩)
    setTimeout(async () => {
      console.log('🚀 3순위: SP500 백그라운드 로딩 시작');
      const sp500Start = Date.now();
      this.sp500Service.initialize();
      this.completeBackgroundLoading('sp500', Date.now() - sp500Start);
    }, delays.sp500);
    
    // 4. ETF (백그라운드 로딩)
    setTimeout(async () => {
      console.log('🚀 4순위: ETF 백그라운드 로딩 시작');
      const etfStart = Date.now();
      this.etfService.initialize();
      this.completeBackgroundLoading('etf', Date.now() - etfStart);
    }, delays.etf);
    
    console.log('✅ 백그라운드 로딩 스케줄 완료 - 순차적 초기화 진행 중');
  }
  
  private completeBackgroundLoading(service: WebSocketType, duration: number): void {
    this.backgroundLoadingState.completed++;
    
    this.emitEvent('background_loading_complete', { service, duration });
    this.emitEvent('background_loading_progress', {
      completed: this.backgroundLoadingState.completed,
      total: this.backgroundLoadingState.total
    });
    
    console.log(`✅ ${service} 백그라운드 로딩 완료 (${duration}ms) - ${this.backgroundLoadingState.completed}/${this.backgroundLoadingState.total}`);
    
    if (this.backgroundLoadingState.completed >= this.backgroundLoadingState.total) {
      this.backgroundLoadingState.isActive = false;
      console.log('🎉 모든 백그라운드 로딩 완료!');
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ============================================================================
  // 시장 상태 모니터링
  // ============================================================================

  private startMarketStatusMonitoring(): void {
    const initialStatus = this.marketTimeManager.getCurrentMarketStatus();
    this.emitEvent('market_status_change', {
      isOpen: initialStatus.isOpen,
      status: initialStatus.status
    });

    setInterval(() => {
      const currentStatus = this.marketTimeManager.getCurrentMarketStatus();
      const previousStatus = this.lastMarketStatus;

      if (!previousStatus || previousStatus.isOpen !== currentStatus.isOpen) {
        console.log(`🕐 시장 상태 변경: ${currentStatus.status}`);
        
        this.lastMarketStatus = currentStatus;
        this.emitEvent('market_status_change', {
          isOpen: currentStatus.isOpen,
          status: currentStatus.status
        });
      }
    }, 60000);
  }

  private lastMarketStatus: any = null;

  // ============================================================================
  // 이벤트 포워딩 설정
  // ============================================================================

  private setupEventForwarding(): void {
    // CryptoService 이벤트 포워딩
    this.cryptoService.subscribe('crypto_update', (data: CryptoData[]) => {
      this.emitEvent('crypto_update', data);
    });
    
    this.cryptoService.subscribe('connection_change', (data) => {
      this.emitEvent('connection_change', { type: 'crypto', status: data.status, mode: data.mode });
    });
    
    this.cryptoService.subscribe('error', (data) => {
      this.emitEvent('error', { type: 'crypto', error: data.error });
    });

    // SP500Service 이벤트 포워딩
    this.sp500Service.subscribe('sp500_update', (data: SP500Data[]) => {
      this.emitEvent('sp500_update', data);
    });
    
    this.sp500Service.subscribe('connection_change', (data) => {
      this.emitEvent('connection_change', { type: 'sp500', status: data.status, mode: data.mode });
    });
    
    this.sp500Service.subscribe('error', (data) => {
      this.emitEvent('error', { type: 'sp500', error: data.error });
    });

    // TopGainersService 이벤트 포워딩
    this.topGainersService.subscribe('topgainers_update', (data: TopGainersData[]) => {
      this.emitEvent('topgainers_update', data);
    });
    
    this.topGainersService.subscribe('topgainers_category_stats', (data: TopGainersCategoryStats) => {
      this.emitEvent('topgainers_category_stats', data);
    });
    
    this.topGainersService.subscribe('connection_change', (data) => {
      this.emitEvent('connection_change', { type: 'topgainers', status: data.status, mode: data.mode });
    });
    
    this.topGainersService.subscribe('error', (data) => {
      this.emitEvent('error', { type: 'topgainers', error: data.error });
    });

    // ETFService 이벤트 포워딩
    this.etfService.subscribe('etf_update', (data: ETFData[]) => {
      this.emitEvent('etf_update', data);
    });
    
    this.etfService.subscribe('connection_change', (data) => {
      this.emitEvent('connection_change', { type: 'etf', status: data.status, mode: data.mode });
    });
    
    this.etfService.subscribe('error', (data) => {
      this.emitEvent('error', { type: 'etf', error: data.error });
    });
  }

  // ============================================================================
  // 공개 API 메서드들
  // ============================================================================

  // 연결 상태 조회
  public getConnectionStatus(type: WebSocketType): ConnectionStatus {
    switch (type) {
      case 'crypto':
        return this.cryptoService.getConnectionStatus();
      case 'sp500':
        return this.sp500Service.getConnectionStatus();
      case 'topgainers':
        return this.topGainersService.getConnectionStatus();
      case 'etf':
        return this.etfService.getConnectionStatus();
      default:
        return 'disconnected';
    }
  }

  public getDataMode(type: WebSocketType): DataMode {
    switch (type) {
      case 'crypto':
        return 'websocket';
      case 'sp500':
      case 'topgainers':
      case 'etf':
        return 'api';
      default:
        return 'websocket';
    }
  }

  public getAllConnectionStatuses(): Record<WebSocketType, { status: ConnectionStatus; mode: DataMode }> {
    return {
      crypto: { 
        status: this.cryptoService.getConnectionStatus(), 
        mode: 'websocket' 
      },
      sp500: { 
        status: this.sp500Service.getConnectionStatus(), 
        mode: 'api' 
      },
      topgainers: { 
        status: this.topGainersService.getConnectionStatus(), 
        mode: 'api' 
      },
      etf: { 
        status: this.etfService.getConnectionStatus(), 
        mode: 'api' 
      }
    };
  }

  // 재연결
  public reconnect(type: WebSocketType): void {
    console.log(`🔄 ${type} 수동 재연결 시도`);
    
    switch (type) {
      case 'crypto':
        this.cryptoService.reconnect();
        break;
      case 'sp500':
        this.sp500Service.reconnect();
        break;
      case 'topgainers':
        this.topGainersService.reconnect();
        break;
      case 'etf':
        this.etfService.reconnect();
        break;
    }
  }

  public reconnectAll(): void {
    console.log('🔄 전체 연결 상태 점검 및 복구');
    
    const statuses = this.getAllConnectionStatuses();
    
    Object.entries(statuses).forEach(([type, statusInfo]) => {
      const wsType = type as WebSocketType;
      
      if (statusInfo.status === 'disconnected') {
        console.log(`🔄 ${type} 재연결 필요`);
        this.reconnect(wsType);
      } else {
        console.log(`✅ ${type} 정상 동작 중 (${statusInfo.status})`);
      }
    });
  }

  // 데이터 새로고침 (우선순위 기반)
  public refreshData(): void {
    console.log('🔄 우선순위 기반 데이터 새로고침 시작');
    
    // 1순위: TopGainers (홈페이지 메인 데이터)
    this.topGainersService.refreshData();
    
    // 2순위: SP500 (시차를 두어 서버 부하 분산)
    setTimeout(() => {
      this.sp500Service.refreshData();
    }, 2000);
    
    // 3순위: ETF
    setTimeout(() => {
      this.etfService.refreshData();
    }, 2500);
    
    // WebSocket 서비스는 연결 상태만 확인
    const cryptoStatus = this.cryptoService.getConnectionStatus();
    if (cryptoStatus === 'connected') {
      console.log('✅ crypto WebSocket 연결 유지 - 실시간 데이터 수신 중');
    } else if (cryptoStatus === 'disconnected') {
      console.log('🔄 crypto WebSocket 재연결 시도');
      this.cryptoService.reconnect();
    }
    
    console.log('✅ 우선순위 기반 새로고침 스케줄 완료');
  }

  // SP500 전용 메서드들
  public async loadMoreSP500Data(): Promise<boolean> {
    return await this.sp500Service.loadMoreData();
  }

  public getSP500PaginationState() {
    return this.sp500Service.getPaginationState();
  }

  // ETF 전용 메서드들
  public async loadMoreETFData(): Promise<boolean> {
    return await this.etfService.loadMoreData();
  }

  public getETFPaginationState() {
    return this.etfService.getPaginationState();
  }

  // ETF 서비스 즉시 초기화 (탭 클릭 시 사용)
  public ensureETFInitialized(): void {
    if (!this.etfService['isInitialized']) {
      console.log('🚀 ETF 탭 클릭 - 즉시 초기화 시작');
      this.etfService.initialize();
    }
  }

  // TopGainers 전용 메서드들
  public getTopGainersByCategory(category: 'top_gainers' | 'top_losers' | 'most_actively_traded'): TopGainersData[] {
    return this.topGainersService.getDataByCategory(category);
  }

  public getAllTopGainersCategories(): Record<string, TopGainersData[]> {
    return this.topGainersService.getAllCategories();
  }

  public getTopGainersCategoryStats(): TopGainersCategoryStats | null {
    return this.topGainersService.getCategoryStats();
  }

  // 캐시된 데이터 조회
  public getLastCachedData(type: WebSocketType): any[] | null {
    switch (type) {
      case 'crypto':
        return this.cryptoService.getLastCachedData();
      case 'sp500':
        return this.sp500Service.getLastCachedData();
      case 'topgainers':
        return this.topGainersService.getLastCachedData();
      case 'etf':
        return this.etfService.getLastCachedData();
      default:
        return null;
    }
  }

  // 상태 조회
  public getStatus() {
    const marketStatus = this.marketTimeManager.getCurrentMarketStatus();
    
    return {
      initialized: this.isInitialized,
      shutdown: this.isShutdown,
      backgroundLoading: {
        isActive: this.backgroundLoadingState.isActive,
        completed: this.backgroundLoadingState.completed,
        total: this.backgroundLoadingState.total,
        progress: this.backgroundLoadingState.total > 0 
          ? (this.backgroundLoadingState.completed / this.backgroundLoadingState.total) * 100 
          : 0
      },
      marketStatus: {
        isOpen: marketStatus.isOpen,
        status: marketStatus.status,
        currentTime: marketStatus.currentTime
      },
      services: {
        crypto: this.cryptoService.getStatus(),
        sp500: this.sp500Service.getStatus(),
        topgainers: this.topGainersService.getStatus(),
        etf: this.etfService.getStatus()
      },
      connectionStatuses: this.getAllConnectionStatuses(),
      subscriberCounts: Object.fromEntries(
        Array.from(this.subscribers.entries()).map(([event, callbacks]) => [
          event,
          callbacks.length
        ])
      )
    };
  }
  
  // 백그라운드 로딩 상태 조회
  public getBackgroundLoadingStatus() {
    return {
      isActive: this.backgroundLoadingState.isActive,
      completed: this.backgroundLoadingState.completed,
      total: this.backgroundLoadingState.total,
      progress: this.backgroundLoadingState.total > 0 
        ? (this.backgroundLoadingState.completed / this.backgroundLoadingState.total) * 100 
        : 0,
      services: this.backgroundLoadingState.services
    };
  }

  // ============================================================================
  // 이벤트 구독/해제
  // ============================================================================

  public subscribe<K extends keyof ServiceEvents>(
    event: K,
    callback: EventCallback<ServiceEvents[K]>
  ): Unsubscribe {
    if (!this.subscribers.has(event)) {
      this.subscribers.set(event, []);
    }

    const callbacks = this.subscribers.get(event)!;
    callbacks.push(callback);

    return () => {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    };
  }

  private emitEvent<K extends keyof ServiceEvents>(
    event: K,
    data: ServiceEvents[K]
  ): void {
    const callbacks = this.subscribers.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`❌ 이벤트 콜백 오류 (${event}):`, error);
        }
      });
    }
  }
}

// ============================================================================
// 싱글톤 인스턴스 생성
// ============================================================================

export const webSocketManager = new WebSocketManager({
  maxReconnectAttempts: 3,
  baseReconnectDelay: 5000,
  apiPollingInterval: 60000, // 1분 간격
  marketClosedPollingInterval: 600000, // 10분 간격
  weekendPollingInterval: 1800000, // 30분 간격
  healthCheckInterval: 60000,
  cacheMaxAge: 180000, // 3분 캐시
  errorBackoffInterval: 60000,
  maxConsecutiveErrors: 3,
  priorityPollingOffsets: {
    sp500: 0,        // 55초 간격 (기본 60초 - 5초)
    topgainers: 5000, // 65초 간격 (기본 60초 + 5초)
    etf: 0           // 60초 간격
  },
  backgroundLoadingDelays: {
    crypto: 0,           // 즉시 시작
    topgainers: 500,     // 0.5초 후 (홈페이지 필수)
    earnings_calendar: 1000,  // 1초 후 (홈페이지 필수)
    earnings_news: 1500,      // 1.5초 후 (홈페이지 필수)
    sp500: 3000,             // 3초 후 (백그라운드)
    etf: 1500                // 1.5초로 통일 (백그라운드)
  }
});

export default webSocketManager;
