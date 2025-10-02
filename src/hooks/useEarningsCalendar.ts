// hooks/useEarningsCalendar.ts
// IPO와 Earnings를 통합한 캘린더 훅

import { useState, useEffect, useCallback } from 'react';
import { earningsCalendarService, CalendarDateUtils } from '../services/earningsCalendarService';
import { ipoCalendarService } from '../services/ipoCalendarService';
import {
  EarningsEvent,
  IPOEvent,
  EarningsCalendarResponse,
  WeeklyEarningsResponse,
  WeeklyEarningsNewsResponse,
  EarningsNewsResponse,
  CalendarEventDisplay,
  IPOEventDisplay,
  UnifiedCalendarEvent,
  EventImportance,
  CalendarLoadingState,
  CalendarErrorState,
  isEarningsEvent,
  isIPOEvent
} from '../types/calendar';

/**
 * 날짜 유틸리티 함수들
 */
const formatDateForApi = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

const getThisWeekRange = (): { start: string; end: string } => {
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  
  return {
    start: formatDateForApi(startOfWeek),
    end: formatDateForApi(endOfWeek)
  };
};

const getThisMonthRange = (): { start: string; end: string } => {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  
  const startOfMonth = new Date(year, month, 1);
  const endOfMonth = new Date(year, month + 1, 0);
  
  return {
    start: formatDateForApi(startOfMonth),
    end: formatDateForApi(endOfMonth)
  };
};

/**
 * 실적 캘린더 + IPO 통합 훅
 */
