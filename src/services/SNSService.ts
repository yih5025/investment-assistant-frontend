// src/services/snsApi.ts

import { apiClient } from './api';

// ============================================================================
// 타입 정의
// ============================================================================

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
        volume_in_post_hour?: number;
        volume_in_prior_hour?: number;
        volume_spike_ratio_1h?: number;
        avg_volume_before?: number | null;
        avg_volume_after?: number | null;
      };
    };
    market_data?: {
      [symbol: string]: {
        asset_info: {
          source: string;
          symbol: string;
          priority: number;
          volatility_score?: number;
        };
        data_source: string;
        price_timeline: Array<{
          price: number;
          volume: number;
          timestamp: string;
          acc_volume: number;
        }>;
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
// API 서비스 클래스
// ============================================================================

class SNSApiService {
  private readonly baseUrl = '/api/v1/sns/analysis';

  /**
   * 분석된 SNS 게시글 목록을 가져옵니다
   */
  async getPosts(params: SNSListParams = {}): Promise<SNSPost[]> {
    const searchParams = new URLSearchParams();
    
    if (params.skip !== undefined) searchParams.append('skip', params.skip.toString());
    if (params.limit !== undefined) searchParams.append('limit', params.limit.toString());
    if (params.post_source && params.post_source !== 'all') {
      searchParams.append('post_source', params.post_source);
    }

    const response = await apiClient.get(`${this.baseUrl}/posts?${searchParams.toString()}`);
    return response.data;
  }

  /**
   * 특정 게시글의 상세 분석 데이터를 가져옵니다
   */
  async getPostDetail(postSource: string, postId: string): Promise<SNSPost> {
    const response = await apiClient.get(`${this.baseUrl}/posts/${postSource}/${postId}`);
    return response.data;
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

// 싱글톤 인스턴스 생성
export const snsApiService = new SNSApiService();