// src/components/SNSDetailPage.tsx

import React, { useState, useMemo } from 'react';
import { 
  ArrowLeft, 
  ExternalLink, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, ComposedChart, Area, ReferenceLine } from 'recharts';
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
  const [activeTab, setActiveTab] = useState("general");

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
        <TabsList className="grid w-full grid-cols-2 glass-card">
          <TabsTrigger value="general">일반 분석</TabsTrigger>
          <TabsTrigger value="advanced">전문 분석</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <GeneralAnalysisTab 
            post={post}
            affectedAssets={affectedAssets}
            formatPrice={formatPrice}
            getChangeColor={getChangeColor}
          />
        </TabsContent>

        <TabsContent value="advanced" className="space-y-4">
          <AdvancedAnalysisTab 
            post={post}
            affectedAssets={affectedAssets}
            formatPrice={formatPrice}
          />
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
// 일반 분석 탭 - 신규
// ============================================================================

interface GeneralAnalysisTabProps {
  post: SNSPost;
  affectedAssets: any[];
  formatPrice: (price: number, symbol: string) => string;
  getChangeColor: (change: number) => string;
}

function GeneralAnalysisTab({ 
  post, 
  affectedAssets, 
  formatPrice, 
  getChangeColor 
}: GeneralAnalysisTabProps) {
  return (
    <>
      {affectedAssets.map((asset) => (
        <GeneralAnalysisCard
          key={asset.symbol}
          post={post}
          symbol={asset.symbol}
          formatPrice={formatPrice}
          getChangeColor={getChangeColor}
        />
      ))}
    </>
  );
}

// ============================================================================
// 일반 분석 카드 (자산별)
// ============================================================================

interface GeneralAnalysisCardProps {
  post: SNSPost;
  symbol: string;
  formatPrice: (price: number, symbol: string) => string;
  getChangeColor: (change: number) => string;
}

