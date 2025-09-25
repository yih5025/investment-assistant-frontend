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

  constructor(customConfig?: Partial<ServiceConfig>) {
    this.cryptoService = new CryptoService(customConfig);
    this.sp500Service = new SP500Service(customConfig);
    this.topGainersService = new TopGainersService(customConfig);
    this.etfService = new ETFService(customConfig);

    this.setupEventForwarding();
    console.log('🚀 WebSocketManager 초기화: 분리된 서비스 아키텍처 (ETF 포함)');
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
    console.log('🔄 분리된 서비스들 초기화 시작');
    
    // 암호화폐: WebSocket 연결
    this.cryptoService.initialize();
    
    // 미국 주식: HTTP 폴링 시작 (순차적으로 시작하여 부하 분산)
    await this.delay(500);
    this.sp500Service.initialize();
    
    await this.delay(300);
    this.topGainersService.initialize();
    
    await this.delay(300);
    this.etfService.initialize();
    
    console.log('✅ 모든 분리된 서비스 초기화 완료');
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

  // 데이터 새로고침
  public refreshData(): void {
    console.log('🔄 데이터 수동 새로고침 - 연결 유지');
    
    // API 서비스들 새로고침
    this.sp500Service.refreshData();
    this.topGainersService.refreshData();
    this.etfService.refreshData();
    
    // WebSocket 서비스는 연결 상태만 확인
    const cryptoStatus = this.cryptoService.getConnectionStatus();
    if (cryptoStatus === 'connected') {
      console.log('✅ crypto WebSocket 연결 유지 - 실시간 데이터 수신 중');
    } else if (cryptoStatus === 'disconnected') {
      console.log('🔄 crypto WebSocket 재연결 시도');
      this.cryptoService.reconnect();
    }
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
  apiPollingInterval: 5000,
  marketClosedPollingInterval: 15000,
  healthCheckInterval: 60000,
  cacheMaxAge: 30000,
  errorBackoffInterval: 60000,
  maxConsecutiveErrors: 3
});

export default webSocketManager;
