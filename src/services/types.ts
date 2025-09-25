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

export type EventCallback<T = any> = (data: T) => void;
export type Unsubscribe = () => void;

export interface ServiceConfig {
  maxReconnectAttempts: number;
  baseReconnectDelay: number;
  apiPollingInterval: number;
  marketClosedPollingInterval: number;
  healthCheckInterval: number;
  cacheMaxAge: number;
  errorBackoffInterval: number;
  maxConsecutiveErrors: number;
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
  'topgainers_update': TopGainersData[];
  'topgainers_category_stats': TopGainersCategoryStats;
  'connection_change': { type: WebSocketType; status: ConnectionStatus; mode: DataMode };
  'error': { type: WebSocketType; error: string };
  'market_status_change': { isOpen: boolean; status: string };
}
