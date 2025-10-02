// src/hooks/useIPOCalendar.ts
// IPO Calendar 커스텀 훅

import { useState, useEffect, useCallback } from 'react';
import { ipoCalendarService } from '../services/ipoCalendarService';
import {
  IPOEvent,
  IPOEventDisplay,
  IPOStatistics
} from '../types/ipoCalendar';

const CACHE_DURATION = 5 * 60 * 1000; // 5분

/**
 * IPO Calendar 메인 훅
 */
export function useIPOCalendar() {
  // 데이터 상태
  const [ipoData, setIPOData] = useState<IPOEvent[]>([]);
  const [statistics, setStatistics] = useState<IPOStatistics | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);
  
  // 로딩 및 에러 상태
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * IPO 이벤트를 화면 표시용으로 변환
   */
  const transformIPOForDisplay = useCallback((ipo: IPOEvent): IPOEventDisplay => {
    const ipoDate = new Date(ipo.ipo_date);
    
    return {
      ...ipo,
      display_time: ipoDate.toLocaleDateString('ko-KR', { 
        month: 'long', 
        day: 'numeric' 
      }),
      event_type: 'ipo' as const
    };
  }, []);

  /**
   * 전체 IPO 데이터 조회
   */
  const fetchIPOData = useCallback(async (forceRefresh: boolean = false) => {
    setLoading(true);
    setError(null);
    
    try {
      // 향후 3개월 데이터 조회
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 3);
      
      const params = {
        start_date: new Date().toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        limit: 1000
      };
      
      console.log('📅 Fetching IPO data with params:', params);
      
      const response = await ipoCalendarService.getIPOCalendar(params);
      
      setIPOData(response.items);
      setLastFetchTime(Date.now());
      
      console.log(`✅ IPO data loaded: ${response.items.length} events`);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(`IPO 데이터 로드 실패: ${errorMessage}`);
      console.error('❌ IPO data fetch failed:', err);
    } finally {
      setLoading(false);
    }
  }, []); // dependency 제거하여 함수가 재생성되지 않도록 함

  /**
   * 통계 정보 조회
   */
  const fetchStatistics = useCallback(async () => {
    try {
      console.log('📊 Fetching IPO statistics');
      const stats = await ipoCalendarService.getStatistics();
      setStatistics(stats);
      console.log('✅ IPO statistics loaded:', stats);
    } catch (err) {
      console.error('❌ IPO statistics fetch failed:', err);
      // 통계는 선택적이므로 에러를 전체 상태에 반영하지 않음
    }
  }, []);

  /**
   * 특정 날짜의 IPO 이벤트 조회
   */
  const getIPOsForDate = useCallback((date: Date): IPOEventDisplay[] => {
    const dateString = date.toISOString().split('T')[0];
    
    return ipoData
      .filter(ipo => ipo.ipo_date === dateString)
      .map(transformIPOForDisplay);
  }, [ipoData, transformIPOForDisplay]);

  /**
   * 이번 주 IPO 이벤트 조회
   */
  const getThisWeekIPOs = useCallback((): IPOEventDisplay[] => {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    
    const start = startOfWeek.toISOString().split('T')[0];
    const end = endOfWeek.toISOString().split('T')[0];
    
    return ipoData
      .filter(ipo => ipo.ipo_date >= start && ipo.ipo_date <= end)
      .map(transformIPOForDisplay)
      .sort((a, b) => new Date(a.ipo_date).getTime() - new Date(b.ipo_date).getTime());
  }, [ipoData, transformIPOForDisplay]);

  /**
   * 이번 달 IPO 이벤트 조회
   */
  const getThisMonthIPOs = useCallback((): IPOEventDisplay[] => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    
    const startOfMonth = new Date(year, month, 1);
    const endOfMonth = new Date(year, month + 1, 0);
    
    const start = startOfMonth.toISOString().split('T')[0];
    const end = endOfMonth.toISOString().split('T')[0];
    
    return ipoData
      .filter(ipo => ipo.ipo_date >= start && ipo.ipo_date <= end)
      .map(transformIPOForDisplay)
      .sort((a, b) => new Date(a.ipo_date).getTime() - new Date(b.ipo_date).getTime());
  }, [ipoData, transformIPOForDisplay]);

  /**
   * 에러 초기화
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * 전체 데이터 새로고침
   */
  const refreshAll = useCallback(async () => {
    await Promise.all([
      fetchIPOData(true),
      fetchStatistics()
    ]);
  }, [fetchIPOData, fetchStatistics]);

  // 컴포넌트 마운트시 초기 데이터 로드 (한 번만 실행)
  useEffect(() => {
    fetchIPOData();
    fetchStatistics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 빈 배열로 설정하여 마운트시 한 번만 실행

  return {
    // 데이터
    ipoData,
    statistics,
    
    // 상태
    loading,
    error,
    
    // 계산된 데이터
    getIPOsForDate,
    getThisWeekIPOs,
    getThisMonthIPOs,
    
    // 액션
    refreshAll,
    clearError,
    
    // 유틸리티
    transformIPOForDisplay
  };
}