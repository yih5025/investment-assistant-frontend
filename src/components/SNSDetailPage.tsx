import { useState } from "react";
import { ArrowLeft, ExternalLink, TrendingUp, TrendingDown, Loader2, RefreshCw } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart as ReBarChart, Bar } from "recharts";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { useSNSPostDetail, useSNSUtils } from "../hooks/useSNSData";
import { SNSPost, PriceTimelinePoint, AssetDetailData } from "../types/sns-type";

interface SNSDetailPageProps {
  post: SNSPost;
  onBack: () => void;
}

export function SNSDetailPage({ post, onBack }: SNSDetailPageProps) {
  const [activeTab, setActiveTab] = useState("overview");
  
  // 실제 API 데이터 사용
  const { post: detailPost, detailData, loading, error, refresh } = useSNSPostDetail(post.postSource, post.id);
  const { formatPrice, formatRelativeTime, getChangeColor, generateSNSLink } = useSNSUtils();

  // 현재 게시글 정보 (detailPost가 있으면 사용, 없으면 props의 post 사용)
  const currentPost = detailPost || post;
  const snsLink = generateSNSLink(currentPost);

  // 차트용 데이터 생성
  const generateChartData = (priceTimeline: PriceTimelinePoint[]) => {
    return priceTimeline.map((point, index) => ({
      time: new Date(point.timestamp).toLocaleTimeString('ko-KR', { 
        month: 'short', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
      }),
      price: point.price,
      volume: point.volume,
      index
    }));
  };

  // 변화율 아이콘
  const getChangeIcon = (change: number) => {
    return change >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />;
  };

  // 로딩 상태
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className="p-2 rounded-lg glass hover:glass-strong transition-all"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-bold">SNS 시장 영향 분석</h1>
          <div className="w-10 h-10"></div>
        </div>
        
        <div className="glass-card p-8 text-center">
          <Loader2 size={48} className="mx-auto mb-4 text-primary animate-spin" />
          <p className="text-foreground/70">상세 분석 데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  // 에러 상태
  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className="p-2 rounded-lg glass hover:glass-strong transition-all"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-bold">SNS 시장 영향 분석</h1>
          <div className="w-10 h-10"></div>
        </div>
        
        <div className="glass-card p-8 text-center">
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
          href={snsLink}
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 rounded-lg glass hover:glass-strong transition-all"
        >
          <ExternalLink size={20} />
        </a>
      </div>

      {/* 게시글 정보 */}
      <div className="glass-card p-4 rounded-xl">
        <div className="flex items-start space-x-3 mb-4">
          <div className="relative">
            <img
              src={currentPost.profileImage}
              alt={currentPost.author}
              className="w-12 h-12 rounded-full object-cover"
            />
            {currentPost.verified && (
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
                  <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="2" fill="none"/>
                </svg>
              </div>
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-1">
              <p className="font-medium">{currentPost.author}</p>
              <Badge variant="secondary">{currentPost.platform}</Badge>
            </div>
            <p className="text-sm text-foreground/60">{formatRelativeTime(currentPost.timestamp)}</p>
          </div>
        </div>
        
        <p className="text-sm mb-4">{currentPost.content}</p>
        
        {/* 미디어 표시 */}
        {currentPost.hasMedia && currentPost.mediaThumbnail && (
          <div className="mb-4">
            <img
              src={currentPost.mediaThumbnail}
              alt="미디어 썸네일"
              className="w-full max-h-64 object-cover rounded-lg"
            />
            {currentPost.mediaType && (
              <p className="text-xs text-foreground/60 mt-2">
                {currentPost.mediaType === 'video' ? '📹 비디오' : '🖼️ 이미지'}
              </p>
            )}
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
              href={snsLink}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1 glass rounded-lg text-sm hover:glass-strong transition-all"
            >
              {currentPost.platform}에서 보기
            </a>
          </div>
        </div>
        
        {currentPost.hasMarketImpact && (
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <TrendingUp size={18} className="text-primary" />
              <span className="text-sm font-medium">
                시장 영향도: {currentPost.impactScore?.toFixed(1)}%
              </span>
            </div>
            <Badge className="bg-primary/20 text-primary">
              분석 완료
            </Badge>
          </div>
        )}
      </div>

      {/* 영향받은 자산 개요 */}
      {currentPost.affectedAssets.length > 0 && (
        <div className="glass-card p-4 rounded-xl">
          <h3 className="font-medium mb-3">영향받은 자산</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {currentPost.affectedAssets.map((asset, index) => (
              <div key={index} className="glass-subtle p-3 rounded-lg text-center">
                <p className="font-medium text-sm mb-1">{asset.symbol}</p>
                <p className="text-xs text-foreground/60 mb-2">
                  우선순위: {asset.priority}
                </p>
                {asset.volatility_score && (
                  <div className="text-xs text-orange-400">
                    변동성: {asset.volatility_score.toFixed(1)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 상세 분석 탭 */}
      {detailData && Object.keys(detailData).length > 0 && (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 glass-card">
            <TabsTrigger value="overview">개요</TabsTrigger>
            <TabsTrigger value="charts">차트</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {/* 자산별 개요 */}
            {Object.entries(detailData).map(([symbol, assetData]: [string, any]) => {
              if (!assetData.price_timeline || !Array.isArray(assetData.price_timeline)) return null;
              
              const timeline = assetData.price_timeline as PriceTimelinePoint[];
              const firstPrice = timeline[0]?.price || 0;
              const lastPrice = timeline[timeline.length - 1]?.price || 0;
              const change = firstPrice > 0 ? ((lastPrice - firstPrice) / firstPrice) * 100 : 0;
              
              return (
                <div key={symbol} className="glass-card p-4 rounded-xl">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium">{symbol}</h4>
                    <Badge variant="outline">{formatPrice(lastPrice, symbol)}</Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-foreground/60">시작 가격</p>
                      <p className="font-medium">{formatPrice(firstPrice, symbol)}</p>
                    </div>
                    <div>
                      <p className="text-foreground/60">현재 가격</p>
                      <div className={`flex items-center space-x-1 ${getChangeColor(change)}`}>
                        {getChangeIcon(change)}
                        <span>{formatPrice(lastPrice, symbol)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-white/10">
                    <div className="flex justify-between text-xs text-foreground/60">
                      <span>데이터 포인트: {timeline.length}개</span>
                      <span className={getChangeColor(change)}>
                        변화율: {change.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </TabsContent>

          <TabsContent value="charts" className="space-y-4">
            {Object.entries(detailData).map(([symbol, assetData]: [string, any]) => {
              if (!assetData.price_timeline || !Array.isArray(assetData.price_timeline)) return null;
              
              const timeline = assetData.price_timeline as PriceTimelinePoint[];
              const chartData = generateChartData(timeline);
              
              return (
                <div key={symbol} className="glass-card p-4 rounded-xl">
                  <h4 className="font-medium mb-4">{symbol} 가격 변화</h4>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
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
                          domain={['dataMin - 1', 'dataMax + 1']}
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
                          dot={{ fill: '#60a5fa', strokeWidth: 2, r: 2 }}
                          activeDot={{ r: 4, stroke: '#60a5fa', strokeWidth: 2 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  
                  <div className="mt-4">
                    <h5 className="text-sm font-medium mb-2">거래량 변화</h5>
                    <div className="h-32">
                      <ResponsiveContainer width="100%" height="100%">
                        <ReBarChart data={chartData}>
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
                          <Bar dataKey="volume" fill="#60a5fa" opacity={0.6} />
                        </ReBarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              );
            })}
          </TabsContent>
        </Tabs>
      )}

      {/* 데이터가 없는 경우 */}
      {(!detailData || Object.keys(detailData).length === 0) && !loading && (
        <div className="glass-card p-8 text-center">
          <p className="text-foreground/70 mb-4">상세 분석 데이터가 없습니다.</p>
          <button
            onClick={refresh}
            className="px-4 py-2 glass rounded-lg hover:glass-strong transition-all flex items-center space-x-2 mx-auto"
          >
            <RefreshCw size={16} />
            <span>새로고침</span>
          </button>
        </div>
      )}
    </div>
  );
}