// src/hooks/useEmailSubscription.ts
// 이메일 구독 관련 커스텀 훅

import { useState, useCallback } from 'react';
import { 
  emailSubscriptionService, 
  SubscriptionScope,
  SubscriptionResponse,
  SubscriptionStatusResponse 
} from '../services/emailSubscriptionService';

interface UseEmailSubscriptionState {
  // 상태
  loading: boolean;
  error: string | null;
  success: boolean;
  message: string | null;
  
  // 구독 상태
  isSubscribed: boolean;
  subscribedEmail: string | null;
}

interface UseEmailSubscriptionReturn extends UseEmailSubscriptionState {
  // 액션
  subscribe: (email: string, scope?: SubscriptionScope, agreed?: boolean) => Promise<boolean>;
  unsubscribe: (email: string, scope?: SubscriptionScope) => Promise<boolean>;
  checkStatus: (email: string, scope?: SubscriptionScope) => Promise<boolean>;
  clearState: () => void;
}

export function useEmailSubscription(): UseEmailSubscriptionReturn {
  const [state, setState] = useState<UseEmailSubscriptionState>({
    loading: false,
    error: null,
    success: false,
    message: null,
    isSubscribed: false,
    subscribedEmail: null,
  });

  /**
   * 이메일 구독 신청 (Double Opt-in)
   * @param email 구독할 이메일 주소
   * @param scope 구독 범위
   * @param agreed 개인정보 수집/이용 동의 여부
   */
  const subscribe = useCallback(async (email: string, scope: SubscriptionScope = 'SP500', agreed: boolean = true): Promise<boolean> => {
    setState(prev => ({ ...prev, loading: true, error: null, success: false, message: null }));
    
    try {
      const response = await emailSubscriptionService.subscribe(email, scope, agreed);
      
      // Double Opt-in: requires_verification이 true면 인증 메일 발송됨
      setState(prev => ({
        ...prev,
        loading: false,
        success: response.success,
        message: response.message,
        // 인증 대기 상태는 아직 완전한 구독이 아님
        isSubscribed: response.success && !response.requires_verification,
        subscribedEmail: response.success ? email : prev.subscribedEmail,
        error: response.success ? null : response.message,
      }));
      
      return response.success;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '구독 신청 중 오류가 발생했습니다.';
      
      setState(prev => ({
        ...prev,
        loading: false,
        success: false,
        error: errorMessage,
        message: errorMessage,
      }));
      
      return false;
    }
  }, []);

  /**
   * 이메일 구독 취소
   */
  const unsubscribe = useCallback(async (email: string, scope: SubscriptionScope = 'SP500'): Promise<boolean> => {
    setState(prev => ({ ...prev, loading: true, error: null, success: false, message: null }));
    
    try {
      const response = await emailSubscriptionService.unsubscribe(email, scope);
      
      setState(prev => ({
        ...prev,
        loading: false,
        success: response.success,
        message: response.message,
        isSubscribed: response.success ? false : prev.isSubscribed,
        subscribedEmail: response.success ? null : prev.subscribedEmail,
        error: response.success ? null : response.message,
      }));
      
      return response.success;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '구독 취소 중 오류가 발생했습니다.';
      
      setState(prev => ({
        ...prev,
        loading: false,
        success: false,
        error: errorMessage,
        message: errorMessage,
      }));
      
      return false;
    }
  }, []);

  /**
   * 구독 상태 확인
   */
  const checkStatus = useCallback(async (email: string, scope: SubscriptionScope = 'SP500'): Promise<boolean> => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await emailSubscriptionService.getStatus(email, scope);
      
      setState(prev => ({
        ...prev,
        loading: false,
        isSubscribed: response.is_subscribed,
        subscribedEmail: response.is_subscribed ? email : null,
      }));
      
      return response.is_subscribed;
      
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : '상태 확인 실패',
      }));
      
      return false;
    }
  }, []);

  /**
   * 상태 초기화
   */
  const clearState = useCallback(() => {
    setState({
      loading: false,
      error: null,
      success: false,
      message: null,
      isSubscribed: false,
      subscribedEmail: null,
    });
  }, []);

  return {
    ...state,
    subscribe,
    unsubscribe,
    checkStatus,
    clearState,
  };
}

