import React, { useState, memo, useCallback } from "react";
import { ArrowLeft, Star, TrendingUp, TrendingDown, AlertTriangle, Building, DollarSign, BarChart3, PieChart, Activity, Clock, Info, HelpCircle, Loader2 } from "lucide-react";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { useMarketDetail } from '../hooks/useSP500Detail'; // 위에서 만든 훅
import { formatCurrency, formatStockChange, formatPercent } from '../utils/formatters';

interface MarketDetailPageProps {
  symbol: string;
  onBack: () => void;
}

// 준비중 섹션 컴포넌트
const PreparingSection = ({ title, message, estimatedTime }: { 
  title: string; 
  message: string; 
  estimatedTime?: string; 
}) => (
  <Card className="glass-card p-4">
    <div className="text-center">
      <div className="flex items-center justify-center mb-3">
        <Loader2 className="animate-spin mr-2" size={20} />
        <h3 className="font-bold">{title}</h3>
      </div>
      <p className="text-sm text-foreground/70 mb-2">{message}</p>
      {estimatedTime && (
        <p className="text-xs text-foreground/50">{estimatedTime}</p>
      )}
    </div>
  </Card>
);

// 로딩 스켈레톤 컴포넌트
const LoadingSkeleton = () => (
  <div className="min-h-screen">
    <div className="max-w-md mx-auto">
      <div className="animate-pulse">
        <div className="h-16 bg-gray-700 rounded-xl mb-4"></div>
        <div className="px-4 space-y-4">
          <div className="h-32 bg-gray-700 rounded-xl"></div>
          <div className="h-48 bg-gray-700 rounded-xl"></div>
          <div className="h-40 bg-gray-700 rounded-xl"></div>
        </div>
      </div>
    </div>
  </div>
);

// 차트 컴포넌트 분리 (React.memo로 최적화)
interface StockChartProps {
  chartData: any[];
  chartLoading: boolean;
  selectedTimeframe: string;
  onTimeframeChange: (timeframe: '1H' | '1D' | '1W' | '1MO') => void;
  formatCurrency: (value: number) => string;
  formatTimestampForChart: (timestamp: string, timeframe: string) => string;
}

