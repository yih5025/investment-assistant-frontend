// src/services/emailSubscriptionService.ts
// 이메일 구독 API 서비스

export type SubscriptionScope = 'SP500' | 'NASDAQ' | 'ALL';

export interface SubscriptionResponse {
  success: boolean;
  message: string;
  email?: string;
  scope?: string;
}

export interface SubscriptionStatusResponse {
  email: string;
  is_subscribed: boolean;
  scope: string | null;
  subscribed_at: string | null;
}

export interface SubscriptionStatsResponse {
  scope: string;
  active_subscribers: number;
  message: string;
}

class EmailSubscriptionService {
  private baseURL: string;

  constructor() {
    this.baseURL = import.meta.env.VITE_API_BASE_URL || 'https://api.investment-assistant.site/api/v1';
  }

  /**
   * 이메일 구독 신청
   */
  async subscribe(email: string, scope: SubscriptionScope = 'SP500'): Promise<SubscriptionResponse> {
    const url = `${this.baseURL}/email-subscription/subscribe`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, scope }),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `구독 신청 실패: ${response.statusText}`);
    }
    
    return await response.json();
  }

  /**
   * 이메일 구독 취소 (이메일 기반)
   */
  async unsubscribe(email: string, scope: SubscriptionScope = 'SP500'): Promise<SubscriptionResponse> {
    const url = `${this.baseURL}/email-subscription/unsubscribe`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, scope }),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `구독 취소 실패: ${response.statusText}`);
    }
    
    return await response.json();
  }

  /**
   * 구독 상태 확인
   */
  async getStatus(email: string, scope: SubscriptionScope = 'SP500'): Promise<SubscriptionStatusResponse> {
    const params = new URLSearchParams({
      email,
      scope,
    });
    
    const url = `${this.baseURL}/email-subscription/status?${params.toString()}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`구독 상태 조회 실패: ${response.statusText}`);
    }
    
    return await response.json();
  }

  /**
   * 구독 통계 조회
   */
  async getStats(scope: SubscriptionScope = 'SP500'): Promise<SubscriptionStatsResponse> {
    const url = `${this.baseURL}/email-subscription/stats?scope=${scope}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`구독 통계 조회 실패: ${response.statusText}`);
    }
    
    return await response.json();
  }
}

/**
 * 싱글톤 서비스 인스턴스
 */
export const emailSubscriptionService = new EmailSubscriptionService();

