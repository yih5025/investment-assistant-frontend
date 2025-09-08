// hooks/useCryptoDetail.ts

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  CryptoDetailService, 
  ConceptAPIResponse, 
  EcosystemAPIResponse, 
  InvestmentAPIResponse,
  DetailedKimchiPremiumResponse,
  cryptoDetailService 
} from '../services/cryptoDetailService';

/**
 * 로딩 상태 타입 정의
 * 
 * 왜 개별 로딩 상태를 관리하는가:
 * - 각 탭별로 독립적인 로딩 UI 표시 가능
 * - 일부 데이터 로딩 실패해도 다른 탭은 정상 표시
 * - 사용자는 로딩 완료된 탭부터 확인 가능 (UX 개선)
 */
interface LoadingState {
  concept: boolean;
  ecosystem: boolean;
  investment: boolean;
  detailedKimchi: boolean;
  overall: boolean; // 전체 초기 로딩 상태
}

/**
 * 에러 상태 타입 정의
 * 
 * 왜 에러를 세분화하는가:
 * - 사용자에게 구체적인 에러 메시지 표시 가능
 * - 개발자는 어떤 API에서 문제가 발생했는지 즉시 파악
 * - 재시도 로직을 API별로 구현 가능
 */
interface ErrorState {
  concept: string | null;
  ecosystem: string | null;
  investment: string | null;
  detailedKimchi: string | null;
  general: string | null;
}

/**
 * 훅 반환 타입 정의
 * 
 * 왜 모든 상태와 함수를 객체로 반환하는가:
 * - 구조분해 할당으로 필요한 것만 선택적 사용 가능
 * - 타입스크립트 자동완성 지원
 * - 훅 내부 구현 변경해도 외부 인터페이스는 안정적
 */
interface UseCryptoDetailReturn {
  // 데이터 상태
  conceptData: ConceptAPIResponse | null;
  ecosystemData: EcosystemAPIResponse | null;
  investmentData: InvestmentAPIResponse | null;
  detailedKimchiData: DetailedKimchiPremiumResponse | null;
  
  // 로딩 상태
  loading: LoadingState;
  
  // 에러 상태
  errors: ErrorState;
  
  // 액션 함수들
  refetchAll: () => Promise<void>;
  refetchConcept: () => Promise<void>;
  refetchEcosystem: () => Promise<void>;
  refetchInvestment: () => Promise<void>;
  fetchDetailedKimchi: (sortBy?: string, minVolume?: number) => Promise<void>;
  clearErrors: () => void;
  
  // 유틸리티 상태
  hasAnyData: boolean;
  hasAnyError: boolean;
  isInitialLoading: boolean;
}

/**
 * 메인 CryptoDetail 훅
 * 
 * 설계 원칙:
 * 1. 관심사 분리: 각 API별 독립적 상태 관리
 * 2. 사용자 경험: 점진적 데이터 로딩으로 빠른 피드백
 * 3. 에러 복구: 개별 API 재시도 및 전체 새로고침 지원
 * 4. 메모리 효율: 컴포넌트 언마운트 시 진행중인 요청 취소
 */
