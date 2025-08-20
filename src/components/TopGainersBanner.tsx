// components/TopGainersBanner.tsx
// 홈페이지 상단 TopGainers 배너 컴포넌트

import React from 'react';
import { TrendingUp, TrendingDown, Activity, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { useTopGainersData, useWebSocketConnection } from '../hooks/useMarketData';

// ============================================================================
// 타입 정의
// ============================================================================

interface TopGainerItemProps {
  symbol: string;
  name: string;
  price: number;
  changePercent: number;
  volume: number;
  sector?: string;
}

// ============================================================================
// 서브 컴포넌트들
// ============================================================================

const TopGainerItem: React.FC<TopGainerItemProps> = ({ 
  symbol, 
  name, 
  price, 
  changePercent, 
  volume,
  sector 
}) => {
  const formatPrice = (price: number): string => {
    return `${price.toFixed(2)}`;
  };

  const formatVolume = (volume: number): string => {
    if (volume >= 1e9) return `${(volume / 1e9).toFixed(1)}B`;
    if (volume >= 1e6) return `${(volume / 1e6).toFixed(1)}M`;
    if (volume >= 1e3) return `${(volume / 1e3).toFixed(1)}K`;
    return volume.toFixed(0);
  };

  return (
    <div className="glass rounded-xl p-3 min-w-[200px] hover:bg-white/10 transition-all cursor-pointer">
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="font-semibold text-sm">{symbol}</div>
          <div className="text-xs text-foreground/60 truncate max-w-[120px]">{name}</div>
        </div>
        <div className="text-right">
          <div className="font-medium text-sm">{formatPrice(price)}</div>
          <div className={`flex items-center text-xs ${
            changePercent >= 0 ? 'text-green-400' : 'text-red-400'
          }`}>
            {changePercent >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            <span className="ml-1">
              {changePercent >= 0 ? '+' : ''}{changePercent.toFixed(2)}%
            </span>
          </div>
        </div>
      </div>
      
      <div className="flex items-center justify-between text-xs text-foreground/50">
        <span>Vol: {formatVolume(volume)}</span>
        {sector && <span className="truncate max-w-[80px]">{sector}</span>}
      </div>
    </div>
  );
};

const LoadingState: React.FC = () => (
  <div className="flex items-center justify-center space-x-4 py-8">
    <RefreshCw className="animate-spin text-blue-400" size={24} />
    <div>
      <div className="font-medium">실시간 데이터 로딩 중...</div>
      <div className="text-sm text-foreground/60">Top Gainers 연결 중</div>
    </div>
  </div>
);

const ErrorState: React.FC<{ onRetry: () => void }> = ({ onRetry }) => (
  <div className="text-center py-8">
    <WifiOff className="mx-auto mb-2 text-red-400" size={32} />
    <div className="font-medium text-red-400 mb-1">연결 실패</div>
    <div className="text-sm text-foreground/60 mb-3">실시간 데이터를 가져올 수 없습니다</div>
    <button
      onClick={onRetry}
      className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors text-sm"
    >
      다시 시도
    </button>
  </div>
);

// ============================================================================
// 메인 컴포넌트
// ============================================================================

const TopGainersBanner: React.FC = () => {
  // =========================================================================
  // 데이터 및 상태 관리
  // =========================================================================
  
  const { 
    topGainersData, 
    topByPercent, 
    lastUpdated, 
    isEmpty, 
    getTopGainers 
  } = useTopGainersData();

  const { 
    connectionStatuses, 
    isConnected, 
    reconnect 
  } = useWebSocketConnection();

  const isTopGainersConnected = isConnected('topgainers');
  const topGainersStatus = connectionStatuses.topgainers;

  // =========================================================================
  // 이벤트 핸들러
  // =========================================================================

  const handleRetry = () => {
    reconnect('topgainers');
  };

  // =========================================================================
  // 렌더링 조건부 로직
  // =========================================================================

  // 로딩 상태
  if (topGainersStatus === 'connecting' || topGainersStatus === 'reconnecting') {
    return (
      <div className="glass-card rounded-2xl p-6">
        <LoadingState />
      </div>
    );
  }

  // 에러 상태
  if (topGainersStatus === 'disconnected' && isEmpty) {
    return (
      <div className="glass-card rounded-2xl p-6">
        <ErrorState onRetry={handleRetry} />
      </div>
    );
  }

  // 데이터 없음
  if (isEmpty) {
    return (
      <div className="glass-card rounded-2xl p-6">
        <div className="text-center py-8 text-foreground/60">
          <Activity className="mx-auto mb-2 opacity-50" size={32} />
          <div>아직 데이터가 없습니다</div>
          <div className="text-sm mt-1">잠시 후 실시간 데이터가 표시됩니다</div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 메인 렌더링
  // =========================================================================

  return (
    <div className="glass-card rounded-2xl p-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold flex items-center">
            <TrendingUp className="mr-2 text-green-400" size={20} />
            🚀 오늘의 급상승 종목
          </h2>
          <p className="text-sm text-foreground/70">
            실시간으로 업데이트되는 상승률 상위 종목들을 확인하세요
          </p>
        </div>
        
        {/* 연결 상태 */}
        <div className="flex items-center space-x-2">
          {isTopGainersConnected ? (
            <>
              <Wifi className="text-green-400" size={16} />
              <span className="text-green-400 text-xs">실시간</span>
            </>
          ) : (
            <>
              <WifiOff className="text-red-400" size={16} />
              <span className="text-red-400 text-xs">연결 끊김</span>
              <button
                onClick={handleRetry}
                className="text-xs text-blue-400 hover:text-blue-300 underline ml-2"
              >
                재연결
              </button>
            </>
          )}
        </div>
      </div>

      {/* Top Gainers 리스트 */}
      <div className="space-y-4">
        {/* 상위 5개 큰 카드로 표시 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {topByPercent.slice(0, 3).map((item, index) => (
            <div key={item.symbol} className="relative">
              {/* 순위 배지 */}
              <div className={`absolute -top-2 -left-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold z-10 ${
                index === 0 ? 'bg-yellow-500 text-black' :
                index === 1 ? 'bg-gray-300 text-black' :
                'bg-orange-400 text-black'
              }`}>
                {index + 1}
              </div>
              
              <TopGainerItem
                symbol={item.symbol}
                name={item.name}
                price={item.price}
                changePercent={item.change_percent}
                volume={item.volume}
                sector={item.sector}
              />
            </div>
          ))}
        </div>

        {/* 나머지 항목들 스크롤 가능한 리스트 */}
        {topGainersData.length > 3 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium text-sm">기타 상승 종목</h3>
              <span className="text-xs text-foreground/60">
                {topGainersData.length - 3}개 더 보기
              </span>
            </div>
            
            <div className="flex space-x-3 overflow-x-auto pb-2 scrollbar-hide">
              {getTopGainers(10).slice(3).map((item) => (
                <TopGainerItem
                  key={item.symbol}
                  symbol={item.symbol}
                  name={item.name}
                  price={item.price}
                  changePercent={item.change_percent}
                  volume={item.volume}
                  sector={item.sector}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 하단 정보 */}
      <div className="mt-4 pt-4 border-t border-white/10">
        <div className="flex items-center justify-between text-xs text-foreground/60">
          <div className="flex items-center space-x-4">
            <span className="flex items-center space-x-1">
              <Activity size={12} />
              <span>총 {topGainersData.length}개 종목</span>
            </span>
            <span>📊 실시간 업데이트</span>
          </div>
          {lastUpdated && (
            <span>
              마지막 업데이트: {lastUpdated.toLocaleTimeString('ko-KR')}
            </span>
          )}
        </div>
      </div>

      {/* 더 보기 링크 */}
      <div className="mt-4 text-center">
        <a
          href="/market"
          className="inline-flex items-center space-x-2 px-4 py-2 bg-primary/20 text-primary rounded-lg hover:bg-primary/30 transition-colors text-sm font-medium"
        >
          <span>전체 마켓 보기</span>
          <TrendingUp size={14} />
        </a>
      </div>
    </div>
  );
};

export default TopGainersBanner;