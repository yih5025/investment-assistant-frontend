// services/webSocketService.ts
// 최적화된 WebSocket 서비스 - 불필요한 연결 시도 제거

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
  current_price?: number;
  previous_close?: number;
  change_amount?: number;
  change_percentage?: number;
  is_positive?: boolean;
  change_color?: string;
  company_name?: string;
}

export interface TopGainersData {
  batch_id: number;
  symbol: string;
  category: 'top_gainers' | 'top_losers' | 'most_actively_traded';
  last_updated: string;
  rank_position?: number;
  price?: number;
  change_amount?: number;
  change_percentage?: string | number;
  volume?: number;
  created_at?: string;
  name?: string;
  change_percent?: number;
}

export interface TopGainersCategoryStats {
  categories: {
    top_gainers: number;
    top_losers: number;
    most_actively_traded: number;
  };
  total: number;
  batch_id: number;
  last_updated: string;
  market_status: 'OPEN' | 'CLOSED';
  data_source: 'redis' | 'database';
}

export interface WebSocketMessage {
  type: string;
  data?: CryptoData[] | SP500Data[] | TopGainersData[];
  timestamp: string;
  status?: string;
  subscription_info?: any;
  batch_id?: number;
  data_count?: number;
  categories?: string[];
  market_status?: {
    is_open: boolean;
    status: string;
    current_time_et: string;
  };
}

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'reconnecting' | 'api_mode';
export type WebSocketType = 'crypto' | 'sp500' | 'topgainers';
export type DataMode = 'websocket' | 'api';

// 이벤트 타입 정의
export interface WebSocketEvents {
  'crypto_update': CryptoData[];
  'sp500_update': SP500Data[];
  'topgainers_update': TopGainersData[];
  'topgainers_category_stats': TopGainersCategoryStats;
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
  cacheMaxAge: number;
  errorBackoffInterval: number;
  maxConsecutiveErrors: number;
}

class WebSocketService {
  private connections: Map<WebSocketType, WebSocket> = new Map();
  private connectionStatuses: Map<WebSocketType, ConnectionStatus> = new Map();
  // 🎯 타입별 고정 모드 설정 - 더 이상 동적 변경하지 않음
  private readonly FIXED_DATA_MODES: Map<WebSocketType, DataMode> = new Map([
    ['crypto', 'websocket'],      // 암호화폐: WebSocket 전용
    ['sp500', 'api'],            // SP500: HTTP 폴링 전용
    ['topgainers', 'api']        // TopGainers: HTTP 폴링 전용
  ]);
  
  private subscribers: Map<string, EventCallback[]> = new Map();
  private reconnectTimeouts: Map<WebSocketType, NodeJS.Timeout> = new Map();
  private reconnectAttempts: Map<WebSocketType, number> = new Map();
  private apiPollingIntervals: Map<WebSocketType, NodeJS.Timeout> = new Map();
  private heartbeatIntervals: Map<WebSocketType, NodeJS.Timeout> = new Map();
  private healthCheckInterval: NodeJS.Timeout | null = null;
  
  // 🚀 중복 요청 방지
  private ongoingRequests: Map<WebSocketType, Promise<void>> = new Map();

  // 🎯 앱 수준 연결 관리 - 페이지 전환과 독립적
  private isInitialized = false;
  private isShutdown = false;
  private marketTimeManager = new MarketTimeManager();
  private lastDataCache: Map<WebSocketType, any[]> = new Map();
  private dataTimestamps: Map<WebSocketType, number> = new Map();
  private consecutiveErrors: Map<WebSocketType, number> = new Map();

  private topGainersCategories: Map<string, TopGainersData[]> = new Map();
  private topGainersCategoryStats: TopGainersCategoryStats | null = null;

