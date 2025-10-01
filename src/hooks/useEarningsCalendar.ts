// hooks/useEarningsCalendar.ts
// 실적 캘린더 데이터 관리를 위한 커스텀 훅

import { useState, useEffect, useCallback } from 'react';
import { earningsCalendarService, CalendarDateUtils } from '../services/earningsCalendarService';
import {
  EarningsEvent,
  EarningsCalendarResponse,
  WeeklyEarningsResponse,
  WeeklyEarningsNewsResponse,
  EarningsNewsResponse,
  CalendarEventDisplay,
  EventImportance,
  CalendarLoadingState,
  CalendarErrorState
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
 * 실적 캘린더 메인 훅
 * 
 * 기능:
 * - 전체 캘린더 데이터 관리
 * - 캐싱을 통한 성능 최적화
 * - 부분적 에러 처리
 * - 날짜 필터링 및 그룹화
 */
export function useEarningsCalendar() {
  // 데이터 상태
  const [calendarData, setCalendarData] = useState<EarningsEvent[]>([]);
  const [weeklyData, setWeeklyData] = useState<EarningsEvent[]>([]);
  const [weeklyNewsData, setWeeklyNewsData] = useState<WeeklyEarningsNewsResponse | null>(null);
  const [selectedEventNews, setSelectedEventNews] = useState<EarningsNewsResponse | null>(null);
  
  // 로딩 상태
  const [loading, setLoading] = useState<CalendarLoadingState>({
    calendar: false,
    weekly: false,
    news: false,
    overall: false
  });
  
  // 에러 상태
  const [errors, setErrors] = useState<CalendarErrorState>({
    calendar: null,
    weekly: null,
    news: null,
    general: null
  });
  
  // 캐시 상태 (간단한 메모리 캐시)
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);
  const CACHE_DURATION = 5 * 60 * 1000; // 5분 캐시
  
  /**
   * 중요도 계산 함수
   * news_count 기반으로 중요도 결정
   */
  const calculateImportance = useCallback((event: EarningsEvent): EventImportance => {
    const newsCount = event.total_news_count;
    if (newsCount >= 10) return 'high';
    if (newsCount >= 5) return 'medium';
    return 'low';
  }, []);
  
  /**
   * 이벤트를 디스플레이용으로 변환
   */
  const transformEventForDisplay = useCallback((event: EarningsEvent): CalendarEventDisplay => {
    return {
      ...event,
      importance: calculateImportance(event),
      display_time: new Date(event.report_date).toLocaleDateString('ko-KR'),
      has_news: event.total_news_count > 0
    };
  }, [calculateImportance]);
  
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
   * 전체 캘린더 데이터 조회
   */
  const fetchCalendarData = useCallback(async (forceRefresh: boolean = false) => {
    // 캐시 확인
    const now = Date.now();
    if (!forceRefresh && calendarData.length > 0 && (now - lastFetchTime) < CACHE_DURATION) {
      console.log('📅 Using cached calendar data');
      return;
    }
    
    updateLoading('calendar', true);
    updateLoading('overall', true);
    updateError('calendar', null);
    
    try {
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 12); // 과거 12개월
      
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 12); // 향후 12개월
      
      const params = {
        start_date: CalendarDateUtils.formatForApi(startDate),
        end_date: CalendarDateUtils.formatForApi(endDate),
        limit: 2000
      };
      
      console.log('📅 Fetching calendar data with params:', params);
      
      const response: EarningsCalendarResponse = await earningsCalendarService.getEarningsCalendar(params);
      
      setCalendarData(response.items);
      setLastFetchTime(now);
      
      console.log(`✅ Calendar data loaded: ${response.items.length} events`);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      updateError('calendar', `캘린더 데이터 로드 실패: ${errorMessage}`);
      console.error('❌ Calendar data fetch failed:', error);
    } finally {
      updateLoading('calendar', false);
      updateLoading('overall', false);
    }
  }, [calendarData.length, lastFetchTime, updateLoading, updateError]);
  
  /**
   * 주간 실적 뉴스 조회 (새로운 API)
   */
  const fetchWeeklyNewsData = useCallback(async () => {
    updateLoading('weekly', true);
    updateError('weekly', null);
    
    try {
      console.log('📰 Fetching weekly earnings news');
      
      const response: WeeklyEarningsNewsResponse = await earningsCalendarService.getWeeklyEarningsNews();
      
      setWeeklyNewsData(response);
      
      console.log(`✅ Weekly news data loaded: ${response.earnings_with_news.length} companies, ${response.total_news_count} news`);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      updateError('weekly', `주간 뉴스 데이터 로드 실패: ${errorMessage}`);
      console.error('❌ Weekly news data fetch failed:', error);
    } finally {
      updateLoading('weekly', false);
    }
  }, [updateLoading, updateError]);
  
  /**
   * 주간 데이터 조회 (기존)
   */
  const fetchWeeklyData = useCallback(async () => {
    updateLoading('weekly', true);
    updateError('weekly', null);
    
    try {
      console.log('📅 Fetching weekly data');
      
      const response: WeeklyEarningsResponse = await earningsCalendarService.getWeeklyEarnings();
      
      setWeeklyData(response.events);
      
      console.log(`✅ Weekly data loaded: ${response.events.length} events`);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      updateError('weekly', `주간 데이터 로드 실패: ${errorMessage}`);
      console.error('❌ Weekly data fetch failed:', error);
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
      
      console.log(`✅ Event news loaded: ${response.forecast_news.length} forecast, ${response.reaction_news?.length || 0} reaction`);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      updateError('news', `뉴스 데이터 로드 실패: ${errorMessage}`);
      console.error('❌ Event news fetch failed:', error);
    } finally {
      updateLoading('news', false);
    }
  }, [updateLoading, updateError]);
  
  /**
   * 특정 날짜의 이벤트 조회
   */
  const getEventsForDate = useCallback((date: Date): CalendarEventDisplay[] => {
    const dateString = formatDateForApi(date);
    
    return calendarData
      .filter(event => event.report_date === dateString)
      .map(transformEventForDisplay);
  }, [calendarData, transformEventForDisplay]);
  
  /**
   * 이번 주 이벤트 조회 (캘린더 데이터에서 필터링)
   */
  const getThisWeekEvents = useCallback((): CalendarEventDisplay[] => {
    const { start, end } = getThisWeekRange();
    
    return calendarData
      .filter(event => event.report_date >= start && event.report_date <= end)
      .map(transformEventForDisplay)
      .sort((a, b) => new Date(a.report_date).getTime() - new Date(b.report_date).getTime());
  }, [calendarData, transformEventForDisplay]);
  
  /**
   * 이번 달 이벤트 조회 (캘린더 데이터에서 필터링)
   */
  const getThisMonthEvents = useCallback((): CalendarEventDisplay[] => {
    const { start, end } = getThisMonthRange();
    
    return calendarData
      .filter(event => event.report_date >= start && event.report_date <= end)
      .map(transformEventForDisplay)
      .sort((a, b) => new Date(a.report_date).getTime() - new Date(b.report_date).getTime());
  }, [calendarData, transformEventForDisplay]);
  
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
      fetchWeeklyData(),
      fetchWeeklyNewsData()
    ]);
  }, [fetchCalendarData, fetchWeeklyData, fetchWeeklyNewsData]);
  
  // 컴포넌트 마운트시 초기 데이터 로드
  useEffect(() => {
    fetchCalendarData();
    fetchWeeklyNewsData(); // 주간 뉴스도 초기 로드
  }, [fetchCalendarData, fetchWeeklyNewsData]);
  
  // 유틸리티 계산값들
  const hasAnyData = calendarData.length > 0 || weeklyData.length > 0;
  const hasAnyError = Object.values(errors).some(error => error !== null);
  const isInitialLoading = loading.overall && calendarData.length === 0;
  
  return {
    // 데이터
    calendarData,
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
    transformEventForDisplay
  };
}