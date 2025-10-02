// types/calendar.ts
// 기존 타입들 + 새로운 통합 타입

// ============ 기존 Earnings 타입들 ============
export interface EarningsEvent {
  id: number;
  symbol: string;
  company_name: string;
  report_date: string;
  fiscal_date_ending: string;
  estimate: number;
  currency: string;
  gics_sector: string;
  gics_sub_industry: string;
  headquarters: string;
  event_type: 'earnings_report' | 'guidance' | 'conference';
  event_title: string;
  event_description: string;
  total_news_count: number;
  forecast_news_count: number;
  reaction_news_count: number;
  created_at: string;
  updated_at: string;
}

export type EventImportance = 'high' | 'medium' | 'low';

export interface CalendarEventDisplay extends EarningsEvent {
  importance: EventImportance;
  display_time: string;
  has_news: boolean;
}

// ============ 새로운 IPO 통합 타입 ============

// IPO 기본 이벤트 (백엔드 응답)
export interface IPOEvent {
  id: number;
  symbol: string;
  company_name: string;
  ipo_date: string;
  price_range_low: number | null;
  price_range_high: number | null;
  currency: string;
  exchange: string | null;
  fetched_at?: string;
  created_at?: string;
  updated_at?: string;
}

// IPO 디스플레이용 타입
export interface IPOEventDisplay extends IPOEvent {
  display_time: string;
  event_type: 'ipo';
  importance: EventImportance;
}

// ============ 통합 캘린더 이벤트 타입 ============

// 모든 이벤트의 통합 타입
export type UnifiedCalendarEvent = CalendarEventDisplay | IPOEventDisplay;

// 타입 가드 함수들
export function isEarningsEvent(event: UnifiedCalendarEvent): event is CalendarEventDisplay {
  return 'report_date' in event;
}

export function isIPOEvent(event: UnifiedCalendarEvent): event is IPOEventDisplay {
  return event.event_type === 'ipo';
}

// ============ API 응답 타입들 ============

export interface EarningsCalendarResponse {
  total_count: number;
  items: EarningsEvent[];
  page: number;
  page_size: number;
}

export interface WeeklyEarningsResponse {
  week_start: string;
  week_end: string;
  total_count: number;
  events: EarningsEvent[];
}

export interface EarningsNewsResponse {
  calendar_info: {
    id: number;
    symbol: string;
    company_name: string;
    report_date: string;
    estimate: string;
    event_title: string;
    gics_sector: string;
  };
  forecast_news: Array<{
    source: string;
    url: string;
    title: string;
    summary: string;
    published_at: string;
  }>;
  reaction_news?: Array<{
    source: string;
    url: string;
    title: string;
    summary: string;
    published_at: string;
  }>;
  forecast_news_count: number;
  reaction_news_count: number;
}

export interface WeeklyEarningsNewsResponse {
  week_start: string;
  week_end: string;
  total_earnings_count: number;
  total_news_count: number;
  earnings_with_news: Array<{
    calendar_info: {
      id: number;
      symbol: string;
      company_name: string;
      report_date: string;
      estimate: string;
      event_title: string;
      gics_sector: string;
    };
    news_count: number;
    forecast_news_count: number;
    reaction_news_count: number;
    forecast_news: Array<{
      source: string;
      url: string;
      title: string;
      summary: string;
      published_at: string;
    }>;
  }>;
}

// ============ 쿼리 파라미터 타입 ============

export interface CalendarQueryParams {
  start_date?: string;
  end_date?: string;
  symbol?: string;
  sector?: string;
  limit?: number;
  offset?: number;
}

// ============ 상태 타입들 ============

export interface CalendarLoadingState {
  calendar: boolean;
  weekly: boolean;
  news: boolean;
  overall: boolean;
}

export interface CalendarErrorState {
  calendar: string | null;
  weekly: string | null;
  news: string | null;
  general: string | null;
}

// ============ IPO 관련 추가 타입 ============

export interface IPOStatistics {
  total_ipos: number;
  upcoming_count: number;
  this_month_count: number;
  average_price: number;
}