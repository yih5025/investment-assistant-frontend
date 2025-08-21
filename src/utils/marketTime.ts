// utils/marketTime.ts
// 미국 주식 시장 시간 관리 유틸리티

import { format, utcToZonedTime, zonedTimeToUtc } from 'date-fns-tz';
import { isWeekend, getDay } from 'date-fns';

// 미국 동부 시간대
const US_EASTERN_TIMEZONE = 'America/New_York';

// 미국 주식 시장 공휴일 (2024-2025)
const US_MARKET_HOLIDAYS_2024_2025 = [
  '2024-01-01', // New Year's Day
  '2024-01-15', // Martin Luther King Jr. Day
  '2024-02-19', // Presidents' Day
  '2024-03-29', // Good Friday
  '2024-05-27', // Memorial Day
  '2024-06-19', // Juneteenth
  '2024-07-04', // Independence Day
  '2024-09-02', // Labor Day
  '2024-11-28', // Thanksgiving
  '2024-11-29', // Day after Thanksgiving
  '2024-12-25', // Christmas Day
  '2025-01-01', // New Year's Day
  '2025-01-20', // Martin Luther King Jr. Day
  '2025-02-17', // Presidents' Day
  '2025-04-18', // Good Friday
  '2025-05-26', // Memorial Day
  '2025-06-19', // Juneteenth
  '2025-07-04', // Independence Day
  '2025-09-01', // Labor Day
  '2025-11-27', // Thanksgiving
  '2025-11-28', // Day after Thanksgiving
  '2025-12-25', // Christmas Day
];

export interface MarketSession {
  isOpen: boolean;
  status: 'pre-market' | 'open' | 'after-hours' | 'closed' | 'weekend' | 'holiday';
  currentTime: Date;
  nextOpen: Date | null;
  lastClose: Date | null;
  timeUntilNext: string;
  marketTimeZone: string;
  displayTime: string;
}

/**
 * 현재 미국 주식 시장 상태 확인
 */
export function getMarketStatus(): MarketSession {
  const now = new Date();
  const easternTime = utcToZonedTime(now, US_EASTERN_TIMEZONE);
  const currentHour = easternTime.getHours();
  const currentMinute = easternTime.getMinutes();
  const currentTimeInMinutes = currentHour * 60 + currentMinute;
  
  // 시장 개장 시간 (9:30 AM - 4:00 PM EST)
  const marketOpen = 9 * 60 + 30; // 9:30 AM = 570 minutes
  const marketClose = 16 * 60; // 4:00 PM = 960 minutes
  
  // 현재 날짜 문자열 (YYYY-MM-DD 형식)
  const currentDateStr = format(easternTime, 'yyyy-MM-dd');
  
  // 공휴일 확인
  const isHoliday = US_MARKET_HOLIDAYS_2024_2025.includes(currentDateStr);
  
  // 주말 확인
  const isWeekendDay = isWeekend(easternTime);
  
  // 기본 정보
  const session: MarketSession = {
    isOpen: false,
    status: 'closed',
    currentTime: now,
    nextOpen: null,
    lastClose: null,
    timeUntilNext: '',
    marketTimeZone: US_EASTERN_TIMEZONE,
    displayTime: format(easternTime, 'yyyy-MM-dd HH:mm:ss zzz')
  };

  // 주말인 경우
  if (isWeekendDay) {
    session.status = 'weekend';
    session.nextOpen = getNextTradingDay(easternTime);
    session.timeUntilNext = getTimeUntilNext(session.nextOpen);
    return session;
  }

  // 공휴일인 경우
  if (isHoliday) {
    session.status = 'holiday';
    session.nextOpen = getNextTradingDay(easternTime);
    session.timeUntilNext = getTimeUntilNext(session.nextOpen);
    return session;
  }

  // 평일 시장 시간 확인
  if (currentTimeInMinutes >= marketOpen && currentTimeInMinutes < marketClose) {
    // 시장 개장 중
    session.isOpen = true;
    session.status = 'open';
    session.lastClose = getLastMarketClose(easternTime);
    session.timeUntilNext = getTimeUntilMarketClose(easternTime);
  } else if (currentTimeInMinutes < marketOpen) {
    // 프리마켓 시간
    session.status = 'pre-market';
    session.nextOpen = getMarketOpenTime(easternTime);
    session.timeUntilNext = getTimeUntilNext(session.nextOpen);
  } else {
    // 애프터아워스
    session.status = 'after-hours';
    session.lastClose = getMarketCloseTime(easternTime);
    session.nextOpen = getNextTradingDay(easternTime);
    session.timeUntilNext = getTimeUntilNext(session.nextOpen);
  }

  return session;
}

/**
 * 다음 거래일 계산
 */
function getNextTradingDay(currentDate: Date): Date {
  let nextDay = new Date(currentDate);
  nextDay.setDate(nextDay.getDate() + 1);
  
  // 다음 평일까지 찾기
  while (isWeekend(nextDay) || isMarketHoliday(nextDay)) {
    nextDay.setDate(nextDay.getDate() + 1);
  }
  
  // 9:30 AM으로 설정
  nextDay.setHours(9, 30, 0, 0);
  return nextDay;
}

/**
 * 오늘 시장 개장 시간
 */
function getMarketOpenTime(currentDate: Date): Date {
  const openTime = new Date(currentDate);
  openTime.setHours(9, 30, 0, 0);
  return openTime;
}

