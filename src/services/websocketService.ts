// services/webSocketService.ts
// TopGainers 백엔드 구조에 맞춘 업데이트된 WebSocket 서비스

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

// 🎯 새로운 TopGainers 데이터 구조 (백엔드 API 응답과 일치)
export interface TopGainersData {
  batch_id: number;
  symbol: string;
  category: 'top_gainers' | 'top_losers' | 'most_actively_traded';
  last_updated: string;
  rank_position?: number;
  price?: number;
  change_amount?: number;
  change_percentage?: string;
  volume?: number;
  created_at?: string;
  // 프론트엔드 표시용 추가 필드
  name?: string;
  change_percent?: number; // change_percentage에서 파싱된 숫자값
}

// 🎯 TopGainers 카테고리별 통계 정보
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
  // TopGainers 전용 필드들
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
export type DataMode = 'websocket' | 'api' | 'hybrid';

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

  // 🎯 TopGainers 카테고리별 데이터 캐시
  private topGainersCategories: Map<string, TopGainersData[]> = new Map();
  private topGainersCategoryStats: TopGainersCategoryStats | null = null;

  // 설정 가능한 옵션들 (HTTP 폴링 최적화)
  private config: ConnectionConfig = {
    maxReconnectAttempts: 3,
    baseReconnectDelay: 2000,
    apiPollingInterval: 5000,        // 5초 - 개장 시 (TopGainers: 50개, SP500: 60개)
    marketClosedPollingInterval: 30000, // 30초 - 장 마감 시 (미국 주식용)
    healthCheckInterval: 15000,      // 15초 (폴링 방식이므로 간격 증가)
    enableApiFallback: true,
    maxConcurrentConnections: 1,     // 암호화폐만 WebSocket 사용
    connectionStabilityDelay: 500    // 연결 안정화 시간 단축
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

    // TopGainers 카테고리 초기화
    this.topGainersCategories.set('top_gainers', []);
    this.topGainersCategories.set('top_losers', []);
    this.topGainersCategories.set('most_actively_traded', []);

    console.log('🚀 Hybrid Service 초기화: Crypto(WebSocket) + US Stocks(HTTP Polling)', this.config);
  }

  // ============================================================================
  // 초기화 및 종료
  // ============================================================================

  public initialize(): void {
    if (this.isInitialized) {
      console.log('⚠️ Hybrid 서비스가 이미 초기화되었습니다.');
      return;
    }

    console.log('🚀 Hybrid 서비스 초기화 시작: Crypto(WebSocket) + US Stocks(HTTP Polling)...');
    
    // 시장 상태 체크 시작
    this.startMarketStatusMonitoring();
    
    // 헬스 체크 시작
    this.startHealthCheck();
    
    // 초기 연결 모드 결정
    this.initializeConnectionModes();

    // 🎯 TopGainers 카테고리 통계 초기 로드
    this.loadTopGainersCategoryStats();

    this.isInitialized = true;
    console.log('✅ Hybrid 서비스 초기화 완료: Crypto(WebSocket) + US Stocks(HTTP Polling)');
  }

  // 🎯 TopGainers 카테고리 통계 로드
  private async loadTopGainersCategoryStats(): Promise<void> {
    try {
      // ❌ 기존: http://api.investment-assistant.site/...
      // ✅ 수정: https://api.investment-assistant.site/...
      const response = await fetch('https://api.investment-assistant.site/api/v1/stocks/topgainers/categories/', {
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
        console.log('📊 TopGainers 카테고리 통계 로드 완료:', stats);
      } else {
        console.warn(`⚠️ TopGainers 카테고리 응답 실패: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('❌ TopGainers 카테고리 통계 로드 실패:', error);
    }
  }
  

  private async initializeConnectionModes(): Promise<void> {
    const marketStatus = this.marketTimeManager.getCurrentMarketStatus();
    
    console.log('🔄 연결 모드 초기화: 암호화폐(WebSocket) + 미국주식(HTTP 폴링)');
    
    // 🎯 암호화폐만 WebSocket으로 연결
    await this.connectWebSocketWithDelay('crypto');
    
    // 🎯 미국 주식 데이터는 항상 HTTP 폴링으로 처리
    this.switchToApiMode('topgainers');
    this.switchToApiMode('sp500');
    
    console.log('✅ 연결 모드 초기화 완료: crypto(WebSocket), topgainers/sp500(HTTP 폴링)');
  }

  private async connectWebSocketWithDelay(type: WebSocketType): Promise<void> {
    if (this.connections.size > 0) {
      await new Promise(resolve => setTimeout(resolve, this.config.connectionStabilityDelay));
    }
    this.connectWebSocket(type);
  }

  public shutdown(): void {
    console.log('🛑 Hybrid 서비스 종료 시작...');

    this.connections.forEach((ws, type) => {
      this.disconnectWebSocket(type);
    });

    this.reconnectTimeouts.forEach(timeout => clearTimeout(timeout));
    this.reconnectTimeouts.clear();

    this.apiPollingIntervals.forEach(interval => clearInterval(interval));
    this.apiPollingIntervals.clear();

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    this.subscribers.clear();
    this.topGainersCategories.clear();
    this.topGainersCategoryStats = null;

    this.isInitialized = false;
    console.log('✅ Hybrid 서비스 종료 완료');
  }

  // ============================================================================
  // 🎯 시장 상태 모니터링
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
        console.log(`🕐 시장 상태 변경: ${currentStatus.status} (${currentStatus.currentTime})`);
        
        this.lastMarketStatus = currentStatus;
        this.emitEvent('market_status_change', {
          isOpen: currentStatus.isOpen,
          status: currentStatus.status
        });

        this.adjustConnectionModeForMarketStatus(currentStatus.isOpen);
      }
    }, 60000);
  }

  private lastMarketStatus: any = null;

  private adjustConnectionModeForMarketStatus(isMarketOpen: boolean): void {
    // 🎯 미국 주식은 시장 상태와 관계없이 항상 HTTP 폴링 유지
    (['sp500', 'topgainers'] as WebSocketType[]).forEach(type => {
      if (this.dataModes.get(type) !== 'api') {
        console.log(`🔄 ${type} HTTP 폴링 모드로 고정 (시장 상태: ${isMarketOpen ? '개장' : '마감'})`);
        this.switchToApiMode(type);
      }
      
      // 폴링 간격 조정 (개장 시 5초, 마감 시 30초)
      this.adjustApiPollingInterval(type, isMarketOpen);
    });
  }

  // 🎯 API 폴링 간격 조정 메서드
  private adjustApiPollingInterval(type: WebSocketType, isMarketOpen: boolean): void {
    const currentInterval = this.apiPollingIntervals.get(type);
    if (currentInterval) {
      clearInterval(currentInterval);
      this.apiPollingIntervals.delete(type);
      
      // 새로운 간격으로 다시 시작
      this.startApiPolling(type);
      
      const interval = isMarketOpen ? this.config.apiPollingInterval : this.config.marketClosedPollingInterval;
      console.log(`🔄 ${type} 폴링 간격 조정: ${interval}ms (${isMarketOpen ? '개장' : '마감'})`);
    }
  }

  // ============================================================================
  // 🎯 연결 모드 관리 (WebSocket ↔ API)
  // ============================================================================

  private switchToWebSocketMode(type: WebSocketType): void {
    this.stopApiPolling(type);
    this.dataModes.set(type, 'websocket');
    this.connectWebSocket(type);
  }

  private switchToApiMode(type: WebSocketType): void {
    this.disconnectWebSocket(type);
    this.dataModes.set(type, 'api');
    this.setConnectionStatus(type, 'api_mode');
    this.startApiPolling(type);
  }

  private startApiPolling(type: WebSocketType): void {
    if (type === 'crypto') {
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

    pollData();
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
    if (type === 'crypto') {
      return;
    }

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

      let result;
      
      if (type === 'topgainers') {
        // TopGainers는 직접 배열 응답
        result = await response.json();
        if (Array.isArray(result)) {
          const data = this.transformTopGainersApiData(result);
          
          if (this.hasDataChanged(type, data)) {
            this.lastDataCache.set(type, data);
            this.updateTopGainersCategories(data);
            this.emitEvent('topgainers_update', data);
            console.log(`📊 ${type} API 데이터 업데이트: ${data.length}개 항목`);
          }
        }
      } else {
        // SP500은 기존 로직 유지
        result = await response.json();
        if (result.items && Array.isArray(result.items)) {
          const data = this.transformApiDataToWebSocketFormat(type, result.items);
          
          if (this.hasDataChanged(type, data)) {
            this.lastDataCache.set(type, data);
            this.emitEvent('sp500_update', data as SP500Data[]);
            console.log(`📊 ${type} API 데이터 업데이트: ${data.length}개 항목`);
          }
        }
      }

    } catch (error) {
      console.error(`❌ ${type} API 호출 실패:`, error);
      this.emitEvent('error', { type, error: error instanceof Error ? error.message : String(error) });
    }
  }

  // 🎯 TopGainers API 데이터 변환
  private transformTopGainersApiData(apiData: any[]): TopGainersData[] {
    return apiData.map(item => {
      // change_percentage 문자열에서 숫자 추출
      let changePercent = 0;
      if (item.change_percentage) {
        const match = item.change_percentage.toString().match(/-?\d+\.?\d*/);
        changePercent = match ? parseFloat(match[0]) : 0;
      }

      return {
        batch_id: item.batch_id || 0,
        symbol: item.symbol,
        category: item.category,
        last_updated: item.last_updated || new Date().toISOString(),
        rank_position: item.rank_position,
        price: item.price,
        change_amount: item.change_amount,
        change_percentage: item.change_percentage,
        volume: item.volume,
        created_at: item.created_at,
        // 프론트엔드용 추가 필드
        name: this.getStockName(item.symbol),
        change_percent: changePercent,
      };
    });
  }

  // 🎯 TopGainers 카테고리별 데이터 업데이트
  private updateTopGainersCategories(data: TopGainersData[]): void {
    // 카테고리별로 데이터 분류
    const categorizedData = {
      top_gainers: data.filter(item => item.category === 'top_gainers'),
      top_losers: data.filter(item => item.category === 'top_losers'),
      most_actively_traded: data.filter(item => item.category === 'most_actively_traded')
    };

    // 캐시 업데이트
    Object.entries(categorizedData).forEach(([category, items]) => {
      this.topGainersCategories.set(category, items);
    });
  }

  private getApiUrl(type: WebSocketType): string {
    const BASE_URL = 'https://api.investment-assistant.site/api/v1';
    
    let endpoint: string;
    let queryParams: string;
    
    switch (type) {
      case 'sp500':
        endpoint = '/stocks/sp500/polling';  // 폴링 엔드포인트 사용
        queryParams = 'limit=60&sort_by=volume&order=desc';  // 60개로 고정
        break;
      case 'topgainers':
        endpoint = '/stocks/topgainers/polling';  // 폴링 엔드포인트 사용
        queryParams = 'limit=50';  // 50개로 고정
        break;
      default:
        throw new Error(`Unknown API type: ${type}`);
    }
    
    const finalUrl = `${BASE_URL}${endpoint}?${queryParams}`;
    
    console.log(`🚀 ${type} API 요청 (HTTPS): ${finalUrl}`);
    return finalUrl;
  }

  private transformApiDataToWebSocketFormat(type: WebSocketType, apiData: any[]): any[] {
    switch (type) {
      case 'sp500':
        return apiData.map(item => ({
          symbol: item.symbol,
          price: item.price,
          volume: item.volume || 0,
          timestamp_ms: item.timestamp_ms || Date.now(),
          category: item.category,
          source: 'api_fallback'
        }));

      default:
        return apiData;
    }
  }

  private hasDataChanged(type: WebSocketType, newData: any[]): boolean {
    const cachedData = this.lastDataCache.get(type) || [];
    
    if (cachedData.length !== newData.length) {
      return true;
    }

    if (newData.length === 0) {
      return false;
    }

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
        return 'stocks/topgainers';  // 🎯 TopGainers 전용 WebSocket
      default:
        throw new Error(`Unknown WebSocket type: ${type}`);
    }
  }

  // ============================================================================
  // WebSocket 연결 관리
  // ============================================================================

  private connectWebSocket(type: WebSocketType): void {
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
    
    if (this.dataModes.get(type) === 'websocket') {
      this.scheduleReconnect(type);
    }
  }

  private handleConnectionFailure(type: WebSocketType): void {
    if (type === 'crypto') {
      // 암호화폐만 WebSocket 재연결 시도
      this.scheduleReconnect(type);
    } else {
      // 미국 주식은 항상 API 모드로 전환
      console.log(`🔄 ${type} WebSocket 실패 - HTTP 폴링 모드로 전환 (고정)`);
      this.switchToApiMode(type);
    }
  }

  private scheduleReconnect(type: WebSocketType): void {
    // 미국 주식은 재연결하지 않고 API 모드로 전환
    if (type !== 'crypto') {
      console.log(`🔄 ${type} WebSocket 재연결 대신 HTTP 폴링 모드로 전환`);
      this.switchToApiMode(type);
      return;
    }

    const attempts = this.reconnectAttempts.get(type) || 0;
    
    if (attempts >= this.config.maxReconnectAttempts) {
      console.error(`❌ ${type} WebSocket 최대 재연결 시도 횟수 초과`);
      return;
    }

    const delay = this.config.baseReconnectDelay * Math.pow(2, attempts);
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
      
      if (message.type === 'heartbeat') {
        return;
      }

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
            const transformedData = this.transformTopGainersWebSocketData(message.data as any[]);
            this.lastDataCache.set(type, transformedData);
            this.updateTopGainersCategories(transformedData);
            this.emitEvent('topgainers_update', transformedData);
          }
          break;

        default:
          console.log(`📨 ${type} 알 수 없는 메시지 타입:`, message.type);
      }

    } catch (error) {
      console.error(`❌ ${type} 메시지 파싱 오류:`, error);
    }
  }

  // 🎯 TopGainers WebSocket 데이터 변환
  private transformTopGainersWebSocketData(wsData: any[]): TopGainersData[] {
    return wsData.map(item => {
      let changePercent = 0;
      if (item.change_percentage) {
        const match = item.change_percentage.toString().match(/-?\d+\.?\d*/);
        changePercent = match ? parseFloat(match[0]) : 0;
      }

      return {
        batch_id: item.batch_id || 0,
        symbol: item.symbol,
        category: item.category,
        last_updated: item.last_updated || new Date().toISOString(),
        rank_position: item.rank_position,
        price: item.price,
        change_amount: item.change_amount,
        change_percentage: item.change_percentage,
        volume: item.volume,
        created_at: item.created_at,
        name: this.getStockName(item.symbol),
        change_percent: changePercent,
      };
    });
  }

  // 🎯 주식 이름 매핑 (간단한 버전, 실제로는 API에서 가져와야 함)
  private getStockName(symbol: string): string {
    const stockNames: Record<string, string> = {
      'AAPL': 'Apple Inc.',
      'MSFT': 'Microsoft Corporation',
      'GOOGL': 'Alphabet Inc.',
      'AMZN': 'Amazon.com Inc.',
      'TSLA': 'Tesla Inc.',
      'META': 'Meta Platforms Inc.',
      'NVDA': 'NVIDIA Corporation',
      'NFLX': 'Netflix Inc.',
      'GOOG': 'Alphabet Inc.',
      'BRK.B': 'Berkshire Hathaway',
      'GXAI': 'Gaxos.ai Inc.',
      'PRFX': 'PainReform Ltd.',
      'ADD': 'Color Star Technology Co.',
      'PLTR': 'Palantir Technologies Inc.',
      'INTC': 'Intel Corporation',
      'OPEN': 'Opendoor Technologies Inc.',
    };

    return stockNames[symbol] || `${symbol} Corp.`;
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
    // 암호화폐만 WebSocket 헬스체크 수행
    const cryptoStatus = this.connectionStatuses.get('crypto');
    const cryptoMode = this.dataModes.get('crypto');
    
    if (cryptoMode === 'websocket' && cryptoStatus === 'disconnected') {
      const reconnectAttempts = this.reconnectAttempts.get('crypto') || 0;
      
      if (reconnectAttempts >= 2) {
        console.log(`🏥 crypto 헬스체크 - 재연결 시도 (현재 시도: ${reconnectAttempts})`);
        this.reconnect('crypto');
      }
    }
    
    // 미국 주식은 API 모드 상태만 확인
    (['sp500', 'topgainers'] as WebSocketType[]).forEach(type => {
      const mode = this.dataModes.get(type);
      const status = this.connectionStatuses.get(type);
      
      if (mode !== 'api') {
        console.log(`🏥 ${type} 헬스체크 - HTTP 폴링 모드로 강제 전환`);
        this.switchToApiMode(type);
      } else if (status !== 'api_mode') {
        console.log(`🏥 ${type} 헬스체크 - API 상태 복구`);
        this.setConnectionStatus(type, 'api_mode');
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
  // 🎯 TopGainers 전용 메서드들
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
  // 수동 제어 메소드
  // ============================================================================

  public reconnect(type: WebSocketType): void {
    console.log(`🔄 ${type} 수동 재연결 시도`);
    this.reconnectAttempts.set(type, 0);
    
    if (type === 'crypto') {
      // 암호화폐만 WebSocket 재연결
      if (this.dataModes.get(type) === 'api') {
        this.switchToWebSocketMode(type);
      } else {
        this.connectWebSocket(type);
      }
    } else {
      // 미국 주식은 HTTP 폴링 모드로 강제 전환
      console.log(`🔄 ${type} HTTP 폴링 모드로 재시작`);
      this.switchToApiMode(type);
    }
  }

  public reconnectAll(): void {
    console.log('🔄 모든 연결 재시도');
    
    // 암호화폐는 WebSocket 재연결
    this.reconnectAttempts.set('crypto', 0);
    this.reconnect('crypto');
    
    // 미국 주식은 HTTP 폴링 재시작
    (['sp500', 'topgainers'] as WebSocketType[]).forEach(type => {
      console.log(`🔄 ${type} HTTP 폴링 재시작`);
      this.switchToApiMode(type);
    });
  }

  public forceWebSocketMode(type: WebSocketType): void {
    if (type === 'crypto') {
      console.log(`🔧 ${type} 강제 WebSocket 모드 전환`);
      this.switchToWebSocketMode(type);
    } else {
      console.warn(`⚠️ ${type}는 WebSocket 모드를 지원하지 않습니다. HTTP 폴링 모드를 사용합니다.`);
      this.switchToApiMode(type);
    }
  }

  public forceApiMode(type: WebSocketType): void {
    console.log(`🔧 ${type} 강제 HTTP 폴링 모드 전환`);
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
}

// 싱글톤 인스턴스 생성 및 export (HTTP 폴링 최적화)
export const webSocketService = new WebSocketService({
  enableApiFallback: true,
  maxReconnectAttempts: 3,
  apiPollingInterval: 5000,           // 5초 - TopGainers(50개) + SP500(60개)
  marketClosedPollingInterval: 30000, // 30초 - 미국 주식 마감 시
  healthCheckInterval: 15000,         // 15초 - 폴링 방식에 맞춘 헬스체크
  maxConcurrentConnections: 1         // 암호화폐만 WebSocket 사용
});

export default webSocketService;