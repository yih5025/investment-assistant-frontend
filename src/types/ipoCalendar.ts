// src/types/ipoCalendar.ts
// IPO Calendar 타입 정의

export interface IPOEvent {
    symbol: string;
    company_name: string;
    ipo_date: string; // ISO 형식 날짜 (YYYY-MM-DD)
    price_range_low: number | null;
    price_range_high: number | null;
    currency: string;
    exchange: string | null;
    fetched_at: string;
    created_at: string;
  }
  
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
  
  // 캘린더 표시용 IPO 이벤트
  export interface IPOEventDisplay extends IPOEvent {
    display_time: string; // 화면 표시용 날짜 (예: "10월 1일")
    event_type: 'ipo'; // 이벤트 타입 구분
  }