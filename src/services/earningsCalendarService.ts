// services/earningsCalendarService.ts
// 실적 캘린더 관련 API 통신 서비스

import { 
    EarningsCalendarResponse, 
    WeeklyEarningsResponse,
    WeeklyEarningsNewsResponse,
    EarningsNewsResponse,
    CalendarQueryParams,
    EarningsEvent 
  } from '../types/calendar';
  
  /**
   * API 설정
   */
  const API_BASE_URL = 'https://api.investment-assistant.site/api/v1';
  const DEFAULT_TIMEOUT = 30000;
  
  /**
   * API 에러 클래스
   */
  class EarningsCalendarApiError extends Error {
    constructor(
      message: string,
      public status?: number,
      public statusText?: string
    ) {
      super(message);
      this.name = 'EarningsCalendarApiError';
    }
  }
  
  /**
   * HTTP 요청 유틸리티
   */
  async function apiRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          ...options.headers,
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new EarningsCalendarApiError(
          `API 요청 실패: ${response.statusText}`,
          response.status,
          response.statusText
        );
      }
      
      return await response.json();
      
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof EarningsCalendarApiError) {
        throw error;
      }
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new EarningsCalendarApiError('요청 시간 초과');
      }
      
      throw new EarningsCalendarApiError(
        `네트워크 오류: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
      );
    }
  }
  
  /**
   * URL 쿼리 파라미터 생성
   */
  function buildQueryParams(params: Record<string, any>): string {
    const searchParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, String(value));
      }
    });
    
    const query = searchParams.toString();
    return query ? `?${query}` : '';
  }
  
  /**
   * 실적 캘린더 API 서비스
   */
  export class EarningsCalendarService {
    
    /**
     * 전체 실적 캘린더 조회
     */
    async getEarningsCalendar(params?: CalendarQueryParams): Promise<EarningsCalendarResponse> {
      const queryString = params ? buildQueryParams(params) : '';
      const endpoint = `/sp500-earnings-calendar/${queryString}`;
      
      // console.log('Fetching earnings calendar:', { endpoint, params });
      
      const response = await apiRequest<EarningsCalendarResponse>(endpoint);
      
      // console.log('Earnings calendar response:', {
        total: response.total_count,
        items: response.items.length
      });
      
      return response;
    }
    
    /**
     * 이번 주 실적 일정 조회
     */
    async getWeeklyEarnings(): Promise<WeeklyEarningsResponse> {
      const endpoint = '/sp500-earnings-calendar/weekly';
      
      // console.log('Fetching weekly earnings');
      
      const response = await apiRequest<WeeklyEarningsResponse>(endpoint);
      
      // console.log('Weekly earnings response:', {
        week: `${response.week_start} ~ ${response.week_end}`,
        count: response.events.length
      });
      
      return response;
    }
    
    /**
     * 이번 주 실적 관련 뉴스 조회 (새로운 API)
     */
    async getWeeklyEarningsNews(): Promise<WeeklyEarningsNewsResponse> {
      const endpoint = '/sp500-earnings-news/weekly';
      
      // console.log('Fetching weekly earnings news');
      
      const response = await apiRequest<WeeklyEarningsNewsResponse>(endpoint);
      
      // console.log('Weekly earnings news response:', {
        week: `${response.week_start} ~ ${response.week_end}`,
        earnings_count: response.total_earnings_count,
        news_count: response.total_news_count
      });
      
      return response;
    }
    
    /**
     * 특정 실적 이벤트의 뉴스 조회
     */
    async getEarningsNews(calendarId: number): Promise<EarningsNewsResponse> {
      const endpoint = `/sp500-earnings-news/calendar/${calendarId}`;
      
      // console.log('Fetching earnings news for:', calendarId);
      
      const response = await apiRequest<EarningsNewsResponse>(endpoint);
      
      // console.log('Earnings news response:', {
        symbol: response.calendar_info.symbol,
        forecast_news: response.forecast_news.length,
        reaction_news: response.reaction_news?.length || 0
      });
      
      return response;
    }
    
    /**
     * 향후 실적 일정 조회
     */
    async getUpcomingEarnings(days: number = 30): Promise<EarningsEvent[]> {
      const endpoint = `/sp500-earnings-calendar/upcoming?days=${days}`;
      
      // console.log('Fetching upcoming earnings for days:', days);
      
      const response = await apiRequest<EarningsEvent[]>(endpoint);
      
      // console.log('Upcoming earnings response:', { count: response.length });
      
      return response;
    }
    
    /**
     * 실적 이벤트 검색
     */
    async searchEarnings(query: string, limit: number = 20): Promise<EarningsEvent[]> {
      if (!query || query.trim().length < 2) {
        throw new EarningsCalendarApiError('검색어는 최소 2글자 이상이어야 합니다');
      }
      
      const params = { q: query.trim(), limit };
      const queryString = buildQueryParams(params);
      const endpoint = `/sp500-earnings-calendar/search${queryString}`;
      
      // console.log('Searching earnings:', { query, limit });
      
      const response = await apiRequest<EarningsEvent[]>(endpoint);
      
      // console.log('Search earnings response:', { count: response.length });
      
      return response;
    }
  }
  
  /**
   * 날짜 유틸리티
   */
  export class CalendarDateUtils {
    /**
     * Date를 API 형식으로 변환 (YYYY-MM-DD)
     */
    static formatForApi(date: Date): string {
      return date.toISOString().split('T')[0];
    }
    
    /**
     * 이번 주 범위 계산
     */
    static getThisWeekRange(): { start: string; end: string } {
      const today = new Date();
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      
      return {
        start: this.formatForApi(startOfWeek),
        end: this.formatForApi(endOfWeek)
      };
    }
    
    /**
     * 이번 달 범위 계산
     */
    static getThisMonthRange(): { start: string; end: string } {
      const today = new Date();
      const year = today.getFullYear();
      const month = today.getMonth();
      
      const startOfMonth = new Date(year, month, 1);
      const endOfMonth = new Date(year, month + 1, 0);
      
      return {
        start: this.formatForApi(startOfMonth),
        end: this.formatForApi(endOfMonth)
      };
    }
    
    /**
     * 달력 표시용 날짜 배열 생성
     */
    static getCalendarDays(year: number, month: number): Date[] {
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      
      // 달력 시작일 (이전 달의 마지막 주 포함)
      const startDate = new Date(firstDay);
      startDate.setDate(startDate.getDate() - firstDay.getDay());
      
      // 6주치 날짜 생성
      const days: Date[] = [];
      const currentDate = new Date(startDate);
      
      for (let i = 0; i < 42; i++) {
        days.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      return days;
    }
    
    /**
     * 한국어 요일 이름
     */
    static getDayNames(): string[] {
      return ['일', '월', '화', '수', '목', '금', '토'];
    }
    
    /**
     * 한국어 월 이름
     */
    static getMonthName(month: number): string {
      const months = [
        '1월', '2월', '3월', '4월', '5월', '6월',
        '7월', '8월', '9월', '10월', '11월', '12월'
      ];
      return months[month];
    }
  }
  
  /**
   * 싱글톤 서비스 인스턴스
   */
  export const earningsCalendarService = new EarningsCalendarService();
  
  /**
   * 추가: calendarApiService export (훅에서 사용)
   */
  export { earningsCalendarService as calendarApiService };