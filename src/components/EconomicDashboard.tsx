// components/OptimizedEconomicDashboard.tsx
// 최적화된 경제 대시보드 - 사용자 친화적 버전

import React, { useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { 
  TrendingUp, TrendingDown, Info, BarChart3, GitCompare, 
  CheckCircle, XCircle, AlertTriangle 
} from "lucide-react";
import { useEconomicData, useChartFormatters, useIndicatorAnalysis } from '../hooks/useEconomicData';

// ============================================================================
// 타입 정의
// ============================================================================

interface OptimizedEconomicDashboardProps {
  isLoggedIn: boolean;
  onLoginPrompt: () => void;
}

// ============================================================================
// 메인 컴포넌트
// ============================================================================

export default function OptimizedEconomicDashboard({ 
  isLoggedIn, 
  onLoginPrompt 
}: OptimizedEconomicDashboardProps) {

  // =========================================================================
  // 경제 데이터 및 상태 관리 (단일 훅으로 처리)
  // =========================================================================
  
  const {
    economicData,
    chartData,
    stats,
    sources,
    isLoading,
    isError,
    error,
    isFetching,
    selectedIndicator,
    setSelectedIndicator,
    currentIndicator,
    correlationMode,
    setCorrelationMode,
    correlationPair,
    setCorrelationPair,
    indicators,
    correlationPairs,
    getLatestPair,
    refetch
  } = useEconomicData({
    refetchInterval: 300000,  // 5분마다 자동 새로고침
    staleTime: 300000,        // 5분 캐시
    cacheTime: 1800000        // 30분 보관
  });

  // 차트 포맷터
  const { formatTooltipValue, formatPeriodLabel } = useChartFormatters();

  // 지표 분석
  const { getChangeAnalysis, getCorrelationStrength } = useIndicatorAnalysis(economicData);

  // =========================================================================
  // 이벤트 핸들러들
  // =========================================================================

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const handleIndicatorClick = useCallback((indicator: any) => {
    setSelectedIndicator(indicator.key);
  }, [setSelectedIndicator]);

  const handleCorrelationPairClick = useCallback((pair: any) => {
    setCorrelationPair(pair);
  }, [setCorrelationPair]);

  // 현재 선택된 지표의 최신값과 변화량 계산
  const latestPair = getLatestPair(selectedIndicator);
  const currentValue = latestPair.value ?? 0;
  const previousValue = latestPair.prev ?? 0;
  const hasPrev = latestPair.prev != null;
  const change = hasPrev ? currentValue - (previousValue as number) : 0;
  const changePercent = hasPrev && previousValue !== 0 ? ((change / (previousValue as number)) * 100) : 0;

  // =========================================================================
  // 에러 상태 처리 (간소화)
  // =========================================================================

  if (error && economicData.length === 0) {
    return (
      <div className="space-y-6">
        <div className="glass-card rounded-2xl p-6">
          <div className="text-center">
            <XCircle className="mx-auto mb-4 text-red-400" size={48} />
            <h3 className="font-semibold mb-2 text-red-400">데이터를 불러올 수 없습니다</h3>
            <p className="text-sm text-foreground/70 mb-4">
              잠시 후 다시 시도해주세요. 문제가 계속되면 페이지를 새로고침해보세요.
            </p>
            
            <button 
              onClick={handleRefresh}
              disabled={isLoading}
              className="px-6 py-3 bg-primary/20 text-primary rounded-xl hover:bg-primary/30 transition-colors disabled:opacity-50 font-medium"
            >
              {isLoading ? '재시도 중...' : '다시 시도'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 메인 렌더링
  // =========================================================================

  return (
    <div className="space-y-6">
      {/* 페이지 소개 및 헤더 */}
      <div className="glass-card rounded-2xl p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-3 flex items-center">
            <BarChart3 className="mr-3" size={24} />
            📊 경제 지표 대시보드
            {isFetching && <div className="ml-3 text-sm text-blue-400">업데이트 중...</div>}
          </h2>
          
          <div className="space-y-4">
            <p className="text-base text-foreground/80 leading-relaxed">
              미국의 핵심 경제 지표들을 실시간으로 확인하고, 지표들 간의 상관관계를 분석할 수 있는 페이지입니다.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="glass rounded-xl p-4">
                <h3 className="font-semibold mb-2 text-blue-400 flex items-center">
                  <BarChart3 size={16} className="mr-2" />
                  🎯 이런 걸 확인할 수 있어요
                </h3>
                <ul className="text-sm text-foreground/70 space-y-1">
                  <li>• <span className="font-medium">연준 기준금리</span> - 미국 경제 정책의 기준</li>
                  <li>• <span className="font-medium">국채 10년 수익률</span> - 장기 투자의 기준점</li>
                  <li>• <span className="font-medium">인플레이션율</span> - 물가 상승률 동향</li>
                  <li>• <span className="font-medium">소비자물가지수</span> - 실생활 물가 변화</li>
                </ul>
              </div>
              
              <div className="glass rounded-xl p-4">
                <h3 className="font-semibold mb-2 text-green-400 flex items-center">
                  <GitCompare size={16} className="mr-2" />
                  💡 이렇게 활용하세요
                </h3>
                <ul className="text-sm text-foreground/70 space-y-1">
                  <li>• <span className="font-medium">투자 타이밍</span> - 금리 변화에 따른 투자 전략</li>
                  <li>• <span className="font-medium">경제 흐름 파악</span> - 인플레이션과 금리의 관계</li>
                  <li>• <span className="font-medium">상관관계 분석</span> - 지표들 간의 연관성 이해</li>
                  <li>• <span className="font-medium">시장 예측</span> - 경제 지표로 시장 방향 예상</li>
                </ul>
              </div>
            </div>
            
            <div className="glass rounded-xl p-4 border border-amber-500/30">
              <div className="flex items-start space-x-3">
                <div className="text-amber-400 mt-0.5">💎</div>
                <div>
                  <h4 className="font-semibold text-amber-400 mb-1">투자자를 위한 핵심 포인트</h4>
                  <p className="text-sm text-foreground/70">
                    <span className="font-medium">금리가 오르면</span> 채권이 유리하고 주식(특히 성장주)은 부담, 
                    <span className="font-medium"> 금리가 내리면</span> 주식이 유리해집니다. 
                    인플레이션이 높으면 실물자산(부동산, 원자재)을, 낮으면 금융자산을 선호하는 경향이 있어요.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* 부분적 에러 알림만 유지 */}
        {error && economicData.length > 0 && (
          <div className="mb-4 p-3 glass rounded-xl border border-yellow-500/30">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="text-yellow-400" size={16} />
              <div className="text-sm">
                <span className="font-medium text-yellow-400">일부 데이터 로딩 중</span>
                <p className="text-foreground/70 mt-1">모든 지표가 곧 업데이트됩니다.</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 차트 모드 선택 */}
      <div className="flex space-x-3">
        <button
          onClick={() => setCorrelationMode(false)}
          className={`flex-1 glass rounded-xl p-3 transition-all ${
            !correlationMode ? "bg-primary/20 border border-primary/30" : "hover:bg-white/10"
          }`}
        >
          <div className="flex items-center justify-center space-x-2">
            <BarChart3 size={16} />
            <span className="text-sm font-medium">개별 지표</span>
          </div>
        </button>
        <button
          onClick={() => setCorrelationMode(true)}
          className={`flex-1 glass rounded-xl p-3 transition-all ${
            correlationMode ? "bg-primary/20 border border-primary/30" : "hover:bg-white/10"
          }`}
        >
          <div className="flex items-center justify-center space-x-2">
            <GitCompare size={16} />
            <span className="text-sm font-medium">상관관계</span>
          </div>
        </button>
      </div>

      {!correlationMode ? (
        <>
          {/* 지표 선택 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {indicators.map((indicator) => {
              const isSelected = selectedIndicator === indicator.key;
              const pair = getLatestPair(indicator.key);
              const value = pair.value;
              const prevValue = pair.prev;
              const indicatorChange = value != null && prevValue != null ? value - prevValue : 0;
              
              return (
                <button
                  key={indicator.key}
                  onClick={() => handleIndicatorClick(indicator)}
                  className={`glass-card rounded-xl p-4 text-left transition-all relative ${
                    isSelected ? "bg-primary/20 border border-primary/30" : "hover:bg-white/10"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">{indicator.name}</span>
                    <div className={`flex items-center text-xs ${
                      indicatorChange >= 0 ? "text-green-400" : "text-red-400"
                    }`}>
                      {indicatorChange >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                    </div>
                  </div>
                  <div className="text-lg font-semibold" style={{ color: indicator.color }}>
                    {value != null ? `${value.toFixed(2)}${indicator.unit}` : "--"}
                  </div>
                  <div className={`text-xs ${
                    value != null && prevValue != null ? (indicatorChange >= 0 ? "text-green-400" : "text-red-400") : "text-foreground/40"
                  }`}>
                    {value != null && prevValue != null ?
                      `${indicatorChange >= 0 ? "+" : ""}${indicatorChange.toFixed(2)}${indicator.unit}` : "데이터 없음"}
                  </div>
                </button>
              );
            })}
          </div>

          {/* 선택된 지표 상세 정보 */}
          {currentIndicator && (
            <div className="glass-card rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold" style={{ color: currentIndicator.color }}>
                  {currentIndicator.name}
                </h3>
                <div className="text-right">
                  <div className="text-2xl font-bold">
                    {isLoading ? "…" : `${currentValue.toFixed(2)}${currentIndicator.unit}`}
                  </div>
                  <div className={`text-sm flex items-center justify-end ${
                    hasPrev ? (change >= 0 ? "text-green-400" : "text-red-400") : "text-foreground/60"
                  }`}>
                    {hasPrev ? (change >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />) : null}
                    <span className="ml-1">
                      {hasPrev ? `${change >= 0 ? "+" : ""}${change.toFixed(2)}${currentIndicator.unit} (${changePercent >= 0 ? "+" : ""}${changePercent.toFixed(1)}%)` : "이전 데이터 없음"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="glass rounded-xl p-4 mb-4">
                <div className="flex items-start space-x-2">
                  <Info size={16} className="text-blue-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium mb-1">이 지표는?</p>
                    <p className="text-xs text-foreground/70 mb-2">{currentIndicator.description}</p>
                    <p className="text-xs text-foreground/60">
                      <span className="font-medium">시장 영향:</span> {currentIndicator.impact}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 개별 지표 차트 */}
          <div className={`glass-card rounded-2xl p-6 ${isLoading ? 'relative' : ''}`}>
            {isLoading && (
              <div className="absolute inset-0 bg-black/30 backdrop-blur-sm rounded-2xl z-10 flex items-center justify-center">
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                  <div className="text-sm text-foreground/80">차트 데이터 로딩 중...</div>
                </div>
              </div>
            )}

            <h3 className="font-semibold mb-4">실시간 추이 차트</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis 
                    dataKey="period" 
                    stroke="rgba(255,255,255,0.6)"
                    fontSize={12}
                    tickFormatter={formatPeriodLabel}
                  />
                  <YAxis 
                    stroke="rgba(255,255,255,0.6)"
                    fontSize={12}
                    tickFormatter={(value) => `${value}${currentIndicator?.unit || ""}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(0,0,0,0.8)",
                      border: "1px solid rgba(255,255,255,0.2)",
                      borderRadius: "8px",
                      color: "white"
                    }}
                    formatter={formatTooltipValue}
                    labelFormatter={(label) => formatPeriodLabel(label)}
                  />
                  <Line
                    type="monotone"
                    dataKey={selectedIndicator}
                    stroke={currentIndicator?.color || "#3b82f6"}
                    strokeWidth={3}
                    dot={false}
                    activeDot={{ r: 6, fill: currentIndicator?.color }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            
            {/* 차트 하단 데이터 요약 */}
            {!isLoading && chartData.length > 0 && currentIndicator && (
              <div className="mt-4 grid grid-cols-3 gap-4 text-center">
                <div className="glass rounded-lg p-3">
                  <div className="text-xs text-foreground/60 mb-1">데이터 포인트</div>
                  <div className="font-semibold">{chartData.length}개</div>
                </div>
                <div className="glass rounded-lg p-3">
                  <div className="text-xs text-foreground/60 mb-1">기간</div>
                  <div className="font-semibold">
                    {chartData.length > 0 && chartData[0].period && chartData[chartData.length - 1].period
                      ? `${chartData[0].period.split('-')[0]} ~ ${chartData[chartData.length - 1].period.split('-')[0]}`
                      : '데이터 없음'
                    }
                  </div>
                </div>
                <div className="glass rounded-lg p-3">
                  <div className="text-xs text-foreground/60 mb-1">최신 업데이트</div>
                  <div className="font-semibold">
                    {chartData.length > 0 && chartData[chartData.length - 1].period
                      ? chartData[chartData.length - 1].period.replace('-', '년 ') + '월'
                      : '없음'
                    }
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          {/* 상관관계 모드 */}
          <div className="glass-card rounded-2xl p-6">
            <h3 className="font-semibold mb-4 flex items-center">
              <GitCompare className="mr-2" size={20} />
              📈 경제 지표 상관관계 분석
            </h3>

            {/* 상관관계 쌍 선택 */}
            <div className="mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {correlationPairs.map((pair, index) => (
                  <button
                    key={index}
                    onClick={() => handleCorrelationPairClick(pair)}
                    className={`glass rounded-xl p-4 text-left transition-all ${
                      correlationPair.first === pair.first && correlationPair.second === pair.second
                        ? "bg-primary/20 border border-primary/30" 
                        : "hover:bg-white/10"
                    }`}
                  >
                    <div className="flex items-center space-x-2 mb-2">
                      <GitCompare size={16} className="text-primary" />
                      <span className="font-medium text-sm">
                        {indicators.find(i => i.key === pair.first)?.name} ↔ {indicators.find(i => i.key === pair.second)?.name}
                      </span>
                    </div>
                    <p className="text-xs text-foreground/70">{pair.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* 상관관계 차트 */}
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis 
                    dataKey="period" 
                    stroke="rgba(255,255,255,0.6)"
                    fontSize={12}
                    tickFormatter={formatPeriodLabel}
                  />
                  <YAxis 
                    stroke="rgba(255,255,255,0.6)"
                    fontSize={12}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(0,0,0,0.8)",
                      border: "1px solid rgba(255,255,255,0.2)",
                      borderRadius: "8px",
                      color: "white"
                    }}
                    labelFormatter={formatPeriodLabel}
                  />
                  <Line
                    type="monotone"
                    dataKey={correlationPair.first}
                    stroke={indicators.find(i => i.key === correlationPair.first)?.color || "#3b82f6"}
                    strokeWidth={3}
                    dot={false}
                    name={indicators.find(i => i.key === correlationPair.first)?.name}
                  />
                  <Line
                    type="monotone"
                    dataKey={correlationPair.second}
                    stroke={indicators.find(i => i.key === correlationPair.second)?.color || "#10b981"}
                    strokeWidth={3}
                    dot={false}
                    name={indicators.find(i => i.key === correlationPair.second)?.name}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* 상관관계 분석 정보 */}
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="glass rounded-xl p-4">
                <h4 className="font-medium mb-2" style={{ color: indicators.find(i => i.key === correlationPair.first)?.color }}>
                  {indicators.find(i => i.key === correlationPair.first)?.name}
                </h4>
                <div className="text-sm text-foreground/70">
                  {indicators.find(i => i.key === correlationPair.first)?.description}
                </div>
              </div>
              <div className="glass rounded-xl p-4">
                <h4 className="font-medium mb-2" style={{ color: indicators.find(i => i.key === correlationPair.second)?.color }}>
                  {indicators.find(i => i.key === correlationPair.second)?.name}
                </h4>
                <div className="text-sm text-foreground/70">
                  {indicators.find(i => i.key === correlationPair.second)?.description}
                </div>
              </div>
            </div>

            {/* 상관관계 강도 표시 */}
            {economicData.length > 0 && (() => {
              const correlationResult = getCorrelationStrength(correlationPair.first, correlationPair.second);
              const isValidCorrelation = correlationResult && 
                                       typeof correlationResult.correlation === 'number' && 
                                       !isNaN(correlationResult.correlation);
              
              if (!isValidCorrelation) {
                return (
                  <div className="mt-4 glass rounded-xl p-4">
                    <h4 className="font-medium mb-3 text-blue-400">📊 상관관계 분석 결과</h4>
                    <div className="text-center text-foreground/60">
                      <p className="text-sm">데이터가 충분하지 않아 상관관계를 계산할 수 없습니다.</p>
                      <p className="text-xs mt-1">더 많은 데이터가 로딩되면 분석 결과가 표시됩니다.</p>
                    </div>
                  </div>
                );
              }

              const correlationValue = correlationResult.correlation;
              const absCorrelation = Math.abs(correlationValue);
              const strengthText = absCorrelation > 0.7 ? '강한 상관관계' :
                                 absCorrelation > 0.3 ? '중간 상관관계' : '약한 상관관계';
              const directionText = correlationValue > 0 ? '양의 상관관계' : '음의 상관관계';

              return (
                <div className="mt-4 glass rounded-xl p-4">
                  <h4 className="font-medium mb-3 text-blue-400">📊 상관관계 분석 결과</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary mb-1">
                        {correlationValue.toFixed(3)}
                      </div>
                      <div className="text-xs text-foreground/60">상관계수</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold mb-1">
                        {strengthText}
                      </div>
                      <div className="text-xs text-foreground/60">관계 강도</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold mb-1">
                        {directionText}
                      </div>
                      <div className="text-xs text-foreground/60">관계 방향</div>
                    </div>
                  </div>
                  
                  {/* 추가 정보 표시 */}
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <div className="flex items-center justify-between text-xs text-foreground/60">
                      <span>데이터 포인트: {correlationResult.dataPoints}개</span>
                      <span>강도: {correlationResult.strength}</span>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </>
      )}

      {/* 지표 간 관계 설명 */}
      <div className="glass-card rounded-2xl p-6">
        <h3 className="font-semibold mb-4 flex items-center">
          🔗 경제 지표들의 상관관계
        </h3>
        
        <div className="space-y-4">
          <div className="glass rounded-xl p-4">
            <h4 className="font-medium mb-2 text-blue-400">연준 금리 ↔ 국채 수익률</h4>
            <p className="text-sm text-foreground/70">
              연준이 기준금리를 올리면 국채 수익률도 따라 오르는 경향이 있어요. 
              둘 다 경제의 '기준 금리' 역할을 하기 때문입니다.
            </p>
          </div>
          
          <div className="glass rounded-xl p-4">
            <h4 className="font-medium mb-2 text-yellow-400">인플레이션 ↔ 금리</h4>
            <p className="text-sm text-foreground/70">
              인플레이션이 높아지면 연준이 금리를 올려서 경기를 식히려 해요. 
              반대로 인플레이션이 낮으면 금리를 내려서 경기를 부양합니다.
            </p>
          </div>
          
          <div className="glass rounded-xl p-4">
            <h4 className="font-medium mb-2 text-green-400">💡 투자 시사점</h4>
            <p className="text-sm text-foreground/70">
              • 금리 상승기: 채권 매력도 증가, 성장주 부담<br/>
              • 금리 하락기: 주식 매력도 증가, 특히 성장주 유리<br/>
              • 고인플레이션: 실물자산(부동산, 원자재) 선호<br/>
              • 저인플레이션: 금융자산(주식, 채권) 선호<br/>
              • 국채수익률 역전: 경기침체 신호, 방어적 투자 전략 필요
            </p>
          </div>
        </div>
      </div>

      {/* 하단 상태 바 (간소화) */}
      {!isLoading && economicData.length > 0 && (
        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center justify-between text-sm text-foreground/60">
            <div className="flex items-center space-x-4">
              <span className="flex items-center space-x-1">
                <CheckCircle size={14} className="text-green-400" />
                <span>실시간 연동 활성</span>
              </span>
              <span>📊 {economicData.length}개 데이터 포인트</span>
              <span>🔄 {new Date().toLocaleTimeString('ko-KR')} 업데이트</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}