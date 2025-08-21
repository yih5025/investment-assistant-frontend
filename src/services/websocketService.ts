// services/enhancedWebSocketService.ts
// 안정화된 WebSocket 서비스 - API fallback 지원

import { MarketTimeManager } from '../utils/marketTime';

export interface CryptoData {
  market: string;
  trade_price: number;
  signed_change_rate: number;
  signed_change_price: number;
  trade_volume: number;
  acc_trade_volume_24h: number;
  change: 'RISE' | 'FALL' | 'EVEN';
  source: string;
}

export interface SP500Data {
  symbol: string;
  price: number;
  volume: number;
  timestamp_ms: number;
  category?: string;
  source: string;
}

export interface TopGainersData {
  symbol: string;
  name: string;
  price: number;
  change_amount: number;
  change_percent: number;
  volume: number;
  market_cap?: number;
  sector?: string;
  source: string;
}

export interface WebSocketMessage {
  type: string;
  data?: CryptoData[] | SP500Data[] | TopGainersData[];
  timestamp: string;
  status?: string;
  subscription_info?: any;
  market_status?: {
    is_open: boolean;
    status: string;
    current_time_et: string;
  };
}

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'reconnecting' | 'api_mode';
export type WebSocketType = 'crypto' | 'sp500' | 'topgainers';
export type DataMode = 'websocket' | 'api' | 'hybrid';

// 이벤트 타입 정의
export interface WebSocketEvents {
  'crypto_update': CryptoData[];
  'sp500_update': SP500Data[];
  'topgainers_update': TopGainersData[];
  'connection_change': { type: WebSocketType; status: ConnectionStatus; mode: DataMode };
  'error': { type: WebSocketType; error: string };
  'market_status_change': { isOpen: boolean; status: string };
}

export type EventCallback<T = any> = (data: T) => void;
export type Unsubscribe = () => void;

interface ConnectionConfig {
  maxReconnectAttempts: number;
  baseReconnectDelay: number;
  apiPollingInterval: number;
  marketClosedPollingInterval: number;
  healthCheckInterval: number;
  enableApiFallback: boolean;
  maxConcurrentConnections: number;
  connectionStabilityDelay: number;
}

class WebSocketService {
  private connections: Map<WebSocketType, WebSocket> = new Map();
  private connectionStatuses: Map<WebSocketType, ConnectionStatus> = new Map();
  private dataModes: Map<WebSocketType, DataMode> = new Map();
  private subscribers: Map<string, EventCallback[]> = new Map();
  private reconnectTimeouts: Map<WebSocketType, NodeJS.Timeout> = new Map();
  private reconnectAttempts: Map<WebSocketType, number> = new Map();
  private apiPollingIntervals: Map<WebSocketType, NodeJS.Timeout> = new Map();
  private healthCheckInterval: NodeJS.Timeout | null = null;

  private isInitialized = false;
  private marketTimeManager = new MarketTimeManager();
  private lastDataCache: Map<WebSocketType, any[]> = new Map();

  // 🎯 설정 가능한 옵션들
  private config: ConnectionConfig = {
    maxReconnectAttempts: 3,
    baseReconnectDelay: 2000,
    apiPollingInterval: 5000,        // 5초 - 개장 시
    marketClosedPollingInterval: 30000, // 30초 - 장 마감 시
    healthCheckInterval: 10000,      // 10초
    enableApiFallback: true,
    maxConcurrentConnections: 2,     // 최대 동시 연결 수 (안정성을 위해)
    connectionStabilityDelay: 1000   // 연결 간 안정화 지연 시간
  };

  constructor(customConfig?: Partial<ConnectionConfig>) {
    if (customConfig) {
      this.config = { ...this.config, ...customConfig };
    }

    // 초기 상태 설정
    (['crypto', 'sp500', 'topgainers'] as WebSocketType[]).forEach(type => {
      this.connectionStatuses.set(type, 'disconnected');
      this.dataModes.set(type, 'websocket');
      this.reconnectAttempts.set(type, 0);
      this.lastDataCache.set(type, []);
    });

    console.log('🚀 Enhanced WebSocket Service 초기화', this.config);
  }

  // ============================================================================
  // 초기화 및 종료
  // ============================================================================

