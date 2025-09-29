// src/components/SNSPage.tsx

import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  MessageSquare, 
  TrendingUp, 
  ExternalLink,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { useSNSList, useSNSFilter } from '../hooks/useSNS';
import { snsApiService, type SNSPost } from '../services/SNSService';

// ============================================================================
// 타입 정의
// ============================================================================

interface SNSPageProps {
  onPostClick: (post: SNSPost) => void;
}

// ============================================================================
// 아바타 생성 유틸리티 함수들
// ============================================================================

// 사용자명 기반 아바타 텍스트 생성
function getAvatarText(username: string): string {
  if (!username) return '?';
  
  // 공백이나 특수문자로 구분된 단어들의 첫 글자 추출
  const words = username.split(/[\s_-]+/);
  if (words.length >= 2) {
    return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
  }
  
  // 단어가 하나면 첫 두 글자 또는 첫 글자
  if (username.length >= 2) {
    return username.substring(0, 2).toUpperCase();
  }
  
  return username.charAt(0).toUpperCase();
}

// 사용자명 기반 그라데이션 색상 생성
function getAvatarGradient(username: string): string {
  if (!username) return 'bg-gradient-to-br from-gray-400 to-gray-600';
  
  // 유명 인물들은 특별한 색상
  const specialUsers: { [key: string]: string } = {
    'realDonaldTrump': 'bg-gradient-to-br from-red-500 to-red-700',
    'elonmusk': 'bg-gradient-to-br from-purple-500 to-indigo-600',
    'WhiteHouse': 'bg-gradient-to-br from-blue-600 to-blue-800',
    'JoeBiden': 'bg-gradient-to-br from-blue-500 to-blue-700',
    'SpeakerPelosi': 'bg-gradient-to-br from-green-500 to-green-700',
  };
  
  if (specialUsers[username]) {
    return specialUsers[username];
  }
  
  // 사용자명 해시 기반 색상 생성
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const gradients = [
    'bg-gradient-to-br from-blue-500 to-purple-600',
    'bg-gradient-to-br from-green-500 to-teal-600',
    'bg-gradient-to-br from-orange-500 to-red-600',
    'bg-gradient-to-br from-pink-500 to-rose-600',
    'bg-gradient-to-br from-indigo-500 to-blue-600',
    'bg-gradient-to-br from-purple-500 to-pink-600',
    'bg-gradient-to-br from-teal-500 to-green-600',
    'bg-gradient-to-br from-yellow-500 to-orange-600',
    'bg-gradient-to-br from-red-500 to-pink-600',
    'bg-gradient-to-br from-cyan-500 to-blue-600',
  ];
  
  return gradients[Math.abs(hash) % gradients.length];
}

// ============================================================================
// 메인 컴포넌트
// ============================================================================

