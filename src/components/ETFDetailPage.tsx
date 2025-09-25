import { useState, useEffect } from "react";
import { ArrowLeft, TrendingUp, TrendingDown, DollarSign, Calendar, Users, Info, PieChart as PieChartIcon, BarChart3, Clock, AlertCircle } from "lucide-react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, LineChart, Line } from "recharts";
import { useETFDetail } from "../hooks/useETFDetail";

interface ETFDetailPageProps {
  symbol: string;
  onBack: () => void;
}

const COLORS = [
  '#60a5fa', '#22d3ee', '#a78bfa', '#34d399', '#fbbf24',
  '#f87171', '#fb7185', '#a3a3a3', '#6b7280', '#9ca3af'
];

export function ETFDetailPage({ symbol, onBack }: ETFDetailPageProps) {
  const {
    data: etfData,
    loading,
    error,
    chartLoading,
    fetchETFDetail,
    fetchChartData,
    clearError,
    refreshData
  } = useETFDetail();

  const [activeTab, setActiveTab] = useState<'overview' | 'sectors' | 'holdings'>('overview');
  const [selectedTimeframe, setSelectedTimeframe] = useState<'1D' | '1W' | '1M'>('1D');

  // 초기 데이터 로드
  useEffect(() => {
    if (symbol) {
      fetchETFDetail(symbol, selectedTimeframe);
    }
  }, [symbol, fetchETFDetail]);

  // timeframe 변경 시 차트 데이터만 업데이트
  const handleTimeframeChange = async (timeframe: '1D' | '1W' | '1M') => {
    setSelectedTimeframe(timeframe);
    await fetchChartData(timeframe);
  };

  // 통화 포맷팅
  const formatCurrency = (value: number | null) => {
    if (value === null || value === undefined) return '--';
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  // 숫자 포맷팅 (큰 수)
  const formatNumber = (value: string | number | null) => {
    if (!value) return 'N/A';
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
    return `$${num.toLocaleString()}`;
  };

  // 퍼센트 포맷팅
  const formatPercentage = (value: number | null) => {
    if (value === null || value === undefined) return 'N/A';
    return `${(value * 100).toFixed(2)}%`;
  };

  // 섹터 차트 데이터 변환
  const getSectorChartData = () => {
    if (!etfData?.sector_chart_data) return [];
    return etfData.sector_chart_data.map((sector, index) => ({
      name: sector.name || (sector as any).sector?.replace(/([A-Z])/g, ' $1').trim() || 'Unknown',
      value: sector.value || ((sector as any).weight ? (sector as any).weight * 100 : 0),
      color: sector.color || COLORS[index % COLORS.length]
    }));
  };

  // 보유종목 차트 데이터 변환
  const getHoldingsChartData = () => {
    if (!etfData?.holdings_chart_data) return [];
    return etfData.holdings_chart_data.slice(0, 10).map(holding => ({
      symbol: holding.symbol,
      name: holding.name || (holding as any).description || holding.symbol,
      weight: holding.weight || ((holding as any).weight ? (holding as any).weight * 100 : 0)
    }));
  };

  // 가격 차트 데이터 변환
  const getPriceChartData = () => {
    if (!etfData?.chart_data) return [];
    return etfData.chart_data.map(point => ({
      time: new Date(point.datetime).toLocaleTimeString('ko-KR', { 
        hour: '2-digit', 
        minute: '2-digit' 
      }),
      price: point.price,
      volume: point.volume
    }));
  };

  // 로딩 상태
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-card rounded-xl p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>ETF 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  // 에러 상태
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-card rounded-xl p-8 text-center">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <p className="mb-4">ETF 정보를 불러올 수 없습니다.</p>
          <p className="text-sm text-foreground/70 mb-4">{error}</p>
          <button 
            onClick={() => {
              clearError();
              refreshData();
            }}
            className="px-4 py-2 glass-subtle rounded-lg hover:glass transition-all"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  // 데이터 없음
  if (!etfData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-card rounded-xl p-8 text-center">
          <AlertCircle className="w-12 h-12 text-foreground/50 mx-auto mb-4" />
          <p>ETF 데이터를 찾을 수 없습니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-md mx-auto px-4 pt-4 pb-20">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={onBack}
            className="flex items-center space-x-2 px-3 py-1.5 glass-subtle rounded-lg hover:glass transition-all"
          >
            <ArrowLeft size={16} />
            <span className="text-sm">뒤로가기</span>
          </button>
          
          <div className="text-center">
            <h1 className="font-bold">{etfData.symbol}</h1>
            <p className="text-xs text-foreground/70">ETF 상세 분석</p>
          </div>
          
          <div className="w-16" />
        </div>

        {/* Current Price */}
        <div className="glass-card rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-2">
                <DollarSign size={20} className="text-primary" />
                <span className="text-2xl font-bold">
                  {formatCurrency(etfData.current_price)}
                </span>
              </div>
              <div className="flex items-center space-x-1 mt-1">
                {etfData.is_positive ? (
                  <TrendingUp size={14} className="text-green-400" />
                ) : etfData.is_positive === false ? (
                  <TrendingDown size={14} className="text-red-400" />
                ) : null}
                <span className={`text-sm ${
                  etfData.is_positive ? 'text-green-400' : 
                  etfData.is_positive === false ? 'text-red-400' : 
                  'text-foreground/70'
                }`}>
                  {etfData.change_percentage !== null && etfData.change_amount !== null 
                    ? `${etfData.change_percentage > 0 ? '+' : ''}${etfData.change_percentage.toFixed(2)}% (${etfData.change_amount > 0 ? '+' : ''}$${etfData.change_amount.toFixed(2)})`
                    : '--'
                  }
                </span>
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center space-x-1 text-xs text-foreground/70">
                <Clock size={12} />
                <span>실시간</span>
              </div>
              <p className="text-xs text-foreground/50 mt-1">
                거래량: {etfData.volume?.toLocaleString() || 0}
              </p>
            </div>
          </div>
        </div>

        {/* ETF 기본 설명 */}
        <div className="glass-card rounded-xl p-4 mb-6">
          <div className="flex items-center space-x-2 mb-3">
            <Info size={18} className="text-primary" />
            <h2 className="font-bold">ETF란 무엇인가요?</h2>
          </div>
          <div className="space-y-3 text-sm text-foreground/80">
            <p>
              <strong>ETF(상장지수펀드)</strong>는 주식처럼 거래소에서 사고팔 수 있는 펀드입니다. 
              여러 주식을 한 번에 살 수 있어 분산투자 효과를 얻을 수 있습니다.
            </p>
            <div className="glass-subtle rounded-lg p-3">
              <p className="text-xs">
                💡 <strong>이 ETF는</strong> {etfData.name}로, 
                {etfData.profile?.sectors?.[0]?.sector?.toLowerCase().includes('technology') ? '기술주' : '다양한 섹터'} 중심으로 구성되어 있으며, 
                상위 보유종목들로 구성되어 있습니다.
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-1 mb-6 glass-subtle rounded-xl p-1">
          {[
            { id: 'overview', label: '개요', icon: BarChart3 },
            { id: 'sectors', label: '섹터', icon: PieChartIcon },
            { id: 'holdings', label: '보유종목', icon: Users }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 flex items-center justify-center space-x-1 py-2 px-3 rounded-lg transition-all ${
                activeTab === tab.id ? 'glass-strong' : 'hover:glass'
              }`}
            >
              <tab.icon size={16} />
              <span className="text-sm">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {/* Timeframe Selector */}
            <div className="flex space-x-2 mb-4">
              {(['1D', '1W', '1M'] as const).map(timeframe => (
                <button
                  key={timeframe}
                  onClick={() => handleTimeframeChange(timeframe)}
                  className={`px-3 py-1 text-sm rounded-lg transition-all ${
                    selectedTimeframe === timeframe 
                      ? 'glass-strong' 
                      : 'glass-subtle hover:glass'
                  }`}
                >
                  {timeframe}
                </button>
              ))}
            </div>

            {/* Price Chart */}
            <div className="glass-card rounded-xl p-4">
              <h3 className="font-bold mb-3 flex items-center space-x-2">
                <TrendingUp size={16} className="text-primary" />
                <span>실시간 가격 차트</span>
                {chartLoading && <div className="animate-spin rounded-full h-4 w-4 border-b border-primary" />}
              </h3>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={getPriceChartData()}>
                    <XAxis 
                      dataKey="time" 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.7)' }}
                    />
                    <YAxis 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.7)' }}
                      domain={['dataMin - 1', 'dataMax + 1']}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'rgba(255,255,255,0.1)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: '8px',
                        color: 'white'
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="price" 
                      stroke="#60a5fa" 
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4, fill: '#60a5fa' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Key Metrics */}
            <div className="glass-card rounded-xl p-4">
              <h3 className="font-bold mb-4">주요 지표</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="glass-subtle rounded-lg p-3">
                  <p className="text-xs text-foreground/70 mb-1">순자산</p>
                  <p className="font-bold">
                    {etfData.key_metrics?.net_assets || etfData.profile?.net_assets 
                      ? formatNumber(etfData.profile?.net_assets ?? 0) 
                      : 'N/A'
                    }
                  </p>
                </div>
                <div className="glass-subtle rounded-lg p-3">
                  <p className="text-xs text-foreground/70 mb-1">보수율</p>
                  <p className="font-bold">
                    {etfData.key_metrics?.net_expense_ratio || 
                     formatPercentage(etfData.profile?.net_expense_ratio ?? null)}
                  </p>
                </div>
                <div className="glass-subtle rounded-lg p-3">
                  <p className="text-xs text-foreground/70 mb-1">배당수익률</p>
                  <p className="font-bold">
                    {etfData.key_metrics?.dividend_yield || 
                     formatPercentage(etfData.profile?.dividend_yield ?? null)}
                  </p>
                </div>
                <div className="glass-subtle rounded-lg p-3">
                  <p className="text-xs text-foreground/70 mb-1">설정일</p>
                  <p className="font-bold">
                    {etfData.key_metrics?.inception_year || 
                     (etfData.profile?.inception_date?.substring(0, 4)) || 'N/A'}년
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'sectors' && (
          <div className="space-y-4">
            {/* Sector Distribution Chart */}
            <div className="glass-card rounded-xl p-4">
              <h3 className="font-bold mb-4 flex items-center space-x-2">
                <PieChartIcon size={16} className="text-primary" />
                <span>섹터별 구성</span>
              </h3>
              {getSectorChartData().length > 0 ? (
                <>
                  <div className="h-64 mb-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={getSectorChartData()}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {getSectorChartData().map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value: any) => [`${value.toFixed(1)}%`, '비중']}
                          contentStyle={{
                            backgroundColor: 'rgba(255,255,255,0.1)',
                            border: '1px solid rgba(255,255,255,0.2)',
                            borderRadius: '8px',
                            color: 'white'
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  
                  {/* Sector Legend */}
                  <div className="space-y-2">
                    {getSectorChartData().slice(0, 5).map((sector, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: sector.color }}
                          />
                          <span className="text-sm truncate flex-1">{sector.name}</span>
                        </div>
                        <span className="text-sm font-medium">{sector.value.toFixed(1)}%</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-center text-foreground/50 py-8">섹터 데이터를 불러올 수 없습니다</p>
              )}
            </div>

            {/* Sector Explanation */}
            <div className="glass-card rounded-xl p-4">
              <h4 className="font-bold mb-2">섹터 분산투자 효과</h4>
              <p className="text-sm text-foreground/80">
                이 ETF는 여러 섹터에 분산투자하여 특정 업종의 위험을 줄입니다. 
                {getSectorChartData().length > 0 && (
                  <>
                    가장 큰 비중을 차지하는 {getSectorChartData()[0]?.name}이 
                    {getSectorChartData()[0]?.value.toFixed(1)}%를 차지하고 있습니다.
                  </>
                )}
              </p>
            </div>
          </div>
        )}

        {activeTab === 'holdings' && (
          <div className="space-y-4">
            {/* Top Holdings Chart */}
            <div className="glass-card rounded-xl p-4">
              <h3 className="font-bold mb-4 flex items-center space-x-2">
                <Users size={16} className="text-primary" />
                <span>상위 보유종목</span>
              </h3>
              {getHoldingsChartData().length > 0 ? (
                <div className="h-64 mb-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={getHoldingsChartData()}>
                      <XAxis 
                        dataKey="symbol"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.7)' }}
                      />
                      <YAxis 
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.7)' }}
                      />
                      <Tooltip 
                        formatter={(value: any) => [`${value.toFixed(2)}%`, '비중']}
                        labelFormatter={(label) => `${label}`}
                        contentStyle={{
                          backgroundColor: 'rgba(255,255,255,0.1)',
                          border: '1px solid rgba(255,255,255,0.2)',
                          borderRadius: '8px',
                          color: 'white'
                        }}
                      />
                      <Bar dataKey="weight" fill="#60a5fa" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-center text-foreground/50 py-8">보유종목 데이터를 불러올 수 없습니다</p>
              )}
            </div>

            {/* Holdings List */}
            {etfData.profile?.holdings && etfData.profile.holdings.length > 0 && (
              <div className="glass-card rounded-xl p-4">
                <h4 className="font-bold mb-3">전체 보유종목 ({etfData.profile.holdings.length}개)</h4>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {etfData.profile.holdings.slice(0, 15).map((holding, index) => (
                    <div key={index} className="flex items-center justify-between py-2 border-b border-white/10 last:border-b-0">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{holding.symbol}</p>
                        <p className="text-xs text-foreground/70 truncate">
                          {holding.description || 'N/A'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-sm">
                          {formatPercentage(holding.weight)}
                        </p>
                        <div className="w-16 h-1 bg-white/20 rounded-full mt-1">
                          <div 
                            className="h-full bg-primary rounded-full"
                            style={{ width: `${Math.min(holding.weight * 1000, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Holdings Explanation */}
            <div className="glass-card rounded-xl p-4">
              <h4 className="font-bold mb-2">분산투자의 장점</h4>
              <p className="text-sm text-foreground/80">
                이 ETF는 {etfData.profile?.holdings?.length || 0}개의 다양한 기업에 투자하여 개별 기업의 위험을 분산시킵니다. 
                {etfData.profile?.holdings && etfData.profile.holdings.length >= 3 && (
                  <>
                    상위 3개 종목({etfData.profile.holdings.slice(0,3).map(h => h.symbol).join(', ')})이 
                    전체의 {(etfData.profile.holdings.slice(0,3).reduce((sum, h) => sum + h.weight, 0) * 100).toFixed(1)}%를 차지합니다.
                  </>
                )}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}