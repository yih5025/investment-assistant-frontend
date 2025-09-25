// services/BaseService.ts
// 공통 기능을 가진 기본 서비스 클래스

import { MarketTimeManager } from '../utils/marketTime';
import { 
  ConnectionStatus, 
  ServiceConfig, 
  EventCallback, 
  Unsubscribe,
  ServiceEvents,
  WebSocketType
} from './types';

export abstract class BaseService {
  protected connectionStatus: ConnectionStatus = 'disconnected';
  protected isInitialized = false;
  protected isShutdown = false;
  protected marketTimeManager = new MarketTimeManager();
  protected subscribers: Map<string, EventCallback[]> = new Map();
  protected consecutiveErrors = 0;
  protected lastDataCache: any[] = [];
  protected dataTimestamp = 0;

  protected config: ServiceConfig = {
    maxReconnectAttempts: 3,
    baseReconnectDelay: 5000,
    apiPollingInterval: 5000,
    marketClosedPollingInterval: 15000,
    healthCheckInterval: 60000,
    cacheMaxAge: 30000,
    errorBackoffInterval: 60000,
    maxConsecutiveErrors: 3
  };

  constructor(customConfig?: Partial<ServiceConfig>) {
    if (customConfig) {
      this.config = { ...this.config, ...customConfig };
    }
  }

  // 추상 메서드 - 각 서비스에서 구현
  abstract initialize(): void;
  abstract shutdown(): void;
  abstract reconnect(): void;

  // 공통 메서드
  public getConnectionStatus(): ConnectionStatus {
    return this.connectionStatus;
  }

  public getStatus() {
    return {
      initialized: this.isInitialized,
      shutdown: this.isShutdown,
      connectionStatus: this.connectionStatus,
      consecutiveErrors: this.consecutiveErrors,
      dataTimestamp: this.dataTimestamp,
      cacheSize: this.lastDataCache.length
    };
  }

  public getLastCachedData(): any[] | null {
    return this.lastDataCache.length > 0 ? this.lastDataCache : null;
  }

  // 이벤트 구독/해제
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

  protected emitEvent<K extends keyof ServiceEvents>(
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

  protected setConnectionStatus(status: ConnectionStatus): void {
    const previousStatus = this.connectionStatus;
    if (previousStatus !== status) {
      this.connectionStatus = status;
      // Note: 'type' will be added by WebSocketManager when forwarding events
      this.emitEvent('connection_change', { 
        type: 'crypto' as WebSocketType, // This will be overridden by the manager
        status, 
        mode: this.getDataMode() 
      });
      console.log(`🔄 ${this.getServiceName()} 상태: ${previousStatus} → ${status}`);
    }
  }

  protected updateCache(data: any[]): void {
    this.lastDataCache = data;
    this.dataTimestamp = Date.now();
    this.consecutiveErrors = 0;
  }

  protected handleError(error: string | Error): void {
    this.consecutiveErrors++;
    const errorMessage = error instanceof Error ? error.message : error;
    console.error(`❌ ${this.getServiceName()} 오류 (${this.consecutiveErrors}회):`, errorMessage);
    this.emitEvent('error', { 
      type: 'crypto' as WebSocketType, // This will be overridden by the manager
      error: errorMessage 
    });
  }

  protected isCacheValid(): boolean {
    const now = Date.now();
    return this.lastDataCache.length > 0 && 
           this.dataTimestamp > 0 && 
           (now - this.dataTimestamp) < this.config.cacheMaxAge;
  }

  // 각 서비스에서 구현해야 하는 메서드들
  protected abstract getServiceName(): string;
  protected abstract getDataMode(): 'websocket' | 'api';
}