export function SNSPage({ onPostClick }: SNSPageProps) {
  const [showFilters, setShowFilters] = useState(false);
  const [localSearchQuery, setLocalSearchQuery] = useState('');
  
  // 필터 상태 관리
  const {
    filter,
    updatePlatform,
    updateSortBy,
    updateSearchQuery,
    resetFilter,
    toApiParams
  } = useSNSFilter();

  // SNS 목록 데이터 관리
  const {
    posts,
    loading,
    error,
    params,
    updateFilter,
    loadMore,
    refresh,
    hasMore,
    totalLoaded,
    isLoadingMore
  } = useSNSList({
    initialParams: toApiParams(),
    autoFetch: true
  });

  // 디버깅용 로그
  console.log('📊 SNSPage State:', {
    posts: posts.length,
    loading,
    error,
    params,
    filter,
    hasMore,
    totalLoaded,
    isLoadingMore
  });

  // 필터 변경시 API 파라미터 업데이트
  useEffect(() => {
    const apiParams = toApiParams();
    console.log('🎯 Filter changed, updating API params:', { 
      filter, 
      apiParams,
      previousParams: params 
    });
    updateFilter(apiParams);
  }, [filter.platform, filter.sortBy, filter.searchQuery, updateFilter, toApiParams]);

  // 검색 처리 (디바운싱)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      updateSearchQuery(localSearchQuery);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [localSearchQuery, updateSearchQuery]);

  // 에러 처리
  if (error) {
    return (
      <div className="space-y-4">
        <div className="glass-card p-8 text-center">
          <AlertCircle size={48} className="mx-auto mb-4 text-red-400" />
          <h3 className="text-lg font-medium mb-2">데이터를 불러올 수 없습니다</h3>
          <p className="text-foreground/70 mb-4">{error}</p>
          <Button onClick={refresh} variant="outline">
            <RefreshCw size={16} className="mr-2" />
            다시 시도
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 검색 및 필터 헤더 */}
      <div className="space-y-3">
        {/* 검색바 */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-foreground/50" size={20} />
          <Input
            placeholder="사용자명 또는 게시글 내용 검색..."
            value={localSearchQuery}
            onChange={(e) => setLocalSearchQuery(e.target.value)}
            className="pl-10 glass-card border-white/20 placeholder:text-foreground/50"
          />
        </div>

        {/* 플랫폼 선택 및 컨트롤 */}
        <div className="flex items-center justify-between">
          <div className="flex space-x-2">
            {[
              { value: 'all', label: '전체' },
              { value: 'x', label: 'X' },
              { value: 'truth_social_posts', label: 'Truth Social' }
            ].map((platform) => (
              <button
                key={platform.value}
                onClick={() => updatePlatform(platform.value as any)}
                className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                  filter.platform === platform.value
                    ? "glass text-primary"
                    : "glass-subtle text-foreground/70 hover:text-foreground"
                }`}
              >
                {platform.label}
              </button>
            ))}
          </div>

          <div className="flex items-center space-x-2">
            <select
              value={filter.sortBy}
              onChange={(e) => updateSortBy(e.target.value as any)}
              className="px-3 py-1.5 rounded-lg glass-card text-sm bg-transparent border-white/20"
            >
              <option value="recent">최신순</option>
              <option value="impact">영향도순</option>
              <option value="engagement">인기순</option>
            </select>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 rounded-lg transition-all ${
                showFilters ? "glass text-primary" : "glass-subtle text-foreground/70"
              }`}
            >
              <Filter size={18} />
            </button>

            <button
              onClick={refresh}
              disabled={loading}
              className="p-2 rounded-lg glass-subtle hover:glass transition-all disabled:opacity-50"
            >
              <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {/* 활성 필터 표시 */}
        {(filter.platform !== 'all' || filter.searchQuery) && (
          <div className="flex items-center space-x-2">
            <span className="text-sm text-foreground/70">필터:</span>
            {filter.platform !== 'all' && (
              <Badge variant="secondary" className="text-xs">
                {filter.platform === 'x' ? 'X' : 'Truth Social'}
              </Badge>
            )}
            {filter.searchQuery && (
              <Badge variant="secondary" className="text-xs">
                검색: {filter.searchQuery}
              </Badge>
            )}
            <button
              onClick={resetFilter}
              className="text-xs text-primary hover:underline"
            >
              초기화
            </button>
          </div>
        )}
      </div>

      {/* 로딩 상태 */}
      {loading && posts.length === 0 && (
        <div className="glass-card p-8 text-center">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-foreground/70">게시글을 불러오는 중...</p>
        </div>
      )}

      {/* SNS 피드 목록 */}
      <div className="space-y-3">
        {posts.length === 0 && !loading ? (
          <div className="glass-card p-8 text-center">
            <MessageSquare size={48} className="mx-auto mb-4 text-foreground/30" />
            <p className="text-foreground/70">
              {filter.searchQuery ? '검색 결과가 없습니다' : '게시글이 없습니다'}
            </p>
          </div>
        ) : (
          posts.map((post) => (
            <SNSPostCard
              key={`${post.analysis.post_source}-${post.analysis.post_id}`}
              post={post}
              onClick={() => onPostClick(post)}
            />
          ))
        )}
      </div>

      {/* 더보기 버튼 */}
      {hasMore && posts.length > 0 && (
        <div className="flex justify-center pt-4">
          <Button
            onClick={loadMore}
            disabled={isLoadingMore}
            variant="outline"
            className="glass-card hover:glass"
          >
            {isLoadingMore ? (
              <>
                <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full mr-2"></div>
                로딩 중...
              </>
            ) : (
              '더 많은 게시글 보기'
            )}
          </Button>
        </div>
      )}

      {/* 로드된 게시글 수 표시 */}
      {totalLoaded > 0 && (
        <div className="text-center text-sm text-foreground/60">
          총 {totalLoaded}개의 게시글을 불러왔습니다
        </div>
      )}
    </div>
  );
}

// ============================================================================
// SNS 게시글 카드 컴포넌트
// ============================================================================

interface SNSPostCardProps {
  post: SNSPost;
  onClick: () => void;
}

function SNSPostCard({ post, onClick }: SNSPostCardProps) {
  const {
    analysis,
    original_post,
    engagement,
    media
  } = post;

  
  // 플랫폼 이름
  const platformName = snsApiService.getPlatformName(analysis.post_source);
  
  // 시간 포맷
  const timeDisplay = snsApiService.formatRelativeTime(analysis.post_timestamp);
  
  // 주요 영향받은 자산 (상위 3개)
  const topAssets = analysis.affected_assets
    .slice(0, 3)
    .filter(asset => analysis.price_analysis?.[asset.symbol]?.base_price);

  return (
    <div
      onClick={onClick}
      className="glass-card p-4 rounded-xl cursor-pointer hover:glass transition-all group"
    >
      {/* 헤더 */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className="relative">
            {/* 개선된 프로필 아바타 */}
            <div 
              className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-medium text-sm ${getAvatarGradient(analysis.author_username)}`}
            >
              {getAvatarText(analysis.author_username)}
            </div>
            {/* 인증 마크 (주요 계정들) */}
            {['realDonaldTrump', 'elonmusk', 'WhiteHouse'].includes(analysis.author_username) && (
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="white">
                  <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="2" fill="none"/>
                </svg>
              </div>
            )}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <p className="font-medium">{analysis.author_username}</p>
              <Badge variant="secondary" className="text-xs">
                {platformName}
              </Badge>
            </div>
            <p className="text-xs text-foreground/60">{timeDisplay}</p>
          </div>
        </div>

      </div>

      {/* 게시글 내용 */}
      <div className="mb-3">
        <p className="text-sm mb-2 line-clamp-3">{original_post.content}</p>
        
        {/* 미디어 썸네일 */}
        {media?.has_media && media.media_thumbnail && (
          <div className="mt-2">
            <img
              src={media.media_thumbnail}
              alt="게시글 미디어"
              className="rounded-lg max-h-32 object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
        )}
      </div>

      {/* 영향받은 자산 미리보기 */}
      {topAssets.length > 0 && (
        <div className="mb-3">
          <div className="flex flex-wrap gap-2">
            {topAssets.map((asset) => {
              const priceData = analysis.price_analysis?.[asset.symbol];
              const change24h = priceData?.["24h_change"] || 0;
              
              return (
                <div key={asset.symbol} className="glass-subtle px-2 py-1 rounded text-xs">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">{asset.symbol}</span>
                    {priceData?.base_price && (
                      <>
                        <span className="text-foreground/60">
                          {snsApiService.formatPrice(priceData.base_price, asset.symbol)}
                        </span>
                        <span className={snsApiService.getChangeColorClass(change24h)}>
                          {change24h >= 0 ? '+' : ''}{change24h.toFixed(2)}%
                        </span>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 하단 정보 */}
      <div className="flex items-center justify-between text-foreground/60 text-xs">
        {/* 인게이지먼트 정보 (X의 경우) */}
        {analysis.post_source === 'x' && engagement && (
          <div className="flex space-x-4">
            <span>💬 {snsApiService.formatNumber(engagement.reply_count)}</span>
            <span>🔄 {snsApiService.formatNumber(engagement.retweet_count)}</span>
            <span>❤️ {snsApiService.formatNumber(engagement.like_count)}</span>
          </div>
        )}

        {/* 분석 상태 */}
        <div className="flex items-center space-x-2 ml-auto">
          {analysis.analysis_status === 'complete' && (
            <Badge className="bg-primary/20 text-primary text-xs">
              분석 완료
            </Badge>
          )}
          <ExternalLink size={12} className="opacity-50 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>
    </div>
  );
}