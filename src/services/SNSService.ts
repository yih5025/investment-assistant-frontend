// src/services/SNSService.ts

import { 
  SNSPostAnalysisListResponse, 
  SNSPostAnalysisDetailResponse,
  SNSPost,
  AffectedAsset
} from '../types/sns-type';

export class SNSService {
  private readonly baseUrl = 'https://api.investment-assistant.site/api/v1/sns/analysis';

  /**
   * HTTP GET 요청 헬퍼
   */
  private async get<T>(url: string, params?: Record<string, any>): Promise<T> {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    const fullUrl = `${url}${queryString}`;
    
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  /**
   * 분석된 SNS 게시글 목록 조회 (피드용)
   */
  async getAnalyzedPosts(params: {
    skip?: number;
    limit?: number;
  } = {}): Promise<SNSPostAnalysisListResponse[]> {
    const { skip = 0, limit = 20 } = params;
    
    const response = await this.get<SNSPostAnalysisListResponse[]>(
      `${this.baseUrl}/posts`,
      { skip: skip.toString(), limit: limit.toString() }
    );
    
    return response;
  }

  /**
   * 특정 게시물의 상세 분석 데이터 조회
   */
  async getAnalyzedPostDetail(
    postSource: string, 
    postId: string
  ): Promise<SNSPostAnalysisDetailResponse> {
    const response = await this.get<SNSPostAnalysisDetailResponse>(
      `${this.baseUrl}/posts/${postSource}/${postId}`
    );
    
    return response;
  }

  /**
   * API 응답을 프론트엔드 SNSPost 형태로 변환
   */
  transformToSNSPost(apiResponse: SNSPostAnalysisListResponse): SNSPost {
    const { analysis, original_post, engagement, media } = apiResponse;
    
    // 플랫폼 결정
    const platform = analysis.post_source === 'x' ? 'X' : 'Truth Social';
    
    // 영향도 점수 계산 (affected_assets의 평균 priority 기반)
    const impactScore = analysis.affected_assets.length > 0 
      ? analysis.affected_assets.reduce((sum, asset) => sum + (asset.priority || 0), 0) / analysis.affected_assets.length * 10
      : 0;

    // 프로필 이미지 생성 (임시)
    const profileImage = this.generateProfileImage(analysis.author_username);

    return {
      id: analysis.post_id,
      content: original_post.content || '',
      author: analysis.author_username,
      platform,
      timestamp: analysis.post_timestamp,
      verified: this.isVerifiedUser(analysis.author_username),
      profileImage,
      hasMarketImpact: analysis.analysis_status === 'complete',
      impactScore: impactScore > 0 ? impactScore : undefined,
      affectedAssets: analysis.affected_assets,
      analysisStatus: analysis.analysis_status,
      postSource: analysis.post_source,
      // 미디어 정보
      hasMedia: media.has_media,
      mediaThumbnail: media.media_thumbnail || undefined,
      mediaType: media.media_type || undefined,
      // 참여도 정보 (X만)
      likes: engagement?.like_count,
      retweets: engagement?.retweet_count,
      replies: engagement?.reply_count,
      quotes: engagement?.quote_count,
      impressions: engagement?.impression_count,
    };
  }

  /**
   * 임시 프로필 이미지 생성
   */
  private generateProfileImage(username: string): string {
    // 실제로는 사용자별 프로필 이미지를 가져와야 하지만, 임시로 Unsplash 이미지 사용
    const imageIds = [
      'photo-1472099645785-5658abf4ff4e', // 남성 1
      'photo-1507003211169-0a1dd7228f2d', // 남성 2
      'photo-1494790108755-2616b88b9b2c', // 여성 1
      'photo-1560250097-0b93528c311a', // 중성
      'photo-1535713875002-d1d0cf377fde', // 남성 3
    ];
    
    const hash = username.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const imageId = imageIds[hash % imageIds.length];
    
    return `https://images.unsplash.com/${imageId}?w=40&h=40&fit=crop&crop=face`;
  }

  /**
   * 인증된 사용자인지 확인
   */
  private isVerifiedUser(username: string): boolean {
    const verifiedUsers = [
      'realDonaldTrump',
      'elonmusk',
      'ARKInvest',
      'The White House',
      'Donald J. Trump',
      'Donald Trump Jr.',
    ];
    
    return verifiedUsers.includes(username);
  }

  /**
   * 자산별 상세 데이터 추출 (상세 페이지용)
   */
  extractAssetData(detailResponse: SNSPostAnalysisDetailResponse): Record<string, any> {
    const assetData: Record<string, any> = {};
    
    // analysis, original_post, engagement, media를 제외한 나머지 키들이 자산 데이터
    Object.keys(detailResponse).forEach(key => {
      if (!['analysis', 'original_post', 'engagement', 'media'].includes(key)) {
        assetData[key] = detailResponse[key];
      }
    });
    
    return assetData;
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
   * 가격 포맷팅
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
    
    // 암호화폐는 소수점 4자리까지
    if (symbol === 'DOGE' || symbol.includes('DOGE')) {
      return `$${price.toFixed(4)}`;
    }
    
    return `$${price.toFixed(2)}`;
  }

  /**
   * 시간 포맷팅 (상대 시간)
   */
  formatRelativeTime(timestamp: string): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) {
      return '방금 전';
    } else if (diffMins < 60) {
      return `${diffMins}분 전`;
    } else if (diffHours < 24) {
      return `${diffHours}시간 전`;
    } else if (diffDays < 7) {
      return `${diffDays}일 전`;
    } else {
      return date.toLocaleDateString('ko-KR', { 
        month: 'short', 
        day: 'numeric' 
      });
    }
  }

  /**
   * 변화율 색상 결정
   */
  getChangeColor(change: number): string {
    return change >= 0 ? 'text-green-400' : 'text-red-400';
  }

  /**
   * SNS 원본 링크 생성
   */
  generateSNSLink(post: SNSPost): string {
    if (post.platform === 'X') {
      return `https://x.com/${post.author}/status/${post.id}`;
    } else if (post.platform === 'Truth Social') {
      return `https://truthsocial.com/@${post.author.replace(/\s+/g, '')}/posts/${post.id}`;
    }
    return '#';
  }
}