export function useEarningsCalendar() {
  // ============ 데이터 상태 ============
  const [calendarData, setCalendarData] = useState<EarningsEvent[]>([]);
  const [ipoData, setIPOData] = useState<IPOEvent[]>([]);
  const [weeklyData, setWeeklyData] = useState<EarningsEvent[]>([]);
  const [weeklyNewsData, setWeeklyNewsData] = useState<WeeklyEarningsNewsResponse | null>(null);
  const [selectedEventNews, setSelectedEventNews] = useState<EarningsNewsResponse | null>(null);
  
  // ============ 로딩 상태 ============
  const [loading, setLoading] = useState<CalendarLoadingState>({
    calendar: false,
    weekly: false,
    news: false,
    overall: false
  });
  
  // ============ 에러 상태 ============
  const [errors, setErrors] = useState<CalendarErrorState>({
    calendar: null,
    weekly: null,
    news: null,
    general: null
  });
  
  // ============ 캐시 상태 ============
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);
  const CACHE_DURATION = 5 * 60 * 1000; // 5분
  
  /**
   * 중요도 계산 함수
   */
  const calculateImportance = useCallback((newsCount: number): EventImportance => {
    if (newsCount >= 10) return 'high';
    if (newsCount >= 5) return 'medium';
    return 'low';
  }, []);
  
  /**
   * Earnings 이벤트를 디스플레이용으로 변환
   */
  const transformEarningsForDisplay = useCallback((event: EarningsEvent): CalendarEventDisplay => {
    return {
      ...event,
      importance: calculateImportance(event.total_news_count),
      display_time: new Date(event.report_date).toLocaleDateString('ko-KR'),
      has_news: event.total_news_count > 0
    };
  }, [calculateImportance]);
  
  /**
   * IPO 이벤트를 디스플레이용으로 변환
   */
  const transformIPOForDisplay = useCallback((ipo: IPOEvent): IPOEventDisplay => {
    const ipoDate = new Date(ipo.ipo_date);
    
    // IPO는 뉴스가 없으므로 기본 중요도 사용
    return {
      ...ipo,
      display_time: ipoDate.toLocaleDateString('ko-KR', { 
        month: 'long', 
        day: 'numeric' 
      }),
      event_type: 'ipo' as const,
      importance: 'medium' as EventImportance // IPO는 기본 medium
    };
  }, []);
  
  /**
   * 로딩 상태 업데이트 헬퍼
   */
  const updateLoading = useCallback((key: keyof CalendarLoadingState, value: boolean) => {
    setLoading(prev => ({ ...prev, [key]: value }));
  }, []);
  
  /**
   * 에러 상태 업데이트 헬퍼
   */
  const updateError = useCallback((key: keyof CalendarErrorState, error: string | null) => {
    setErrors(prev => ({ ...prev, [key]: error }));
  }, []);
  
  /**
   * 전체 캘린더 데이터 조회 (Earnings)
   */
  const fetchCalendarData = useCallback(async (forceRefresh: boolean = false) => {
    updateLoading('calendar', true);
    updateLoading('overall', true);
    updateError('calendar', null);
    
    try {
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 1);
      
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 3);
      
      const params = {
        start_date: CalendarDateUtils.formatForApi(startDate),
        end_date: CalendarDateUtils.formatForApi(endDate),
        limit: 2000
      };
      
      console.log('📅 Fetching earnings calendar data:', params);
      
      const response: EarningsCalendarResponse = await earningsCalendarService.getEarningsCalendar(params);
      
      setCalendarData(response.items);
      setLastFetchTime(Date.now());
      
      console.log(`✅ Earnings calendar loaded: ${response.items.length} events`);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      updateError('calendar', `캘린더 데이터 로드 실패: ${errorMessage}`);
      console.error('❌ Calendar data fetch failed:', error);
    } finally {
      updateLoading('calendar', false);
      updateLoading('overall', false);
    }
  }, [updateLoading, updateError]);
  
  /**
   * IPO 데이터 조회
   */
  const fetchIPOData = useCallback(async () => {
    try {
      console.log('📅 Fetching IPO data');
      
      const response = await ipoCalendarService.getIPOCalendar();
      
      setIPOData(response.items);
      
      console.log(`✅ IPO data loaded: ${response.items.length} events`);
      
    } catch (error) {
      console.error('❌ IPO data fetch failed:', error);
      // IPO는 선택적이므로 전체 에러로 표시하지 않음
    }
  }, []);
  
  /**
   * 주간 실적 뉴스 조회
   */
  const fetchWeeklyNewsData = useCallback(async () => {
    updateLoading('weekly', true);
    updateError('weekly', null);
    
    try {
      console.log('📰 Fetching weekly earnings news');
      
      const response: WeeklyEarningsNewsResponse = await earningsCalendarService.getWeeklyEarningsNews();
      
      setWeeklyNewsData(response);
      
      console.log(`✅ Weekly news loaded: ${response.earnings_with_news.length} companies`);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      updateError('weekly', `주간 뉴스 데이터 로드 실패: ${errorMessage}`);
      console.error('❌ Weekly news fetch failed:', error);
    } finally {
      updateLoading('weekly', false);
    }
  }, [updateLoading, updateError]);
  
  /**
   * 특정 이벤트의 뉴스 조회
   */
  const fetchEventNews = useCallback(async (eventId: number) => {
    updateLoading('news', true);
    updateError('news', null);
    
    try {
      console.log('📰 Fetching news for event:', eventId);
      
      const response: EarningsNewsResponse = await earningsCalendarService.getEarningsNews(eventId);
      
      setSelectedEventNews(response);
      
      console.log(`✅ Event news loaded: ${response.forecast_news.length} forecast`);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      updateError('news', `뉴스 데이터 로드 실패: ${errorMessage}`);
      console.error('❌ Event news fetch failed:', error);
    } finally {
      updateLoading('news', false);
    }
  }, [updateLoading, updateError]);
  
  /**
   * 특정 날짜의 통합 이벤트 조회 (Earnings + IPO)
   */
  const getEventsForDate = useCallback((date: Date): UnifiedCalendarEvent[] => {
    const dateString = formatDateForApi(date);
    
    // Earnings 이벤트
    const earningsEvents = calendarData
      .filter(event => event.report_date === dateString)
      .map(transformEarningsForDisplay);
    
    // IPO 이벤트
    const ipoEvents = ipoData
      .filter(ipo => ipo.ipo_date === dateString)
      .map(transformIPOForDisplay);
    
    // 통합하여 반환
    return [...earningsEvents, ...ipoEvents];
  }, [calendarData, ipoData, transformEarningsForDisplay, transformIPOForDisplay]);
  
  /**
   * 이번 주 통합 이벤트 조회
   */
  const getThisWeekEvents = useCallback((): UnifiedCalendarEvent[] => {
    const { start, end } = getThisWeekRange();
    
    const earningsEvents = calendarData
      .filter(event => event.report_date >= start && event.report_date <= end)
      .map(transformEarningsForDisplay);
    
    const ipoEvents = ipoData
      .filter(ipo => ipo.ipo_date >= start && ipo.ipo_date <= end)
      .map(transformIPOForDisplay);
    
    return [...earningsEvents, ...ipoEvents]
      .sort((a, b) => {
        const dateA = isEarningsEvent(a) ? a.report_date : a.ipo_date;
        const dateB = isEarningsEvent(b) ? b.report_date : b.ipo_date;
        return new Date(dateA).getTime() - new Date(dateB).getTime();
      });
  }, [calendarData, ipoData, transformEarningsForDisplay, transformIPOForDisplay]);
  
  /**
   * 이번 달 통합 이벤트 조회
   */
  const getThisMonthEvents = useCallback((): UnifiedCalendarEvent[] => {
    const { start, end } = getThisMonthRange();
    
    const earningsEvents = calendarData
      .filter(event => event.report_date >= start && event.report_date <= end)
      .map(transformEarningsForDisplay);
    
    const ipoEvents = ipoData
      .filter(ipo => ipo.ipo_date >= start && ipo.ipo_date <= end)
      .map(transformIPOForDisplay);
    
    return [...earningsEvents, ...ipoEvents]
      .sort((a, b) => {
        const dateA = isEarningsEvent(a) ? a.report_date : a.ipo_date;
        const dateB = isEarningsEvent(b) ? b.report_date : b.ipo_date;
        return new Date(dateA).getTime() - new Date(dateB).getTime();
      });
  }, [calendarData, ipoData, transformEarningsForDisplay, transformIPOForDisplay]);
  
  /**
   * 에러 상태 초기화
   */
  const clearErrors = useCallback(() => {
    setErrors({
      calendar: null,
      weekly: null,
      news: null,
      general: null
    });
  }, []);
  
  /**
   * 뉴스 상세 초기화
   */
  const clearSelectedNews = useCallback(() => {
    setSelectedEventNews(null);
  }, []);
  
  /**
   * 전체 데이터 새로고침
   */
  const refreshAll = useCallback(async () => {
    await Promise.all([
      fetchCalendarData(true),
      fetchIPOData(),
      fetchWeeklyNewsData()
    ]);
  }, [fetchCalendarData, fetchIPOData, fetchWeeklyNewsData]);
  
  // ============ 초기 데이터 로드 ============
  useEffect(() => {
    fetchCalendarData();
    fetchIPOData();
    fetchWeeklyNewsData();
  }, []);
  
  // 유틸리티 계산값들
  const hasAnyData = calendarData.length > 0 || ipoData.length > 0 || weeklyData.length > 0;
  const hasAnyError = Object.values(errors).some(error => error !== null);
  const isInitialLoading = loading.overall && calendarData.length === 0 && ipoData.length === 0;
  
  return {
    // 데이터
    calendarData,
    ipoData,
    weeklyData,
    weeklyNewsData,
    selectedEventNews,
    
    // 상태
    loading,
    errors,
    
    // 계산된 데이터
    getEventsForDate,
    getThisWeekEvents,
    getThisMonthEvents,
    
    // 액션
    fetchEventNews,
    fetchWeeklyNewsData,
    refreshAll,
    clearErrors,
    clearSelectedNews,
    
    // 유틸리티
    hasAnyData,
    hasAnyError,
    isInitialLoading,
    transformEarningsForDisplay,
    transformIPOForDisplay
  };
}