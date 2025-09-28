import { MessageSquare, TrendingUp, Loader2 } from "lucide-react";
import { Badge } from "./ui/badge";
import { useSNSFeed, useSNSUtils } from "../hooks/useSNSData";
import { SNSPost } from "../types/sns-type";

interface SocialFeedProps {
  isLoggedIn: boolean;
  onPostClick?: (post: SNSPost) => void;
}

export function HomeSocialFeed({ isLoggedIn, onPostClick }: SocialFeedProps) {
  // 실제 API 데이터 사용 (홈페이지용으로 3개만 표시)
  const { posts, loading, error } = useSNSFeed();
  const { formatNumber, formatRelativeTime } = useSNSUtils();

  // 홈페이지용으로 최신 3개만 표시
  const displayPosts = posts.slice(0, 3);

  if (!isLoggedIn) {
    return (
      <div className="glass-card p-6 rounded-xl text-center">
        <MessageSquare size={48} className="mx-auto mb-4 text-foreground/30" />
        <h3 className="text-lg font-medium mb-2">SNS 시장 영향 분석</h3>
        <p className="text-sm text-foreground/60 mb-4">
          실시간 SNS 게시글이 주식 시장에 미치는 영향을 분석합니다
        </p>
        <div className="text-xs text-foreground/50">
          로그인하여 더 많은 분석을 확인하세요
        </div>
      </div>
    );
  }

  if (loading && posts.length === 0) {
    return (
      <div className="glass-card p-6 rounded-xl text-center">
        <Loader2 size={32} className="mx-auto mb-4 text-primary animate-spin" />
        <p className="text-sm text-foreground/70">SNS 분석 데이터 로딩 중...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card p-6 rounded-xl text-center">
        <MessageSquare size={32} className="mx-auto mb-4 text-red-400" />
        <p className="text-sm text-red-400">데이터를 불러올 수 없습니다</p>
      </div>
    );
  }

  if (displayPosts.length === 0) {
    return (
      <div className="glass-card p-6 rounded-xl text-center">
        <MessageSquare size={32} className="mx-auto mb-4 text-foreground/30" />
        <p className="text-sm text-foreground/70">분석된 SNS 게시글이 없습니다</p>
      </div>
    );
  }

  return (
    <div className="glass-card p-4 rounded-xl">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <MessageSquare size={20} className="text-primary" />
          <h3 className="font-medium">SNS 시장 영향</h3>
        </div>
        <Badge variant="outline" className="text-xs">
          실시간 분석
        </Badge>
      </div>

      <div className="space-y-3">
        {displayPosts.map((post) => (
          <div
            key={post.id}
            onClick={() => onPostClick?.(post)}
            className="p-3 glass-subtle rounded-lg cursor-pointer hover:glass transition-all group"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <p className="font-medium text-sm truncate">{post.author}</p>
                  <Badge variant="secondary" className="text-xs">
                    {post.platform}
                  </Badge>
                  {post.verified && (
                    <div className="w-3 h-3 bg-blue-500 rounded-full flex items-center justify-center">
                      <svg width="8" height="8" viewBox="0 0 24 24" fill="white">
                        <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="3" fill="none"/>
                      </svg>
                    </div>
                  )}
                </div>
                <span className="text-xs text-foreground/50">{formatRelativeTime(post.timestamp)}</span>
              </div>
                
                <p className="text-xs text-foreground/80 line-clamp-2 mb-2">
                  {post.content}
                </p>

                {/* 영향받는 자산 표시 */}
                {post.affectedAssets.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {post.affectedAssets.slice(0, 2).map((asset, index) => (
                      <Badge key={index} variant="outline" className="text-xs px-1 py-0">
                        {asset.symbol}
                      </Badge>
                    ))}
                    {post.affectedAssets.length > 2 && (
                      <Badge variant="outline" className="text-xs px-1 py-0">
                        +{post.affectedAssets.length - 2}
                      </Badge>
                    )}
                  </div>
                )}
                
              {post.platform === "X" && (post.likes || post.retweets || post.replies) && (
                <div className="flex space-x-3 text-xs text-foreground/50">
                  {post.replies && <span>💬 {formatNumber(post.replies)}</span>}
                  {post.retweets && <span>🔄 {formatNumber(post.retweets)}</span>}
                  {post.likes && <span>❤️ {formatNumber(post.likes)}</span>}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-3 border-t border-white/10">
        <button className="w-full text-xs text-primary hover:text-primary/80 transition-colors">
          더 많은 SNS 분석 보기 →
        </button>
      </div>
    </div>
  );
}