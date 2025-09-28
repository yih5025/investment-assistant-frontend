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
          {/* 개선된 프로필 아바타 */}
          <div 
            className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-medium text-lg ${getAvatarGradient(analysis.author_username)}`}
          >
            {getAvatarText(analysis.author_username)}
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
  const { 
    priceChartData, 
    volumeChartData, 
    hasData, 
    totalDataPoints, 
    filteredDataPoints 
  } = useSNSChartData(post, symbol);

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
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-medium">{symbol} 가격 변화</h4>
        <div className="text-xs text-foreground/60">
          {filteredDataPoints}/{totalDataPoints} 포인트 (최적화됨)
        </div>
      </div>
      
      {/* 가격 차트 - 개선된 버전 */}
      <div className="h-80 mb-6">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart 
            data={priceChartData} 
            margin={{ top: 20, right: 30, left: 60, bottom: 80 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis 
              dataKey="time" 
              tick={{ 
                fontSize: 10, 
                fill: 'rgba(255,255,255,0.8)',
                textAnchor: 'middle'
              }}
              angle={0}
              height={60}
              interval={0}
              axisLine={{ stroke: 'rgba(255,255,255,0.3)' }}
              tickLine={{ stroke: 'rgba(255,255,255,0.3)' }}
            />
            <YAxis 
              tick={{ 
                fontSize: 10, 
                fill: 'rgba(255,255,255,0.8)' 
              }}
              domain={['dataMin - 1%', 'dataMax + 1%']}
              width={60}
              axisLine={{ stroke: 'rgba(255,255,255,0.3)' }}
              tickLine={{ stroke: 'rgba(255,255,255,0.3)' }}
              tickFormatter={(value) => formatPrice(value, symbol)}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'rgba(0,0,0,0.95)', 
                border: '1px solid rgba(255,255,255,0.4)',
                borderRadius: '8px',
                fontSize: '12px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.4)'
              }}
              formatter={(value: any) => [formatPrice(value, symbol), '가격']}
              labelStyle={{ 
                color: 'rgba(255,255,255,0.9)',
                fontWeight: 'bold'
              }}
            />
            <Line 
              type="monotone" 
              dataKey="price" 
              stroke="#60a5fa" 
              strokeWidth={3}
              dot={false}
              activeDot={{ 
                r: 6, 
                stroke: '#60a5fa', 
                strokeWidth: 3, 
                fill: '#ffffff' 
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      
      {/* 거래량 차트 - 개선된 버전 */}
      <div>
        <h5 className="text-sm font-medium mb-3">거래량 변화</h5>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={volumeChartData} 
              margin={{ top: 20, right: 30, left: 60, bottom: 60 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis 
                dataKey="time" 
                tick={{ 
                  fontSize: 10, 
                  fill: 'rgba(255,255,255,0.8)',
                  textAnchor: 'middle'
                }}
                angle={0}
                height={50}
                interval={0}
                axisLine={{ stroke: 'rgba(255,255,255,0.3)' }}
                tickLine={{ stroke: 'rgba(255,255,255,0.3)' }}
              />
              <YAxis 
                tick={{ 
                  fontSize: 10, 
                  fill: 'rgba(255,255,255,0.8)' 
                }} 
                width={60}
                axisLine={{ stroke: 'rgba(255,255,255,0.3)' }}
                tickLine={{ stroke: 'rgba(255,255,255,0.3)' }}
                tickFormatter={(value) => {
                  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
                  return value.toString();
                }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(0,0,0,0.95)', 
                  border: '1px solid rgba(255,255,255,0.4)',
                  borderRadius: '8px',
                  fontSize: '12px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.4)'
                }}
                formatter={(value: any) => [value.toLocaleString(), '거래량']}
                labelStyle={{ 
                  color: 'rgba(255,255,255,0.9)',
                  fontWeight: 'bold'
                }}
              />
              <Bar 
                dataKey="volume" 
                fill="#60a5fa"
                stroke="#ffffff"
                strokeWidth={1}
                opacity={0.8}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 개선된 차트 범례 */}
      <div className="mt-4 p-3 glass-subtle rounded-lg">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 rounded-full bg-blue-400 border-2 border-white"></div>
              <span>일반 시점</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 rounded-full bg-red-400 border-2 border-white"></div>
              <span>SNS 게시 시점</span>
            </div>
          </div>
          <div className="text-foreground/60">
            <span>총 {totalDataPoints}개 → {filteredDataPoints}개로 최적화</span>
          </div>
        </div>
        <div className="mt-2 text-xs text-foreground/50">
          시간대별 핵심 포인트만 표시하여 트렌드를 명확하게 파악할 수 있습니다
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