  public initialize(): void {
    if (this.isInitialized) {
      console.log('⚠️ WebSocket 서비스가 이미 초기화되었습니다.');
      return;
    }

    console.log('🚀 Enhanced WebSocket 서비스 초기화 시작...');
    
    // 시장 상태 체크 시작
    this.startMarketStatusMonitoring();
    
    // 헬스 체크 시작
    this.startHealthCheck();
    
    // 초기 연결 모드 결정
    this.initializeConnectionModes();

    this.isInitialized = true;
    console.log('✅ Enhanced WebSocket 서비스 초기화 완료');
  }

  private async initializeConnectionModes(): Promise<void> {
    const marketStatus = this.marketTimeManager.getCurrentMarketStatus();
    
    // 🎯 연결 안정화를 위한 우선순위 기반 순차 연결
    const connectionPriority: WebSocketType[] = marketStatus.isOpen 
      ? ['crypto', 'topgainers'] // 개장 시: 암호화폐 + Top Gainers 우선
      : ['crypto']; // 장 마감 시: 암호화폐만 WebSocket, 나머지는 API

    let connectedCount = 0;
    
    for (const type of connectionPriority) {
      if (connectedCount >= this.config.maxConcurrentConnections) {
        // 최대 연결 수 초과 시 API 모드로 전환
        this.switchToApiMode(type);
      } else {
        if (type === 'crypto') {
          // 암호화폐는 24시간 거래이므로 항상 WebSocket 시도
          await this.connectWebSocketWithDelay(type);
          connectedCount++;
        } else if (marketStatus.isOpen) {
          // 주식은 시장 상태에 따라 결정
          await this.connectWebSocketWithDelay(type);
          connectedCount++;
        } else {
          // 장 마감 시 API 모드로 시작
          this.switchToApiMode(type);
        }
      }
    }

    // 나머지 타입들은 API 모드로 처리
    const remainingTypes = (['crypto', 'sp500', 'topgainers'] as WebSocketType[])
      .filter(type => !connectionPriority.includes(type));
    
    for (const type of remainingTypes) {
      this.switchToApiMode(type);
    }
  }

  private async connectWebSocketWithDelay(type: WebSocketType): Promise<void> {
    // 연결 안정화를 위한 지연
    if (this.connections.size > 0) {
      await new Promise(resolve => setTimeout(resolve, this.config.connectionStabilityDelay));
    }
    this.connectWebSocket(type);
  }

  public shutdown(): void {
    console.log('🛑 Enhanced WebSocket 서비스 종료 시작...');

    // 모든 연결 종료
    this.connections.forEach((ws, type) => {
      this.disconnectWebSocket(type);
    });

    // 모든 타이머 정리
    this.reconnectTimeouts.forEach(timeout => clearTimeout(timeout));
    this.reconnectTimeouts.clear();

    this.apiPollingIntervals.forEach(interval => clearInterval(interval));
    this.apiPollingIntervals.clear();

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    // 구독자 정리
    this.subscribers.clear();

    this.isInitialized = false;
    console.log('✅ Enhanced WebSocket 서비스 종료 완료');
  }

  // ============================================================================
  // 🎯 시장 상태 모니터링
  // ============================================================================

  private startMarketStatusMonitoring(): void {
    // 초기 상태 설정
    const initialStatus = this.marketTimeManager.getCurrentMarketStatus();
    this.emitEvent('market_status_change', {
      isOpen: initialStatus.isOpen,
      status: initialStatus.status
    });

    // 1분마다 시장 상태 체크
    setInterval(() => {
      const currentStatus = this.marketTimeManager.getCurrentMarketStatus();
      const previousStatus = this.lastMarketStatus;

      if (!previousStatus || previousStatus.isOpen !== currentStatus.isOpen) {
        console.log(`🕐 시장 상태 변경: ${currentStatus.status} (${currentStatus.currentTime})`);
        
        this.lastMarketStatus = currentStatus;
        this.emitEvent('market_status_change', {
          isOpen: currentStatus.isOpen,
          status: currentStatus.status
        });

        // 시장 상태 변경에 따른 연결 모드 조정
        this.adjustConnectionModeForMarketStatus(currentStatus.isOpen);
      }
    }, 60000); // 1분마다
  }

  private lastMarketStatus: any = null;

  private adjustConnectionModeForMarketStatus(isMarketOpen: boolean): void {
    (['sp500', 'topgainers'] as WebSocketType[]).forEach(type => {
      if (isMarketOpen) {
        // 장 개장 시: WebSocket 모드로 전환
        if (this.dataModes.get(type) === 'api') {
          console.log(`🔄 ${type} 장 개장 - WebSocket 모드로 전환`);
          this.switchToWebSocketMode(type);
        }
      } else {
        // 장 마감 시: API 모드로 전환 (최신 가격 유지)
        if (this.dataModes.get(type) === 'websocket') {
          console.log(`🕐 ${type} 장 마감 - API 모드로 전환`);
          this.switchToApiMode(type);
        }
      }
    });
  }