const StockChart = memo<StockChartProps>(({ 
  chartData, 
  chartLoading, 
  selectedTimeframe, 
  onTimeframeChange,
  formatCurrency,
  formatTimestampForChart
}) => {
  return (
    <Card className="glass-card p-4">
      <h3 className="font-bold mb-3 flex items-center">
        <Clock size={16} className="mr-2" />
        주가 차트
      </h3>
      
      <div className="flex space-x-2 mb-4">
        {(['1H', '1D', '1W', '1MO'] as const).map((timeframe) => (
          <button
            key={timeframe}
            onClick={() => onTimeframeChange(timeframe)}
            disabled={chartLoading}
            className={`px-3 py-1 rounded-lg text-xs transition-all ${
              selectedTimeframe === timeframe 
                ? 'glass-strong text-primary' 
                : 'glass-subtle hover:glass'
            } ${chartLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {timeframe === '1MO' ? '1M' : timeframe}
          </button>
        ))}
      </div>

      <div className="h-48 relative">
        {chartLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Loader2 className="animate-spin mx-auto mb-2" size={24} />
              <p className="text-sm text-foreground/70">차트 데이터 로딩 중...</p>
            </div>
          </div>
        ) : chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#60a5fa" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis 
                dataKey="timestamp" 
                axisLine={false} 
                tickLine={false}
                tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.7)' }}
                tickFormatter={(timestamp) => formatTimestampForChart(timestamp, selectedTimeframe)}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false}
                tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.7)' }}
                domain={['dataMin - 0.5', 'dataMax + 0.5']}
              />
              <Tooltip 
                formatter={(value) => [formatCurrency(Number(value)), '주가']}
                labelFormatter={(label) => `시간: ${formatTimestampForChart(label, selectedTimeframe)}`}
                contentStyle={{ 
                  backgroundColor: 'rgba(0, 0, 0, 0.8)', 
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '8px',
                  color: 'white'
                }}
              />
              <Area 
                type="monotone" 
                dataKey="price" 
                stroke="#60a5fa" 
                strokeWidth={2}
                fill="url(#priceGradient)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Loader2 className="animate-spin mx-auto mb-2" size={24} />
              <p className="text-sm text-foreground/70">차트 데이터 로딩 중...</p>
              <button 
                onClick={() => onTimeframeChange(selectedTimeframe as '1H' | '1D' | '1W' | '1MO')}
                className="mt-2 text-xs text-primary hover:underline"
              >
                다시 시도
              </button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
});

export function MarketDetailPage({ symbol, onBack }: MarketDetailPageProps) {
  const [isExpertMode, setIsExpertMode] = useState(false);
  const [showTooltip, setShowTooltip] = useState<string | null>(null);
  
  // 훅 사용 - 단일 API 호출로 모든 데이터 관리
  const {
    loading,
    chartLoading,
    error,
    dataCase,
    stockPrice,
    companyData,
    financialData,
    chartData,
    dataAvailability,
    ratios,
    grades,
    risks,
    sectorComparison,
    integratedAnalysis,
    refreshData,
    changeTimeframe,
    toggleFavorite,
    isFavorite,
    selectedTimeframe
  } = useMarketDetail(symbol);

  // 데이터 상태 디버깅
  console.log('데이터 상태:', dataCase.replace('_', ' '));

  // 유틸리티 함수들 (useCallback으로 최적화)
  const formatBillion = useCallback((value: number | null | undefined) => {
    if (value === null || value === undefined || isNaN(value)) return '$0.00B';
    return `$${(value / 1e9).toFixed(2)}B`;
  }, []);

  // 차트용 timestamp 포맷팅 함수 (useCallback으로 최적화)
  const formatTimestampForChart = useCallback((timestamp: string, timeframe: string) => {
    if (!timestamp) return '';
    
    try {
      const date = new Date(timestamp);
      
      switch (timeframe) {
        case '1H':
          // 시간별: HH:MM 형식
          return date.toLocaleTimeString('ko-KR', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: false
          });
        case '1D':
          // 일별: MM/DD HH:MM 형식
          return date.toLocaleDateString('ko-KR', { 
            month: '2-digit', 
            day: '2-digit' 
          }) + ' ' + date.toLocaleTimeString('ko-KR', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: false
          });
        case '1W':
          // 주별: MM/DD 형식
          return date.toLocaleDateString('ko-KR', { 
            month: '2-digit', 
            day: '2-digit' 
          });
        case '1MO':
          // 월별: MM/DD 형식
          return date.toLocaleDateString('ko-KR', { 
            month: '2-digit', 
            day: '2-digit' 
          });
        default:
          return timestamp;
      }
    } catch (error) {
      console.error('Timestamp formatting error:', error);
      return timestamp;
    }
  }, []);

  const getGradeColor = (grade: string) => {
    switch (grade.charAt(0)) {
      case 'A': return 'text-green-400 bg-green-500/20';
      case 'B': return 'text-blue-400 bg-blue-500/20';
      case 'C': return 'text-yellow-400 bg-yellow-500/20';
      case 'D': return 'text-red-400 bg-red-500/20';
      default: return 'text-foreground/70 bg-muted/20';
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'high': return 'border-red-400 bg-red-500/10';
      case 'medium': return 'border-yellow-400 bg-yellow-500/10';
      case 'low': return 'border-green-400 bg-green-500/10';
      default: return 'border-gray-400 bg-gray-500/10';
    }
  };

  // 로딩 상태
  if (loading) {
    return <LoadingSkeleton />;
  }

  // 에러 상태
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="glass-card p-6 max-w-md mx-auto">
          <div className="text-center">
            <AlertTriangle className="mx-auto mb-4 text-red-400" size={48} />
            <h2 className="text-lg font-bold mb-2">데이터 로딩 실패</h2>
            <p className="text-sm text-foreground/70 mb-4">{error}</p>
            <button 
              onClick={refreshData}
              className="px-4 py-2 glass hover:glass-strong rounded-lg transition-all"
            >
              다시 시도
            </button>
          </div>
        </Card>
      </div>
    );
  }

  // 주가 데이터가 없으면 에러 처리
  if (!stockPrice) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">주식 데이터를 찾을 수 없습니다.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative z-10">
      <div className="max-w-md mx-auto">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-4 glass-card rounded-b-xl mb-4">
          <button onClick={onBack} className="p-2 rounded-lg glass hover:glass-strong transition-all">
            <ArrowLeft size={20} />
          </button>
          
          <div className="text-center">
            <h1 className="text-lg font-bold">{stockPrice.symbol}</h1>
            <p className="text-xs text-foreground/70">
              {stockPrice.market_status.is_open ? 'OPEN' : 'CLOSED'}
            </p>
          </div>

          <button
            onClick={toggleFavorite}
            className={`p-2 rounded-lg transition-all ${isFavorite ? 'text-yellow-400 glass-strong' : 'glass hover:glass-strong'}`}
          >
            <Star size={20} fill={isFavorite ? 'currentColor' : 'none'} />
          </button>
        </div>

        {/* ✨ 새로 추가: 페이지 안내 섹션 */}
        <div className="px-4 mb-4">
          <div className="glass-card rounded-2xl p-4">
            <h3 className="text-base font-bold mb-3 flex items-center">
              <Info size={18} className="mr-2 text-blue-400" />
              이 페이지에서 확인할 수 있어요
            </h3>
            
            <div className="space-y-3">
              {/* 투자 인사이트 모드 설명 */}
              {!isExpertMode ? (
                <>
                  <div className="flex items-start space-x-3 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                    <div className="flex-1">
                      <h4 className="font-semibold text-blue-400 mb-1 text-sm">투자 인사이트 모드</h4>
                      <p className="text-xs text-foreground/70 leading-relaxed">
                        이 기업이 투자하기 좋은지 쉽게 알려드려요. 수익성, 안정성, 가격 적정성을 한눈에 확인하세요!
                      </p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div className="glass rounded-lg p-2.5">
                      <div className="text-xs text-foreground/60 mb-1">실시간 차트</div>
                      <p className="text-xs text-foreground/80">주가 움직임을 시간대별로 확인</p>
                    </div>
                    <div className="glass rounded-lg p-2.5">
                      <div className="text-xs text-foreground/60 mb-1">투자 매력도</div>
                      <p className="text-xs text-foreground/80">A~D 등급으로 평가</p>
                    </div>
                    <div className="glass rounded-lg p-2.5">
                      <div className="text-xs text-foreground/60 mb-1">⚠️ 주의사항</div>
                      <p className="text-xs text-foreground/80">투자 전 꼭 확인할 리스크</p>
                    </div>
                    <div className="glass rounded-lg p-2.5">
                      <div className="text-xs text-foreground/60 mb-1">업종 비교</div>
                      <p className="text-xs text-foreground/80">같은 업종 다른 회사와 비교</p>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-start space-x-3 p-3 rounded-xl bg-purple-500/10 border border-purple-500/20">
                    <div className="flex-1">
                      <h4 className="font-semibold text-purple-400 mb-1 text-sm">상세 재무정보 모드</h4>
                      <p className="text-xs text-foreground/70 leading-relaxed">
                        기업의 재무 상태를 전문가처럼 자세히 분석할 수 있어요. 재무비율과 업종 평균을 비교해보세요!
                      </p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div className="glass rounded-lg p-2.5">
                      <div className="text-xs text-foreground/60 mb-1">💰 재무비율</div>
                      <p className="text-xs text-foreground/80">유동비율, 부채비율 등</p>
                    </div>
                    <div className="glass rounded-lg p-2.5">
                      <div className="text-xs text-foreground/60 mb-1">재무상태표</div>
                      <p className="text-xs text-foreground/80">자산, 부채, 자본 현황</p>
                    </div>
                    <div className="glass rounded-lg p-2.5">
                      <div className="text-xs text-foreground/60 mb-1">업종 평균 대비</div>
                      <p className="text-xs text-foreground/80">업계에서 얼마나 잘하는지</p>
                    </div>
                    <div className="glass rounded-lg p-2.5">
                      <div className="text-xs text-foreground/60 mb-1">회사 정보</div>
                      <p className="text-xs text-foreground/80">사업 설명과 웹사이트</p>
                    </div>
                  </div>
                </>
              )}
              
              {/* 모드 전환 안내 */}
              <div className="flex items-center justify-center pt-2">
                <p className="text-xs text-foreground/60 text-center">
                  💡 아래 버튼으로 <span className="font-semibold text-primary">"투자 인사이트"</span>와 <span className="font-semibold text-primary">"상세 재무정보"</span>를 전환할 수 있어요
                </p>
              </div>
            </div>
          </div>
        </div>


        {/* 모드 전환 토글 */}
        <div className="px-4 mb-4">
          <div className="glass-card rounded-xl p-1 flex">
            <button
              onClick={() => setIsExpertMode(false)}
              className={`flex-1 py-2 px-4 rounded-lg transition-all text-sm font-medium ${
                !isExpertMode ? 'glass-strong text-primary' : 'text-foreground/70'
              }`}
            >
              투자 인사이트
            </button>
            <button
              onClick={() => setIsExpertMode(true)}
              className={`flex-1 py-2 px-4 rounded-lg transition-all text-sm font-medium ${
                isExpertMode ? 'glass-strong text-primary' : 'text-foreground/70'
              }`}
            >
              상세 재무정보
            </button>
          </div>
        </div>

        <div className="px-4 space-y-4 pb-20">
          {/* 기본 정보 - 항상 표시 (current_price는 항상 있음) */}
          <Card className="glass-card p-4">
            <div className="text-center mb-4">
              <h2 className="text-xl font-bold mb-1">
                {companyData?.name || stockPrice.symbol}
              </h2>
              {companyData && (
                <div className="flex items-center justify-center space-x-2 text-sm text-foreground/70">
                  <Building size={14} />
                  <span>{companyData.sector}</span>
                  <span>•</span>
                  <span>{companyData.industry}</span>
                </div>
              )}
            </div>

            <div className="text-center">
              <div className="text-3xl font-bold mb-1">
                {formatCurrency(stockPrice.current_price || 0)}
              </div>
              <div className={`flex items-center justify-center space-x-1 ${
                (stockPrice.change_percentage || 0) >= 0 ? 'text-green-400' : 'text-red-400'
              }`}>
                {(stockPrice.change_percentage || 0) >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                <span className="font-medium">
                  {(stockPrice.change_percentage || 0) >= 0 ? '+' : ''}
                  {formatStockChange(stockPrice.change_amount || 0)} 
                  ({(stockPrice.change_percentage || 0) >= 0 ? '+' : ''}
                  {formatPercent(stockPrice.change_percentage || 0)})
                </span>
              </div>
            </div>
          </Card>

          {/* 실시간 주가 차트 - 항상 표시 */}
          <StockChart 
            chartData={chartData}
            chartLoading={chartLoading}
            selectedTimeframe={selectedTimeframe}
            onTimeframeChange={changeTimeframe}
            formatCurrency={formatCurrency}
            formatTimestampForChart={formatTimestampForChart}
          />

          {!isExpertMode ? (
            /* 투자 인사이트 모드 */
            <>
              {/* 핵심 투자 지표 - 데이터 가용성에 따라 조건부 표시 */}
              {dataAvailability.companyOverview && dataAvailability.balanceSheet && grades ? (
                <Card className="glass-card p-4">
                  <h3 className="font-bold mb-3 flex items-center">
                    <PieChart size={16} className="mr-2" />
                    투자 매력도 분석
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="glass-subtle rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">수익성</span>
                        <Badge className={`${getGradeColor(grades.profitability)} border-0`}>
                          {grades.profitability}
                        </Badge>
                      </div>
                      <div className="text-xs text-foreground/70">
                        ROE {formatPercent(companyData?.roe || 0)}
                        {sectorComparison && (
                          sectorComparison.roe_vs_sector > 0 ? 
                            <span className="text-green-400 ml-1">
                              (업계 +{formatPercent(sectorComparison.roe_vs_sector || 0)})
                            </span> :
                            <span className="text-red-400 ml-1">
                              (업계 {formatPercent(sectorComparison.roe_vs_sector || 0)})
                            </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="glass-subtle rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">안정성</span>
                        <Badge className={`${getGradeColor(grades.stability)} border-0`}>
                          {grades.stability}
                        </Badge>
                      </div>
                      <div className="text-xs text-foreground/70">
                        유동비율 {ratios?.currentRatio?.toFixed(2) || 'N/A'}
                        <br />부채비율 {formatPercent((ratios?.debtToAssetRatio || 0) * 100)}
                      </div>
                    </div>
                    
                    <div className="glass-subtle rounded-lg p-3 col-span-2">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">밸류에이션</span>
                        <Badge className={`${getGradeColor(grades.valuation)} border-0`}>
                          {grades.valuation}
                        </Badge>
                      </div>
                      <div className="text-xs text-foreground/70">
                        PER {companyData?.pe_ratio}
                        {sectorComparison && (
                          sectorComparison.pe_vs_sector > 0 ? 
                            <span className="text-red-400 ml-1">
                              (업계 +{sectorComparison.pe_vs_sector?.toFixed(1) || 'N/A'})
                            </span> :
                            <span className="text-green-400 ml-1">
                              (업계 {sectorComparison.pe_vs_sector?.toFixed(1) || 'N/A'})
                            </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              ) : (
                <PreparingSection 
                  title="투자 매력도 분석"
                  message="기업 정보와 재무 데이터를 종합 분석하고 있어요"
                  estimatedTime="데이터 수집 완료 후에 제공해드릴게요!"
                />
              )}

              {/* 기업 규모 및 재무 현황 */}
              {dataAvailability.companyOverview || dataAvailability.balanceSheet ? (
                <Card className="glass-card p-4">
                  <h3 className="font-bold mb-3 flex items-center">
                    <BarChart3 size={16} className="mr-2" />
                    기업 규모 및 재무 현황
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    {companyData && (
                      <>
                        <div>
                          <div className="text-lg font-bold">{formatBillion(companyData.market_cap)}</div>
                          <div className="text-xs text-foreground/70">시가총액</div>
                        </div>
                        <div>
                          <div className="text-lg font-bold">{formatPercent(companyData.dividend_yield || 0)}</div>
                          <div className="text-xs text-foreground/70">배당수익률</div>
                        </div>
                        <div>
                          <div className="text-lg font-bold">{companyData.beta}</div>
                          <div className="text-xs text-foreground/70">베타 (변동성)</div>
                        </div>
                      </>
                    )}
                    {financialData && (
                      <div>
                        <div className="text-lg font-bold">{formatBillion(financialData.key_metrics.total_assets)}</div>
                        <div className="text-xs text-foreground/70">총자산</div>
                      </div>
                    )}
                    {!companyData && !financialData && (
                      <div className="col-span-2 text-center text-sm text-foreground/70">
                        데이터 수집 진행 중이에요...
                      </div>
                    )}
                  </div>
                </Card>
              ) : (
                <PreparingSection 
                  title="기업 규모 및 재무 현황"
                  message="회사와 재무 데이터를 확인하고 있어요"
                  estimatedTime="곧 준비 돼요!"
                />
              )}

              {/* 투자 리스크 분석 */}
              {risks.length > 0 ? (
                <Card className="glass-card p-4">
                  <h3 className="font-bold mb-3 flex items-center text-yellow-400">
                    <AlertTriangle size={16} className="mr-2" />
                    투자시 주의사항
                  </h3>
                  <div className="space-y-3">
                    {risks.map((risk, index) => (
                      <div key={index} className={`p-3 rounded-lg border-l-2 ${getRiskColor(risk.level)}`}>
                        <div className="font-medium text-sm mb-1">{risk.title}</div>
                        <div className="text-xs text-foreground/70">{risk.description}</div>
                      </div>
                    ))}
                  </div>
                </Card>
              ) : (
                <PreparingSection 
                  title="투자 리스크 분석"
                  message="종합적인 리스크 분석을 위해 데이터를 수집하고 있어요"
                  estimatedTime="리스크 분석을 위해 준비 중이에요!"
                />
              )}

              {/* 투자 포인트 요약 */}
              {integratedAnalysis?.available && integratedAnalysis.summary ? (
                <Card className="glass-card p-4">
                  <h3 className="font-bold mb-3 flex items-center">
                    <Info size={16} className="mr-2" />
                    한줄 요약
                  </h3>
                  <div className="text-sm leading-relaxed">
                    {integratedAnalysis.summary}
                  </div>
                  {integratedAnalysis.key_highlights && (
                    <div className="mt-3">
                      <div className="text-xs text-foreground/70 mb-2">핵심 포인트:</div>
                      <div className="space-y-1">
                        {integratedAnalysis.key_highlights.map((highlight, index) => (
                          <div key={index} className="text-xs bg-primary/10 rounded px-2 py-1">
                            • {highlight}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </Card>
              ) : (
                <PreparingSection 
                  title="투자 인사이트 요약"
                  message="모든 정보를 종합해서 한번에 볼 수 있게 정리하고 있어요"
                  estimatedTime="분석 완료 후 제공해드릴게요!"
                />
              )}
            </>
          ) : (
            /* 상세 재무정보 모드 */
            <>
              {/* 재무비율 분석 */}
              {ratios ? (
                <Card className="glass-card p-4">
                  <h3 className="font-bold mb-3 flex items-center">
                    <Activity size={16} className="mr-2" />
                    핵심 재무비율
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center">
                        <span className="text-sm text-foreground/70">유동비율</span>
                        <button 
                          className="ml-1 text-foreground/50"
                          onMouseEnter={() => setShowTooltip('currentRatio')}
                          onMouseLeave={() => setShowTooltip(null)}
                        >
                          <HelpCircle size={12} />
                        </button>
                      </div>
                      <span className="font-medium">{ratios.currentRatio?.toFixed(2) || 'N/A'}</span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <div className="flex items-center">
                        <span className="text-sm text-foreground/70">부채비율</span>
                        <button 
                          className="ml-1 text-foreground/50"
                          onMouseEnter={() => setShowTooltip('debtRatio')}
                          onMouseLeave={() => setShowTooltip(null)}
                        >
                          <HelpCircle size={12} />
                        </button>
                      </div>
                      <span className="font-medium">{formatPercent((ratios.debtToAssetRatio || 0) * 100)}</span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-foreground/70">자기자본비율</span>
                      <span className="font-medium">{formatPercent((ratios.equityRatio || 0) * 100)}</span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-foreground/70">현금비율</span>
                      <span className="font-medium">{formatPercent((ratios.cashRatio || 0) * 100)}</span>
                    </div>
                  </div>

                  {/* 툴팁 */}
                  {showTooltip && (
                    <div className="mt-3 p-2 bg-black/50 rounded-lg text-xs">
                      {showTooltip === 'currentRatio' && 
                        "유동자산 ÷ 유동부채. 1.0 이상이면 단기 지급능력 양호"
                      }
                      {showTooltip === 'debtRatio' && 
                        "부채 ÷ 총자산. 낮을수록 재무 안정성 높음"
                      }
                    </div>
                  )}
                </Card>
              ) : (
                <PreparingSection 
                  title="핵심 재무비율"
                  message="재무제표 데이터를 분석하여 주요 비율을 계산하고 있어요"
                  estimatedTime="재무 데이터 수집 중이에요!"
                />
              )}

              {/* Company Overview 상세 지표 */}
              {companyData ? (
                <Card className="glass-card p-4">
                  <h3 className="font-bold mb-3">기업 개요 지표</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-foreground/70">ROE (자기자본이익률)</span>
                      <span className="font-medium">{formatPercent(companyData.roe || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-foreground/70">순이익률</span>
                      <span className="font-medium">{formatPercent(companyData.profit_margin || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-foreground/70">PER</span>
                      <span className="font-medium">{companyData.pe_ratio}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-foreground/70">베타</span>
                      <span className="font-medium">{companyData.beta}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-foreground/70">배당수익률</span>
                      <span className="font-medium">{formatPercent(companyData.dividend_yield || 0)}</span>
                    </div>
                  </div>
                </Card>
              ) : (
                <PreparingSection 
                  title="기업 개요 지표"
                  message="기업 상세 정보를 수집하고 있어요"
                  estimatedTime="기업 정보를 수집 중이에요!"
                />
              )}

              {/* Balance Sheet 주요 항목 */}
              {financialData ? (
                <Card className="glass-card p-4">
                  <h3 className="font-bold mb-3">재무상태표 주요 항목</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-foreground/70">총자산</span>
                      <span className="font-medium">{formatBillion(financialData.key_metrics.total_assets)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-foreground/70">총부채</span>
                      <span className="font-medium">{formatBillion(financialData.key_metrics.total_liabilities)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-foreground/70">자기자본</span>
                      <span className="font-medium">{formatBillion(financialData.key_metrics.shareholders_equity)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-foreground/70">현금 및 현금성자산</span>
                      <span className="font-medium">{formatBillion(financialData.key_metrics.cash_and_equivalents)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-foreground/70">재무건전성 등급</span>
                      <Badge className={`${getGradeColor(financialData.financial_health.grade)} border-0`}>
                        {financialData.financial_health.grade}
                      </Badge>
                    </div>
                  </div>
                  <div className="mt-3 text-xs text-foreground/70">
                    기준일: {new Date(financialData.latest_period).toLocaleDateString()}
                  </div>
                </Card>
              ) : (
                <PreparingSection 
                  title="재무상태표 주요 항목"
                  message="재무제표 데이터를 분석하고 있어요"
                  estimatedTime="데이터 수집 진행 중이에요!"
                />
              )}

              {/* 업종 비교 */}
              {sectorComparison && companyData ? (
                <Card className="glass-card p-4">
                  <h3 className="font-bold mb-3 flex items-center">
                    <BarChart3 size={16} className="mr-2" />
                    업종 평균 대비
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">ROE</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium">{formatPercent(companyData.roe || 0)}</span>
                        <span className={`text-xs px-2 py-1 rounded ${
                          sectorComparison.roe_vs_sector > 0 
                            ? 'bg-green-500/20 text-green-400' 
                            : 'bg-red-500/20 text-red-400'
                        }`}>
                          {sectorComparison.roe_vs_sector > 0 ? '+' : ''}{sectorComparison.roe_vs_sector?.toFixed(1) || 'N/A'}%p
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm">PER</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium">{companyData.pe_ratio}</span>
                        <span className={`text-xs px-2 py-1 rounded ${
                          sectorComparison.pe_vs_sector > 0 
                            ? 'bg-red-500/20 text-red-400' 
                            : 'bg-green-500/20 text-green-400'
                        }`}>
                          {sectorComparison.pe_vs_sector > 0 ? '+' : ''}{sectorComparison.pe_vs_sector?.toFixed(1) || 'N/A'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm">부채비율</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium">{formatPercent((ratios?.debtToAssetRatio || 0) * 100)}</span>
                        <span className={`text-xs px-2 py-1 rounded ${
                          sectorComparison.debt_vs_sector > 0 
                            ? 'bg-red-500/20 text-red-400' 
                            : 'bg-green-500/20 text-green-400'
                        }`}>
                          {sectorComparison.debt_vs_sector > 0 ? '+' : ''}{sectorComparison.debt_vs_sector?.toFixed(1) || 'N/A'}%p
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              ) : (
                <PreparingSection 
                  title="업종 평균 대비"
                  message="업종별 비교 분석을 위해 데이터를 수집하고 있어요"
                  estimatedTime="종합 분석 준비 중이에요!"
                />
              )}

              {/* 회사 기본 정보 */}
              {companyData ? (
                <Card className="glass-card p-4">
                  <h3 className="font-bold mb-3 flex items-center">
                    <Building size={16} className="mr-2" />
                    회사 정보
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-foreground/70 block">사업 설명</span>
                      <span className="text-sm leading-relaxed">{companyData.description}</span>
                    </div>
                    <div className="flex justify-between pt-2">
                      <span className="text-foreground/70">웹사이트</span>
                      <a href={companyData.website} target="_blank" rel="noopener noreferrer" 
                         className="text-primary hover:underline text-sm">
                        바로가기
                      </a>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-foreground/70">데이터 배치</span>
                      <span className="text-sm">#{companyData.batch_id}</span>
                    </div>
                  </div>
                </Card>
              ) : (
                <PreparingSection 
                  title="회사 정보"
                  message="회사 상세 정보를 수집하고 있습니다"
                  estimatedTime="기업 데이터 수집 중"
                />
              )}
            </>
          )}

          {/* 하단 액션 버튼 */}
          <Card className="glass-card p-4">
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={toggleFavorite}
                className={`glass hover:glass-strong border-foreground/20 rounded-lg py-3 text-sm font-medium transition-all flex items-center justify-center ${
                  isFavorite ? 'glass-strong text-yellow-400' : ''
                }`}
              >
                <Star size={16} className="mr-2" fill={isFavorite ? 'currentColor' : 'none'} />
                {isFavorite ? '관심종목 해제' : '관심종목 추가'}
              </button>
              <button 
                onClick={refreshData}
                className="glass hover:glass-strong border-foreground/20 rounded-lg py-3 text-sm font-medium transition-all flex items-center justify-center"
              >
                <AlertTriangle size={16} className="mr-2" />
                데이터 새로고침
              </button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}