  private config: ConnectionConfig = {
    maxReconnectAttempts: 3,
    baseReconnectDelay: 5000,        // 2초 → 5초로 증가
    apiPollingInterval: 5000,        // 3초 → 5초로 증가  
    marketClosedPollingInterval: 15000, // 10초 → 15초로 증가
    healthCheckInterval: 60000,      // 30초 → 60초로 증가
    cacheMaxAge: 30000,
    errorBackoffInterval: 60000,     // 30초 → 60초로 증가
    maxConsecutiveErrors: 3
  };

  constructor(customConfig?: Partial<ConnectionConfig>) {
    if (customConfig) {
      this.config = { ...this.config, ...customConfig };
    }

    // 초기 상태 설정
    (['crypto', 'sp500', 'topgainers'] as WebSocketType[]).forEach(type => {
      this.connectionStatuses.set(type, 'disconnected');
      this.reconnectAttempts.set(type, 0);
      this.lastDataCache.set(type, []);
      this.consecutiveErrors.set(type, 0);
    });

    // TopGainers 카테고리 초기화
    this.topGainersCategories.set('top_gainers', []);
    this.topGainersCategories.set('top_losers', []);
    this.topGainersCategories.set('most_actively_traded', []);

    console.log('🚀 최적화된 WebSocket Service 초기화: 타입별 고정 모드 적용');
  }

  // ============================================================================
  // 초기화 및 종료
  // ============================================================================

  public initialize(): void {
    if (this.isInitialized) {
      console.log('✅ WebSocket 서비스 이미 초기화됨 - 기존 연결 유지');
      return;
    }

    if (this.isShutdown) {
      console.log('⚠️ 서비스가 종료된 상태입니다. 재시작이 필요합니다.');
      return;
    }

    console.log('🚀 WebSocket 서비스 초기화 시작 (앱 수준 연결)');
    
    this.startMarketStatusMonitoring();
    this.startHealthCheck();
    this.initializeConnections();
    this.loadTopGainersCategoryStats();

    this.isInitialized = true;
    console.log('✅ WebSocket 서비스 초기화 완료 - 백그라운드에서 지속 실행');
  }

  // 🎯 연결 초기화 - 타입별 고정 모드로 단순화
  private async initializeConnections(): Promise<void> {
    console.log('🔄 타입별 고정 모드 연결 시작');
    
    // 암호화폐: WebSocket 연결
    this.connectWebSocket('crypto');
    
    // 미국 주식: HTTP 폴링 시작
    await this.delay(500); // 연결 안정화
    this.startApiPolling('sp500');
    this.startApiPolling('topgainers');
    
    console.log('✅ 모든 연결 초기화 완료 (고정 모드)');
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async loadTopGainersCategoryStats(): Promise<void> {
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
        this.topGainersCategoryStats = stats;
        this.emitEvent('topgainers_category_stats', stats);
        console.log('📊 TopGainers 카테고리 통계 로드 완료');
      }
    } catch (error) {
      console.warn('⚠️ TopGainers 카테고리 통계 로드 실패:', error);
    }
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