  // ============================================================================
  // 🎯 연결 모드 관리 (WebSocket ↔ API)
  // ============================================================================

  private switchToWebSocketMode(type: WebSocketType): void {
    // API 폴링 중단
    this.stopApiPolling(type);
    
    // WebSocket 연결 시도
    this.dataModes.set(type, 'websocket');
    this.connectWebSocket(type);
  }

  private switchToApiMode(type: WebSocketType): void {
    // WebSocket 연결 중단
    this.disconnectWebSocket(type);
    
    // API 폴링 시작
    this.dataModes.set(type, 'api');
    this.setConnectionStatus(type, 'api_mode');
    this.startApiPolling(type);
  }

  private startApiPolling(type: WebSocketType): void {
    // 기존 폴링 중단
    this.stopApiPolling(type);

    const marketStatus = this.marketTimeManager.getCurrentMarketStatus();
    const interval = marketStatus.isOpen 
      ? this.config.apiPollingInterval 
      : this.config.marketClosedPollingInterval;

    console.log(`🔄 ${type} API 폴링 시작 (${interval}ms 간격)`);

    const pollData = async () => {
      try {
        await this.fetchDataFromApi(type);
      } catch (error) {
        console.error(`❌ ${type} API 폴링 오류:`, error);
      }
    };

    // 즉시 한번 실행
    pollData();

    // 주기적 폴링 시작
    const intervalId = setInterval(pollData, interval);
    this.apiPollingIntervals.set(type, intervalId);
  }

  private stopApiPolling(type: WebSocketType): void {
    const intervalId = this.apiPollingIntervals.get(type);
    if (intervalId) {
      clearInterval(intervalId);
      this.apiPollingIntervals.delete(type);
      console.log(`⏹️ ${type} API 폴링 중단`);
    }
  }

