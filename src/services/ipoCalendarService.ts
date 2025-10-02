// src/services/ipoCalendarService.ts
// IPO Calendar API 서비스

import {
    IPOCalendarResponse,
    IPOMonthlyResponse,
    IPOStatistics
  } from '../types/ipoCalendar';
  
  class IPOCalendarService {
    private baseURL: string;
  
    constructor() {
      this.baseURL = import.meta.env.VITE_API_BASE_URL || 'https://api.investment-assistant.site/api/v1';
    }
  
    /**
     * 전체 IPO 캘린더 조회
     */
    async getIPOCalendar(params?: {
      start_date?: string;
      end_date?: string;
      exchange?: string;
      limit?: number;
    }): Promise<IPOCalendarResponse> {
      const queryParams = new URLSearchParams();
      
      if (params?.start_date) queryParams.append('start_date', params.start_date);
      if (params?.end_date) queryParams.append('end_date', params.end_date);
      if (params?.exchange) queryParams.append('exchange', params.exchange);
      if (params?.limit) queryParams.append('limit', params.limit.toString());
  
      const url = `${this.baseURL}/ipo-calendar/}`;
      
      console.log('🚀 IPO Calendar API 호출:', url);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`IPO 캘린더 조회 실패: ${response.statusText}`);
      }
      
      return await response.json();
    }
  
    /**
     * 이번 달 IPO 일정 조회
     */
    async getMonthlyIPOs(params?: {
      year?: number;
      month?: number;
    }): Promise<IPOMonthlyResponse> {
      const queryParams = new URLSearchParams();
      
      if (params?.year) queryParams.append('year', params.year.toString());
      if (params?.month) queryParams.append('month', params.month.toString());
  
      const url = `${this.baseURL}/ipo-calendar/monthly?${queryParams.toString()}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`월별 IPO 조회 실패: ${response.statusText}`);
      }
      
      return await response.json();
    }
  
    /**
     * IPO 통계 정보 조회
     */
    async getStatistics(): Promise<IPOStatistics> {
      const url = `${this.baseURL}/ipo-calendar/statistics`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`IPO 통계 조회 실패: ${response.statusText}`);
      }
      
      return await response.json();
    }
  }
  
  /**
   * 싱글톤 서비스 인스턴스
   */
  export const ipoCalendarService = new IPOCalendarService();