import { useState, useEffect } from "react";
import { Search, Filter, MessageSquare, TrendingUp, RefreshCw, Loader2 } from "lucide-react";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { useSNSFeed, useSNSUtils } from "../hooks/useSNSData";
import { SNSPost } from "../types/sns-type";

interface SNSPageProps {
  isLoggedIn: boolean;
  onLoginPrompt: () => void;
  onPostClick: (post: SNSPost) => void;
}

export function SNSPage({ isLoggedIn, onLoginPrompt, onPostClick }: SNSPageProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPlatform, setSelectedPlatform] = useState<"all" | "X" | "Truth Social">("all");
  const [sortBy, setSortBy] = useState<"recent" | "impact">("recent");
  
  // 실제 API 데이터 사용
  const { posts, loading, error, hasMore, loadMorePosts, refresh } = useSNSFeed();
  const { formatNumber, formatRelativeTime } = useSNSUtils();

  // 필터링된 게시글
  const filteredPosts = posts.filter(post => {
    const matchesSearch = post.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         post.author.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesPlatform = selectedPlatform === "all" || post.platform === selectedPlatform;
    
    return matchesSearch && matchesPlatform;
  }).sort((a, b) => {
    switch (sortBy) {
      case "impact":
        return (b.impactScore || 0) - (a.impactScore || 0);
      default:
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    }
  });

  // 에러 처리
  if (error) {
    return (
      <div className="space-y-4">
        <div className="glass-card p-8 text-center">
          <MessageSquare size={48} className="mx-auto mb-4 text-red-400" />
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={refresh}
            className="px-4 py-2 glass rounded-lg hover:glass-strong transition-all flex items-center space-x-2 mx-auto"
          >
            <RefreshCw size={16} />
            <span>다시 시도</span>
          </button>
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
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 glass-card border-white/20 placeholder:text-foreground/50"
          />
        </div>

        {/* 플랫폼 및 정렬 선택 */}
        <div className="flex items-center justify-between">
          <div className="flex space-x-2">
            {["all", "X", "Truth Social"].map((platform) => (
              <button
                key={platform}
                onClick={() => setSelectedPlatform(platform as typeof selectedPlatform)}
                className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                  selectedPlatform === platform
                    ? "glass text-primary"
                    : "glass-subtle text-foreground/70 hover:text-foreground"
                }`}
              >
                {platform === "all" ? "전체" : platform}
              </button>
            ))}
          </div>

          <div className="flex items-center space-x-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="px-3 py-1.5 rounded-lg glass-card text-sm bg-transparent border-white/20"
            >
              <option value="recent">최신순</option>
              <option value="impact">영향도순</option>
            </select>

            <button
              onClick={refresh}
              disabled={loading}
              className="p-2 rounded-lg glass-subtle hover:glass transition-all disabled:opacity-50"
            >
              <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>
      </div>

      {/* 로딩 상태 */}
      {loading && posts.length === 0 && (
        <div className="glass-card p-8 text-center">
          <Loader2 size={48} className="mx-auto mb-4 text-primary animate-spin" />
          <p className="text-foreground/70">SNS 분석 데이터를 불러오는 중...</p>
        </div>
      )}

      {/* SNS 피드 목록 */}
      <div className="space-y-3">
        {filteredPosts.length === 0 && !loading ? (
          <div className="glass-card p-8 text-center">
            <MessageSquare size={48} className="mx-auto mb-4 text-foreground/30" />
            <p className="text-foreground/70">
              {searchQuery ? "검색 결과가 없습니다" : "분석된 게시글이 없습니다"}
            </p>
          </div>
        ) : (
          filteredPosts.map((post) => (
            <div
              key={post.id}
              onClick={() => onPostClick(post)}
              className="glass-card p-4 rounded-xl cursor-pointer hover:glass transition-all group"
            >
              {/* 헤더 */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2">
                    <p className="font-medium">{post.author}</p>
                    <Badge variant="secondary" className="text-xs">
                      {post.platform}
                    </Badge>
                    {post.verified && (
                      <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="white">
                          <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="2" fill="none"/>
                        </svg>
                      </div>
                    )}
                  </div>
                </div>
                <p className="text-xs text-foreground/60">{formatRelativeTime(post.timestamp)}</p>
              </div>

              {/* 내용 */}
              <p className="text-sm mb-3 line-clamp-3">{post.content}</p>

              {/* 미디어 표시 */}
              {post.hasMedia && post.mediaThumbnail && (
                <div className="mb-3">
                  <div className="relative w-full aspect-video bg-gray-800 rounded-lg overflow-hidden">
                    <img
                      src={post.mediaThumbnail}
                      alt="미디어 썸네일"
                      className="w-full h-full object-cover"
                    />
                    {post.mediaType && (
                      <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/70 rounded text-xs text-white">
                        {post.mediaType === 'video' ? '📹 비디오' : '🖼️ 이미지'}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 영향받는 자산 표시 */}
              {post.affectedAssets.length > 0 && (
                <div className="mb-3">
                  <div className="flex flex-wrap gap-1">
                    {post.affectedAssets.slice(0, 3).map((asset, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {asset.symbol}
                      </Badge>
                    ))}
                    {post.affectedAssets.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{post.affectedAssets.length - 3}
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              {/* 인게이지먼트 (X만) */}
              {post.platform === "X" && (post.likes || post.retweets || post.replies) && (
                <div className="flex items-center text-foreground/60 text-xs">
                  <div className="flex space-x-4">
                    {post.replies && <span>💬 {formatNumber(post.replies)}</span>}
                    {post.retweets && <span>🔄 {formatNumber(post.retweets)}</span>}
                    {post.likes && <span>❤️ {formatNumber(post.likes)}</span>}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* 더보기 버튼 */}
      {hasMore && !loading && filteredPosts.length > 0 && (
        <div className="flex justify-center pt-4">
          <button
            onClick={loadMorePosts}
            className="px-6 py-2 glass-card rounded-xl hover:glass transition-all flex items-center space-x-2"
          >
            <span>더 많은 게시글 보기</span>
          </button>
        </div>
      )}

      {/* 추가 로딩 */}
      {loading && posts.length > 0 && (
        <div className="flex justify-center pt-4">
          <Loader2 size={24} className="text-primary animate-spin" />
        </div>
      )}
    </div>
  );
}