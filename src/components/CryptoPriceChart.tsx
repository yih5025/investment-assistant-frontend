import React, { useEffect, useState } from 'react';
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { AlertTriangle, BarChart3, Info } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useCryptoPriceChart } from '../hooks/useCryptoDetailHook';
import { formatCurrencyKRW, formatVolume } from '../utils/formatters';

interface CryptoPriceChartProps {
  symbol: string;
  className?: string;
}

export function CryptoPriceChart({ symbol, className = "" }: CryptoPriceChartProps) {
  const [isVisible, setIsVisible] = useState(false);
  
  const {
    chartData: priceChartData,
    loading: priceChartLoading,
    error: priceChartError,
    selectedTimeframe,
    changeTimeframe,
    refreshTimeframe,
    hasData: hasPriceChartData
  } = useCryptoPriceChart(symbol);

  // 컴포넌트가 마운트된 후 차트를 로드하기 시작
  useEffect(() => {
    if (symbol) {
      // 약간의 지연 후 차트 표시 (메인 페이지 렌더링 우선)
      const timer = setTimeout(() => {
        setIsVisible(true);
        if (!priceChartData && !priceChartLoading) {
          changeTimeframe('1D'); // 기본 1D 차트 로드
        }
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [symbol, priceChartData, priceChartLoading, changeTimeframe]);

  // 차트 타임스탬프 포맷팅 함수
  const formatTimestampForChart = (timestamp: string, timeframe: string): string => {
    const date = new Date(timestamp);
    
    switch (timeframe) {
      case '30M':
        return date.toLocaleTimeString('ko-KR', { 
          hour: '2-digit', 
          minute: '2-digit' 
        });
      case '1H':
        return date.toLocaleTimeString('ko-KR', { 
          hour: '2-digit', 
          minute: '2-digit' 
        });
      case '1D':
        return date.toLocaleDateString('ko-KR', { 
          month: 'short', 
          day: 'numeric' 
        });
      case '1W':
        return date.toLocaleDateString('ko-KR', { 
          month: 'short', 
          day: 'numeric' 
        });
      case '1MO':
        return date.toLocaleDateString('ko-KR', { 
          month: 'short',
          day: 'numeric'
        });
      default:
        return date.toLocaleDateString('ko-KR');
    }
  };

  // 차트가 아직 보이지 않으면 placeholder 렌더링
  if (!isVisible) {
    return (
      <Card className={`glass-card p-4 ${className}`}>
        <h3 className="font-bold mb-3 flex items-center">
          <BarChart3 size={16} className="mr-2" />
          가격 차트
          <Badge className="ml-2 bg-blue-500/20 text-blue-400 border-0 text-xs">
            빗썸
          </Badge>
        </h3>
        
        <div className="h-48 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-2">
              <BarChart3 size={24} className="text-primary/40" />
            </div>
            <p className="text-sm text-foreground/50">차트 로딩 준비 중...</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className={`glass-card p-4 ${className}`}>
      <h3 className="font-bold mb-3 flex items-center">
        <BarChart3 size={16} className="mr-2" />
        가격 차트
        <Badge className="ml-2 bg-blue-500/20 text-blue-400 border-0 text-xs">
          빗썸
        </Badge>
      </h3>
      
      {/* 타임프레임 버튼들 */}
      <div className="flex space-x-2 mb-4">
        {(['30M', '1H', '1D', '1W', '1MO'] as const).map((timeframe) => (
          <button
            key={timeframe}
            onClick={() => changeTimeframe(timeframe)}
            disabled={priceChartLoading}
            className={`px-3 py-1 rounded-lg text-xs transition-all ${
              selectedTimeframe === timeframe 
                ? 'glass-strong text-primary' 
                : 'glass-subtle hover:glass'
            } ${priceChartLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {timeframe === '1MO' ? '30D' : timeframe}
          </button>
        ))}
      </div>

      {/* 차트 영역 */}
      <div className="h-48 relative">
        {priceChartLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-sm text-foreground/70">
                {selectedTimeframe === '1MO' ? '30일 데이터 집계 중...' : '차트 데이터 로딩 중...'}
              </p>
              {selectedTimeframe === '1MO' && (
                <p className="text-xs text-foreground/50 mt-1">
                  대용량 데이터 최적화 중 (잠시만 기다려주세요)
                </p>
              )}
            </div>
          </div>
        ) : priceChartError ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <AlertTriangle className="h-8 w-8 text-red-400 mx-auto mb-2" />
              <p className="text-sm text-red-400">{priceChartError}</p>
              <button 
                onClick={() => refreshTimeframe(selectedTimeframe)}
                className="mt-2 text-xs text-primary hover:underline"
              >
                다시 시도
              </button>
            </div>
          </div>
        ) : priceChartData && priceChartData.chart_data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={priceChartData.chart_data.map(point => ({
              timestamp: point.timestamp,
              price: point.price,
              volume: point.volume,
              open: point.open,
              high: point.high,
              low: point.low,
              close: point.close
            }))}>
              <defs>
                <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
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
                domain={['dataMin * 0.98', 'dataMax * 1.02']}
                tickFormatter={(value) => formatCurrencyKRW(value).replace('₩', '')}
              />
              <Tooltip 
                formatter={(value: any, name: any) => {
                  if (name === 'price') return [formatCurrencyKRW(value), '가격'];
                  if (name === 'volume') return [formatVolume(value), '거래량'];
                  return [value, name];
                }}
                labelFormatter={(label) => `시간: ${formatTimestampForChart(label, selectedTimeframe)}`}
                contentStyle={{ 
                  backgroundColor: 'rgba(0, 0, 0, 0.8)', 
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '8px',
                  fontSize: '12px'
                }}
              />
              <Area 
                type="monotone" 
                dataKey="price" 
                stroke="#3B82F6" 
                strokeWidth={2}
                fill="url(#priceGradient)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Info className="h-8 w-8 text-yellow-400 mx-auto mb-2" />
              <p className="text-sm text-foreground/70">차트 데이터를 불러올 수 없습니다.</p>
              <button 
                onClick={() => refreshTimeframe(selectedTimeframe)}
                className="mt-2 text-xs text-primary hover:underline"
              >
                다시 시도
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* 차트 정보 */}
      {priceChartData && (
        <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
          <div className="text-center">
            <div className="text-foreground/70">데이터 포인트</div>
            <div className="font-medium">
              {priceChartData.data_points}개
              {selectedTimeframe === '1MO' && (
                <span className="text-green-400 ml-1">(최적화됨)</span>
              )}
            </div>
          </div>
          <div className="text-center">
            <div className="text-foreground/70">최저 - 최고</div>
            <div className="font-medium">
              {formatCurrencyKRW(priceChartData.price_range.min)} - {formatCurrencyKRW(priceChartData.price_range.max)}
            </div>
          </div>
          <div className="text-center">
            <div className="text-foreground/70">마켓</div>
            <div className="font-medium">{priceChartData.market_code}</div>
          </div>
        </div>
      )}
    </Card>
  );
}