  private async fetchDataFromApi(type: WebSocketType): Promise<void> {
    try {
      const apiUrl = this.getApiUrl(type);
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.items && Array.isArray(result.items)) {
        const data = this.transformApiDataToWebSocketFormat(type, result.items);
        
        // 데이터 변경 체크 (불필요한 업데이트 방지)
        if (this.hasDataChanged(type, data)) {
          this.lastDataCache.set(type, data);
          
          // 이벤트 발송
          switch (type) {
            case 'crypto':
              this.emitEvent('crypto_update', data as CryptoData[]);
              break;
            case 'sp500':
              this.emitEvent('sp500_update', data as SP500Data[]);
              break;
            case 'topgainers':
              this.emitEvent('topgainers_update', data as TopGainersData[]);
              break;
          }

          console.log(`📊 ${type} API 데이터 업데이트: ${data.length}개 항목`);
        }
      } else {
        console.warn(`⚠️ ${type} API 응답에서 유효하지 않은 데이터:`, result);
      }

    } catch (error) {
      console.error(`❌ ${type} API 호출 실패:`, error);
      this.emitEvent('error', { type, error: error instanceof Error ? error.message : String(error) });
    }
  }

  private getApiUrl(type: WebSocketType): string {
    const BASE_URL = 'https://api.investment-assistant.site/api/v1';  // HTTPS 고정
    
    let endpoint: string;
    let queryParams: string;
    
    switch (type) {
      case 'crypto':
        endpoint = '/crypto';
        queryParams = 'limit=20';
        break;
      case 'sp500':
        endpoint = '/stocks/sp500';
        queryParams = 'limit=15';
        break;
      case 'topgainers':
        endpoint = '/stocks/topgainers';
        queryParams = 'limit=10';
        break;
      default:
        throw new Error(`Unknown API type: ${type}`);
    }
    
    // 🎯 trailing slash 추가로 리다이렉트 방지 (news API와 동일한 로직)
    const baseUrlWithSlash = `${BASE_URL}${endpoint}${endpoint.endsWith('/') ? '' : '/'}`;
    const finalUrl = `${baseUrlWithSlash}?${queryParams}`;
    
    console.log(`🚀 ${type} API 요청: ${finalUrl}`);
    
    return finalUrl;
  }

  private transformApiDataToWebSocketFormat(type: WebSocketType, apiData: any[]): any[] {
    // API 응답을 WebSocket 메시지 형태로 변환
    switch (type) {
      case 'crypto':
        return apiData.map(item => ({
          market: item.market || item.symbol,
          trade_price: item.trade_price || item.price,
          signed_change_rate: item.signed_change_rate || item.change_rate,
          signed_change_price: item.signed_change_price || item.change_amount,
          trade_volume: item.trade_volume || item.volume,
          acc_trade_volume_24h: item.acc_trade_volume_24h || 0,
          change: item.change || 'EVEN',
          source: 'api_fallback'
        }));

      case 'sp500':
        return apiData.map(item => ({
          symbol: item.symbol,
          price: item.price,
          volume: item.volume || 0,
          timestamp_ms: item.timestamp_ms || Date.now(),
          category: item.category,
          source: 'api_fallback'
        }));

      case 'topgainers':
        return apiData.map(item => ({
          symbol: item.symbol,
          name: item.name || item.symbol,
          price: item.price,
          change_amount: item.change_amount,
          change_percent: item.change_percent || item.change_percentage,
          volume: item.volume || 0,
          market_cap: item.market_cap,
          sector: item.sector,
          source: 'api_fallback'
        }));

      default:
        return apiData;
    }
  }

  private hasDataChanged(type: WebSocketType, newData: any[]): boolean {
    const cachedData = this.lastDataCache.get(type) || [];
    
    // 간단한 데이터 변경 체크 (길이와 첫 번째 항목 비교)
    if (cachedData.length !== newData.length) {
      return true;
    }

    if (newData.length === 0) {
      return false;
    }

    // 첫 번째 항목의 가격 비교
    const oldFirst = cachedData[0];
    const newFirst = newData[0];

    if (!oldFirst || !newFirst) {
      return true;
    }

    const oldPrice = oldFirst.price || oldFirst.trade_price;
    const newPrice = newFirst.price || newFirst.trade_price;

    return oldPrice !== newPrice;
  }

  // ============================================================================
  // WebSocket URL 생성
  // ============================================================================
  
  private buildWebSocketUrl(type: WebSocketType): string {
    const BASE_API_URL = 'https://api.investment-assistant.site/api/v1';
    const wsUrl = `wss://api.investment-assistant.site/api/v1/ws/${this.getWebSocketPath(type)}`;
    
    console.log(`🔗 ${type} WebSocket URL: ${wsUrl}`);
    return wsUrl;
  }

  private getWebSocketPath(type: WebSocketType): string {
    switch (type) {
      case 'crypto':
        return 'crypto';
      case 'sp500':
        return 'stocks/sp500';
      case 'topgainers':
        return 'stocks/topgainers';
      default:
        throw new Error(`Unknown WebSocket type: ${type}`);
    }
  }

  // ============================================================================
  // WebSocket 연결 관리
  // ============================================================================

  private connectWebSocket(type: WebSocketType): void {
    // 기존 연결이 있으면 정리
    this.disconnectWebSocket(type);

    const url = this.buildWebSocketUrl(type);
    console.log(`🔄 ${type} WebSocket 연결 시도: ${url}`);

    try {
      this.setConnectionStatus(type, 'connecting');

      const ws = new WebSocket(url);
      this.connections.set(type, ws);

      ws.onopen = () => {
        console.log(`🟢 ${type} WebSocket 연결 성공`);
        this.setConnectionStatus(type, 'connected');
        this.reconnectAttempts.set(type, 0); // 재연결 카운터 리셋
      };

      ws.onmessage = (event) => {
        this.handleMessage(type, event);
      };

      ws.onclose = (event) => {
        console.log(`🔴 ${type} WebSocket 연결 종료:`, event.code, event.reason);
        this.handleConnectionClose(type);
      };

      ws.onerror = (error) => {
        console.error(`❌ ${type} WebSocket 오류:`, error);
        this.emitEvent('error', { type, error: 'WebSocket connection error' });
        this.handleConnectionClose(type);
      };

    } catch (error) {
      console.error(`❌ ${type} WebSocket 연결 실패:`, error);
      this.setConnectionStatus(type, 'disconnected');
      this.handleConnectionFailure(type);
    }
  }

  private disconnectWebSocket(type: WebSocketType): void {
    const ws = this.connections.get(type);
    if (ws) {
      ws.close();
      this.connections.delete(type);
    }

    const timeout = this.reconnectTimeouts.get(type);
    if (timeout) {
      clearTimeout(timeout);
      this.reconnectTimeouts.delete(type);
    }

    this.setConnectionStatus(type, 'disconnected');
  }

  private handleConnectionClose(type: WebSocketType): void {
    this.connections.delete(type);
    this.setConnectionStatus(type, 'disconnected');
    
    // WebSocket 모드에서만 재연결 시도
    if (this.dataModes.get(type) === 'websocket') {
      this.scheduleReconnect(type);
    }
  }

  private handleConnectionFailure(type: WebSocketType): void {
    // WebSocket 연결 실패 시 API 모드로 전환 (fallback 활성화된 경우)
    if (this.config.enableApiFallback && this.dataModes.get(type) === 'websocket') {
      console.log(`🔄 ${type} WebSocket 실패 - API 모드로 fallback`);
      this.switchToApiMode(type);
    } else {
      this.scheduleReconnect(type);
    }
  }

  private scheduleReconnect(type: WebSocketType): void {
    const attempts = this.reconnectAttempts.get(type) || 0;
    
    if (attempts >= this.config.maxReconnectAttempts) {
      console.error(`❌ ${type} WebSocket 최대 재연결 시도 횟수 초과`);
      
      // API fallback이 활성화된 경우 API 모드로 전환
      if (this.config.enableApiFallback) {
        console.log(`🔄 ${type} 최대 재시도 후 API 모드로 전환`);
        this.switchToApiMode(type);
      }
      return;
    }

    const delay = this.config.baseReconnectDelay * Math.pow(2, attempts); // 지수 백오프
    console.log(`⏰ ${type} WebSocket ${delay}ms 후 재연결 시도 (${attempts + 1}/${this.config.maxReconnectAttempts})`);

    this.reconnectAttempts.set(type, attempts + 1);
    this.setConnectionStatus(type, 'reconnecting');

    const timeout = setTimeout(() => {
      this.connectWebSocket(type);
    }, delay);

    this.reconnectTimeouts.set(type, timeout);
  }

  // ============================================================================
  // 메시지 처리
  // ============================================================================

  private handleMessage(type: WebSocketType, event: MessageEvent): void {
    try {
      const message: WebSocketMessage = JSON.parse(event.data);
      
      console.log(`📨 ${type} 메시지 수신:`, {
        messageType: message.type,
        hasData: !!message.data,
        dataLength: Array.isArray(message.data) ? message.data.length : 0,
        timestamp: message.timestamp
      });
      
      // 하트비트 메시지는 무시
      if (message.type === 'heartbeat') {
        return;
      }

      // 상태 메시지 처리
      if (message.type === 'status' || message.status) {
        console.log(`📊 ${type} 상태:`, message);
        return;
      }

      // 데이터 업데이트 처리
      switch (message.type) {
        case 'crypto_update':
          if (type === 'crypto' && message.data) {
            this.lastDataCache.set(type, message.data);
            this.emitEvent('crypto_update', message.data as CryptoData[]);
          }
          break;
          
        case 'sp500_update':
          if (type === 'sp500' && message.data) {
            this.lastDataCache.set(type, message.data);
            this.emitEvent('sp500_update', message.data as SP500Data[]);
          }
          break;
          
        case 'topgainers_update':
          if (type === 'topgainers' && message.data) {
            this.lastDataCache.set(type, message.data);
            this.emitEvent('topgainers_update', message.data as TopGainersData[]);
          }
          break;

        default:
          console.log(`📨 ${type} 알 수 없는 메시지 타입:`, message.type);
      }

    } catch (error) {
      console.error(`❌ ${type} 메시지 파싱 오류:`, error);
    }
  }

  // ============================================================================
  // 🎯 헬스 체크 시스템
  // ============================================================================

  private startHealthCheck(): void {
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, this.config.healthCheckInterval);
  }

  private performHealthCheck(): void {
    (['crypto', 'sp500', 'topgainers'] as WebSocketType[]).forEach(type => {
      const status = this.connectionStatuses.get(type);
      const mode = this.dataModes.get(type);
      
      // WebSocket 모드에서 연결 끊어진 경우 API fallback 고려
      if (mode === 'websocket' && status === 'disconnected' && this.config.enableApiFallback) {
        const reconnectAttempts = this.reconnectAttempts.get(type) || 0;
        
        // 재연결 시도가 많아지면 API 모드로 전환
        if (reconnectAttempts >= 2) {
          console.log(`🏥 ${type} 헬스체크 - API 모드로 전환 (재연결 실패)`);
          this.switchToApiMode(type);
        }
      }
    });
  }

  // ============================================================================
  // 연결 상태 관리
  // ============================================================================

  private setConnectionStatus(type: WebSocketType, status: ConnectionStatus): void {
    const previousStatus = this.connectionStatuses.get(type);
    const currentMode = this.dataModes.get(type) || 'websocket';
    
    if (previousStatus !== status) {
      this.connectionStatuses.set(type, status);
      this.emitEvent('connection_change', { type, status, mode: currentMode });
      console.log(`🔄 ${type} 연결 상태 변경: ${previousStatus} → ${status} (${currentMode} 모드)`);
    }
  }

  public getConnectionStatus(type: WebSocketType): ConnectionStatus {
    return this.connectionStatuses.get(type) || 'disconnected';
  }

  public getDataMode(type: WebSocketType): DataMode {
    return this.dataModes.get(type) || 'websocket';
  }

  public getAllConnectionStatuses(): Record<WebSocketType, { status: ConnectionStatus; mode: DataMode }> {
    return {
      crypto: { 
        status: this.getConnectionStatus('crypto'), 
        mode: this.getDataMode('crypto') 
      },
      sp500: { 
        status: this.getConnectionStatus('sp500'), 
        mode: this.getDataMode('sp500') 
      },
      topgainers: { 
        status: this.getConnectionStatus('topgainers'), 
        mode: this.getDataMode('topgainers') 
      },
    };
  }

  // ============================================================================
  // 이벤트 구독/해제
  // ============================================================================

  public subscribe<K extends keyof WebSocketEvents>(
    event: K,
    callback: EventCallback<WebSocketEvents[K]>
  ): Unsubscribe {
    if (!this.subscribers.has(event)) {
      this.subscribers.set(event, []);
    }

    const callbacks = this.subscribers.get(event)!;
    callbacks.push(callback);

    // 구독 해제 함수 반환
    return () => {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    };
  }

  private emitEvent<K extends keyof WebSocketEvents>(
    event: K,
    data: WebSocketEvents[K]
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

  // ============================================================================
  // 수동 제어 메소드
  // ============================================================================

  public reconnect(type: WebSocketType): void {
    console.log(`🔄 ${type} 수동 재연결 시도`);
    this.reconnectAttempts.set(type, 0); // 재시도 카운터 리셋
    
    if (this.dataModes.get(type) === 'api') {
      this.switchToWebSocketMode(type);
    } else {
      this.connectWebSocket(type);
    }
  }

  public reconnectAll(): void {
    console.log('🔄 모든 연결 재시도');
    (['crypto', 'sp500', 'topgainers'] as WebSocketType[]).forEach(type => {
      this.reconnectAttempts.set(type, 0);
      this.reconnect(type);
    });
  }

  public forceWebSocketMode(type: WebSocketType): void {
    console.log(`🔧 ${type} 강제 WebSocket 모드 전환`);
    this.switchToWebSocketMode(type);
  }

  public forceApiMode(type: WebSocketType): void {
    console.log(`🔧 ${type} 강제 API 모드 전환`);
    this.switchToApiMode(type);
  }

  // ============================================================================
  // 상태 조회
  // ============================================================================

  public getStatus() {
    const marketStatus = this.marketTimeManager.getCurrentMarketStatus();
    
    return {
      initialized: this.isInitialized,
      marketStatus: {
        isOpen: marketStatus.isOpen,
        status: marketStatus.status,
        currentTime: marketStatus.currentTime
      },
      connections: Object.fromEntries(
        Array.from(this.connections.entries()).map(([type, ws]) => [
          type,
          {
            readyState: ws.readyState,
            url: ws.url,
            status: this.getConnectionStatus(type),
            mode: this.getDataMode(type)
          }
        ])
      ),
      connectionStatuses: Object.fromEntries(this.connectionStatuses),
      dataModes: Object.fromEntries(this.dataModes),
      reconnectAttempts: Object.fromEntries(this.reconnectAttempts),
      subscriberCounts: Object.fromEntries(
        Array.from(this.subscribers.entries()).map(([event, callbacks]) => [
          event,
          callbacks.length
        ])
      ),
      config: this.config
    };
  }
}

// 싱글톤 인스턴스 생성 및 export
export const webSocketService = new WebSocketService({
  enableApiFallback: true,
  maxReconnectAttempts: 3,
  apiPollingInterval: 5000,
  marketClosedPollingInterval: 30000
});

// 기본 export도 제공
export default webSocketService;