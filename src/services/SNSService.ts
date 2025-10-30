// src/services/SNSService.ts
// SNS 분석 데이터 관련 API 통신 서비스

// ============================================================================
// 타입 정의
// ============================================================================
// 추가: OHLCV 데이터 타입
export interface OHLCVData {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface SNSPost {
  analysis: {
    post_id: string;
    post_source: string;
    post_timestamp: string;
    author_username: string;
    affected_assets: Array<{
      source: string;
      symbol: string;
      priority: number;
      volatility_score?: number;
    }>;
    analysis_status: string;
    price_analysis?: {
      [symbol: string]: {
        "1h_change"?: number;
        "12h_change"?: number;
        "24h_change"?: number;
        base_price?: number;
      };
    };
    volume_analysis?: {
      [symbol: string]: {
        total_volume_after_1h?: number;
        total_volume_before_1h?: number;
      };
    };
    // 🔴 변경: market_data 구조 단순화 (OHLCV)
    market_data?: {
      [symbol: string]: {
        price_timeline: OHLCVData[];  // 🔴 OHLCV 배열로 변경
      };
    };
  };
  original_post: {
    content: string;
  };
  engagement?: {
    retweet_count: number;
    reply_count: number;
    like_count: number;
    quote_count: number;
    impression_count: number;
    account_category: string;
  };
  media?: {
    has_media: boolean;
    media_thumbnail?: string;
    media_type?: string;
  };
}

export interface SNSListParams {
  skip?: number;
  limit?: number;
  post_source?: string;
}

// ============================================================================
// API 설정 및 유틸리티
// ============================================================================

/**
 * API 설정
 */
const API_BASE_URL = 'https://api.investment-assistant.site/api/v1';
const DEFAULT_TIMEOUT = 30000;

/**
 * API 에러 클래스
 */
class SNSApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public statusText?: string
  ) {
    super(message);
    this.name = 'SNSApiError';
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
      throw new SNSApiError(
        `API 요청 실패: ${response.statusText}`,
        response.status,
        response.statusText
      );
    }
    
    return await response.json();
    
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error instanceof SNSApiError) {
      throw error;
    }
    
    if (error instanceof Error && error.name === 'AbortError') {
      throw new SNSApiError('요청 시간 초과');
    }
    
    throw new SNSApiError(
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

// ============================================================================
// API 서비스 클래스
// ============================================================================

class SNSApiService {
  
  /**
   * 분석된 SNS 게시글 목록을 가져옵니다
   */
  async getPosts(params: SNSListParams = {}): Promise<SNSPost[]> {
    const queryString = buildQueryParams(params);
    const endpoint = `/sns/analysis/posts${queryString}`;
    const fullUrl = `${API_BASE_URL}${endpoint}`;
    
    // console.log('🔍 SNS Posts Request:', { 
    //   endpoint, 
    //   fullUrl, 
    //   params,
    //   queryString 
    // });
    
    try {
      const response = await apiRequest<SNSPost[]>(endpoint);
      
      // console.log('✅ SNS Posts Response:', { 
      //   type: typeof response,
      //   isArray: Array.isArray(response),
      //   count: Array.isArray(response) ? response.length : 'Not an array',
      //   firstItem: Array.isArray(response) && response.length > 0 ? response[0] : null,
      //   rawResponse: response
      // });
      
      // 응답이 배열이 아닌 경우 처리
      if (!Array.isArray(response)) {
        console.warn('⚠️ Response is not an array:', response);
        return [];
      }
      
      return response;
    } catch (error) {
      console.error('❌ SNS posts fetch error:', {
        error,
        endpoint,
        fullUrl,
        params
      });
      throw error;
    }
  }

  /**
   * 특정 게시글의 상세 분석 데이터를 가져옵니다
   */
  async getPostDetail(postSource: string, postId: string): Promise<SNSPost> {
    const endpoint = `/sns/analysis/posts/${postSource}/${postId}`;
    
    // console.log('Fetching SNS post detail:', { postSource, postId });
    
    const response = await apiRequest<SNSPost>(endpoint);
    
    // console.log('SNS post detail response:', {
    //   postId: response.analysis.post_id,
    //   source: response.analysis.post_source
    // });
    
    return response;
  }

  /**
   * SNS 플랫폼별 링크 생성
   */
  generateSNSLink(post: SNSPost): string {
    const { post_source, post_id, author_username } = post.analysis;
    
    if (post_source === 'x') {
      return `https://x.com/${author_username}/status/${post_id}`;
    } else if (post_source === 'truth_social_posts') {
      const cleanUsername = author_username.replace(/\s+/g, '');
      return `https://truthsocial.com/@${cleanUsername}/posts/${post_id}`;
    }
    return '#';
  }

  /**
   * 가격 포맷팅 (심볼에 따라 다른 형식 적용)
   */
  formatPrice(price: number, symbol: string): string {
    if (symbol.includes('USD') || symbol === 'BTC-USD') {
      return price.toLocaleString('en-US', { 
        style: 'currency', 
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    }
    
    // 크립토 화폐는 소수점 자리 더 많이
    if (['DOGE', 'SHIB'].includes(symbol)) {
      return `${price.toFixed(4)}`;
    }
    
    return `${price.toFixed(2)}`;
  }

  /**
   * 시간 포맷팅 (상대 시간으로 표시)
   */
  formatRelativeTime(timestamp: string): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 60) {
      return `${diffMins}분 전`;
    } else if (diffHours < 24) {
      return `${diffHours}시간 전`;
    } else if (diffDays < 7) {
      return `${diffDays}일 전`;
    } else {
      return date.toLocaleDateString('ko-KR', { 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  }

  /**
   * 숫자 포맷팅 (K, M 단위)
   */
  formatNumber(num: number): string {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  }

  /**
   * 변화율에 따른 색상 클래스 반환
   */
  getChangeColorClass(change: number): string {
    return change >= 0 ? 'text-green-400' : 'text-red-400';
  }

  /**
   * 플랫폼 한글명 반환
   */
  getPlatformName(postSource: string): string {
    switch (postSource) {
      case 'x':
        return 'X';
      case 'truth_social_posts':
        return 'Truth Social';
      default:
        return postSource;
    }
  }

}

/**
 * 싱글톤 서비스 인스턴스
 */
export const snsApiService = new SNSApiService();

/**
 * 추가: SNSService export (다른 파일에서 사용)
 */
export { snsApiService as SNSService };