/**
 * 오늘 시장 마감 시간
 */
function getMarketCloseTime(currentDate: Date): Date {
  const closeTime = new Date(currentDate);
  closeTime.setHours(16, 0, 0, 0);
  return closeTime;
}

/**
 * 마지막 시장 마감 시간
 */
function getLastMarketClose(currentDate: Date): Date {
  let lastDay = new Date(currentDate);
  lastDay.setDate(lastDay.getDate() - 1);
  
  // 이전 거래일까지 찾기
  while (isWeekend(lastDay) || isMarketHoliday(lastDay)) {
    lastDay.setDate(lastDay.getDate() - 1);
  }
  
  lastDay.setHours(16, 0, 0, 0);
  return lastDay;
}

/**
 * 시장 마감까지 남은 시간
 */
function getTimeUntilMarketClose(currentDate: Date): string {
  const closeTime = getMarketCloseTime(currentDate);
  const timeDiff = closeTime.getTime() - currentDate.getTime();
  
  if (timeDiff <= 0) return '마감됨';
  
  const hours = Math.floor(timeDiff / (1000 * 60 * 60));
  const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 0) {
    return `${hours}시간 ${minutes}분 후 마감`;
  }
  return `${minutes}분 후 마감`;
}

/**
 * 특정 시간까지 남은 시간 계산
 */
function getTimeUntilNext(targetTime: Date | null): string {
  if (!targetTime) return '';
  
  const now = new Date();
  const timeDiff = targetTime.getTime() - now.getTime();
  
  if (timeDiff <= 0) return '';
  
  const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (days > 0) {
    return `${days}일 ${hours}시간 후 개장`;
  } else if (hours > 0) {
    return `${hours}시간 ${minutes}분 후 개장`;
  }
  return `${minutes}분 후 개장`;
}

/**
 * 공휴일 확인
 */
function isMarketHoliday(date: Date): boolean {
  const dateStr = format(date, 'yyyy-MM-dd');
  return US_MARKET_HOLIDAYS_2024_2025.includes(dateStr);
}

/**
 * 시장 상태에 따른 표시 텍스트
 */
export function getMarketStatusText(session: MarketSession): {
  status: string;
  time: string;
  color: string;
  isLive: boolean;
} {
  switch (session.status) {
    case 'open':
      return {
        status: '개장 중',
        time: session.timeUntilNext,
        color: 'text-green-400',
        isLive: true
      };
    case 'pre-market':
      return {
        status: '개장 준비',
        time: session.timeUntilNext,
        color: 'text-yellow-400',
        isLive: false
      };
    case 'after-hours':
      return {
        status: '장 마감',
        time: session.timeUntilNext,
        color: 'text-gray-400',
        isLive: false
      };
    case 'weekend':
      return {
        status: '주말',
        time: session.timeUntilNext,
        color: 'text-gray-400',
        isLive: false
      };
    case 'holiday':
      return {
        status: '공휴일',
        time: session.timeUntilNext,
        color: 'text-gray-400',
        isLive: false
      };
    default:
      return {
        status: '장 마감',
        time: session.timeUntilNext,
        color: 'text-gray-400',
        isLive: false
      };
  }
}

/**
 * 현재 시간을 미국 동부 시간으로 포맷
 */
export function getFormattedEasternTime(): string {
  const now = new Date();
  const easternTime = utcToZonedTime(now, US_EASTERN_TIMEZONE);
  return format(easternTime, 'MM/dd HH:mm EST');
}

/**
 * 데이터 소스 결정 (Redis vs PostgreSQL)
 */
export function shouldUseRealtimeData(session: MarketSession): boolean {
  // 시장이 열려있으면 실시간 데이터(Redis) 우선
  return session.isOpen;
}

/**
 * WebSocket 연결 최적화 여부
 */
export function shouldOptimizeWebSocket(session: MarketSession): boolean {
  // 장 마감 시간에는 WebSocket 연결 최소화
  return !session.isOpen;
}

/**
 * 시장 시간 관리 클래스
 */
export class MarketTimeManager {
  private lastMarketStatus: MarketSession | null = null;

  constructor() {
    // 초기 시장 상태 설정
    this.lastMarketStatus = getMarketStatus();
  }

  /**
   * 현재 시장 상태 반환
   */
  getCurrentMarketStatus(): MarketSession {
    const currentStatus = getMarketStatus();
    this.lastMarketStatus = currentStatus;
    return currentStatus;
  }

  /**
   * 시장이 열려있는지 확인
   */
  isMarketOpen(): boolean {
    return this.getCurrentMarketStatus().isOpen;
  }

  /**
   * 시장 상태 텍스트 반환
   */
  getMarketStatusText(): {
    status: string;
    time: string;
    color: string;
    isLive: boolean;
  } {
    const session = this.getCurrentMarketStatus();
    return getMarketStatusText(session);
  }

  /**
   * 실시간 데이터 사용 여부 결정
   */
  shouldUseRealtimeData(): boolean {
    return shouldUseRealtimeData(this.getCurrentMarketStatus());
  }

  /**
   * WebSocket 최적화 여부
   */
  shouldOptimizeWebSocket(): boolean {
    return shouldOptimizeWebSocket(this.getCurrentMarketStatus());
  }
}