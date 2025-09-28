// src/components/SNSDetailPage.tsx

import React, { useState } from 'react';
import { 
  ArrowLeft, 
  ExternalLink, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { useSNSDetail, useSNSChartData } from '../hooks/useSNS';
import { snsApiService, type SNSPost } from '../services/SNSService';

// ============================================================================
// 타입 정의
// ============================================================================

interface SNSDetailPageProps {
  postSource: string;
  postId: string;
  onBack: () => void;
}

// ============================================================================
// 메인 컴포넌트
// ============================================================================

export function SNSDetailPage({ postSource, postId, onBack }: SNSDetailPageProps) {
  const [activeTab, setActiveTab] = useState("overview");

  // SNS 상세 데이터 조회
  const {
    post,
    loading,
    error,
    affectedAssets,
    externalLink,
    refetch,
    formatPrice,
    formatTime,
    formatNumber,
    getChangeColor,
    getPlatformName
  } = useSNSDetail({ postSource, postId });

  // 에러 처리
  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className="p-2 rounded-lg glass hover:glass-strong transition-all"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-bold">SNS 시장 영향 분석</h1>
          <div></div>
        </div>
        
        <div className="glass-card p-8 text-center">
          <AlertCircle size={48} className="mx-auto mb-4 text-red-400" />
          <h3 className="text-lg font-medium mb-2">데이터를 불러올 수 없습니다</h3>
          <p className="text-foreground/70 mb-4">{error}</p>
          <Button onClick={() => refetch()} variant="outline">
            <RefreshCw size={16} className="mr-2" />
            다시 시도
          </Button>
        </div>
      </div>
    );
  }

  // 로딩 상태
  if (loading || !post) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className="p-2 rounded-lg glass hover:glass-strong transition-all"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-bold">SNS 시장 영향 분석</h1>
          <div></div>
        </div>
        
        <div className="glass-card p-8 text-center">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-foreground/70">분석 데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  const { analysis, original_post, engagement, media } = post;

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="p-2 rounded-lg glass hover:glass-strong transition-all"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-bold">SNS 시장 영향 분석</h1>
        <a
          href={externalLink}
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 rounded-lg glass hover:glass-strong transition-all"
        >
          <ExternalLink size={20} />
        </a>
      </div>

      {/* 게시글 정보 */}
      <PostInfoCard 
        post={post}
        externalLink={externalLink}
        formatTime={formatTime}
        getPlatformName={getPlatformName}
      />

      {/* 영향받은 자산 개요 */}
      <AffectedAssetsOverview 
        assets={affectedAssets}
        priceAnalysis={analysis.price_analysis}
        formatPrice={formatPrice}
        getChangeColor={getChangeColor}
      />

      {/* 상세 분석 탭 */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 glass-card">
          <TabsTrigger value="overview">개요</TabsTrigger>
          <TabsTrigger value="charts">차트</TabsTrigger>
          <TabsTrigger value="analysis">분석</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <OverviewTab 
            post={post}
            affectedAssets={affectedAssets}
            formatPrice={formatPrice}
            getChangeColor={getChangeColor}
          />
        </TabsContent>

        <TabsContent value="charts" className="space-y-4">
          <ChartsTab 
            post={post}
            affectedAssets={affectedAssets}
            formatPrice={formatPrice}
          />
        </TabsContent>

        <TabsContent value="analysis" className="space-y-4">
          <AnalysisTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============================================================================
// 게시글 정보 카드
// ============================================================================

interface PostInfoCardProps {
  post: SNSPost;
  externalLink: string;
  formatTime: (timestamp: string) => string;
  getPlatformName: (source: string) => string;
}

function PostInfoCard({ 
  post, 
  externalLink, 
  formatTime, 
  getPlatformName 
}: PostInfoCardProps) {
  const { analysis, original_post, media } = post;

  return (
    <div className="glass-card p-4 rounded-xl">
      <div className="flex items-start space-x-3 mb-4">
        <div className="relative">
          {/* 프로필 이미지 플레이스홀더 */}
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-medium">
            {analysis.author_username.charAt(0).toUpperCase()}
          </div>
          {/* 인증 마크 */}
          {['realDonaldTrump', 'elonmusk', 'WhiteHouse'].includes(analysis.author_username) && (
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
                <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="2" fill="none"/>
              </svg>
            </div>
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-1">
            <p className="font-medium">{analysis.author_username}</p>
            <Badge variant="secondary">{getPlatformName(analysis.post_source)}</Badge>
          </div>
          <div className="flex items-center space-x-2 text-sm text-foreground/60">
            <Clock size={14} />
            <span>{formatTime(analysis.post_timestamp)}</span>
          </div>
        </div>
      </div>
      
      <p className="text-sm mb-4">{original_post.content}</p>
      
      {/* 미디어 */}
      {media?.has_media && media.media_thumbnail && (
        <div className="mb-4">
          <img
            src={media.media_thumbnail}
            alt="게시글 미디어"
            className="rounded-lg max-w-full h-auto"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        </div>
      )}

      {/* SNS 원본 링크 */}
      <div className="mb-4 p-3 glass-subtle rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ExternalLink size={16} className="text-primary" />
            <span className="text-sm text-foreground/70">원본 게시글 보기</span>
          </div>
          <a
            href={externalLink}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1 glass rounded-lg text-sm hover:glass-strong transition-all"
          >
            {getPlatformName(analysis.post_source)}에서 보기
          </a>
        </div>
      </div>
      
      {/* 분석 상태 */}
      {analysis.analysis_status === 'complete' && (
        <div className="flex justify-end">
          <Badge className="bg-primary/20 text-primary">
            분석 완료
          </Badge>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 영향받은 자산 개요
// ============================================================================

interface AffectedAssetsOverviewProps {
  assets: any[];
  priceAnalysis: any;
  formatPrice: (price: number, symbol: string) => string;
  getChangeColor: (change: number) => string;
}

function AffectedAssetsOverview({ 
  assets, 
  priceAnalysis, 
  formatPrice, 
  getChangeColor 
}: AffectedAssetsOverviewProps) {
  if (assets.length === 0) {
    return (
      <div className="glass-card p-4 rounded-xl">
        <h3 className="font-medium mb-3">영향받은 자산</h3>
        <p className="text-sm text-foreground/60">가격 데이터가 있는 자산이 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="glass-card p-4 rounded-xl">
      <h3 className="font-medium mb-3">영향받은 자산</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {assets.map((asset) => {
          const priceData = priceAnalysis?.[asset.symbol];
          const change24h = priceData?.["24h_change"] || 0;
          
          return (
            <div key={asset.symbol} className="glass-subtle p-3 rounded-lg text-center">
              <p className="font-medium text-sm mb-1">{asset.symbol}</p>
              {priceData?.base_price && (
                <>
                  <p className="text-xs text-foreground/60 mb-2">
                    {formatPrice(priceData.base_price, asset.symbol)}
                  </p>
                  <div className={`flex items-center justify-center space-x-1 text-xs ${getChangeColor(change24h)}`}>
                    {change24h >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                    <span>{change24h >= 0 ? '+' : ''}{change24h.toFixed(2)}%</span>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// 개요 탭
// ============================================================================

interface OverviewTabProps {
  post: SNSPost;
  affectedAssets: any[];
  formatPrice: (price: number, symbol: string) => string;
  getChangeColor: (change: number) => string;
}

function OverviewTab({ post, affectedAssets, formatPrice, getChangeColor }: OverviewTabProps) {
  const { analysis } = post;

  return (
    <>
      {affectedAssets.map((asset) => {
        const priceData = analysis.price_analysis?.[asset.symbol];
        const volumeData = analysis.volume_analysis?.[asset.symbol];
        
        if (!priceData) return null;

        return (
          <div key={asset.symbol} className="glass-card p-4 rounded-xl">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium">{asset.symbol}</h4>
              <Badge variant="outline">
                {priceData.base_price ? formatPrice(priceData.base_price, asset.symbol) : 'N/A'}
              </Badge>
            </div>
            
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-foreground/60">1시간 후</p>
                <div className={`flex items-center space-x-1 ${getChangeColor(priceData["1h_change"] || 0)}`}>
                  {(priceData["1h_change"] || 0) >= 0 ? 
                    <TrendingUp size={12} /> : <TrendingDown size={12} />
                  }
                  <span>{(priceData["1h_change"] || 0).toFixed(2)}%</span>
                </div>
              </div>
              <div>
                <p className="text-foreground/60">12시간 후</p>
                <div className={`flex items-center space-x-1 ${getChangeColor(priceData["12h_change"] || 0)}`}>
                  {(priceData["12h_change"] || 0) >= 0 ? 
                    <TrendingUp size={12} /> : <TrendingDown size={12} />
                  }
                  <span>{(priceData["12h_change"] || 0).toFixed(2)}%</span>
                </div>
              </div>
              <div>
                <p className="text-foreground/60">24시간 후</p>
                <div className={`flex items-center space-x-1 ${getChangeColor(priceData["24h_change"] || 0)}`}>
                  {(priceData["24h_change"] || 0) >= 0 ? 
                    <TrendingUp size={12} /> : <TrendingDown size={12} />
                  }
                  <span>{(priceData["24h_change"] || 0).toFixed(2)}%</span>
                </div>
              </div>
            </div>

            {volumeData && (
              <div className="mt-3 pt-3 border-t border-white/10">
                <div className="flex justify-between text-xs text-foreground/60">
                  <span>
                    거래량 변화: {volumeData.volume_spike_ratio_1h ? 
                      `${(volumeData.volume_spike_ratio_1h * 100).toFixed(1)}%` : 'N/A'
                    }
                  </span>
                  <span>우선순위: {asset.priority}</span>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}

// ============================================================================
// 차트 탭
// ============================================================================

interface ChartsTabProps {
  post: SNSPost;
  affectedAssets: any[];
  formatPrice: (price: number, symbol: string) => string;
}

function ChartsTab({ post, affectedAssets, formatPrice }: ChartsTabProps) {
  return (
    <>
      {affectedAssets.map((asset) => (
        <AssetChartCard 
          key={asset.symbol}
          post={post}
          symbol={asset.symbol}
          formatPrice={formatPrice}
        />
      ))}
    </>
  );
}

// ============================================================================
// 자산 차트 카드
// ============================================================================

interface AssetChartCardProps {
  post: SNSPost;
  symbol: string;
  formatPrice: (price: number, symbol: string) => string;
}

function AssetChartCard({ post, symbol, formatPrice }: AssetChartCardProps) {
  const { priceChartData, volumeChartData, hasData } = useSNSChartData(post, symbol);

  if (!hasData) {
    return (
      <div className="glass-card p-4 rounded-xl">
        <h4 className="font-medium mb-4">{symbol} 가격 변화</h4>
        <div className="text-center py-8 text-foreground/60">
          차트 데이터가 없습니다
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card p-4 rounded-xl">
      <h4 className="font-medium mb-4">{symbol} 가격 변화</h4>
      
      {/* 가격 차트 */}
      <div className="h-64 mb-6">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={priceChartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis 
              dataKey="time" 
              tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.6)' }}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis 
              tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.6)' }}
              domain={['dataMin - 5', 'dataMax + 5']}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'rgba(0,0,0,0.8)', 
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '8px'
              }}
              formatter={(value: any) => [formatPrice(value, symbol), '가격']}
            />
            <Line 
              type="monotone" 
              dataKey="price" 
              stroke="#60a5fa" 
              strokeWidth={2}
              dot={(props) => {
                if (props.payload?.isPostTime) {
                  return <circle cx={props.cx} cy={props.cy} r={5} fill="#ef4444" stroke="#ef4444" strokeWidth={2} />;
                }
                return <circle cx={props.cx} cy={props.cy} r={3} fill="#60a5fa" stroke="#60a5fa" strokeWidth={2} />;
              }}
              activeDot={{ r: 5, stroke: '#60a5fa', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      
      {/* 거래량 차트 */}
      <div>
        <h5 className="text-sm font-medium mb-2">거래량 변화</h5>
        <div className="h-32">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={volumeChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis 
                dataKey="time" 
                tick={{ fontSize: 8, fill: 'rgba(255,255,255,0.6)' }}
                angle={-45}
                textAnchor="end"
                height={40}
              />
              <YAxis tick={{ fontSize: 8, fill: 'rgba(255,255,255,0.6)' }} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(0,0,0,0.8)', 
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '8px'
                }}
                formatter={(value: any) => [value.toLocaleString(), '거래량']}
              />
              <Bar 
                dataKey="volume" 
                fill="#60a5fa"
                opacity={0.6} 
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 분석 탭 (미구현)
// ============================================================================

function AnalysisTab() {
  return (
    <div className="glass-card p-8 rounded-xl text-center">
      <AlertCircle size={48} className="mx-auto mb-4 text-foreground/30" />
      <h3 className="text-lg font-medium mb-2">통계 분석</h3>
      <p className="text-foreground/70 mb-4">이 기능은 추후 구현 예정입니다</p>
      <div className="text-sm text-foreground/60">
        <p>구현 예정 기능:</p>
        <ul className="mt-2 space-y-1">
          <li>• 상관관계 분석</li>
          <li>• 시계열 분석</li>
          <li>• 대조군 비교</li>
          <li>• 통계적 유의성 검증</li>
        </ul>
      </div>
    </div>
  );
}