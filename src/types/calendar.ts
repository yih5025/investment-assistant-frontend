// types/calendar.ts
// 백엔드 API 응답과 일치하는 타입 정의

/**
 * 백엔드 SP500EarningsCalendarResponse와 매핑되는 타입
 */
export interface EarningsEvent {
    id: number;
    symbol: string;
    company_name: string;
    report_date: string; // 'YYYY-MM-DD' 형식
    fiscal_date_ending: string;
    estimate: number | null;
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
  
  /**
   * 백엔드 API 응답 구조
   */
  export interface EarningsCalendarResponse {
    items: EarningsEvent[];
    total_count: number;
    message: string;
  }
  
  /**
   * 주간 일정 응답 구조 (백엔드 SP500EarningsCalendarWeeklyResponse)
   */
  export interface WeeklyEarningsResponse {
    week_start: string;
    week_end: string;
    events: EarningsEvent[];
    total_count: number;
    message: string;
  }
  
  /**
   * 뉴스 아이템 구조 (백엔드 API 응답 기반)
   */
  export interface EarningsNews {
    calendar_id: number;
    source_table: string;
    title: string;
    url: string;
    summary: string;
    content: string | null;
    source: string;
    published_at: string;
    news_section: 'forecast' | 'reaction';
    days_from_earnings: number;
    id: number;
    fetched_at: string;
    created_at: string;
    is_forecast_news: boolean;
    is_reaction_news: boolean;
    has_content: boolean;
    short_title: string;
  }
  
  /**
   * 캘린더 정보와 뉴스가 결합된 응답 구조
   */
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
    forecast_news: EarningsNews[];
    reaction_news?: EarningsNews[];
  }
  
  /**
   * API 쿼리 파라미터 타입
   */
  export interface CalendarQueryParams {
    start_date?: string;
    end_date?: string;
    symbol?: string;
    sector?: string;
    limit?: number;
  }
  
  /**
   * 주간 실적 뉴스 응답 구조 (새로운 API)
   */
  export interface WeeklyEarningsNewsResponse {
    week_start: string;
    week_end: string;
    earnings_with_news: WeeklyEarningsWithNews[];
    total_earnings_count: number;
    total_news_count: number;
    forecast_news_count: number;
    reaction_news_count: number;
    message: string;
  }
  
  /**
   * 주간 실적과 뉴스 결합 구조
   */
  export interface WeeklyEarningsWithNews {
    calendar_info: {
      id: number;
      symbol: string;
      company_name: string;
      report_date: string;
      estimate: string;
      event_title: string;
      gics_sector: string;
    };
    forecast_news: EarningsNews[];
    reaction_news: EarningsNews[];
    news_count: number;
    forecast_news_count: number;
    reaction_news_count: number;
  }
  
  /**
   * 캘린더 컴포넌트에서 사용하는 중요도 타입
   * (백엔드에서는 total_news_count로 중요도 판단)
   */
  export type EventImportance = 'high' | 'medium' | 'low';
  
  /**
   * 캘린더 표시용 이벤트 (UI 최적화)
   */
  export interface CalendarEventDisplay extends EarningsEvent {
    importance: EventImportance;
    display_time: string;
    has_news: boolean;
  }
  
  /**
   * 캘린더 탭 타입
   */
  export type CalendarTabType = 'calendar' | 'thisweek' | 'thismonth';
  
  /**
   * 로딩 상태 관리
   */
  export interface CalendarLoadingState {
    calendar: boolean;
    weekly: boolean;
    news: boolean;
    overall: boolean;
  }
  
  /**
   * 에러 상태 관리
   */
  export interface CalendarErrorState {
    calendar: string | null;
    weekly: string | null;
    news: string | null;
    general: string | null;
  }