        // 🎯 시장 상태에 따른 폴링 간격만 조정 (연결 변경 없음)
        this.adjustPollingIntervals(currentStatus.isOpen);
      }
    }, 60000);
  }

  private lastMarketStatus: any = null;

  // 🎯 폴링 간격만 조정 - 연결 방식 변경 없음
  private adjustPollingIntervals(isMarketOpen: boolean): void {
    (['sp500', 'topgainers'] as WebSocketType[]).forEach(type => {
      const currentInterval = this.apiPollingIntervals.get(type);
      if (currentInterval) {
        clearInterval(currentInterval);
        this.apiPollingIntervals.delete(type);
        this.startApiPolling(type); // 새로운 간격으로 재시작
        
        const interval = isMarketOpen ? this.config.apiPollingInterval : this.config.marketClosedPollingInterval;
        console.log(`🔄 ${type} 폴링 간격 조정: ${interval}ms`);
      }
    });
  }

  // ============================================================================
  // WebSocket 연결 관리 (crypto 전용)
  // ============================================================================

  private connectWebSocket(type: WebSocketType): void {
    // 🎯 crypto만 WebSocket 연결 허용
    if (type !== 'crypto') {
      console.warn(`⚠️ ${type}는 WebSocket을 지원하지 않습니다. HTTP 폴링을 사용하세요.`);
      return;
    }

    const existingWs = this.connections.get(type);
    if (existingWs && existingWs.readyState === WebSocket.OPEN) {
      console.log(`✅ ${type} 이미 연결되어 있음 - 재연결 중단`);
      return;
    }
    this.lastReconnectTime.set(type, Date.now());
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
        this.reconnectAttempts.set(type, 0);
        this.startHeartbeat(type, ws);
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

  private buildWebSocketUrl(type: WebSocketType): string {
    const wsUrl = `wss://api.investment-assistant.site/api/v1/ws/${this.getWebSocketPath(type)}`;
    return wsUrl;
  }

  private getWebSocketPath(type: WebSocketType): string {
    switch (type) {
      case 'crypto':
        return 'crypto';
      default:
        throw new Error(`WebSocket path not available for type: ${type}`);
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

    this.stopHeartbeat(type);
    this.setConnectionStatus(type, 'disconnected');
  }

  private handleConnectionClose(type: WebSocketType): void {
    this.connections.delete(type);
    this.setConnectionStatus(type, 'disconnected');
    
    // 🎯 crypto만 재연결 시도
    if (type === 'crypto') {
      this.scheduleReconnect(type);
    }
  }

  private handleConnectionFailure(type: WebSocketType): void {
    // 🎯 crypto만 재연결 시도, 다른 타입은 무시
    if (type === 'crypto') {
      this.scheduleReconnect(type);
    }
  }

  // 🎯 재연결 로직 최적화 - crypto 전용
  private scheduleReconnect(type: WebSocketType): void {
    if (type !== 'crypto') {
      return; // crypto가 아니면 재연결하지 않음
    }

    const attempts = this.reconnectAttempts.get(type) || 0;
    const currentStatus = this.connectionStatuses.get(type);

    const lastReconnectTime = this.lastReconnectTime?.get(type) || 0;
    const timeSinceLastReconnect = Date.now() - lastReconnectTime;

    if (timeSinceLastReconnect < 10000) { // 10초 내 재연결 시도 방지
      console.log(`⚠️ ${type} 너무 빠른 재연결 시도 - 10초 대기`);
      return;
    }
    // 중복 재연결 방지
    if (currentStatus === 'reconnecting' || currentStatus === 'connecting' || currentStatus === 'connected') {
      console.log(`⚠️ ${type} 이미 ${currentStatus} 상태 - 재연결 중단`);
      return;
    }
    
    if (attempts >= this.config.maxReconnectAttempts) {
      console.error(`❌ ${type} 최대 재연결 시도 횟수 초과 - 연결 포기`);
      this.setConnectionStatus(type, 'disconnected');
      return;
    }

    const delay = Math.min(this.config.baseReconnectDelay * Math.pow(2, attempts), 30000);
    console.log(`⏰ ${type} ${delay}ms 후 재연결 시도 (${attempts + 1}/${this.config.maxReconnectAttempts})`);

    this.reconnectAttempts.set(type, attempts + 1);
    this.setConnectionStatus(type, 'reconnecting');

    const timeout = setTimeout(() => {
      // 상태 재확인
      const currentStatus = this.connectionStatuses.get(type);
      if (currentStatus === 'connected') {
        console.log(`⏭️ ${type} 이미 연결됨 - 재연결 중단`);
        return;
      }
      
      if (currentStatus !== 'reconnecting') {
        console.log(`🚫 ${type} 재연결 취소 - 현재 상태: ${currentStatus}`);
        return;
      }
      
      console.log(`🔄 ${type} WebSocket 재연결 시도`);
      this.connectWebSocket(type);
    }, delay);

    this.reconnectTimeouts.set(type, timeout);
  }

  // ============================================================================
  // Heartbeat 관리 (crypto 전용)
  // ============================================================================
  private lastReconnectTime: Map<WebSocketType, number> = new Map();

  private startHeartbeat(type: WebSocketType, ws: WebSocket): void {
    this.stopHeartbeat(type);

    const heartbeatInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(JSON.stringify({ type: 'ping' }));
        } catch (error) {
          console.error(`❌ ${type} heartbeat 전송 실패:`, error);
          this.handleConnectionClose(type);
        }
      } else {
        console.log(`💔 ${type} WebSocket 연결 상태 이상`);
        this.stopHeartbeat(type);
        this.handleConnectionClose(type);
      }
    }, 60000);

    this.heartbeatIntervals.set(type, heartbeatInterval);
  }

  private stopHeartbeat(type: WebSocketType): void {
    const heartbeatInterval = this.heartbeatIntervals.get(type);
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      this.heartbeatIntervals.delete(type);
    }
  }

  // ============================================================================
  // API 폴링 관리 (sp500, topgainers 전용)
  // ============================================================================

  private startApiPolling(type: WebSocketType): void {
    // 🎯 API 폴링 타입만 허용
    if (type === 'crypto') {
      console.warn(`⚠️ ${type}는 API 폴링을 지원하지 않습니다. WebSocket을 사용하세요.`);
      return;
    }

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

    // 즉시 한 번 실행 후 주기적 폴링
    this.loadWithCachePriority(type, pollData);
    this.setConnectionStatus(type, 'api_mode');
    
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

  // 🎯 캐시 우선 로딩
  private async loadWithCachePriority(type: WebSocketType, fetchFn: () => Promise<void>): Promise<void> {
    const cachedData = this.lastDataCache.get(type);
    const cacheTimestamp = this.dataTimestamps.get(type);
    const now = Date.now();

    if (cachedData && cacheTimestamp && (now - cacheTimestamp) < this.config.cacheMaxAge) {
      console.log(`📦 ${type} 캐시 데이터 사용 (${Math.round((now - cacheTimestamp) / 1000)}초 전)`);
      
      // 즉시 캐시된 데이터 emit
      if (type === 'topgainers') {
        this.emitEvent('topgainers_update', cachedData as TopGainersData[]);
      } else if (type === 'sp500') {
        this.emitEvent('sp500_update', cachedData as SP500Data[]);
      }
      
      // 백그라운드에서 최신 데이터 가져오기
      setTimeout(() => fetchFn(), 100);
    } else {
      console.log(`🆕 ${type} 새 데이터 fetch`);
      await fetchFn();
    }
  }

  private async fetchDataFromApi(type: WebSocketType): Promise<void> {
    if (type === 'crypto') {
      console.warn(`⚠️ ${type}는 API fetch를 지원하지 않습니다.`);
      return;
    }

    // 🚀 중복 요청 방지: 이미 진행 중인 요청이 있으면 대기
    const ongoingRequest = this.ongoingRequests.get(type);
    if (ongoingRequest) {
      console.log(`⏳ ${type} 요청이 이미 진행 중입니다. 대기...`);
      await ongoingRequest;
      return;
    }

    // 새 요청 시작
    const requestPromise = this._performApiRequest(type);
    this.ongoingRequests.set(type, requestPromise);

    try {
      await requestPromise;
    } finally {
      // 요청 완료 후 정리
      this.ongoingRequests.delete(type);
    }
  }

  private async _performApiRequest(type: WebSocketType): Promise<void> {
    try {
      const apiUrl = this.getApiUrl(type);
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
          console.warn(`⚠️ ${type} CloudFlare 타임아웃 - 다음 폴링에서 재시도`);
          return;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.data && Array.isArray(result.data)) {
        let data;
        
        if (type === 'topgainers') {
          data = this.transformTopGainersApiData(result.data);
          this.updateTopGainersCategories(data);
          this.emitEvent('topgainers_update', data);
        } else {
          data = this.transformApiDataToWebSocketFormat(type, result.data);
          this.emitEvent('sp500_update', data as SP500Data[]);
        }
        
        this.lastDataCache.set(type, data);
        this.dataTimestamps.set(type, Date.now());
        this.consecutiveErrors.set(type, 0);
        
        console.log(`📊 ${type} API 데이터 업데이트: ${data.length}개`);
      }

    } catch (error) {
      const currentErrors = this.consecutiveErrors.get(type) || 0;
      this.consecutiveErrors.set(type, currentErrors + 1);
      
      console.error(`❌ ${type} API 호출 실패 (${currentErrors + 1}회):`, error);
      
      if (currentErrors >= this.config.maxConsecutiveErrors) {
        console.warn(`⚠️ ${type} 연속 에러 - 백오프 적용`);
        this.applyErrorBackoff(type);
      }
      
      this.emitEvent('error', { type, error: error instanceof Error ? error.message : String(error) });
    }
  }

  private applyErrorBackoff(type: WebSocketType): void {
    this.stopApiPolling(type);
    
    setTimeout(() => {
      console.log(`🔄 ${type} 백오프 완료 - 폴링 재시작`);
      this.consecutiveErrors.set(type, 0);
      this.startApiPolling(type);
    }, this.config.errorBackoffInterval);
  }

  private getApiUrl(type: WebSocketType): string {
    const BASE_URL = 'https://api.investment-assistant.site/api/v1';
    
    switch (type) {
      case 'sp500':
        return `${BASE_URL}/stocks/sp500/polling?limit=500`;
      case 'topgainers':
        return `${BASE_URL}/stocks/topgainers/polling?limit=50`;
      default:
        throw new Error(`API URL not available for type: ${type}`);
    }
  }

  // ============================================================================
  // 데이터 변환 및 처리
  // ============================================================================

  private transformTopGainersApiData(apiData: any[]): TopGainersData[] {
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

  private updateTopGainersCategories(data: TopGainersData[]): void {
    const categorizedData = {
      top_gainers: data.filter(item => item.category === 'top_gainers'),
      top_losers: data.filter(item => item.category === 'top_losers'),
      most_actively_traded: data.filter(item => item.category === 'most_actively_traded')
    };

    Object.entries(categorizedData).forEach(([category, items]) => {
      this.topGainersCategories.set(category, items);
    });
  }

  private transformApiDataToWebSocketFormat(type: WebSocketType, apiData: any[]): any[] {
    switch (type) {
      case 'sp500':
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
      default:
        return apiData;
    }
  }

  // ============================================================================
  // 메시지 처리
  // ============================================================================

  private handleMessage(type: WebSocketType, event: MessageEvent): void {
    try {
      const message: WebSocketMessage = JSON.parse(event.data);
      
      if (message.type === 'heartbeat') {
        return;
      }

      if (message.type === 'status' || message.status) {
        console.log(`📊 ${type} 상태:`, message);
        return;
      }

      switch (message.type) {
        case 'crypto_update':
          if (type === 'crypto' && message.data) {
            this.lastDataCache.set(type, message.data);
            this.dataTimestamps.set(type, Date.now());
            this.emitEvent('crypto_update', message.data as CryptoData[]);
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
  // 헬스 체크 최적화
  // ============================================================================

  private startHealthCheck(): void {
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, this.config.healthCheckInterval);
  }

  private performHealthCheck(): void {
    // 🎯 간소화된 헬스체크 - 실제 문제가 있는 경우만 복구
    const cryptoStatus = this.connectionStatuses.get('crypto');
    
    // crypto WebSocket이 끊어진 경우만 재연결 시도
    if (cryptoStatus === 'disconnected' && !this.reconnectTimeouts.has('crypto')) {
      console.log(`🏥 crypto 헬스체크 - 재연결 시도`);
      this.reconnect('crypto');
    }
    
    // API 폴링 서비스가 완전히 멈춘 경우만 재시작
    (['sp500', 'topgainers'] as WebSocketType[]).forEach(type => {
      const hasActivePolling = this.apiPollingIntervals.has(type);
      const status = this.connectionStatuses.get(type);
      
      if (!hasActivePolling && status !== 'api_mode') {
        console.log(`🏥 ${type} 폴링 중단됨 - 재시작`);
        this.startApiPolling(type);
      }
    });
  }

  // ============================================================================
  // 연결 상태 관리
  // ============================================================================

  private setConnectionStatus(type: WebSocketType, status: ConnectionStatus): void {
    const previousStatus = this.connectionStatuses.get(type);
    const currentMode = this.FIXED_DATA_MODES.get(type) || 'websocket';
    
    if (previousStatus !== status) {
      this.connectionStatuses.set(type, status);
      this.emitEvent('connection_change', { type, status, mode: currentMode });
      console.log(`🔄 ${type} 상태: ${previousStatus} → ${status} (${currentMode} 모드)`);
    }
  }

  public getConnectionStatus(type: WebSocketType): ConnectionStatus {
    return this.connectionStatuses.get(type) || 'disconnected';
  }

  public getDataMode(type: WebSocketType): DataMode {
    return this.FIXED_DATA_MODES.get(type) || 'websocket';
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
  // TopGainers 전용 메서드들
  // ============================================================================

  public getTopGainersByCategory(category: 'top_gainers' | 'top_losers' | 'most_actively_traded'): TopGainersData[] {
    return this.topGainersCategories.get(category) || [];
  }

  public getAllTopGainersCategories(): Record<string, TopGainersData[]> {
    return {
      top_gainers: this.getTopGainersByCategory('top_gainers'),
      top_losers: this.getTopGainersByCategory('top_losers'),
      most_actively_traded: this.getTopGainersByCategory('most_actively_traded')
    };
  }

  public getTopGainersCategoryStats(): TopGainersCategoryStats | null {
    return this.topGainersCategoryStats;
  }

  public getLastCachedData(type: WebSocketType): any[] | null {
    return this.lastDataCache.get(type) || null;
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
  // 🎯 최적화된 수동 제어 메소드
  // ============================================================================

  public reconnect(type: WebSocketType): void {
    console.log(`🔄 ${type} 수동 재연결 시도`);
    this.reconnectAttempts.set(type, 0);
    
    const dataMode = this.FIXED_DATA_MODES.get(type);
    
    if (dataMode === 'websocket') {
      // crypto만 WebSocket 재연결
      this.connectWebSocket(type);
    } else if (dataMode === 'api') {
      // sp500, topgainers는 API 폴링 재시작
      this.startApiPolling(type);
    }
  }

  // 🎯 페이지 전환과 무관한 전체 재연결 (신중하게 사용)
  public reconnectAll(): void {
    console.log('🔄 전체 연결 상태 점검 및 복구');
    
    const statuses = this.getAllConnectionStatuses();
    
    Object.entries(statuses).forEach(([type, statusInfo]) => {
      const wsType = type as WebSocketType;
      const dataMode = this.FIXED_DATA_MODES.get(wsType);
      
      if (dataMode === 'websocket' && statusInfo.status === 'disconnected') {
        console.log(`🔄 ${type} WebSocket 재연결 필요`);
        this.reconnect(wsType);
      } else if (dataMode === 'api' && !this.apiPollingIntervals.has(wsType)) {
        console.log(`🔄 ${type} API 폴링 재시작 필요`);
        this.reconnect(wsType);
      } else {
        console.log(`✅ ${type} 정상 동작 중 (${statusInfo.status})`);
      }
    });
  }

  // 🎯 데이터 수동 새로고침 (연결 유지하며 데이터만 갱신)
  public refreshData(): void {
    console.log('🔄 데이터 수동 새로고침 - 연결 유지');
    
    // API 서비스는 즉시 fetch 실행
    (['sp500', 'topgainers'] as WebSocketType[]).forEach(type => {
      if (this.FIXED_DATA_MODES.get(type) === 'api') {
        this.fetchDataFromApi(type).catch(error => {
          console.error(`❌ ${type} 데이터 새로고침 실패:`, error);
        });
      }
    });
    
    // WebSocket 서비스는 연결 상태만 확인
    const cryptoStatus = this.getConnectionStatus('crypto');
    if (cryptoStatus === 'connected') {
      console.log('✅ crypto WebSocket 연결 유지 - 실시간 데이터 수신 중');
    } else if (cryptoStatus === 'disconnected') {
      console.log('🔄 crypto WebSocket 재연결 시도');
      this.reconnect('crypto');
    }
  }

  // ============================================================================
  // 상태 조회
  // ============================================================================

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
      dataModes: Object.fromEntries(this.FIXED_DATA_MODES),
      reconnectAttempts: Object.fromEntries(this.reconnectAttempts),
      subscriberCounts: Object.fromEntries(
        Array.from(this.subscribers.entries()).map(([event, callbacks]) => [
          event,
          callbacks.length
        ])
      ),
      topGainersCategories: Object.fromEntries(
        Array.from(this.topGainersCategories.entries()).map(([category, data]) => [
          category,
          data.length
        ])
      ),
      topGainersCategoryStats: this.topGainersCategoryStats,
      config: this.config
    };
  }

  // ============================================================================
  // 🎯 서비스 종료 및 정리 (앱 종료 시에만 호출)
  // ============================================================================

  public shutdown(): void {
    if (this.isShutdown) {
      console.log('⚠️ 이미 종료된 서비스입니다.');
      return;
    }

    console.log('🛑 WebSocket 서비스 종료 시작');
    
    this.isShutdown = true;
    
    // 모든 WebSocket 연결 종료
    this.connections.forEach((ws, type) => {
      console.log(`🔌 ${type} WebSocket 연결 종료`);
      ws.close(1000, 'Service shutdown');
    });
    this.connections.clear();
    
    // 모든 폴링 인터벌 정리
    this.apiPollingIntervals.forEach((intervalId, type) => {
      console.log(`⏹️ ${type} API 폴링 중단`);
      clearInterval(intervalId);
    });
    this.apiPollingIntervals.clear();
    
    // 재연결 타임아웃 정리
    this.reconnectTimeouts.forEach((timeoutId, type) => {
      console.log(`⏱️ ${type} 재연결 타임아웃 취소`);
      clearTimeout(timeoutId);
    });
    this.reconnectTimeouts.clear();
    
    // 하트비트 인터벌 정리
    this.heartbeatIntervals.forEach((intervalId, type) => {
      console.log(`💓 ${type} 하트비트 중단`);
      clearInterval(intervalId);
    });
    this.heartbeatIntervals.clear();
    
    // 헬스체크 인터벌 정리
    if (this.healthCheckInterval) {
      console.log('🏥 헬스체크 중단');
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    
    // 상태 초기화
    this.connectionStatuses.clear();
    this.reconnectAttempts.clear();
    this.consecutiveErrors.clear();
    this.dataTimestamps.clear();
    this.lastDataCache.clear();
    
    // TopGainers 관련 데이터 정리
    this.topGainersCategories.clear();
    this.topGainersCategoryStats = null;
    
    // 이벤트 구독자 정리
    this.subscribers.clear();
    
    this.isInitialized = false;
    console.log('✅ WebSocket 서비스 종료 완료');
  }

}

// ============================================================================
// 🎯 싱글톤 인스턴스 생성 (최적화된 설정)
// ============================================================================

export const webSocketService = new WebSocketService({
  maxReconnectAttempts: 3,
  baseReconnectDelay: 5000,           // 2000 → 5000
  apiPollingInterval: 5000,           // 3000 → 5000
  marketClosedPollingInterval: 15000, // 10000 → 15000  
  healthCheckInterval: 60000,         // 30000 → 60000
  cacheMaxAge: 30000,                 
  errorBackoffInterval: 60000,        // 30000 → 60000
  maxConsecutiveErrors: 3             
});

export default webSocketService;