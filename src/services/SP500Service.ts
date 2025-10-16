// services/SP500Service.ts
// SP500 WebSocket Push 전용 서비스

import { BaseService } from './BaseService';
import { SP500Data, WebSocketMessage } from './types';

export class SP500Service extends BaseService {
  private connection: WebSocket | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private lastReconnectTime = 0;

  protected getServiceName(): string {
    return 'SP500Service';
  }

  protected getDataMode(): 'websocket' | 'api' {
    return 'websocket';
  }

  public initialize(): void {
    if (this.isInitialized) {
      console.log('✅ SP500Service 이미 초기화됨 - 기존 연결 유지');
      return;
    }

    if (this.isShutdown) {
      console.log('⚠️ SP500Service가 종료된 상태입니다. 재시작이 필요합니다.');
      return;
    }

    console.log('🚀 SP500Service 초기화 시작 (WebSocket Push)');
    this.connectWebSocket();
    this.isInitialized = true;
    console.log('✅ SP500Service 초기화 완료');
  }

  public reconnect(): void {
    console.log('🔄 SP500Service 수동 재연결 시도');
    this.reconnectAttempts = 0;
    this.connectWebSocket();
  }

  public shutdown(): void {
    if (this.isShutdown) {
      console.log('⚠️ SP500Service 이미 종료된 상태입니다.');
      return;
    }

    console.log('🛑 SP500Service 종료 시작');
    this.isShutdown = true;

    // WebSocket 연결 종료
    if (this.connection) {
      console.log('🔌 SP500 WebSocket 연결 종료');
      this.connection.close(1000, 'Service shutdown');
      this.connection = null;
    }

    // 타임아웃 정리
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    // 하트비트 정리
    this.stopHeartbeat();

    // 상태 초기화
    this.setConnectionStatus('disconnected');
    this.subscribers.clear();
    this.lastDataCache = [];
    this.isInitialized = false;

    console.log('✅ SP500Service 종료 완료');
  }

  private connectWebSocket(): void {
    const existingWs = this.connection;
    if (existingWs && existingWs.readyState === WebSocket.OPEN) {
      console.log('✅ SP500 WebSocket 이미 연결되어 있음 - 재연결 중단');
      return;
    }

    this.lastReconnectTime = Date.now();
    this.disconnectWebSocket();

    const url = this.buildWebSocketUrl();
    console.log(`🔄 SP500 WebSocket 연결 시도: ${url}`);

    try {
      this.setConnectionStatus('connecting');

      const ws = new WebSocket(url);
      this.connection = ws;

      ws.onopen = () => {
        console.log('🟢 SP500 WebSocket 연결 성공');
        this.setConnectionStatus('connected');
        this.reconnectAttempts = 0;
        this.startHeartbeat();
      };

      ws.onmessage = (event) => {
        this.handleMessage(event);
      };

      ws.onclose = (event) => {
        console.log('🔴 SP500 WebSocket 연결 종료:', event.code, event.reason);
        this.handleConnectionClose();
      };

      ws.onerror = (error) => {
        console.error('❌ SP500 WebSocket 오류:', error);
        this.handleError('WebSocket connection error');
        this.handleConnectionClose();
      };

    } catch (error) {
      console.error('❌ SP500 WebSocket 연결 실패:', error);
      this.setConnectionStatus('disconnected');
      this.handleConnectionFailure();
    }
  }

  private buildWebSocketUrl(): string {
    return 'wss://api.investment-assistant.site/api/v1/ws/sp500';
  }

  private disconnectWebSocket(): void {
    if (this.connection) {
      this.connection.close();
      this.connection = null;
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    this.stopHeartbeat();
    this.setConnectionStatus('disconnected');
  }

  private handleConnectionClose(): void {
    this.connection = null;
    this.setConnectionStatus('disconnected');
    this.scheduleReconnect();
  }

  private handleConnectionFailure(): void {
    this.scheduleReconnect();
  }

  private scheduleReconnect(): void {
    const currentStatus = this.connectionStatus;

    const timeSinceLastReconnect = Date.now() - this.lastReconnectTime;
    if (timeSinceLastReconnect < 10000) {
      console.log('⚠️ SP500 너무 빠른 재연결 시도 - 10초 대기');
      return;
    }

    if (currentStatus === 'reconnecting' || currentStatus === 'connecting' || currentStatus === 'connected') {
      console.log(`⚠️ SP500 이미 ${currentStatus} 상태 - 재연결 중단`);
      return;
    }
    
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      console.error('❌ SP500 최대 재연결 시도 횟수 초과 - 연결 포기');
      this.setConnectionStatus('disconnected');
      return;
    }

    const delay = Math.min(this.config.baseReconnectDelay * Math.pow(2, this.reconnectAttempts), 30000);
    console.log(`⏰ SP500 ${delay}ms 후 재연결 시도 (${this.reconnectAttempts + 1}/${this.config.maxReconnectAttempts})`);

    this.reconnectAttempts++;
    this.setConnectionStatus('reconnecting');

    this.reconnectTimeout = setTimeout(() => {
      const currentStatus = this.connectionStatus;
      if (currentStatus === 'connected') {
        console.log('⏭️ SP500 이미 연결됨 - 재연결 중단');
        return;
      }
      
      if (currentStatus !== 'reconnecting') {
        console.log(`🚫 SP500 재연결 취소 - 현재 상태: ${currentStatus}`);
        return;
      }
      
      console.log('🔄 SP500 WebSocket 재연결 시도');
      this.connectWebSocket();
    }, delay);
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();

    this.heartbeatInterval = setInterval(() => {
      if (this.connection && this.connection.readyState === WebSocket.OPEN) {
        try {
          this.connection.send(JSON.stringify({ action: 'heartbeat' }));
        } catch (error) {
          console.error('❌ SP500 heartbeat 전송 실패:', error);
          this.handleConnectionClose();
        }
      } else {
        console.log('💔 SP500 WebSocket 연결 상태 이상');
        this.stopHeartbeat();
        this.handleConnectionClose();
      }
    }, 60000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const message: WebSocketMessage = JSON.parse(event.data);
      
      if (message.type === 'heartbeat_response') {
        return;
      }

      if (message.type === 'status') {
        console.log('📊 SP500 상태:', message);
        return;
      }

      switch (message.type) {
        case 'sp500':
          if (message.data) {
            const transformedData = this.transformWebSocketData(message.data);
            this.updateCache(transformedData);
            this.emitEvent('sp500_update', transformedData);
            console.log(`📊 SP500 push 데이터 수신: ${transformedData.length}개`);
          }
          break;
        default:
          console.log('📨 SP500 알 수 없는 메시지 타입:', message.type);
      }

    } catch (error) {
      console.error('❌ SP500 메시지 파싱 오류:', error);
    }
  }

  private transformWebSocketData(data: any[]): SP500Data[] {
    return data.map(item => ({
      symbol: item.symbol,
      price: item.current_price || item.price || 0,
      volume_24h: item.volume_24h || 0,
      timestamp_ms: item.timestamp_ms || Date.now(),
      category: item.category,
      source: item.source || 'websocket',
      company_name: item.company_name,
      current_price: item.current_price || item.price || 0,
      previous_close: item.previous_close,
      change_amount: item.change_amount,
      change_percentage: item.change_percentage,
      is_positive: item.is_positive,
      change_color: item.change_color
    }));
  }

  // 데이터 수동 새로고침 (WebSocket 재연결)
  public refreshData(): void {
    console.log('🔄 SP500 데이터 수동 새로고침 (WebSocket 재연결)');
    this.reconnect();
  }
}
