// services/CryptoService.ts
// 암호화폐 WebSocket 전용 서비스

import { BaseService } from './BaseService';
import { CryptoData, WebSocketMessage, ConnectionStatus } from './types';

export class CryptoService extends BaseService {
  private connection: WebSocket | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private lastReconnectTime = 0;

  protected getServiceName(): string {
    return 'CryptoService';
  }

  protected getDataMode(): 'websocket' | 'api' {
    return 'websocket';
  }

  public initialize(): void {
    if (this.isInitialized) {
      console.log('✅ CryptoService 이미 초기화됨 - 기존 연결 유지');
      return;
    }

    if (this.isShutdown) {
      console.log('⚠️ CryptoService가 종료된 상태입니다. 재시작이 필요합니다.');
      return;
    }

    console.log('🚀 CryptoService 초기화 시작');
    this.connectWebSocket();
    this.isInitialized = true;
    console.log('✅ CryptoService 초기화 완료');
  }

  public reconnect(): void {
    console.log('🔄 CryptoService 수동 재연결 시도');
    this.reconnectAttempts = 0;
    this.connectWebSocket();
  }

  public shutdown(): void {
    if (this.isShutdown) {
      console.log('⚠️ CryptoService 이미 종료된 상태입니다.');
      return;
    }

    console.log('🛑 CryptoService 종료 시작');
    this.isShutdown = true;

    // WebSocket 연결 종료
    if (this.connection) {
      console.log('🔌 Crypto WebSocket 연결 종료');
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

    console.log('✅ CryptoService 종료 완료');
  }

  private connectWebSocket(): void {
    const existingWs = this.connection;
    if (existingWs && existingWs.readyState === WebSocket.OPEN) {
      console.log('✅ Crypto WebSocket 이미 연결되어 있음 - 재연결 중단');
      return;
    }

    this.lastReconnectTime = Date.now();
    this.disconnectWebSocket();

    const url = this.buildWebSocketUrl();
    console.log(`🔄 Crypto WebSocket 연결 시도: ${url}`);

    try {
      this.setConnectionStatus('connecting');

      const ws = new WebSocket(url);
      this.connection = ws;

      ws.onopen = () => {
        console.log('🟢 Crypto WebSocket 연결 성공');
        this.setConnectionStatus('connected');
        this.reconnectAttempts = 0;
        this.startHeartbeat();
      };

      ws.onmessage = (event) => {
        this.handleMessage(event);
      };

      ws.onclose = (event) => {
        console.log('🔴 Crypto WebSocket 연결 종료:', event.code, event.reason);
        this.handleConnectionClose();
      };

      ws.onerror = (error) => {
        console.error('❌ Crypto WebSocket 오류:', error);
        this.handleError('WebSocket connection error');
        this.handleConnectionClose();
      };

    } catch (error) {
      console.error('❌ Crypto WebSocket 연결 실패:', error);
      this.setConnectionStatus('disconnected');
      this.handleConnectionFailure();
    }
  }

  private buildWebSocketUrl(): string {
    return 'wss://api.investment-assistant.site/api/v1/ws/crypto';
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
    if (timeSinceLastReconnect < 10000) { // 10초 내 재연결 시도 방지
      console.log('⚠️ Crypto 너무 빠른 재연결 시도 - 10초 대기');
      return;
    }

    // 중복 재연결 방지
    if (currentStatus === 'reconnecting' || currentStatus === 'connecting' || currentStatus === 'connected') {
      console.log(`⚠️ Crypto 이미 ${currentStatus} 상태 - 재연결 중단`);
      return;
    }
    
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      console.error('❌ Crypto 최대 재연결 시도 횟수 초과 - 연결 포기');
      this.setConnectionStatus('disconnected');
      return;
    }

    const delay = Math.min(this.config.baseReconnectDelay * Math.pow(2, this.reconnectAttempts), 30000);
    console.log(`⏰ Crypto ${delay}ms 후 재연결 시도 (${this.reconnectAttempts + 1}/${this.config.maxReconnectAttempts})`);

    this.reconnectAttempts++;
    this.setConnectionStatus('reconnecting');

    this.reconnectTimeout = setTimeout(() => {
      // 상태 재확인
      const currentStatus = this.connectionStatus;
      if (currentStatus === 'connected') {
        console.log('⏭️ Crypto 이미 연결됨 - 재연결 중단');
        return;
      }
      
      if (currentStatus !== 'reconnecting') {
        console.log(`🚫 Crypto 재연결 취소 - 현재 상태: ${currentStatus}`);
        return;
      }
      
      console.log('🔄 Crypto WebSocket 재연결 시도');
      this.connectWebSocket();
    }, delay);
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();

    this.heartbeatInterval = setInterval(() => {
      if (this.connection && this.connection.readyState === WebSocket.OPEN) {
        try {
          this.connection.send(JSON.stringify({ type: 'ping' }));
        } catch (error) {
          console.error('❌ Crypto heartbeat 전송 실패:', error);
          this.handleConnectionClose();
        }
      } else {
        console.log('💔 Crypto WebSocket 연결 상태 이상');
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
      
      if (message.type === 'heartbeat') {
        return;
      }

      if (message.type === 'status' || message.status) {
        console.log('📊 Crypto 상태:', message);
        return;
      }

      switch (message.type) {
        case 'crypto_update':
          if (message.data) {
            this.updateCache(message.data);
            this.emitEvent('crypto_update', message.data as CryptoData[]);
          }
          break;
        default:
          console.log('📨 Crypto 알 수 없는 메시지 타입:', message.type);
      }

    } catch (error) {
      console.error('❌ Crypto 메시지 파싱 오류:', error);
    }
  }
}
