// services/websocketService.ts
// 전역 WebSocket 연결 관리 서비스

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
  }
  
  export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'reconnecting';
  
  export type WebSocketType = 'crypto' | 'sp500' | 'topgainers';
  
  // 이벤트 타입 정의
  export interface WebSocketEvents {
    'crypto_update': CryptoData[];
    'sp500_update': SP500Data[];
    'topgainers_update': TopGainersData[];
    'connection_change': { type: WebSocketType; status: ConnectionStatus };
    'error': { type: WebSocketType; error: string };
  }
  
  // 구독자 타입 정의
  export type EventCallback<T = any> = (data: T) => void;
  export type Unsubscribe = () => void;
  
  class WebSocketService {
    private connections: Map<WebSocketType, WebSocket> = new Map();
    private connectionStatuses: Map<WebSocketType, ConnectionStatus> = new Map();
    private subscribers: Map<string, EventCallback[]> = new Map();
    private reconnectTimeouts: Map<WebSocketType, NodeJS.Timeout> = new Map();
    private reconnectAttempts: Map<WebSocketType, number> = new Map();
    private maxReconnectAttempts = 5;
    private baseReconnectDelay = 1000; // 1초
  
    private isInitialized = false;
  
    constructor() {
      // 초기 상태 설정
      (['crypto', 'sp500', 'topgainers'] as WebSocketType[]).forEach(type => {
        this.connectionStatuses.set(type, 'disconnected');
        this.reconnectAttempts.set(type, 0);
      });
    }
  
    // ============================================================================
    // 초기화 및 종료
    // ============================================================================
  
    /**
     * WebSocket 서비스 초기화 (앱 시작 시 호출)
     */
    public initialize(): void {
      if (this.isInitialized) {
        console.log('⚠️ WebSocket 서비스가 이미 초기화되었습니다.');
        return;
      }
  
      console.log('🚀 WebSocket 서비스 초기화 시작...');
      
      // 3가지 WebSocket 연결 시작
      this.connectWebSocket('crypto');
      this.connectWebSocket('sp500');
      this.connectWebSocket('topgainers');
  
      this.isInitialized = true;
      console.log('✅ WebSocket 서비스 초기화 완료');
    }
  
    /**
     * WebSocket 서비스 종료
     */
    public shutdown(): void {
      console.log('🛑 WebSocket 서비스 종료 시작...');
  
      // 모든 연결 종료
      this.connections.forEach((ws, type) => {
        this.disconnectWebSocket(type);
      });
  
      // 모든 타이머 정리
      this.reconnectTimeouts.forEach(timeout => {
        clearTimeout(timeout);
      });
      this.reconnectTimeouts.clear();
  
      // 구독자 정리
      this.subscribers.clear();
  
      this.isInitialized = false;
      console.log('✅ WebSocket 서비스 종료 완료');
    }
  
    // ============================================================================
    // WebSocket URL 생성
    // ============================================================================
  
    private buildWebSocketUrl(type: WebSocketType): string {
      // 1) 절대 WS URL 환경변수 우선
      const absUrl = import.meta.env?.VITE_WS_URL;
      if (absUrl) {
        return `${absUrl}/${this.getWebSocketPath(type)}`;
      }
  
      if (typeof window === 'undefined') {
        return `/${this.getWebSocketPath(type)}`;
      }
  
      // 2) Vercel과 같은 정적 호스팅용
      const hostname = window.location.hostname;
      if (hostname.includes('vercel.app')) {
        return `wss://api.investment-assistant.site/api/v1/ws/${this.getWebSocketPath(type)}`;
      }
  
      // 3) 동일 출처 프록시 사용
      const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
      const host = window.location.host;
      const wsBase = import.meta.env?.VITE_WS_BASE || '/ws';
      
      return `${protocol}://${host}${wsBase}/${this.getWebSocketPath(type)}`;
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
          this.emitEvent('error', { type, error: error.toString() });
          this.handleConnectionClose(type);
        };
  
      } catch (error) {
        console.error(`❌ ${type} WebSocket 연결 실패:`, error);
        this.setConnectionStatus(type, 'disconnected');
        this.scheduleReconnect(type);
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
      this.scheduleReconnect(type);
    }
  
    private scheduleReconnect(type: WebSocketType): void {
      const attempts = this.reconnectAttempts.get(type) || 0;
      
      if (attempts >= this.maxReconnectAttempts) {
        console.error(`❌ ${type} WebSocket 최대 재연결 시도 횟수 초과`);
        return;
      }
  
      const delay = this.baseReconnectDelay * Math.pow(2, attempts); // 지수 백오프
      console.log(`⏰ ${type} WebSocket ${delay}ms 후 재연결 시도 (${attempts + 1}/${this.maxReconnectAttempts})`);
  
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
              this.emitEvent('crypto_update', message.data as CryptoData[]);
            }
            break;
            
          case 'sp500_update':
            if (type === 'sp500' && message.data) {
              this.emitEvent('sp500_update', message.data as SP500Data[]);
            }
            break;
            
          case 'topgainers_update':
            if (type === 'topgainers' && message.data) {
              this.emitEvent('topgainers_update', message.data as TopGainersData[]);
            }
            break;
  
          default:
            console.log(`📨 ${type} 알 수 없는 메시지:`, message.type);
        }
  
      } catch (error) {
        console.error(`❌ ${type} 메시지 파싱 오류:`, error);
      }
    }
  
    // ============================================================================
    // 연결 상태 관리
    // ============================================================================
  
    private setConnectionStatus(type: WebSocketType, status: ConnectionStatus): void {
      const previousStatus = this.connectionStatuses.get(type);
      
      if (previousStatus !== status) {
        this.connectionStatuses.set(type, status);
        this.emitEvent('connection_change', { type, status });
        console.log(`🔄 ${type} 연결 상태 변경: ${previousStatus} → ${status}`);
      }
    }
  
    public getConnectionStatus(type: WebSocketType): ConnectionStatus {
      return this.connectionStatuses.get(type) || 'disconnected';
    }
  
    public getAllConnectionStatuses(): Record<WebSocketType, ConnectionStatus> {
      return {
        crypto: this.getConnectionStatus('crypto'),
        sp500: this.getConnectionStatus('sp500'),
        topgainers: this.getConnectionStatus('topgainers'),
      };
    }
  
    public isConnected(type: WebSocketType): boolean {
      return this.getConnectionStatus(type) === 'connected';
    }
  
    public isAnyConnected(): boolean {
      return Array.from(this.connectionStatuses.values()).some(status => status === 'connected');
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
  
    /**
     * 특정 WebSocket 수동 재연결
     */
    public reconnect(type: WebSocketType): void {
      console.log(`🔄 ${type} 수동 재연결 시도`);
      this.reconnectAttempts.set(type, 0); // 재시도 카운터 리셋
      this.connectWebSocket(type);
    }
  
    /**
     * 모든 WebSocket 재연결
     */
    public reconnectAll(): void {
      console.log('🔄 모든 WebSocket 재연결 시도');
      (['crypto', 'sp500', 'topgainers'] as WebSocketType[]).forEach(type => {
        this.reconnectAttempts.set(type, 0);
        this.connectWebSocket(type);
      });
    }
  
    // ============================================================================
    // 디버깅 및 상태 확인
    // ============================================================================
  
    public getStatus() {
      return {
        initialized: this.isInitialized,
        connections: Object.fromEntries(
          Array.from(this.connections.entries()).map(([type, ws]) => [
            type,
            {
              readyState: ws.readyState,
              url: ws.url,
              status: this.getConnectionStatus(type)
            }
          ])
        ),
        connectionStatuses: Object.fromEntries(this.connectionStatuses),
        reconnectAttempts: Object.fromEntries(this.reconnectAttempts),
        subscriberCounts: Object.fromEntries(
          Array.from(this.subscribers.entries()).map(([event, callbacks]) => [
            event,
            callbacks.length
          ])
        )
      };
    }
  
    public logStatus(): void {
      console.log('📊 WebSocket 서비스 상태:', this.getStatus());
    }
  }
  
  // 싱글톤 인스턴스 생성 및 export
  export const websocketService = new WebSocketService();
  
  // 기본 export도 제공
  export default websocketService;