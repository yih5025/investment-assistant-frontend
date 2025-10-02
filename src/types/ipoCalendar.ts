// src/types/ipoCalendar.ts
// IPO Calendar API 응답 타입 정의
// 실제 이벤트 타입은 calendar.ts의 IPOEvent, IPOEventDisplay 사용

import { IPOEvent } from './calendar';

export interface IPOCalendarResponse {
  items: IPOEvent[];
  total_count: number;
  start_date: string | null;
  end_date: string | null;
}

export interface IPOMonthlyResponse {
  month: string;
  items: IPOEvent[];
  total_count: number;
}

export interface IPOStatistics {
  total_ipos: number;
  this_month: number;
  next_month: number;
  by_exchange: Record<string, number>;
  avg_price_range: {
    low: number;
    high: number;
  };
  upcoming_7days: number;
}