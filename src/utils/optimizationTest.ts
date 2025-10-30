// utils/optimizationTest.ts
// API 요청 최적화 테스트 유틸리티

import { webSocketManager } from '../services/WebSocketManager';

export interface OptimizationTestResult {
  totalRequests: number;
  requestsPerHour: number;
  averageInterval: number;
  estimatedReduction: number;
  services: {
    [key: string]: {
      interval: number;
      requestsPerHour: number;
    };
  };
}

export class OptimizationTester {
  private startTime: number = 0;
  private requestCounts: { [service: string]: number } = {};
  private lastRequestTimes: { [service: string]: number } = {};

  public startTest(): void {
    this.startTime = Date.now();
    this.requestCounts = {
      crypto: 0,
      sp500: 0,
      topgainers: 0,
      etf: 0
    };
    this.lastRequestTimes = {};

    // console.log('🧪 최적화 테스트 시작');
    
    // 각 서비스의 업데이트 이벤트 모니터링
    webSocketManager.subscribe('sp500_update', () => {
      this.recordRequest('sp500');
    });

    webSocketManager.subscribe('etf_update', () => {
      this.recordRequest('etf');
    });

    webSocketManager.subscribe('crypto_update', () => {
      this.recordRequest('crypto');
    });
  }

  private recordRequest(service: string): void {
    const now = Date.now();
    this.requestCounts[service] = (this.requestCounts[service] || 0) + 1;
    this.lastRequestTimes[service] = now;
    
    // console.log(`📊 ${service} 요청 #${this.requestCounts[service]}`);
  }

  public getTestResults(): OptimizationTestResult {
    const now = Date.now();
    const testDurationHours = (now - this.startTime) / (1000 * 60 * 60);
    
    let totalRequests = 0;
    const services: { [key: string]: { interval: number; requestsPerHour: number } } = {};

    Object.keys(this.requestCounts).forEach(service => {
      const count = this.requestCounts[service] || 0;
      totalRequests += count;
      
      const requestsPerHour = testDurationHours > 0 ? count / testDurationHours : 0;
      const averageInterval = count > 1 ? (now - this.startTime) / count : 0;
      
      services[service] = {
        interval: averageInterval,
        requestsPerHour
      };
    });

    const requestsPerHour = testDurationHours > 0 ? totalRequests / testDurationHours : 0;
    const averageInterval = totalRequests > 0 ? (now - this.startTime) / totalRequests : 0;
    
    // 기존 시스템 대비 예상 감소율 계산
    // 기존: 5초 간격 × 3개 서비스 = 시간당 2,160회
    // 최적화: 60초 간격 (시차 적용) = 시간당 약 240회
    const oldSystemRequestsPerHour = 2160; // (3600 / 5) * 3
    const estimatedReduction = ((oldSystemRequestsPerHour - requestsPerHour) / oldSystemRequestsPerHour) * 100;

    return {
      totalRequests,
      requestsPerHour,
      averageInterval,
      estimatedReduction,
      services
    };
  }

  public logOptimizationSummary(): void {
    const results = this.getTestResults();
    
    // console.log('🎯 최적화 테스트 결과:');
    // console.log(`총 요청 수: ${results.totalRequests}회`);
    // console.log(`시간당 요청 수: ${Math.round(results.requestsPerHour)}회`);
    // console.log(`평균 요청 간격: ${Math.round(results.averageInterval / 1000)}초`);
    // console.log(`예상 요청 감소율: ${Math.round(results.estimatedReduction)}%`);
    
    // console.log('\n📋 서비스별 상세:');
    Object.entries(results.services).forEach(([service, data]) => {
      // console.log(`${service}: ${Math.round(data.requestsPerHour)}회/시간, ${Math.round(data.interval / 1000)}초 간격`);
    });

    if (results.estimatedReduction > 80) {
      // console.log('✅ 최적화 목표 달성! (80% 이상 요청 감소)');
    } else if (results.estimatedReduction > 50) {
      // console.log('🟡 최적화 부분 성공 (50% 이상 요청 감소)');
    } else {
      // console.log('❌ 최적화 목표 미달성 (50% 미만 요청 감소)');
    }
  }

  public getMarketTimeOptimizationInfo(): {
    currentPollingIntervals: { [service: string]: number };
    nextOptimizationTime: string;
    weekendMode: boolean;
  } {
    const status = webSocketManager.getStatus();
    const marketStatus = status.marketStatus;
    
    const now = new Date();
    const dayOfWeek = now.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    
    // 현재 폴링 간격 추정
    const currentPollingIntervals = {
      sp500: marketStatus.isOpen ? 55000 : (isWeekend ? 1800000 : 600000), // 55초/10분/30분
      topgainers: marketStatus.isOpen ? 65000 : (isWeekend ? 1800000 : 600000), // 65초/10분/30분
      etf: marketStatus.isOpen ? 60000 : (isWeekend ? 1800000 : 600000), // 60초/10분/30분
      crypto: 0 // WebSocket (실시간)
    };

    // 다음 최적화 시점 계산
    let nextOptimizationTime = '';
    if (marketStatus.isOpen) {
      nextOptimizationTime = '시장 폐장 시 (폐장 후 10분 간격으로 전환)';
    } else if (isWeekend) {
      nextOptimizationTime = '월요일 시장 개장 시 (1분 간격으로 전환)';
    } else {
      nextOptimizationTime = '시장 개장 시 (1분 간격으로 전환)';
    }

    return {
      currentPollingIntervals,
      nextOptimizationTime,
      weekendMode: isWeekend
    };
  }
}

// 싱글톤 인스턴스
export const optimizationTester = new OptimizationTester();

// 개발자 도구용 전역 함수
if (typeof window !== 'undefined') {
  (window as any).testOptimization = {
    start: () => optimizationTester.startTest(),
    results: () => optimizationTester.getTestResults(),
    summary: () => optimizationTester.logOptimizationSummary(),
    marketInfo: () => optimizationTester.getMarketTimeOptimizationInfo()
  };
}