function GeneralAnalysisCard({ 
  post, 
  symbol, 
  formatPrice, 
  getChangeColor 
}: GeneralAnalysisCardProps) {
  const { 
    bollingerBandData,
    dualAxisData,
    priceChangeSummary,
    volumeChangeSummary,
    hasData 
  } = useSNSChartData(post, symbol);

  const postTimePoint = useMemo(() => {
    return bollingerBandData.find(d => d.isPostTime);
  }, [bollingerBandData]);

  const dualAxisPostTimePoint = useMemo(() => {
    return dualAxisData.find(d => d.isPostTime);
  }, [dualAxisData]);

  
  if (!hasData) {
    return (
      <div className="glass-card p-4 rounded-xl">
        <h4 className="font-medium mb-4">{symbol} 분석</h4>
        <div className="text-center py-8 text-foreground/60">
          데이터가 없습니다
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card p-4 rounded-xl space-y-6">
      <h4 className="font-medium text-lg">{symbol} 일반 분석</h4>

      {/* 1. 가격 변화 요약 */}
      {priceChangeSummary && (
        <div className="glass-subtle p-4 rounded-lg">
          <h5 className="text-sm font-medium mb-3">📊 가격 변화 요약</h5>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-foreground/60 mb-1">게시 시점 가격</p>
              <p className="font-medium">{formatPrice(priceChangeSummary.postPrice, symbol)}</p>
            </div>
            <div>
              <p className="text-foreground/60 mb-1">게시 후 최고가</p>
              <p className={`font-medium ${getChangeColor(priceChangeSummary.maxPriceChange)}`}>
                {formatPrice(priceChangeSummary.maxPrice, symbol)}
                <span className="text-xs ml-1">
                  ({priceChangeSummary.maxPriceChange >= 0 ? '+' : ''}
                  {priceChangeSummary.maxPriceChange.toFixed(2)}%)
                </span>
              </p>
            </div>
            <div>
              <p className="text-foreground/60 mb-1">게시 후 최저가</p>
              <p className={`font-medium ${getChangeColor(priceChangeSummary.minPriceChange)}`}>
                {formatPrice(priceChangeSummary.minPrice, symbol)}
                <span className="text-xs ml-1">
                  ({priceChangeSummary.minPriceChange >= 0 ? '+' : ''}
                  {priceChangeSummary.minPriceChange.toFixed(2)}%)
                </span>
              </p>
            </div>
            <div>
              <p className="text-foreground/60 mb-1">현재가 (1시간 후)</p>
              <p className={`font-medium ${getChangeColor(priceChangeSummary.currentPriceChange)}`}>
                {formatPrice(priceChangeSummary.currentPrice, symbol)}
                <span className="text-xs ml-1">
                  ({priceChangeSummary.currentPriceChange >= 0 ? '+' : ''}
                  {priceChangeSummary.currentPriceChange.toFixed(2)}%)
                </span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 볼린저 밴드 차트 */}
      <div>
        <h5 className="text-sm font-medium mb-2">📈 볼린저 밴드 차트</h5>
        
        {/* 스크롤 컨테이너 */}
        <div className="overflow-x-auto overflow-y-hidden -mx-4 px-4">
          <div className="h-[420px] min-w-[700px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart 
                data={bollingerBandData} 
                margin={{ top: 10, right: 5, left: 5, bottom: 50 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                
                <XAxis 
                  dataKey="timestamp" 
                  tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.8)' }}
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    const hours = date.getHours();
                    const mins = date.getMinutes();
                    return `${hours}:${String(mins).padStart(2, '0')}`;
                  }}
                  angle={-35}
                  textAnchor="end"
                  height={50}
                  interval="preserveStartEnd"
                />
                
                <YAxis 
                  tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.8)' }}
                  tickFormatter={(value) => {
                    // 간결한 포맷
                    if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
                    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
                    if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
                    if (value >= 1) return value.toFixed(1);
                    return value.toFixed(3);
                  }}
                  width={50}
                />
                
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(0,0,0,0.95)', 
                    border: '1px solid rgba(255,255,255,0.4)',
                    borderRadius: '6px',
                    padding: '8px',
                    fontSize: '11px'
                  }}
                  formatter={(value: any) => formatPrice(value, symbol)}
                  labelFormatter={(label) => {
                    const date = new Date(label);
                    return date.toLocaleTimeString('ko-KR');
                  }}
                />
                
                {/* 상단 밴드 */}
                <Line 
                  type="monotone" 
                  dataKey="upper" 
                  stroke="#ef4444" 
                  strokeWidth={1}
                  dot={false}
                  strokeDasharray="3 3"
                />
                
                {/* 중심선 */}
                <Line 
                  type="monotone" 
                  dataKey="middle" 
                  stroke="#60a5fa" 
                  strokeWidth={1.5}
                  dot={false}
                />
                
                {/* 하단 밴드 */}
                <Line 
                  type="monotone" 
                  dataKey="lower" 
                  stroke="#ef4444" 
                  strokeWidth={1}
                  dot={false}
                  strokeDasharray="3 3"
                />
                
                {/* 실제 가격 - 게시 시점 강조 */}
                <Line 
                type="monotone" 
                dataKey="close" 
                stroke="#10b981" 
                strokeWidth={2}
                dot={(props: any) => {
                  const { cx, cy, payload } = props;
                  if (!payload || cx === undefined || cy === undefined) return <></>;  // 🔴
                  
                  if (payload.isPostTime) {
                    return (
                      <g>
                        <circle 
                          cx={cx} 
                          cy={cy} 
                          r={8} 
                          fill="rgba(245, 158, 11, 0.2)"
                        />
                        <circle 
                          cx={cx} 
                          cy={cy} 
                          r={5} 
                          fill="#f59e0b" 
                          stroke="#fff"
                          strokeWidth={2}
                        />
                      </g>
                    );
                  }
                  return <></>;  // 🔴
                }}
                activeDot={{ r: 4 }}
              />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* 범례 - 간결하게 */}
        <div className="mt-1 text-[10px] text-foreground/60 space-y-0.5">
          <p>• <span className="text-green-400">초록</span>: 실제가 • <span className="text-blue-400">파랑</span>: 평균 • <span className="text-red-400">빨강점선</span>: 변동성구간</p>
          <p>• <span className="inline-block w-2 h-2 rounded-full bg-orange-400"></span> 주황: 게시시점</p>
        </div>
      </div>

      {/* 가격 & 거래량 차트 */}
      <div>
        <h5 className="text-sm font-medium mb-2">📊 가격 & 거래량</h5>
        
        <div className="overflow-x-auto overflow-y-hidden -mx-4 px-4">
          <div className="h-[420px] min-w-[700px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart 
                data={dualAxisData} 
                margin={{ top: 10, right: 45, left: 5, bottom: 50 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                
                <XAxis 
                  dataKey="timestamp"
                  tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.8)' }}
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    return `${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
                  }}
                  angle={-35}
                  textAnchor="end"
                  height={50}
                  interval="preserveStartEnd"
                />
                
                {/* 왼쪽 Y축 - 가격 */}
                <YAxis 
                  yAxisId="left"
                  tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.8)' }}
                  tickFormatter={(value) => {
                    if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
                    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
                    if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
                    if (value >= 1) return value.toFixed(1);
                    return value.toFixed(3);
                  }}
                  width={48}
                />
                
                {/* 오른쪽 Y축 - 거래량 */}
                <YAxis 
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.8)' }}
                  tickFormatter={(value) => {
                    if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
                    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
                    if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
                    return value.toString();
                  }}
                  width={42}
                />
                
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(0,0,0,0.95)', 
                    border: '1px solid rgba(255,255,255,0.4)',
                    borderRadius: '6px',
                    padding: '8px',
                    fontSize: '11px'
                  }}
                  labelFormatter={(label) => new Date(label).toLocaleTimeString('ko-KR')}
                />
                
                {/* 가격 Area */}
                <Area
                yAxisId="left"
                type="monotone"
                dataKey="price"
                stroke="#60a5fa"
                fill="rgba(96,165,250,0.15)"
                strokeWidth={2}
                dot={(props: any) => {
                  const { cx, cy, payload } = props;
                  if (!payload || cx === undefined || cy === undefined) return <></>;  // 🔴 빈 fragment 반환
                  
                  if (payload.isPostTime) {
                    return (
                      <g>
                        <circle cx={cx} cy={cy} r={8} fill="rgba(245, 158, 11, 0.2)" />
                        <circle cx={cx} cy={cy} r={5} fill="#f59e0b" stroke="#fff" strokeWidth={2} />
                      </g>
                    );
                  }
                  return <></>;  // 🔴 빈 fragment 반환
                }}
              />
                
                {/* 거래량 Bar */}
                <Bar
                  yAxisId="right"
                  dataKey="volume"
                  fill="#10b981"
                  opacity={0.6}
                  shape={(props: any) => {
                    const { fill, x, y, width, height, payload } = props;
                    
                    if (payload && payload.isPostTime) {
                      return (
                        <rect 
                          x={x} 
                          y={y} 
                          width={width} 
                          height={height} 
                          fill="#f59e0b"
                          opacity={0.9}
                        />
                      );
                    }
                    
                    return <rect x={x} y={y} width={width} height={height} fill={fill} />;
                  }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <div className="mt-1 text-[10px] text-foreground/60">
          • <span className="text-blue-400">파랑영역</span>: 가격(좌) • <span className="text-green-400">초록막대</span>: 거래량(우)
        </div>
      </div>

      {/* 4. 거래량 변화 인사이트 */}
      {volumeChangeSummary && (
        <div className="glass-subtle p-4 rounded-lg">
          <h5 className="text-sm font-medium mb-3">🔥 거래량 급증</h5>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-foreground/60">게시 전 평균</span>
              <span className="font-medium">
                {volumeChangeSummary.avgVolumeBefore.toFixed(0)} {symbol}/분
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-foreground/60">게시 후 최대</span>
              <span className="font-medium text-green-400">
                {volumeChangeSummary.maxVolume.toFixed(0)} {symbol}/분
              </span>
            </div>
            <div className="mt-3 p-2 bg-primary/10 rounded text-center">
              <p className="text-xs text-foreground/60 mb-1">거래량 증가율</p>
              <p className="text-lg font-bold text-primary">
                {volumeChangeSummary.volumeIncreaseRatio.toFixed(0)}배 증가
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 전문 분석 탭 - 신규
// ============================================================================

interface AdvancedAnalysisTabProps {
  post: SNSPost;
  affectedAssets: any[];
  formatPrice: (price: number, symbol: string) => string;
}

function AdvancedAnalysisTab({ 
  post, 
  affectedAssets, 
  formatPrice 
}: AdvancedAnalysisTabProps) {
  return (
    <>
      {affectedAssets.map((asset) => (
        <AdvancedAnalysisCard
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
// 전문 분석 카드 (자산별)
// ============================================================================

interface AdvancedAnalysisCardProps {
  post: SNSPost;
  symbol: string;
  formatPrice: (price: number, symbol: string) => string;
}

function AdvancedAnalysisCard({ 
  post, 
  symbol, 
  formatPrice 
}: AdvancedAnalysisCardProps) {
  const { 
    candlestickData,
    priceDistribution,
    volatilityData,
    priceChangeSummary,
    volumeChangeSummary,
    hasData 
  } = useSNSChartData(post, symbol);

  const candlestickPostTimePoint = useMemo(() => {
    return candlestickData.find(d => d.isPostTime);
  }, [candlestickData]);

  if (!hasData) {
    return (
      <div className="glass-card p-4 rounded-xl">
        <h4 className="font-medium mb-4">{symbol} 전문 분석</h4>
        <div className="text-center py-8 text-foreground/60">
          데이터가 없습니다
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card p-4 rounded-xl space-y-6">
      <h4 className="font-medium text-lg">{symbol} 전문 분석</h4>

      {/* 캔들스틱 차트 */}
      <div>
        <h5 className="text-sm font-medium mb-2">🕯️ 캔들스틱 차트</h5>
        
        <div className="overflow-x-auto overflow-y-hidden -mx-4 px-4">
          <div className="h-[480px] min-w-[800px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart 
                data={candlestickData} 
                margin={{ top: 10, right: 5, left: 5, bottom: 50 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                
                <XAxis 
                  dataKey="timestamp"
                  tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.8)' }}
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    return `${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
                  }}
                  angle={-35}
                  textAnchor="end"
                  height={50}
                  interval="preserveStartEnd"
                />
                
                <YAxis 
                  domain={['dataMin - 1%', 'dataMax + 1%']}
                  tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.8)' }}
                  tickFormatter={(value) => {
                    if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)}B`;
                    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
                    if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
                    if (value >= 1) return value.toFixed(1);
                    return value.toFixed(3);
                  }}
                  width={55}
                />
                
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(0,0,0,0.95)', 
                    border: '1px solid rgba(255,255,255,0.4)',
                    borderRadius: '6px',
                    padding: '8px'
                  }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="text-[11px] space-y-1">
                          <p className="font-medium">
                            {new Date(data.timestamp).toLocaleTimeString('ko-KR')}
                          </p>
                          {data.isPostTime && (
                            <p className="text-orange-400 font-bold">📍 게시시점</p>
                          )}
                          <p>시: {formatPrice(data.open, symbol)}</p>
                          <p className="text-green-400">고: {formatPrice(data.high, symbol)}</p>
                          <p className="text-red-400">저: {formatPrice(data.low, symbol)}</p>
                          <p>종: {formatPrice(data.close, symbol)}</p>
                          <p className="text-blue-400">량: {data.volume.toLocaleString()}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                
                {/* High-Low 선 */}
                <Line 
                  type="monotone"
                  dataKey="high"
                  stroke="transparent"
                  dot={false}
                />
                <Line 
                  type="monotone"
                  dataKey="low"
                  stroke="transparent"
                  dot={false}
                />
                
                {/* 캔들 몸통 */}
                <Bar 
                  dataKey={(data: any) => data.close >= data.open ? [data.open, data.close] : [data.close, data.open]}
                  shape={(props: any) => {  // 🔴 타입 명시
                    const { x, y, width, height, payload } = props;
                    if (!payload) {
                      return <rect x={0} y={0} width={0} height={0} fill="transparent" />;
                    }
                    
                    const fill = payload.close >= payload.open 
                      ? 'rgba(16,185,129,0.8)' 
                      : 'rgba(239,68,68,0.8)';
                    
                    return (
                      <rect 
                        x={x} 
                        y={y} 
                        width={width} 
                        height={height} 
                        fill={fill}
                      />
                    );
                  }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <div className="mt-1 text-[10px] text-foreground/60">
          • <span className="text-green-400">초록</span>: 상승 • <span className="text-red-400">빨강</span>: 하락
        </div>
      </div>

      {/* 2. 핵심 인사이트 (기존 개요 탭 내용) */}
      <div className="glass-subtle p-4 rounded-lg">
        <h5 className="text-sm font-medium mb-3">💡 핵심 인사이트</h5>
        
        {/* 가격 변화 */}
        {priceChangeSummary && (
          <div className="mb-4">
            <p className="text-xs text-foreground/60 mb-2">🎯 가격 반응</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 glass-subtle rounded">
                <p className="text-foreground/60">초기 반응 속도</p>
                <p className="font-medium">
                  {Math.abs(priceChangeSummary.maxPriceChange) > 2 ? '빠름' : '보통'}
                  {priceChangeSummary.maxPriceChange > 0 && ' (5분 내 상승)'}
                </p>
              </div>
              <div className="p-2 glass-subtle rounded">
                <p className="text-foreground/60">회복 여부</p>
                <p className="font-medium">
                  {priceChangeSummary.currentPriceChange > priceChangeSummary.maxPriceChange * 0.5
                    ? '부분 회복'
                    : '완전 회복'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 거래량 급증 */}
        {volumeChangeSummary && (
          <div className="mb-4">
            <p className="text-xs text-foreground/60 mb-2">🔥 거래량 급증</p>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-foreground/60">게시 전 평균:</span>
                <span>{volumeChangeSummary.avgVolumeBefore.toFixed(0)} {symbol}/분</span>
              </div>
              <div className="flex justify-between">
                <span className="text-foreground/60">게시 후 최대:</span>
                <span className="text-green-400 font-medium">
                  {volumeChangeSummary.maxVolume.toLocaleString()} {symbol}/분
                </span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-2 mt-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{ 
                    width: `${Math.min(100, (volumeChangeSummary.volumeIncreaseRatio / 30) * 100)}%` 
                  }}
                />
              </div>
              <p className="text-center font-bold text-primary">
                {volumeChangeSummary.volumeIncreaseRatio.toFixed(0)}배 증가
              </p>
            </div>
          </div>
        )}

        {/* 변동성 점수 */}
        {post.analysis.affected_assets.find(a => a.symbol === symbol)?.volatility_score && (
          <div>
            <p className="text-xs text-foreground/60 mb-2">⚡ 변동성 점수</p>
            <div className="space-y-2">
              <div className="w-full bg-white/10 rounded-full h-3">
                <div 
                  className="bg-gradient-to-r from-yellow-500 to-red-500 h-3 rounded-full"
                  style={{ 
                    width: `${Math.min(100, 
                      (post.analysis.affected_assets.find(a => a.symbol === symbol)!.volatility_score! / 1000) * 100
                    )}%` 
                  }}
                />
              </div>
              <div className="flex justify-between text-xs">
                <span>{post.analysis.affected_assets.find(a => a.symbol === symbol)!.volatility_score!.toFixed(0)}점</span>
                <span className="text-foreground/60">
                  {post.analysis.affected_assets.find(a => a.symbol === symbol)!.volatility_score! > 700 
                    ? '상위 5% 수준' 
                    : post.analysis.affected_assets.find(a => a.symbol === symbol)!.volatility_score! > 500
                    ? '상위 20% 수준'
                    : '보통 수준'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. 가격대별 거래 분포 */}
      <div>
        <h5 className="text-sm font-medium mb-3">📊 가격대별 거래 분포</h5>
        <div className="space-y-2">
          {priceDistribution.map((bin, index) => {
            const maxVolume = Math.max(...priceDistribution.map(b => b.volume));
            const percentage = (bin.volume / maxVolume) * 100;
            
            return (
              <div key={index} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-foreground/60">{bin.label}</span>
                  <span className="font-medium">{bin.volume.toLocaleString()} {symbol}</span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-2">
                  <div 
                    className="bg-blue-400 h-2 rounded-full transition-all"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-foreground/60">
          💡 가장 많은 거래가 일어난 구간: {
            priceDistribution.reduce((max, bin) => bin.volume > max.volume ? bin : max).label
          }
        </p>
      </div>

      {/* 4. 시간대별 변동폭 */}
      <div>
        <h5 className="text-sm font-medium mb-3">📉 시간대별 변동폭</h5>
        <div className="space-y-3">
          <div className="text-xs text-foreground/60">
            각 분의 변동폭 = (고가 - 저가) / 시가 × 100
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="glass-subtle p-3 rounded-lg">
              <p className="text-xs text-foreground/60 mb-2">게시 전 평균</p>
              <p className="text-2xl font-bold">{volatilityData?.avgBefore?.toFixed(2) || '0.00'}%</p>
            </div>
            <div className="glass-subtle p-3 rounded-lg">
              <p className="text-xs text-foreground/60 mb-2">게시 후 평균</p>
              <p className="text-2xl font-bold text-primary">{volatilityData?.avgAfter?.toFixed(2) || '0.00'}%</p>
            </div>
          </div>

          <div className="p-3 glass-subtle rounded-lg">
            <p className="text-xs text-foreground/60 mb-2">📊 변동폭 비교</p>
            <p className="text-sm">
              게시 후 변동폭이 게시 전 대비{' '}
              <span className="font-bold text-primary">
                {volatilityData?.avgBefore && volatilityData.avgBefore > 0 
                  ? (volatilityData.avgAfter! / volatilityData.avgBefore).toFixed(1) 
                  : '0'}배
              </span>{' '}
              증가
            </p>
            <p className="text-xs text-foreground/60 mt-2">
              💡 해석: 게시물이 가격 불확실성을{' '}
              {volatilityData?.avgAfter && volatilityData?.avgBefore && 
               volatilityData.avgAfter > volatilityData.avgBefore * 2 
                ? '크게 증가시킴' 
                : '다소 증가시킴'}
            </p>
          </div>

          {/* 시각적 표현 */}
          <div className="flex items-end justify-between h-20 px-4">
            <div className="text-center">
              <div 
                className="w-12 bg-blue-400 rounded-t"
                style={{ height: `${Math.min(100, ((volatilityData?.avgBefore || 0) / 5) * 100)}%` }}
              />
              <p className="text-xs mt-2">게시 전</p>
            </div>
            <div className="text-center">
              <div 
                className="w-12 bg-primary rounded-t"
                style={{ height: `${Math.min(100, ((volatilityData?.avgAfter || 0) / 5) * 100)}%` }}
              />
              <p className="text-xs mt-2">게시 후</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}