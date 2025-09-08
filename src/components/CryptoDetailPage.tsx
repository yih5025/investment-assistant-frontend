import { useState } from "react";
import { 
  ArrowLeft, Star, TrendingUp, TrendingDown, AlertTriangle, DollarSign, 
  BarChart3, Activity, MessageSquare, Target, Users, ExternalLink, 
  Globe, Github, Twitter, Calendar, Crown, Shield, Info, Calculator, 
  Settings, ChevronDown, ChevronUp
} from "lucide-react";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

// 훅과 서비스 import (실제 구현에서는 별도 파일)
import { useCryptoDetail, useKimchiPremiumDetail } from '../hooks/useCryptoDetailHook';
import { 
  formatCurrency, formatPercent, formatSupply, formatDate, formatTimeAgo,
  getKimchiPremiumColor, getMarketSentimentColor, getRiskLevelStyle,
  getGitHubActivityGrade, interpretFundingRate, calculateArbitrageProfit,
  calculatePriceDistances, safeParseFloat
} from '../utils/cryptoDataUtils';

interface CryptoDetailPageProps {
  symbol: string;
  onBack: () => void;
}

export function CryptoDetailPage({ symbol, onBack }: CryptoDetailPageProps) {
  // 탭 상태 관리 (5탭으로 확장)
  const [activeTab, setActiveTab] = useState<"concept" | "market" | "kimchi" | "derivatives" | "ecosystem">("concept");
  const [isFavorite, setIsFavorite] = useState(false);
  
  // 확장 상태 관리
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  
  // 메인 데이터 훅
  const {
    conceptData,
    ecosystemData, 
    investmentData,
    loading,
    errors,
    refetchAll,
    hasAnyData,
    hasAnyError,
    isInitialLoading
  } = useCryptoDetail(symbol);
  
  // 김치프리미엄 상세 훅 (필요할 때만 로드)
  const {
    data: detailedKimchiData,
    loading: kimchiDetailLoading,
    changeSortBy,
    changeMinVolume,
    sortBy,
    minVolume
  } = useKimchiPremiumDetail(activeTab === 'kimchi' ? symbol : '');

  // 섹션 확장/축소 토글
  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  // 로딩 상태
  if (isInitialLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-foreground/70">데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  // 에러 상태
  if (hasAnyError && !hasAnyData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-lg font-semibold mb-2">데이터 로드 실패</h2>
          <p className="text-foreground/70 mb-4">
            {Object.values(errors).find((error: any) => error) || '알 수 없는 오류가 발생했습니다.'}
          </p>
          <button
            onClick={refetchAll}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/80 mr-2"
          >
            다시 시도
          </button>
          <button
            onClick={onBack}
            className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80"
          >
            돌아가기
          </button>
        </div>
      </div>
    );
  }

  // 헤더 렌더링
  const renderHeader = () => {
    const basicInfo = conceptData?.basic_info || investmentData?.basic_info;
    const marketData = investmentData?.market_data;
    
    if (!basicInfo) return null;

    return (
      <div className="space-y-4">
        {/* Navigation Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className="p-2 rounded-lg glass hover:glass-strong transition-all"
          >
            <ArrowLeft size={20} />
          </button>
          
          <div className="text-center">
            <h1 className="text-lg font-bold">{basicInfo.symbol}</h1>
            <p className="text-xs text-foreground/70">Rank #{basicInfo.market_cap_rank}</p>
          </div>

          <button
            onClick={() => setIsFavorite(!isFavorite)}
            className={`p-2 rounded-lg transition-all ${isFavorite ? 'text-yellow-400 glass-strong' : 'glass hover:glass-strong'}`}
          >
            <Star size={20} fill={isFavorite ? 'currentColor' : 'none'} />
          </button>
        </div>

        {/* Coin Info Header */}
        <Card className="glass-card p-4">
          <div className="flex items-center space-x-4 mb-4">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
              {basicInfo.image_large ? (
                <img src={basicInfo.image_large} alt={basicInfo.name} className="w-8 h-8" />
              ) : (
                <div className="text-2xl">🪙</div>
              )}
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold">{basicInfo.name} ({basicInfo.symbol})</h2>
              <div className="flex items-center space-x-2 text-sm text-foreground/70">
                <Badge className="glass border-0 px-2 py-1">
                  <Crown size={12} className="mr-1" />
                  #{basicInfo.market_cap_rank}
                </Badge>
                {conceptData?.category_info?.categories_korean?.slice(0, 2).map((category: any, index: number) => (
                  <Badge key={index} className="glass-subtle border-0 px-2 py-1 text-xs">
                    {category}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          {marketData && (
            <>
              <div className="text-center mb-4">
                <div className="text-3xl font-bold mb-1">
                  {formatCurrency(safeParseFloat(marketData.current_price_usd))}
                </div>
                <div className={`flex items-center justify-center space-x-1 ${
                  safeParseFloat(marketData.price_change_percentage_24h) >= 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {safeParseFloat(marketData.price_change_percentage_24h) >= 0 ? 
                    <TrendingUp size={16} /> : <TrendingDown size={16} />
                  }
                  <span className="font-medium">
                    {formatPercent(safeParseFloat(marketData.price_change_percentage_24h))} (24h)
                  </span>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="glass-subtle rounded-lg p-2">
                  <div className="text-sm font-medium">
                    {formatCurrency(marketData.market_cap_usd)}
                  </div>
                  <div className="text-xs text-foreground/70">시가총액</div>
                </div>
                <div className="glass-subtle rounded-lg p-2">
                  <div className="text-sm font-medium">
                    {formatCurrency(marketData.total_volume_usd)}
                  </div>
                  <div className="text-xs text-foreground/70">24h 거래량</div>
                </div>
                <div className="glass-subtle rounded-lg p-2">
                  <div className="text-sm font-medium">
                    {investmentData?.supply_data?.circulating_supply ? 
                      formatSupply(safeParseFloat(investmentData.supply_data.circulating_supply)) : 
                      'N/A'
                    }
                  </div>
                  <div className="text-xs text-foreground/70">유통량</div>
                </div>
              </div>
            </>
          )}
        </Card>

        {/* Global Market Context */}
        {investmentData?.global_context && (
          <Card className="glass-card p-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-4">
                  <div>
                    <span className="text-foreground/70">전체 시장: </span>
                    <span className="font-medium">
                      {formatCurrency(safeParseFloat(investmentData.global_context.total_market_cap_usd))}
                    </span>
                    <span className={`ml-1 ${
                      safeParseFloat(investmentData.global_context.market_cap_change_24h) >= 0 ? 
                      'text-green-400' : 'text-red-400'
                    }`}>
                      ({formatPercent(safeParseFloat(investmentData.global_context.market_cap_change_24h))})
                    </span>
                  </div>
                </div>
                <div className="text-xs text-foreground/50">
                  실시간 업데이트
                </div>
              </div>
              
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-4">
                  <div>
                    <span className="text-foreground/70">BTC 점유율: </span>
                    <span className="font-medium">{investmentData.global_context.btc_dominance}%</span>
                  </div>
                  <div>
                    <span className="text-foreground/70">활성 코인: </span>
                    <span className="font-medium">
                      {investmentData.global_context.active_cryptocurrencies?.toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className={`flex items-center space-x-1 ${
                  getMarketSentimentColor(investmentData.global_context.market_status)
                }`}>
                  <div className="w-2 h-2 bg-current rounded-full"></div>
                  <span className="capitalize">{investmentData.global_context.market_status}</span>
                </div>
              </div>
            </div>
          </Card>
        )}
      </div>
    );
  };

  // 개념 설명 탭
  const renderConceptTab = () => {
    if (!conceptData) {
      return (
        <div className="text-center py-8">
          <Info className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
          <p className="text-foreground/70">개념 설명 데이터를 불러올 수 없습니다.</p>
          {errors.concept && (
            <p className="text-red-400 text-sm mt-2">{errors.concept}</p>
          )}
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {/* 기본 개념 설명 */}
        <Card className="glass-card p-4">
          <h3 className="font-bold mb-3 flex items-center">
            <MessageSquare size={16} className="mr-2" />
            {conceptData.basic_info.name} 이해하기
          </h3>
          
          <div className="space-y-4">
            <div className="glass-subtle rounded-lg p-4">
              <h4 className="font-medium mb-2 text-primary">한 줄 요약</h4>
              <p className="text-sm leading-relaxed">
                {conceptData.educational_content.what_is_it}
              </p>
            </div>

            <div className="glass-subtle rounded-lg p-4">
              <h4 className="font-medium mb-2 text-green-400">어떻게 작동하나?</h4>
              <p className="text-sm leading-relaxed">
                {conceptData.educational_content.how_it_works}
              </p>
            </div>

            <div className="glass-subtle rounded-lg p-4">
              <h4 className="font-medium mb-2 text-yellow-400">왜 만들어졌나?</h4>
              <p className="text-sm leading-relaxed">
                {conceptData.educational_content.why_created}
              </p>
            </div>

            {conceptData.key_features.unique_features.length > 0 && (
              <div className="glass-subtle rounded-lg p-4">
                <h4 className="font-medium mb-2 text-purple-400">핵심 특징</h4>
                <div className="space-y-2">
                  {conceptData.key_features.unique_features.map((feature: any, index: number) => (
                    <div key={index} className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* 기본 정보 */}
        <Card className="glass-card p-4">
          <h3 className="font-bold mb-3">기본 정보</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="glass-subtle rounded-lg p-3">
              <div className="flex items-center space-x-2 mb-2">
                <Calendar size={14} className="text-primary" />
                <span className="text-sm font-medium">탄생일</span>
              </div>
              <div className="font-bold">
                {formatDate(conceptData.concept_description.genesis_date)}
              </div>
            </div>
            
            <div className="glass-subtle rounded-lg p-3">
              <div className="flex items-center space-x-2 mb-2">
                <Crown size={14} className="text-primary" />
                <span className="text-sm font-medium">프로젝트 연령</span>
              </div>
              <div className="font-bold">{conceptData.concept_description.project_age_years}년</div>
            </div>
            
            <div className="glass-subtle rounded-lg p-3">
              <div className="flex items-center space-x-2 mb-2">
                <BarChart3 size={14} className="text-primary" />
                <span className="text-sm font-medium">주요 카테고리</span>
              </div>
              <div className="font-bold">{conceptData.category_info.primary_category}</div>
            </div>
            
            <div className="glass-subtle rounded-lg p-3">
              <div className="flex items-center space-x-2 mb-2">
                <Target size={14} className="text-primary" />
                <span className="text-sm font-medium">합의 알고리즘</span>
              </div>
              <div className="font-bold">{conceptData.key_features.consensus_algorithm}</div>
            </div>
          </div>
        </Card>

        {/* FAQ */}
        {conceptData.faqs.length > 0 && (
          <Card className="glass-card p-4">
            <h3 className="font-bold mb-3">자주 묻는 질문</h3>
            <div className="space-y-3">
              {conceptData.faqs.map((faq: any, index: number) => (
                <div key={index} className="glass-subtle rounded-lg p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-sm mb-2">{faq.question}</h4>
                      <p className="text-xs text-foreground/70">{faq.answer}</p>
                    </div>
                    <Badge className="ml-2 text-xs">{faq.category}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    );
  };

  // 시장 분석 탭
  const renderMarketTab = () => {
    if (!investmentData) {
      return (
        <div className="text-center py-8">
          <Info className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
          <p className="text-foreground/70">시장 분석 데이터를 불러올 수 없습니다.</p>
        </div>
      );
    }

    const marketData = investmentData.market_data;
    const supplyData = investmentData.supply_data;
    const priceDistances = calculatePriceDistances(
      safeParseFloat(marketData.current_price_usd),
      safeParseFloat(marketData.ath_usd),
      safeParseFloat(marketData.atl_usd)
    );

    return (
      <div className="space-y-4">
        {/* 가격 정보 */}
        <Card className="glass-card p-4">
          <h3 className="font-bold mb-3">가격 분석</h3>
          
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="text-center">
              <div className="text-lg font-bold text-green-400">
                {formatPercent(safeParseFloat(marketData.price_change_percentage_24h))}
              </div>
              <div className="text-xs text-foreground/70">24시간</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-blue-400">
                {formatPercent(safeParseFloat(marketData.price_change_percentage_7d))}
              </div>
              <div className="text-xs text-foreground/70">7일</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-purple-400">
                {formatPercent(safeParseFloat(marketData.price_change_percentage_30d))}
              </div>
              <div className="text-xs text-foreground/70">30일</div>
            </div>
          </div>

          {/* ATH/ATL 정보 */}
          <div className="space-y-3">
            <div className="glass-subtle rounded-lg p-3">
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-sm text-foreground/70">최고가 (ATH)</div>
                  <div className="font-bold">{formatCurrency(safeParseFloat(marketData.ath_usd))}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-red-400">
                    {formatPercent(safeParseFloat(marketData.ath_change_percentage))}
                  </div>
                  <div className="text-xs text-foreground/70">
                    {formatDate(marketData.ath_date)}
                  </div>
                </div>
              </div>
            </div>

            <div className="glass-subtle rounded-lg p-3">
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-sm text-foreground/70">최저가 (ATL)</div>
                  <div className="font-bold">{formatCurrency(safeParseFloat(marketData.atl_usd))}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-green-400">
                    +{formatPercent(safeParseFloat(marketData.atl_change_percentage))}
                  </div>
                  <div className="text-xs text-foreground/70">
                    {formatDate(marketData.atl_date)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* 공급량 분석 */}
        {supplyData && (
          <Card className="glass-card p-4">
            <h3 className="font-bold mb-3">공급량 분석</h3>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-foreground/70">유통 공급량:</span>
                <span className="font-medium">
                  {formatSupply(safeParseFloat(supplyData.circulating_supply))}
                </span>
              </div>
              
              {supplyData.max_supply && (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-foreground/70">최대 공급량:</span>
                    <span className="font-medium">
                      {formatSupply(safeParseFloat(supplyData.max_supply))}
                    </span>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-foreground/70">유통률:</span>
                      <span className="font-medium">
                        {formatPercent(safeParseFloat(supplyData.circulating_supply_percentage))}
                      </span>
                    </div>
                    <Progress 
                      value={safeParseFloat(supplyData.circulating_supply_percentage)} 
                      className="h-2"
                    />
                  </div>
                  
                  <div className="glass-subtle rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-foreground/70">희소성 점수:</span>
                      <Badge className={`${getRiskLevelStyle(supplyData.scarcity_score).bgColor} ${getRiskLevelStyle(supplyData.scarcity_score).color} border-0`}>
                        {supplyData.scarcity_score}
                      </Badge>
                    </div>
                  </div>
                </>
              )}
            </div>
          </Card>
        )}

        {/* 위험도 분석 */}
        {investmentData.risk_analysis && (
          <Card className="glass-card p-4">
            <h3 className="font-bold mb-3 flex items-center text-yellow-400">
              <AlertTriangle size={16} className="mr-2" />
              위험도 분석
            </h3>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="glass-subtle rounded-lg p-3">
                <div className="text-sm text-foreground/70 mb-1">변동성 위험</div>
                <Badge className={`${getRiskLevelStyle(investmentData.risk_analysis.volatility_risk).bgColor} ${getRiskLevelStyle(investmentData.risk_analysis.volatility_risk).color} border-0`}>
                  {investmentData.risk_analysis.volatility_risk}
                </Badge>
              </div>
              
              <div className="glass-subtle rounded-lg p-3">
                <div className="text-sm text-foreground/70 mb-1">유동성 위험</div>
                <Badge className={`${getRiskLevelStyle(investmentData.risk_analysis.liquidity_risk).bgColor} ${getRiskLevelStyle(investmentData.risk_analysis.liquidity_risk).color} border-0`}>
                  {investmentData.risk_analysis.liquidity_risk}
                </Badge>
              </div>
              
              <div className="glass-subtle rounded-lg p-3">
                <div className="text-sm text-foreground/70 mb-1">시장 위치 위험</div>
                <Badge className={`${getRiskLevelStyle(investmentData.risk_analysis.market_position_risk).bgColor} ${getRiskLevelStyle(investmentData.risk_analysis.market_position_risk).color} border-0`}>
                  {investmentData.risk_analysis.market_position_risk}
                </Badge>
              </div>
              
              <div className="glass-subtle rounded-lg p-3">
                <div className="text-sm text-foreground/70 mb-1">종합 위험도</div>
                <Badge className={`${getRiskLevelStyle(investmentData.risk_analysis.overall_risk_score).bgColor} ${getRiskLevelStyle(investmentData.risk_analysis.overall_risk_score).color} border-0`}>
                  {investmentData.risk_analysis.overall_risk_score}
                </Badge>
              </div>
            </div>
          </Card>
        )}
      </div>
    );
  };

  // 김치프리미엄 탭
  const renderKimchiTab = () => {
    if (!investmentData?.kimchi_premium) {
      return (
        <div className="text-center py-8">
          <Info className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
          <p className="text-foreground/70">김치프리미엄 데이터를 불러올 수 없습니다.</p>
        </div>
      );
    }

    const kimchiData = investmentData.kimchi_premium;
    const arbitrageResult = calculateArbitrageProfit(
      safeParseFloat(kimchiData.korean_price_usd),
      safeParseFloat(kimchiData.global_avg_price_usd)
    );

    return (
      <div className="space-y-4">
        {/* 김치프리미엄 요약 */}
        <Card className="glass-card p-4 border-2 border-primary/30">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center">
              <DollarSign size={16} className="mr-2" />
              <h3 className="font-bold">김치프리미엄 분석</h3>
              <Badge className="ml-2 bg-primary/20 text-primary border-0 text-xs">실시간</Badge>
            </div>
          </div>
          
          <div className="text-center mb-4">
            <div className={`text-4xl font-bold mb-2 ${
              getKimchiPremiumColor(safeParseFloat(kimchiData.kimchi_premium_percent))
            }`}>
              {formatPercent(safeParseFloat(kimchiData.kimchi_premium_percent))}
            </div>
            <div className="text-sm text-foreground/70">
              {kimchiData.korean_exchange} vs 글로벌 평균
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="glass-subtle rounded-lg p-3 text-center">
              <div className="text-sm font-bold">
                {formatCurrency(safeParseFloat(kimchiData.korean_price_usd))}
              </div>
              <div className="text-xs text-foreground/70">{kimchiData.korean_exchange}</div>
            </div>
            <div className="glass-subtle rounded-lg p-3 text-center">
              <div className="text-sm font-bold">
                {formatCurrency(safeParseFloat(kimchiData.global_avg_price_usd))}
              </div>
              <div className="text-xs text-foreground/70">글로벌 평균</div>
            </div>
          </div>

          {/* 차익거래 분석 */}
          <div className="glass-subtle rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center">
                <Calculator size={14} className="mr-2" />
                <span className="text-sm font-medium">차익거래 분석</span>
              </div>
              <Badge className={`border-0 ${
                arbitrageResult.profitability ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
              }`}>
                {arbitrageResult.profitabilityText}
              </Badge>
            </div>
            
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <div className="text-foreground/70">총 차익</div>
                <div className="font-medium text-green-400">
                  ${arbitrageResult.grossProfit.toFixed(0)}
                </div>
              </div>
              <div>
                <div className="text-foreground/70">거래 비용</div>
                <div className="font-medium text-red-400">
                  ${arbitrageResult.transactionCost.toFixed(0)}
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* 상세 거래소 비교 (확장 가능) */}
        <Card className="glass-card p-4">
          <div 
            className="flex items-center justify-between cursor-pointer"
            onClick={() => toggleSection('detailed-kimchi')}
          >
            <h3 className="font-bold">거래소별 상세 비교</h3>
            {expandedSections['detailed-kimchi'] ? 
              <ChevronUp size={16} /> : <ChevronDown size={16} />
            }
          </div>
          
          {expandedSections['detailed-kimchi'] && (
            <div className="mt-4">
              {kimchiDetailLoading ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                  <p className="text-sm text-foreground/70">상세 데이터 로딩 중...</p>
                </div>
              ) : detailedKimchiData ? (
                <div className="space-y-3">
                  {/* 정렬 옵션 */}
                  <div className="flex items-center space-x-2">
                    <select 
                      value={sortBy}
                      onChange={(e) => changeSortBy(e.target.value)}
                      className="text-xs p-2 rounded bg-background border border-border"
                    >
                      <option value="premium_desc">프리미엄 높은순</option>
                      <option value="premium_asc">프리미엄 낮은순</option>
                      <option value="volume_desc">거래량 높은순</option>
                      <option value="volume_asc">거래량 낮은순</option>
                    </select>
                    
                    <input
                      type="number"
                      placeholder="최소 거래량"
                      value={minVolume}
                      onChange={(e) => changeMinVolume(Number(e.target.value))}
                      className="text-xs p-2 rounded bg-background border border-border w-24"
                    />
                  </div>
                  
                  {/* 거래소 비교 리스트 */}
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {detailedKimchiData.exchange_comparisons.slice(0, 20).map((comparison: any, index: number) => (
                      <div key={index} className="glass-subtle rounded-lg p-3">
                        <div className="flex justify-between items-center">
                          <div className="flex-1">
                            <div className="text-sm font-medium">
                              {comparison.korean_exchange} vs {comparison.global_exchange}
                            </div>
                            <div className="text-xs text-foreground/70">
                              ${comparison.korean_price_usd.toLocaleString()} vs ${comparison.global_price_usd.toLocaleString()}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`font-bold ${
                              comparison.premium_percentage > 0 ? 'text-green-400' : 'text-red-400'
                            }`}>
                              {formatPercent(comparison.premium_percentage)}
                            </div>
                            <div className="text-xs text-foreground/70">
                              ${Math.abs(comparison.price_diff_usd).toFixed(0)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* 통계 요약 */}
                  <div className="glass-subtle rounded-lg p-3">
                    <div className="text-sm font-medium mb-2">통계 요약</div>
                    <div className="grid grid-cols-3 gap-3 text-xs">
                      <div>
                        <div className="text-foreground/70">평균</div>
                        <div className="font-medium">{formatPercent(detailedKimchiData.statistics.premium_stats.average)}</div>
                      </div>
                      <div>
                        <div className="text-foreground/70">최대</div>
                        <div className="font-medium text-green-400">{formatPercent(detailedKimchiData.statistics.premium_stats.max)}</div>
                      </div>
                      <div>
                        <div className="text-foreground/70">최소</div>
                        <div className="font-medium text-red-400">{formatPercent(detailedKimchiData.statistics.premium_stats.min)}</div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-foreground/70 text-center py-4">
                  상세 데이터를 불러올 수 없습니다.
                </p>
              )}
            </div>
          )}
        </Card>
      </div>
    );
  };

  // 파생상품 & 리스크 탭
  const renderDerivativesTab = () => {
    if (!investmentData?.derivatives) {
      return (
        <div className="text-center py-8">
          <Info className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
          <p className="text-foreground/70">파생상품 데이터를 불러올 수 없습니다.</p>
        </div>
      );
    }

    const derivatives = investmentData.derivatives;
    const fundingInterpretation = interpretFundingRate(safeParseFloat(derivatives.avg_funding_rate));

    return (
      <div className="space-y-4">
        {/* 파생상품 시장 심리 */}
        <Card className="glass-card p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center">
              <Activity size={16} className="mr-2" />
              <h3 className="font-bold">파생상품 시장 심리</h3>
            </div>
            <Badge className="bg-primary/20 text-primary border-0 text-xs">실시간</Badge>
          </div>
          
          <div className="space-y-3">
            {/* 펀딩비 분석 */}
            <div className="glass-subtle rounded-lg p-3 border-l-4 border-primary">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center">
                  <Info size={14} className="mr-2 text-primary" />
                  <span className="text-sm font-medium">펀딩비 (8시간)</span>
                </div>
                <span className={`font-bold text-lg ${
                  safeParseFloat(derivatives.avg_funding_rate) >= 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {formatPercent(safeParseFloat(derivatives.avg_funding_rate) * 100, 3)}
                </span>
              </div>
              
              <div className="space-y-2">
                <div className={`text-sm font-medium ${fundingInterpretation.color}`}>
                  {fundingInterpretation.text}
                </div>
                <div className="text-xs text-foreground/70">
                  펀딩비가 양수: 롱 포지션이 숏에 수수료 지급 → 기관들이 상승 베팅
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-foreground/60">시장 심리 강도:</span>
                  <Badge className={`border-0 ${
                    fundingInterpretation.intensity === '높음' ? 'bg-red-500/20 text-red-400' :
                    fundingInterpretation.intensity === '보통' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-green-500/20 text-green-400'
                  }`}>
                    {fundingInterpretation.intensity}
                  </Badge>
                </div>
              </div>
            </div>

            {/* 미결제약정 */}
            <div className="glass-subtle rounded-lg p-3">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-foreground/70">미결제약정</span>
                <span className="font-medium">
                  {formatCurrency(safeParseFloat(derivatives.total_open_interest))}
                </span>
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-foreground/60">24h 거래량:</span>
                  <span className="font-medium">
                    {formatCurrency(safeParseFloat(derivatives.volume_24h_usd))}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-foreground/60">기관 관심도:</span>
                  <Badge className={`border-0 text-xs ${
                    derivatives.institutional_interest === '매우 높음' ? 'bg-green-500/20 text-green-400' :
                    derivatives.institutional_interest === '높음' ? 'bg-blue-500/20 text-blue-400' :
                    'bg-yellow-500/20 text-yellow-400'
                  }`}>
                    {derivatives.institutional_interest}
                  </Badge>
                </div>
              </div>
            </div>

            {/* 시장 심리 종합 */}
            <div className="glass-subtle rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">종합 시장 심리</span>
                <div className="flex items-center">
                  <div className={`w-3 h-3 rounded-full mr-2 ${
                    derivatives.positive_funding_count > derivatives.negative_funding_count * 2 ? 'bg-green-400' :
                    derivatives.positive_funding_count > derivatives.negative_funding_count ? 'bg-yellow-400' : 'bg-red-400'
                  }`}></div>
                  <span className={`font-medium ${getMarketSentimentColor(derivatives.market_sentiment)}`}>
                    {derivatives.market_sentiment}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <div className="text-foreground/70">긍정 펀딩:</div>
                  <div className="font-medium text-green-400">{derivatives.positive_funding_count}개 거래소</div>
                </div>
                <div>
                  <div className="text-foreground/70">부정 펀딩:</div>
                  <div className="font-medium text-red-400">{derivatives.negative_funding_count}개 거래소</div>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* 투자 기회 분석 */}
        {investmentData.investment_opportunity && (
          <Card className="glass-card p-4">
            <h3 className="font-bold mb-3 flex items-center">
              <Target size={16} className="mr-2" />
              투자 기회
            </h3>
            
            <div className="space-y-3">
              <div className="glass-subtle rounded-lg p-3 border-l-2 border-green-400">
                <div className="flex justify-between items-center mb-1">
                  <div className="font-medium text-sm">기관 채택</div>
                  <Badge className="bg-green-500/20 text-green-400 border-0 text-xs">
                    {investmentData.investment_opportunity.institutional_adoption}
                  </Badge>
                </div>
                <div className="text-xs text-foreground/70 mb-2">
                  ETF 승인: {investmentData.investment_opportunity.etf_status}
                </div>
              </div>
              
              <div className="glass-subtle rounded-lg p-3 border-l-2 border-blue-400">
                <div className="flex justify-between items-center mb-1">
                  <div className="font-medium text-sm">공급 제한 효과</div>
                  <Badge className="bg-blue-500/20 text-blue-400 border-0 text-xs">
                    {investmentData.investment_opportunity.supply_constraint}
                  </Badge>
                </div>
                <div className="text-xs text-foreground/70">
                  인플레이션 헤지: {investmentData.investment_opportunity.inflation_hedge}
                </div>
              </div>
              
              {investmentData.investment_opportunity.key_drivers.length > 0 && (
                <div className="glass-subtle rounded-lg p-3 bg-primary/5">
                  <div className="text-sm font-medium mb-2 text-primary">주요 상승 동력</div>
                  <div className="space-y-1">
                    {investmentData.investment_opportunity.key_drivers.map((driver, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                        <span className="text-xs">{driver}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* 포트폴리오 가이드 */}
        {investmentData.portfolio_guidance && (
          <Card className="glass-card p-4">
            <h3 className="font-bold mb-3">포트폴리오 배분 가이드</h3>
            
            <div className="space-y-3">
              <div className="glass-subtle rounded-lg p-3">
                <div className="text-sm font-medium mb-2">투자자 유형별 권장 비중</div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-foreground/70">보수적 투자자:</span>
                    <Badge className="bg-blue-500/20 text-blue-400 border-0 text-xs">
                      {investmentData.portfolio_guidance.conservative_allocation}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-foreground/70">중간 위험 선호:</span>
                    <Badge className="bg-yellow-500/20 text-yellow-400 border-0 text-xs">
                      {investmentData.portfolio_guidance.moderate_allocation}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-foreground/70">적극적 투자자:</span>
                    <Badge className="bg-green-500/20 text-green-400 border-0 text-xs">
                      {investmentData.portfolio_guidance.aggressive_allocation}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="glass-subtle rounded-lg p-3">
                <div className="text-sm font-medium mb-2">권장 투자 전략</div>
                <div className="space-y-2 text-xs">
                  {investmentData.portfolio_guidance.investment_strategies.map((strategy, index) => (
                    <div key={index} className="flex items-start space-x-2">
                      <div className="w-1.5 h-1.5 bg-primary rounded-full mt-1.5 flex-shrink-0"></div>
                      <span>{strategy}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-2 text-xs text-foreground/70">
                  권장 투자 기간: {investmentData.portfolio_guidance.time_horizon}
                </div>
              </div>
            </div>
          </Card>
        )}
      </div>
    );
  };

  // 생태계 & 개발 탭
  const renderEcosystemTab = () => {
    if (!ecosystemData) {
      return (
        <div className="text-center py-8">
          <Info className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
          <p className="text-foreground/70">생태계 데이터를 불러올 수 없습니다.</p>
          {errors.ecosystem && (
            <p className="text-red-400 text-sm mt-2">{errors.ecosystem}</p>
          )}
        </div>
      );
    }

    const devActivity = ecosystemData.development_activity;
    const community = ecosystemData.community_metrics;
    const marketPos = ecosystemData.market_position;
    const gitHubGrade = getGitHubActivityGrade(
      devActivity.github_metrics.commit_count_4_weeks,
      devActivity.github_metrics.stars
    );

    return (
      <div className="space-y-4">
        {/* 개발 활성도 */}
        <Card className="glass-card p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center">
              <Github size={16} className="mr-2" />
              <h3 className="font-bold">개발 활성도</h3>
            </div>
            <Badge className="bg-primary/20 text-primary border-0 text-xs">GitHub 연동</Badge>
          </div>
          
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="glass-subtle rounded-lg p-3 text-center">
              <div className={`text-lg font-bold ${gitHubGrade.color.split(' ')[0]}`}>
                {gitHubGrade.grade}
              </div>
              <div className="text-xs text-foreground/70">개발 점수</div>
              <Badge className={`${gitHubGrade.color} border-0 mt-1 text-xs`}>
                종합 평가
              </Badge>
            </div>
            
            <div className="glass-subtle rounded-lg p-3 text-center">
              <div className="text-lg font-bold">{devActivity.github_metrics.commit_count_4_weeks}</div>
              <div className="text-xs text-foreground/70">4주간 커밋</div>
              <div className="text-xs text-green-400 mt-1">
                주당 {devActivity.activity_indicators.commits_per_week}개
              </div>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2 text-xs">
            <div className="glass-subtle rounded-lg p-2 text-center">
              <div className="font-medium">{formatSupply(devActivity.github_metrics.stars)}</div>
              <div className="text-foreground/70">스타</div>
            </div>
            <div className="glass-subtle rounded-lg p-2 text-center">
              <div className="font-medium">{formatSupply(devActivity.github_metrics.forks)}</div>
              <div className="text-foreground/70">포크</div>
            </div>
            <div className="glass-subtle rounded-lg p-2 text-center">
              <div className="font-medium">
                {Math.round(devActivity.github_metrics.issues_resolved_rate_percent)}%
              </div>
              <div className="text-foreground/70">이슈 해결률</div>
            </div>
            <div className="glass-subtle rounded-lg p-2 text-center">
              <div className="font-medium">{devActivity.github_metrics.total_issues}</div>
              <div className="text-foreground/70">총 이슈</div>
            </div>
          </div>
        </Card>

        {/* 커뮤니티 건강도 */}
        <Card className="glass-card p-4">
          <h3 className="font-bold mb-3 flex items-center">
            <Users size={16} className="mr-2" />
            커뮤니티 건강도
          </h3>
          
          <div className="space-y-3">
            <div className="glass-subtle rounded-lg p-3">
              <div className="text-sm font-medium mb-2">플랫폼 현황</div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="text-center">
                  <div className="font-bold text-orange-400">
                    {community.social_metrics.reddit_subscribers || 'N/A'}
                  </div>
                  <div className="text-foreground/70">Reddit 구독자</div>
                  <div className={`text-xs mt-1 ${
                    community.platform_presence.has_reddit ? 'text-green-400' : 'text-gray-400'
                  }`}>
                    {community.platform_presence.has_reddit ? '활성' : '비활성'}
                  </div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-blue-400">
                    {community.social_metrics.telegram_users || 'N/A'}
                  </div>
                  <div className="text-foreground/70">Telegram 사용자</div>
                  <div className={`text-xs mt-1 ${
                    community.platform_presence.has_telegram ? 'text-green-400' : 'text-gray-400'
                  }`}>
                    {community.platform_presence.has_telegram ? '활성' : '비활성'}
                  </div>
                </div>
              </div>
            </div>

            <div className="glass-subtle rounded-lg p-3">
              <div className="text-sm font-medium mb-2">플랫폼 활성도</div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-foreground/70">활성 플랫폼:</span>
                <Badge className="bg-blue-500/20 text-blue-400 border-0 text-xs">
                  {community.platform_presence.total_platforms}개 플랫폼
                </Badge>
              </div>
            </div>
          </div>
        </Card>

        {/* 시장 위치 */}
        <Card className="glass-card p-4">
          <h3 className="font-bold mb-3 flex items-center">
            <BarChart3 size={16} className="mr-2" />
            시장 위치
          </h3>
          
          <div className="space-y-3">
            <div className="glass-subtle rounded-lg p-3">
              <div className="flex justify-between items-center mb-2">
                <div>
                  <div className="text-sm font-medium">현재 순위</div>
                  <div className="text-xs text-foreground/70">
                    전체 {marketPos.ranking_info.total_cryptocurrencies.toLocaleString()}개 중
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-primary">
                    #{marketPos.ranking_info.current_rank}
                  </div>
                  <div className="text-xs text-green-400">
                    상위 {(100 - marketPos.ranking_info.top_percentile).toFixed(1)}%
                  </div>
                </div>
              </div>
              <Badge className="bg-green-500/20 text-green-400 border-0 text-xs">
                {marketPos.ranking_info.rank_category}
              </Badge>
            </div>

            <div className="glass-subtle rounded-lg p-3">
              <div className="text-sm font-medium mb-2">카테고리 정보</div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-xs text-foreground/70">주요 카테고리:</span>
                  <span className="text-xs font-medium">{marketPos.category_context.primary_category}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-foreground/70">전체 카테고리:</span>
                  <span className="text-xs font-medium">{marketPos.category_context.category_count}개</span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* 비교 분석 */}
        {ecosystemData.comparative_context && (
          <Card className="glass-card p-4">
            <div 
              className="flex items-center justify-between cursor-pointer"
              onClick={() => toggleSection('competitors')}
            >
              <h3 className="font-bold">경쟁사 비교</h3>
              {expandedSections['competitors'] ? 
                <ChevronUp size={16} /> : <ChevronDown size={16} />
              }
            </div>
            
            {expandedSections['competitors'] && (
              <div className="mt-4 space-y-3">
                {/* 카테고리 경쟁사 */}
                <div>
                  <div className="text-sm font-medium mb-2">같은 카테고리 프로젝트</div>
                  <div className="space-y-2">
                    {ecosystemData.comparative_context.category_peers.slice(0, 5).map((peer, index) => (
                      <div key={index} className="glass-subtle rounded-lg p-2">
                        <div className="flex justify-between items-center">
                          <div>
                            <span className="text-sm font-medium">{peer.name}</span>
                            <span className="text-xs text-foreground/70 ml-2">({peer.symbol})</span>
                          </div>
                          <Badge className="text-xs">#{peer.market_cap_rank}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 순위 인접 프로젝트 */}
                <div>
                  <div className="text-sm font-medium mb-2">순위 인접 프로젝트</div>
                  <div className="space-y-2">
                    {ecosystemData.comparative_context.rank_peers.slice(0, 5).map((peer, index) => (
                      <div key={index} className="glass-subtle rounded-lg p-2">
                        <div className="flex justify-between items-center">
                          <div>
                            <span className="text-sm font-medium">{peer.name}</span>
                            <span className="text-xs text-foreground/70 ml-2">({peer.symbol})</span>
                          </div>
                          <div className="text-right">
                            <Badge className="text-xs">#{peer.market_cap_rank}</Badge>
                            <div className="text-xs text-foreground/70">
                              {peer.rank_difference > 0 ? '+' : ''}{peer.rank_difference}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </Card>
        )}
      </div>
    );
  };

  // 탭 네비게이션
  const renderTabNavigation = () => (
    <div className="flex rounded-xl glass p-1 mb-4 overflow-x-auto">
      {[
        { id: "concept", label: "개념", icon: MessageSquare },
        { id: "market", label: "시장", icon: BarChart3 },
        { id: "kimchi", label: "김치", icon: DollarSign },
        { id: "derivatives", label: "파생", icon: Activity },
        { id: "ecosystem", label: "생태계", icon: Users }
      ].map(tab => {
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center space-x-1 py-2 px-3 rounded-lg transition-all text-sm flex-shrink-0 ${
              activeTab === tab.id
                ? 'glass-strong text-primary font-medium'
                : 'hover:glass-subtle text-foreground/70'
            }`}
          >
            <Icon size={14} />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );

  // 탭 콘텐츠 렌더링
  const renderTabContent = () => {
    switch (activeTab) {
      case "concept":
        return renderConceptTab();
      case "market":
        return renderMarketTab();
      case "kimchi":
        return renderKimchiTab();
      case "derivatives":
        return renderDerivativesTab();
      case "ecosystem":
        return renderEcosystemTab();
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen">
      <div className="max-w-md mx-auto relative z-10">
        <div className="px-4 pt-4 pb-20">
          {renderHeader()}
          {renderTabNavigation()}
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
}