// services/enhancedWebSocketService.ts
// 강화된 디버깅 기능을 가진 WebSocket 서비스

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
    data?: any;
    timestamp: string;
    status?: string;
    subscription_info?: any;
    server_info?: any;
    connected_clients?: number;
  }
  
  export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'reconnecting';
  export type WebSocketType = 'crypto' | 'sp500' | 'topgainers';
  
  // 🎯 강화된 디버깅 인터페이스
  export interface DebugInfo {
    type: WebSocketType;
    event: 'connection' | 'message' | 'error' | 'heartbeat' | 'status';
    timestamp: Date;
    data: any;
    metadata?: {
      messageSize?: number;
      connectionDuration?: number;
      lastActivity?: Date;
      messageCount?: number;
    };
  }
  
  export interface ConnectionMetrics {
    type: WebSocketType;
    connectedAt: Date | null;
    lastMessageAt: Date | null;
    messageCount: number;
    errorCount: number;
    reconnectCount: number;
    totalDataReceived: number;
    lastHeartbeat: Date | null;
    averageMessageInterval: number;
  }
  
  // 이벤트 타입 정의
  export interface WebSocketEvents {
    'crypto_update': CryptoData[];
    'sp500_update': SP500Data[];
    'topgainers_update': TopGainersData[];
    'connection_change': { type: WebSocketType; status: ConnectionStatus };
    'error': { type: WebSocketType; error: string };
    'debug': DebugInfo; // 🎯 새로운 디버그 이벤트
    'metrics': { type: WebSocketType; metrics: ConnectionMetrics }; // 🎯 메트릭스 이벤트
  }
  
  export type EventCallback<T = any> = (data: T) => void;
  export type Unsubscribe = () => void;
  
  class EnhancedWebSocketService {
    private connections: Map<WebSocketType, WebSocket> = new Map();
    private connectionStatuses: Map<WebSocketType, ConnectionStatus> = new Map();
    private subscribers: Map<string, EventCallback[]> = new Map();
    private reconnectTimeouts: Map<WebSocketType, NodeJS.Timeout> = new Map();
    private reconnectAttempts: Map<WebSocketType, number> = new Map();
    
    // 🎯 강화된 디버깅 및 메트릭스
    private debugLogs: DebugInfo[] = [];
    private connectionMetrics: Map<WebSocketType, ConnectionMetrics> = new Map();
    private messageBuffer: Map<WebSocketType, WebSocketMessage[]> = new Map();
    private isDebugMode: boolean = true; // 디버그 모드 기본 활성화
    
    private maxReconnectAttempts = 5;
    private baseReconnectDelay = 1000;
    private maxDebugLogs = 100; // 최대 디버그 로그 개수
    private maxMessageBuffer = 50; // 최대 메시지 버퍼 개수
  
    private isInitialized = false;
  
    constructor() {
      // 초기 상태 설정
      (['crypto', 'sp500', 'topgainers'] as WebSocketType[]).forEach(type => {
        this.connectionStatuses.set(type, 'disconnected');
        this.reconnectAttempts.set(type, 0);
        this.messageBuffer.set(type, []);
        this.connectionMetrics.set(type, {
          type,
          connectedAt: null,
          lastMessageAt: null,
          messageCount: 0,
          errorCount: 0,
          reconnectCount: 0,
          totalDataReceived: 0,
          lastHeartbeat: null,
          averageMessageInterval: 0,
        });
      });
    }
  
    // ============================================================================
    // 🎯 강화된 디버깅 메소드들
    // ============================================================================
  
    /**
     * 디버그 정보 로깅
     */
    private logDebug(type: WebSocketType, event: DebugInfo['event'], data: any, metadata?: DebugInfo['metadata']): void {
      if (!this.isDebugMode) return;
  
      const debugInfo: DebugInfo = {
        type,
        event,
        timestamp: new Date(),
        data,
        metadata
      };
  
      // 디버그 로그 저장 (최대 개수 제한)
      this.debugLogs.push(debugInfo);
      if (this.debugLogs.length > this.maxDebugLogs) {
        this.debugLogs.shift();
      }
  
      // 이벤트 발생
      this.emitEvent('debug', debugInfo);
  
      // 콘솔 로깅 강화
      const emoji = this.getEventEmoji(event);
      const typeColor = this.getTypeColor(type);
      
      console.log(
        `%c${emoji} [${type.toUpperCase()}] ${event}%c`,
        `color: ${typeColor}; font-weight: bold;`,
        'color: inherit;',
        {
          timestamp: debugInfo.timestamp.toISOString(),
          data: this.sanitizeLogData(data),
          metadata
        }
      );
    }
  
    /**
     * 메트릭스 업데이트
     */
    private updateMetrics(type: WebSocketType, event: 'message' | 'error' | 'connect' | 'heartbeat', dataSize?: number): void {
      const metrics = this.connectionMetrics.get(type)!;
      const now = new Date();
  
      switch (event) {
        case 'connect':
          metrics.connectedAt = now;
          metrics.reconnectCount++;
          break;
        case 'message':
          metrics.lastMessageAt = now;
          metrics.messageCount++;
          if (dataSize) metrics.totalDataReceived += dataSize;
          
          // 평균 메시지 간격 계산
          if (metrics.messageCount > 1 && metrics.connectedAt) {
            const totalDuration = now.getTime() - metrics.connectedAt.getTime();
            metrics.averageMessageInterval = totalDuration / metrics.messageCount;
          }
          break;
        case 'error':
          metrics.errorCount++;
          break;
        case 'heartbeat':
          metrics.lastHeartbeat = now;
          break;
      }
  
      this.connectionMetrics.set(type, metrics);
      this.emitEvent('metrics', { type, metrics });
    }
  
    /**
     * 메시지 버퍼링 (최근 메시지 저장)
     */
    private bufferMessage(type: WebSocketType, message: WebSocketMessage): void {
      const buffer = this.messageBuffer.get(type)!;
      buffer.push(message);
      
      if (buffer.length > this.maxMessageBuffer) {
        buffer.shift();
      }
      
      this.messageBuffer.set(type, buffer);
    }
  
    /**
     * 유틸리티 메소드들
     */
    private getEventEmoji(event: DebugInfo['event']): string {
      const emojiMap: Record<DebugInfo['event'], string> = {
        connection: '🔗',
        message: '📨',
        error: '❌',
        heartbeat: '💓',
        status: '📊'
      };
      return emojiMap[event] || '📋';
    }
  
    private getTypeColor(type: WebSocketType): string {
      const colorMap: Record<WebSocketType, string> = {
        crypto: '#f7931a',    // Bitcoin orange
        sp500: '#1f77b4',     // Blue
        topgainers: '#2ca02c' // Green
      };
      return colorMap[type];
    }
  
    private sanitizeLogData(data: any): any {
      if (Array.isArray(data)) {
        return `Array(${data.length}) [첫 2개: ${JSON.stringify(data.slice(0, 2))}]`;
      }
      if (typeof data === 'object' && data !== null) {
        const keys = Object.keys(data);
        if (keys.length > 5) {
          const preview = keys.slice(0, 5).reduce((acc, key) => {
            acc[key] = data[key];
            return acc;
          }, {} as any);
          return { ...preview, '...': `+${keys.length - 5} more keys` };
        }
      }
      return data;
    }
  
    // ============================================================================
    // 초기화 및 종료 (기존 코드 유지하되 디버깅 강화)
    // ============================================================================
  
    public initialize(): void {
      if (this.isInitialized) {
        this.logDebug('crypto', 'status', { message: 'WebSocket 서비스가 이미 초기화되었습니다.' });
        return;
      }
  
      this.logDebug('crypto', 'status', { message: 'WebSocket 서비스 초기화 시작...' });
      
      // 3가지 WebSocket 연결 시작
      this.connectWebSocket('crypto');
      this.connectWebSocket('sp500');
      this.connectWebSocket('topgainers');
  
      this.isInitialized = true;
      this.logDebug('crypto', 'status', { message: 'WebSocket 서비스 초기화 완료' });
    }
  
    public shutdown(): void {
      this.logDebug('crypto', 'status', { message: 'WebSocket 서비스 종료 시작...' });
  
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
      this.logDebug('crypto', 'status', { message: 'WebSocket 서비스 종료 완료' });
    }
  
    // ============================================================================
    // WebSocket URL 생성 (기존 로직 유지)
    // ============================================================================
  
    private buildWebSocketUrl(type: WebSocketType): string {
      const BASE_API_URL = 'https://api.investment-assistant.site/api/v1';
      const wsUrl = `wss://api.investment-assistant.site/api/v1/ws/${this.getWebSocketPath(type)}`;
      
      this.logDebug(type, 'connection', { 
        message: `WebSocket URL 생성`, 
        url: wsUrl,
        baseUrl: BASE_API_URL 
      });
      
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
    // 🎯 강화된 WebSocket 연결 관리
    // ============================================================================
  
    private connectWebSocket(type: WebSocketType): void {
      // 기존 연결이 있으면 정리
      this.disconnectWebSocket(type);
  
      const url = this.buildWebSocketUrl(type);
      
      this.logDebug(type, 'connection', { 
        message: 'WebSocket 연결 시도',
        url,
        attempt: this.reconnectAttempts.get(type)! + 1
      });
  
      try {
        this.setConnectionStatus(type, 'connecting');
  
        const ws = new WebSocket(url);
        this.connections.set(type, ws);
  
        ws.onopen = () => {
          this.logDebug(type, 'connection', { message: 'WebSocket 연결 성공' });
          this.setConnectionStatus(type, 'connected');
          this.reconnectAttempts.set(type, 0);
          this.updateMetrics(type, 'connect');
        };
  
        ws.onmessage = (event) => {
          this.handleMessage(type, event);
        };
  
        ws.onclose = (event) => {
          this.logDebug(type, 'connection', { 
            message: 'WebSocket 연결 종료',
            code: event.code,
            reason: event.reason,
            wasClean: event.wasClean
          });
          this.handleConnectionClose(type);
        };
  
        ws.onerror = (error) => {
          this.logDebug(type, 'error', { 
            message: 'WebSocket 오류',
            error: error.toString(),
            readyState: ws.readyState
          });
          this.updateMetrics(type, 'error');
          this.emitEvent('error', { type, error: error.toString() });
          this.handleConnectionClose(type);
        };
  
      } catch (error) {
        this.logDebug(type, 'error', { 
          message: 'WebSocket 연결 실패',
          error: error instanceof Error ? error.message : String(error)
        });
        this.updateMetrics(type, 'error');
        this.setConnectionStatus(type, 'disconnected');
        this.scheduleReconnect(type);
      }
    }
  
    // ============================================================================
    // 🎯 대폭 강화된 메시지 처리
    // ============================================================================
  
    private handleMessage(type: WebSocketType, event: MessageEvent): void {
      const messageSize = event.data.length;
      
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        
        // 메시지 버퍼링
        this.bufferMessage(type, message);
        
        // 메트릭스 업데이트
        this.updateMetrics(type, 'message', messageSize);
        
        // 🎯 상세한 메시지 분석 로깅
        const messageAnalysis = {
          messageType: message.type,
          hasData: !!message.data,
          dataLength: Array.isArray(message.data) ? message.data.length : 0,
          timestamp: message.timestamp,
          status: message.status,
          subscriptionInfo: message.subscription_info,
          serverInfo: message.server_info,
          connectedClients: message.connected_clients,
          fullMessageKeys: Object.keys(message),
          messageSize,
          hasServerTime: !!(message as any).server_time,
          dataType: message.data ? typeof message.data : 'none'
        };
        
        this.logDebug(type, 'message', {
          message: `메시지 수신`,
          analysis: messageAnalysis,
          sampleData: Array.isArray(message.data) ? message.data.slice(0, 2) : message.data
        });
        
        // 하트비트 메시지 처리
        if (message.type === 'heartbeat') {
          this.logDebug(type, 'heartbeat', { 
            message: '하트비트 수신',
            serverTime: (message as any).server_time,
            dataType: (message as any).data_type
          });
          this.updateMetrics(type, 'heartbeat');
          return;
        }
  
        // 상태 메시지 처리
        if (message.type === 'status' || message.status) {
          this.logDebug(type, 'status', {
            message: '상태 메시지 수신',
            status: message.status,
            subscriptionInfo: message.subscription_info,
            connectedClients: message.connected_clients,
            serverInfo: message.server_info
          });
          return;
        }
  
        // 🎯 데이터 업데이트 처리 - 대폭 강화된 디버깅
        this.processDataUpdate(type, message, messageAnalysis);
  
      } catch (error) {
        this.logDebug(type, 'error', {
          message: '메시지 파싱 오류',
          error: error instanceof Error ? error.message : String(error),
          rawData: event.data.substring(0, 200),
          messageSize
        });
        this.updateMetrics(type, 'error');
      }
    }
  
    /**
     * 🎯 데이터 업데이트 처리 메소드 (새로 분리)
     */
    private processDataUpdate(type: WebSocketType, message: WebSocketMessage, analysis: any): void {
      const updateHandlers = {
        'crypto_update': () => {
          if (type === 'crypto' && message.data) {
            this.logDebug(type, 'message', {
              message: '✅ crypto 데이터 업데이트 성공',
              itemCount: message.data.length,
              sampleItems: message.data.slice(0, 2),
              updateType: 'crypto_update'
            });
            this.emitEvent('crypto_update', message.data as CryptoData[]);
            return true;
          }
          this.logDebug(type, 'error', {
            message: '❌ crypto_update 조건 불일치',
            expectedType: 'crypto',
            actualType: type,
            hasData: !!message.data,
            messageType: message.type
          });
          return false;
        },
        
        'sp500_update': () => {
          if (type === 'sp500' && message.data) {
            this.logDebug(type, 'message', {
              message: '✅ sp500 데이터 업데이트 성공',
              itemCount: message.data.length,
              sampleItems: message.data.slice(0, 2),
              updateType: 'sp500_update'
            });
            this.emitEvent('sp500_update', message.data as SP500Data[]);
            return true;
          }
          this.logDebug(type, 'error', {
            message: '❌ sp500_update 조건 불일치',
            expectedType: 'sp500',
            actualType: type,
            hasData: !!message.data,
            messageType: message.type,
            possibleReasons: [
              'Redis에 sp500 데이터가 없음',
              'WebSocket 서버에서 데이터를 보내지 않음',
              '메시지 타입 불일치'
            ]
          });
          return false;
        },
        
        'topgainers_update': () => {
          if (type === 'topgainers' && message.data) {
            this.logDebug(type, 'message', {
              message: '✅ topgainers 데이터 업데이트 성공',
              itemCount: message.data.length,
              sampleItems: message.data.slice(0, 2),
              updateType: 'topgainers_update'
            });
            this.emitEvent('topgainers_update', message.data as TopGainersData[]);
            return true;
          }
          this.logDebug(type, 'error', {
            message: '❌ topgainers_update 조건 불일치',
            expectedType: 'topgainers',
            actualType: type,
            hasData: !!message.data,
            messageType: message.type,
            possibleReasons: [
              'Redis에 topgainers 데이터가 없음',
              'WebSocket 서버에서 데이터를 보내지 않음',
              '장 마감으로 인한 데이터 부족'
            ]
          });
          return false;
        }
      };
  
      const handler = updateHandlers[message.type as keyof typeof updateHandlers];
      if (handler) {
        const success = handler();
        if (!success) {
          // 실패한 경우 추가 진단 정보 제공
          this.provideDiagnosticInfo(type, message, analysis);
        }
      } else {
        this.logDebug(type, 'message', {
          message: '🤔 알 수 없는 메시지 타입',
          messageType: message.type,
          knownTypes: Object.keys(updateHandlers),
          fullMessage: message
        });
      }
    }
  
    /**
     * 🎯 진단 정보 제공 (문제 해결 도움)
     */
    private provideDiagnosticInfo(type: WebSocketType, message: WebSocketMessage, analysis: any): void {
      const metrics = this.connectionMetrics.get(type)!;
      const recentMessages = this.messageBuffer.get(type)!.slice(-5);
      
      this.logDebug(type, 'error', {
        message: '🔍 진단 정보',
        connectionMetrics: {
          messageCount: metrics.messageCount,
          lastMessageAt: metrics.lastMessageAt,
          averageInterval: metrics.averageMessageInterval,
          errorCount: metrics.errorCount
        },
        recentMessageTypes: recentMessages.map(msg => ({
          type: msg.type,
          hasData: !!msg.data,
          timestamp: msg.timestamp
        })),
        currentMessage: analysis,
        troubleshooting: {
          checkRedisData: `Redis에 ${type} 데이터가 있는지 확인 필요`,
          checkWebSocketServer: `백엔드 WebSocket 서버 로그 확인 필요`,
          checkMessageFormat: `메시지 형식이 예상과 다를 수 있음`,
          possibleActions: [
            'Redis 데이터 직접 확인',
            '백엔드 WebSocket 로그 확인',
            'WebSocket 서버 재시작',
            '임시 테스트 데이터 삽입'
          ]
        }
      });
    }
  
    // ============================================================================
    // 기존 메소드들 (연결 상태 관리, 구독 등) - 유지
    // ============================================================================
  
    private setConnectionStatus(type: WebSocketType, status: ConnectionStatus): void {
      const previousStatus = this.connectionStatuses.get(type);
      
      if (previousStatus !== status) {
        this.connectionStatuses.set(type, status);
        this.emitEvent('connection_change', { type, status });
        this.logDebug(type, 'connection', {
          message: '연결 상태 변경',
          from: previousStatus,
          to: status
        });
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
        this.logDebug(type, 'error', {
          message: '최대 재연결 시도 횟수 초과',
          attempts,
          maxAttempts: this.maxReconnectAttempts
        });
        return;
      }
  
      const delay = this.baseReconnectDelay * Math.pow(2, attempts);
      this.logDebug(type, 'connection', {
        message: '재연결 예약',
        delay,
        attempt: attempts + 1,
        maxAttempts: this.maxReconnectAttempts
      });
  
      this.reconnectAttempts.set(type, attempts + 1);
      this.setConnectionStatus(type, 'reconnecting');
  
      const timeout = setTimeout(() => {
        this.connectWebSocket(type);
      }, delay);
  
      this.reconnectTimeouts.set(type, timeout);
    }
  
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
    // 🎯 새로운 디버깅 API들
    // ============================================================================
  
    /**
     * 디버그 모드 토글
     */
    public toggleDebugMode(): boolean {
      this.isDebugMode = !this.isDebugMode;
      localStorage.setItem('websocket-debug-mode', this.isDebugMode.toString());
      this.logDebug('crypto', 'status', { 
        message: '디버그 모드 변경',
        enabled: this.isDebugMode 
      });
      return this.isDebugMode;
    }
  
    /**
     * 모든 디버그 로그 가져오기
     */
    public getDebugLogs(type?: WebSocketType): DebugInfo[] {
      if (type) {
        return this.debugLogs.filter(log => log.type === type);
      }
      return [...this.debugLogs];
    }
  
    /**
     * 특정 타입의 메트릭스 가져오기
     */
    public getMetrics(type: WebSocketType): ConnectionMetrics | null {
      return this.connectionMetrics.get(type) || null;
    }
  
    /**
     * 모든 메트릭스 가져오기
     */
    public getAllMetrics(): Record<WebSocketType, ConnectionMetrics> {
      return {
        crypto: this.getMetrics('crypto')!,
        sp500: this.getMetrics('sp500')!,
        topgainers: this.getMetrics('topgainers')!,
      };
    }
  
    /**
     * 최근 메시지 버퍼 가져오기
     */
    public getRecentMessages(type: WebSocketType, count: number = 10): WebSocketMessage[] {
      const buffer = this.messageBuffer.get(type) || [];
      return buffer.slice(-count);
    }
  
    /**
     * 진단 리포트 생성
     */
    public generateDiagnosticReport(): any {
      const now = new Date();
      
      return {
        timestamp: now.toISOString(),
        debugMode: this.isDebugMode,
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
        metrics: this.getAllMetrics(),
        recentActivity: Object.fromEntries(
          (['crypto', 'sp500', 'topgainers'] as WebSocketType[]).map(type => [
            type,
            {
              recentMessages: this.getRecentMessages(type, 5).map(msg => ({
                type: msg.type,
                hasData: !!msg.data,
                timestamp: msg.timestamp
              })),
              recentErrors: this.getDebugLogs(type)
                .filter(log => log.event === 'error')
                .slice(-3)
                .map(log => ({
                  timestamp: log.timestamp,
                  data: log.data
                }))
            }
          ])
        ),
        troubleshooting: {
          commonIssues: [
            {
              issue: 'sp500/topgainers 데이터 없음',
              causes: [
                'Redis에 해당 데이터가 없음 (장 마감)',
                'WebSocket 서버에서 해당 타입 데이터를 보내지 않음',
                '메시지 타입이 예상과 다름'
              ],
              solutions: [
                'Redis 데이터 직접 확인: redis-cli keys "*sp500*"',
                '백엔드 WebSocket 로그 확인',
                '임시 테스트 데이터 Redis에 삽입',
                'WebSocket 서버 재시작'
              ]
            }
          ],
          nextSteps: [
            '1. Redis 데이터 확인',
            '2. 백엔드 WebSocket 서버 로그 확인',
            '3. 테스트 데이터 삽입 후 재테스트',
            '4. 메시지 형식 검증'
          ]
        }
      };
    }
  
    /**
     * 강제로 테스트 메시지 시뮬레이션 (디버깅용)
     */
    public simulateMessage(type: WebSocketType, messageType: string, testData?: any): void {
      if (!this.isDebugMode) {
        console.warn('디버그 모드가 비활성화되어 있습니다.');
        return;
      }
  
      const simulatedMessage = {
        type: messageType,
        data: testData || this.generateTestData(type),
        timestamp: new Date().toISOString(),
        simulated: true
      };
  
      this.logDebug(type, 'message', {
        message: '🧪 시뮬레이션 메시지',
        simulatedMessage
      });
  
      // 실제 메시지 처리 로직 실행
      const fakeEvent = {
        data: JSON.stringify(simulatedMessage)
      } as MessageEvent;
  
      this.handleMessage(type, fakeEvent);
    }
  
    /**
     * 테스트 데이터 생성
     */
    private generateTestData(type: WebSocketType): any {
      switch (type) {
        case 'crypto':
          return [
            {
              market: 'KRW-BTC',
              trade_price: 50000000,
              signed_change_rate: 0.05,
              signed_change_price: 2500000,
              trade_volume: 0.1,
              acc_trade_volume_24h: 1000,
              change: 'RISE',
              source: 'test'
            }
          ];
        case 'sp500':
          return [
            {
              symbol: 'AAPL',
              price: 175.50,
              volume: 1000000,
              timestamp_ms: Date.now(),
              category: 'technology',
              source: 'test'
            }
          ];
        case 'topgainers':
          return [
            {
              symbol: 'TSLA',
              name: 'Tesla Inc.',
              price: 250.00,
              change_amount: 15.50,
              change_percent: 6.6,
              volume: 2000000,
              market_cap: 800000000000,
              sector: 'automotive',
              source: 'test'
            }
          ];
        default:
          return [];
      }
    }
  
    /**
     * WebSocket 연결 상태 확인
     */
    public checkConnectionHealth(): Record<WebSocketType, any> {
      const health: Record<WebSocketType, any> = {} as any;
  
      (['crypto', 'sp500', 'topgainers'] as WebSocketType[]).forEach(type => {
        const ws = this.connections.get(type);
        const metrics = this.connectionMetrics.get(type)!;
        const status = this.getConnectionStatus(type);
  
        health[type] = {
          status,
          connected: status === 'connected',
          readyState: ws?.readyState,
          readyStateText: ws ? this.getReadyStateText(ws.readyState) : 'N/A',
          url: ws?.url,
          lastMessage: metrics.lastMessageAt,
          messageCount: metrics.messageCount,
          errorCount: metrics.errorCount,
          timeSinceLastMessage: metrics.lastMessageAt 
            ? Date.now() - metrics.lastMessageAt.getTime() 
            : null,
          isHealthy: this.isConnectionHealthy(type, metrics),
          issues: this.detectConnectionIssues(type, metrics, status)
        };
      });
  
      return health;
    }
  
    private getReadyStateText(readyState: number): string {
      const states = {
        0: 'CONNECTING',
        1: 'OPEN',
        2: 'CLOSING',
        3: 'CLOSED'
      };
      return states[readyState as keyof typeof states] || 'UNKNOWN';
    }
  
    private isConnectionHealthy(type: WebSocketType, metrics: ConnectionMetrics): boolean {
      const now = Date.now();
      const fiveMinutesAgo = now - (5 * 60 * 1000);
  
      // 연결되어 있고, 5분 이내에 메시지를 받았거나 하트비트가 있으면 건강함
      return this.getConnectionStatus(type) === 'connected' && 
             ((metrics.lastMessageAt && metrics.lastMessageAt.getTime() > fiveMinutesAgo ||
              metrics.lastHeartbeat && metrics.lastHeartbeat.getTime() > fiveMinutesAgo)) || false;
    }
  
    private detectConnectionIssues(type: WebSocketType, metrics: ConnectionMetrics, status: ConnectionStatus): string[] {
      const issues: string[] = [];
      const now = Date.now();
  
      if (status !== 'connected') {
        issues.push(`연결 상태가 ${status}입니다.`);
      }
  
      if (metrics.errorCount > 5) {
        issues.push(`에러가 ${metrics.errorCount}회 발생했습니다.`);
      }
  
      if (metrics.lastMessageAt) {
        const timeSinceLastMessage = now - metrics.lastMessageAt.getTime();
        if (timeSinceLastMessage > 5 * 60 * 1000) { // 5분
          issues.push(`마지막 메시지로부터 ${Math.round(timeSinceLastMessage / 60000)}분이 지났습니다.`);
        }
      } else {
        issues.push('아직 메시지를 받지 못했습니다.');
      }
  
      if (type !== 'crypto' && metrics.messageCount === 0) {
        issues.push('데이터 업데이트 메시지가 없습니다. Redis 데이터를 확인하세요.');
      }
  
      return issues;
    }
  
    // ============================================================================
    // 기존 Public API 메소드들 (유지)
    // ============================================================================
  
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
  
    public reconnect(type: WebSocketType): void {
      this.logDebug(type, 'connection', { message: '수동 재연결 시도' });
      this.reconnectAttempts.set(type, 0);
      this.connectWebSocket(type);
    }
  
    public reconnectAll(): void {
      this.logDebug('crypto', 'connection', { message: '모든 WebSocket 재연결 시도' });
      (['crypto', 'sp500', 'topgainers'] as WebSocketType[]).forEach(type => {
        this.reconnectAttempts.set(type, 0);
        this.connectWebSocket(type);
      });
    }
  
    /**
     * 레거시 getStatus() 메소드 (기존 코드 호환성)
     */
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
        ),
        debugMode: this.isDebugMode,
        metrics: this.getAllMetrics()
      };
    }
  
    public logStatus(): void {
      console.log('📊 WebSocket 서비스 상태:', this.getStatus());
    }
  }
  
  // 싱글톤 인스턴스 생성 및 export
  export const enhancedWebSocketService = new EnhancedWebSocketService();
  
  // 기본 export
  export default enhancedWebSocketService;