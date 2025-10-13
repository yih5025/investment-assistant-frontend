// services/types.ts
// 공통 타입 정의

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


export interface ETFData {
  symbol: string;
  name: string;
  current_price: number;
  change_amount: number;
  change_percentage: number;
  volume: number;
  previous_close?: number;
  is_positive?: boolean;
  change_color?: string;
  last_updated?: string;
  rank?: number;
}

export interface ETFProfile {
  net_assets?: number;
  net_expense_ratio?: number;
  portfolio_turnover?: number;
  dividend_yield?: number;
  inception_date?: string;
  leveraged?: boolean;
  sectors?: Array<{
    sector: string;
    weight: number;
    color?: string;
  }>;
  holdings?: Array<{
    symbol: string;
    description: string;
    weight: number;
  }>;
}

export interface ETFDetailData extends ETFData {
  profile?: ETFProfile;
  chart_data?: Array<{
    timestamp: string;
    price: number;
    volume: number;
    datetime: string;
    raw_timestamp?: number;
  }>;
  sector_chart_data?: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  holdings_chart_data?: Array<{
    symbol: string;
    name: string;
    weight: number;
  }>;
  key_metrics?: {
    net_assets: string;
    net_expense_ratio: string;
    dividend_yield: string;
    inception_year: string;
  };
  timeframe?: string;
  market_status?: {
    is_open: boolean;
    status: string;
    current_time_et: string;
    timezone: string;
  };
}


export interface WebSocketMessage {
  type: string;
  data?: CryptoData[] | SP500Data[] | ETFData[];
  timestamp: string;
  status?: string;
  subscription_info?: any;
  market_status?: {
    is_open: boolean;
    status: string;
    current_time_et: string;
  };
}

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'reconnecting';
export type WebSocketType = 'crypto' | 'sp500' | 'etf';
export type DataMode = 'websocket' | 'api';

export type EventCallback<T = any> = (data: T) => void;
export type Unsubscribe = () => void;

export interface ServiceConfig {
  maxReconnectAttempts: number;
  baseReconnectDelay: number;
  apiPollingInterval: number;
  marketClosedPollingInterval: number;
  weekendPollingInterval: number; // 주말 폴링 간격
  healthCheckInterval: number;
  cacheMaxAge: number;
  errorBackoffInterval: number;
  maxConsecutiveErrors: number;
  // 우선순위 기반 차등 폴링 설정 (레거시, WebSocket에서는 미사용)
  priorityPollingOffsets?: {
    sp500: number;
    etf: number;
  };
  // 백그라운드 로딩 우선순위 설정
  backgroundLoadingDelays?: {
    crypto: number;
    sp500: number;
    etf: number;
  };
}

// 기본 서비스 인터페이스
export interface BaseService {
  initialize(): void;
  shutdown(): void;
  getConnectionStatus(): ConnectionStatus;
  reconnect(): void;
  subscribe<T>(event: string, callback: EventCallback<T>): Unsubscribe;
}

// 이벤트 타입 정의
export interface ServiceEvents {
  'crypto_update': CryptoData[];
  'sp500_update': SP500Data[];
  'etf_update': ETFData[];
  'connection_change': { type: WebSocketType; status: ConnectionStatus; mode: DataMode };
  'error': { type: WebSocketType; error: string };
  'market_status_change': { isOpen: boolean; status: string };
  'background_loading_start': { services: WebSocketType[] };
  'background_loading_complete': { service: WebSocketType; duration: number };
  'background_loading_progress': { completed: number; total: number };
}
