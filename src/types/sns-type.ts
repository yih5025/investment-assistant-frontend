// src/types/sns-type.ts

// --------------------------------------------------------------------------
// 백엔드 API 응답에 맞는 타입 정의 (실제 테스트 응답 기반)
// --------------------------------------------------------------------------

// 영향받는 자산 정보
export interface AffectedAsset {
  source: string;
  symbol: string;
  priority: number;
  volatility_score?: number;
}

// 분석 정보 (목록용)
export interface PostAnalysisBase {
  post_id: string;
  post_source: string;
  post_timestamp: string; // ISO 8601 string
  author_username: string;
  affected_assets: AffectedAsset[];
  analysis_status: string;
}

// 가격 타임라인 데이터 포인트
export interface PriceTimelinePoint {
  price: number;
  volume: number;
  timestamp: string;
  acc_volume?: number;
}

// 자산별 상세 데이터
export interface AssetDetailData {
  asset_info: AffectedAsset;
  data_source: string;
  price_timeline: PriceTimelinePoint[];
}

// 분석 정보 (상세용) - 실제 API 응답 구조
export interface PostAnalysisDetail extends PostAnalysisBase {
  // 상세 페이지에서는 각 자산별 데이터가 키-값 쌍으로 제공됨
  [assetSymbol: string]: AssetDetailData | any;
}

// 원본 게시글 정보
export interface OriginalPost {
  content: string;
}

// 미디어 정보
export interface MediaInfo {
  has_media: boolean;
  media_thumbnail: string | null;
  media_type: string | null;
}

// X 게시글 참여도 정보
export interface XPostEngagement {
  retweet_count?: number;
  reply_count?: number;
  like_count?: number;
  quote_count?: number;
  impression_count?: number;
  account_category?: string;
}

// 목록 API 응답 타입
export interface SNSPostAnalysisListResponse {
  analysis: PostAnalysisBase;
  original_post: OriginalPost;
  engagement: XPostEngagement | null;
  media: MediaInfo;
}

// 상세 API 응답 타입
export interface SNSPostAnalysisDetailResponse {
  analysis: PostAnalysisBase;
  original_post: OriginalPost;
  engagement: XPostEngagement | null;
  media: MediaInfo;
  // 각 자산별 상세 데이터 (동적 키)
  [assetSymbol: string]: AssetDetailData | any;
}

// 프론트엔드에서 사용할 통합 SNS 게시글 타입
export interface SNSPost {
  id: string;
  content: string;
  author: string;
  platform: "X" | "Truth Social";
  timestamp: string;
  verified: boolean;
  profileImage: string;
  hasMarketImpact: boolean;
  impactScore?: number;
  affectedAssets: AffectedAsset[];
  analysisStatus: string;
  postSource: string;
  // 미디어 정보
  hasMedia: boolean;
  mediaThumbnail?: string;
  mediaType?: string;
  // 참여도 정보 (X만)
  likes?: number;
  retweets?: number;
  replies?: number;
  quotes?: number;
  impressions?: number;
}