export function useCryptoDetail(symbol: string): UseCryptoDetailReturn {
  // 데이터 상태
  const [conceptData, setConceptData] = useState<ConceptAPIResponse | null>(null);
  const [ecosystemData, setEcosystemData] = useState<EcosystemAPIResponse | null>(null);
  const [investmentData, setInvestmentData] = useState<InvestmentAPIResponse | null>(null);
  const [detailedKimchiData, setDetailedKimchiData] = useState<DetailedKimchiPremiumResponse | null>(null);

  // 로딩 상태 (각 API별로 독립적 관리)
  const [loading, setLoading] = useState<LoadingState>({
    concept: false,
    ecosystem: false,
    investment: false,
    detailedKimchi: false,
    overall: false,
  });

  // 에러 상태
  const [errors, setErrors] = useState<ErrorState>({
    concept: null,
    ecosystem: null,
    investment: null,
    detailedKimchi: null,
    general: null,
  });

  /**
   * 진행중인 요청을 추적하는 AbortController
   * 
   * 왜 필요한가:
   * - 컴포넌트 언마운트 시 메모리 누수 방지
   * - 빠른 symbol 변경 시 이전 요청 취소
   * - 중복 요청 방지
   */
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * 에러 상태 업데이트 헬퍼 함수
   * 
   * 왜 별도 함수로 분리했는가:
   * - 에러 상태 업데이트 로직 중복 제거
   * - 에러 로깅 등 부가 기능 추가 용이
   */
  const setError = useCallback((key: keyof ErrorState, error: string | null) => {
    setErrors(prev => ({ ...prev, [key]: error }));
  }, []);

  /**
   * 로딩 상태 업데이트 헬퍼 함수
   */
  const setLoadingState = useCallback((key: keyof LoadingState, isLoading: boolean) => {
    setLoading(prev => ({ ...prev, [key]: isLoading }));
  }, []);

  /**
   * 개념 데이터 조회
   * 
   * 왜 useCallback을 사용했는가:
   * - 의존성 배열 최적화로 불필요한 리렌더링 방지
   * - 다른 훅에서 이 함수를 의존성으로 사용할 때 안정성 확보
   */
  const refetchConcept = useCallback(async () => {
    if (!symbol) return;

    setLoadingState('concept', true);
    setError('concept', null);

    try {
      const data = await cryptoDetailService.fetchConceptData(symbol);
      setConceptData(data);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setError('concept', errorMessage);
      console.error('Failed to fetch concept data:', error);
    } finally {
      setLoadingState('concept', false);
    }
  }, [symbol, setLoadingState, setError]);

  /**
   * 생태계 데이터 조회
   */
  const refetchEcosystem = useCallback(async () => {
    if (!symbol) return;

    setLoadingState('ecosystem', true);
    setError('ecosystem', null);

    try {
      const data = await cryptoDetailService.fetchEcosystemData(symbol);
      setEcosystemData(data);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setError('ecosystem', errorMessage);
      console.error('Failed to fetch ecosystem data:', error);
    } finally {
      setLoadingState('ecosystem', false);
    }
  }, [symbol, setLoadingState, setError]);

  /**
   * 투자 분석 데이터 조회
   */
  const refetchInvestment = useCallback(async () => {
    if (!symbol) return;

    setLoadingState('investment', true);
    setError('investment', null);

    try {
      const data = await cryptoDetailService.fetchInvestmentData(symbol);
      setInvestmentData(data);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setError('investment', errorMessage);
      console.error('Failed to fetch investment data:', error);
    } finally {
      setLoadingState('investment', false);
    }
  }, [symbol, setLoadingState, setError]);

  /**
   * 김치프리미엄 상세 데이터 조회
   * 
   * 왜 별도 함수로 분리했는가:
   * - 38개 조합 데이터는 용량이 크므로 사용자가 요청할 때만 로드
   * - 정렬/필터 옵션을 매번 다르게 요청할 수 있음
   */
  const fetchDetailedKimchi = useCallback(async (sortBy: string = 'premium_desc', minVolume: number = 0) => {
    if (!symbol) return;

    setLoadingState('detailedKimchi', true);
    setError('detailedKimchi', null);

    try {
      const data = await cryptoDetailService.fetchDetailedKimchiPremium(symbol, sortBy, minVolume);
      setDetailedKimchiData(data);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setError('detailedKimchi', errorMessage);
      console.error('Failed to fetch detailed kimchi premium:', error);
    } finally {
      setLoadingState('detailedKimchi', false);
    }
  }, [symbol, setLoadingState, setError]);

  /**
   * 모든 기본 데이터 새로고침
   * 
   * 왜 Promise.allSettled를 사용했는가:
   * - 일부 API 실패해도 성공한 데이터는 표시
   * - 사용자는 부분적으로라도 정보를 확인 가능
   * - 전체 UI가 에러로 인해 차단되지 않음
   */
  const refetchAll = useCallback(async () => {
    if (!symbol) return;

    // 이전 요청이 있다면 취소
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // 새로운 AbortController 생성
    abortControllerRef.current = new AbortController();

    setLoadingState('overall', true);
    setError('general', null);

    try {
      // 병렬로 모든 API 호출
      await Promise.allSettled([
        refetchConcept(),
        refetchEcosystem(),
        refetchInvestment()
      ]);
    } catch (error) {
      // Promise.allSettled는 reject되지 않지만, 예외적인 경우를 대비
      setError('general', 'Failed to load data');
      console.error('Failed to fetch all data:', error);
    } finally {
      setLoadingState('overall', false);
    }
  }, [symbol, refetchConcept, refetchEcosystem, refetchInvestment, setLoadingState, setError]);

  /**
   * 에러 상태 초기화
   * 
   * 사용자가 에러 메시지를 닫을 때 사용
   */
  const clearErrors = useCallback(() => {
    setErrors({
      concept: null,
      ecosystem: null,
      investment: null,
      detailedKimchi: null,
      general: null,
    });
  }, []);

  /**
   * symbol이 변경될 때 자동으로 데이터 로드
   * 
   * 의존성 배열에 refetchAll이 포함된 이유:
   * - symbol 변경 시마다 새로운 데이터 로드 필요
   * - refetchAll 함수가 symbol에 의존하므로 포함 필요
   */
  useEffect(() => {
    if (symbol) {
      // 이전 데이터 초기화
      setConceptData(null);
      setEcosystemData(null);
      setInvestmentData(null);
      setDetailedKimchiData(null);
      
      // 새로운 데이터 로드
      refetchAll();
    }
  }, [symbol, refetchAll]);

  /**
   * 컴포넌트 언마운트 시 정리
   * 
   * 메모리 누수 방지를 위한 cleanup
   */
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // 파생 상태 계산 (매번 계산하지 않고 메모이제이션 가능)
  const hasAnyData = !!(conceptData || ecosystemData || investmentData);
  const hasAnyError = !!(errors.concept || errors.ecosystem || errors.investment || errors.general);
  const isInitialLoading = loading.overall && !hasAnyData;

  return {
    // 데이터
    conceptData,
    ecosystemData,
    investmentData,
    detailedKimchiData,
    
    // 상태
    loading,
    errors,
    
    // 액션
    refetchAll,
    refetchConcept,
    refetchEcosystem,
    refetchInvestment,
    fetchDetailedKimchi,
    clearErrors,
    
    // 파생 상태
    hasAnyData,
    hasAnyError,
    isInitialLoading,
  };
}

/**
 * 김치프리미엄 데이터 전용 훅
 * 
 * 왜 별도 훅으로 분리했는가:
 * - 김치프리미엄 탭에서만 사용하는 특화 기능
 * - 정렬, 필터링 등 김치프리미엄 특화 로직 포함
 * - 메인 훅을 가볍게 유지
 */
export function useKimchiPremiumDetail(symbol: string) {
  const [data, setData] = useState<DetailedKimchiPremiumResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 정렬 및 필터 상태
  const [sortBy, setSortBy] = useState('premium_desc');
  const [minVolume, setMinVolume] = useState(0);

  const fetchData = useCallback(async () => {
    if (!symbol) return;

    setLoading(true);
    setError(null);

    try {
      const result = await cryptoDetailService.fetchDetailedKimchiPremium(symbol, sortBy, minVolume);
      setData(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load kimchi premium data';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [symbol, sortBy, minVolume]);

  // 정렬/필터 변경 시 자동 재조회
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /**
   * 정렬 기준 변경
   * 
   * UI에서 드롭다운이나 버튼으로 정렬 기준 변경할 때 사용
   */
  const changeSortBy = useCallback((newSortBy: string) => {
    setSortBy(newSortBy);
  }, []);

  /**
   * 최소 거래량 필터 변경
   * 
   * UI에서 슬라이더나 입력창으로 필터 변경할 때 사용
   */
  const changeMinVolume = useCallback((newMinVolume: number) => {
    setMinVolume(newMinVolume);
  }, []);

  return {
    data,
    loading,
    error,
    sortBy,
    minVolume,
    refetch: fetchData,
    changeSortBy,
    changeMinVolume,
  };
}