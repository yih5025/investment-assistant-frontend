// components/EnhancedTopGainersBanner.tsx
// 시장 시간 표시가 추가된 TopGainers 배너

import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Activity, Wifi, WifiOff, RefreshCw, Clock } from 'lucide-react';
import { useTopGainersData, useWebSocketConnection } from '../hooks/useMarketData';
import { getMarketStatus, getMarketStatusText, getFormattedEasternTime, MarketSession } from '../utils/marketTime';

// ============================================================================
// 시장 시간 표시 컴포넌트
// ============================================================================

interface MarketTimeDisplayProps {
  session: MarketSession;
}

const MarketTimeDisplay: React.FC<MarketTimeDisplayProps> = ({ session }) => {
  const statusInfo = getMarketStatusText(session);
  
  return (
    <div className="flex items-center justify-between text-xs mb-2 px-1">
      <div className="flex items-center space-x-2">
        <Clock size={12} className="text-gray-400" />
        <span className="text-gray-400">{getFormattedEasternTime()}</span>
      </div>
      <div className="flex items-center space-x-1">
        <div className={`w-2 h-2 rounded-full ${
          statusInfo.isLive ? 'bg-green-400 animate-pulse' : 'bg-gray-400'
        }`} />
        <span className={`${statusInfo.color} font-medium`}>
          {statusInfo.status}
        </span>
      </div>
    </div>
  );
};

// ============================================================================
// 강화된 FlipBoard 컴포넌트
// ============================================================================

interface EnhancedFlipBoardProps {
  data: any[];
  color: string;
  bgColor: string;
  onBannerClick: (item: any) => void;
  isMarketOpen: boolean;
}

function EnhancedFlipBoard({ data, color, bgColor, onBannerClick, isMarketOpen }: EnhancedFlipBoardProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipping, setIsFlipping] = useState(false);

  useEffect(() => {
    if (data.length === 0) return;

    // 장 마감 시에는 더 느린 전환 (8초), 장 중에는 빠른 전환 (4초)
    const interval = isMarketOpen ? 4000 : 8000;

    const flipInterval = setInterval(() => {
      setIsFlipping(true);
      setTimeout(() => {
        const newIndex = (currentIndex + 1) % data.length;
        setCurrentIndex(newIndex);
        setIsFlipping(false);
      }, 300);
    }, interval);

    return () => clearInterval(flipInterval);
  }, [currentIndex, data.length, isMarketOpen]);

  if (data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="animate-spin mx-auto mb-1 opacity-50" size={16} />
          <div className="text-xs text-foreground/60">
            {isMarketOpen ? '실시간 로딩 중...' : '마지막 거래 데이터 로딩 중...'}
          </div>
        </div>
      </div>
    );
  }

  const currentItem = data[currentIndex];

  const formatPrice = (price: number) => {
    if (price < 1) {
      return `$${price.toFixed(4)}`;
    }
    return `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatVolume = (volume: number) => {
    if (volume >= 1000000000) {
      return `${(volume / 1000000000).toFixed(1)}B`;
    } else if (volume >= 1000000) {
      return `${(volume / 1000000).toFixed(1)}M`;
    }
    return `${(volume / 1000).toFixed(0)}K`;
  };

  return (
    <div 
      className="h-full flex flex-col cursor-pointer"
      onClick={() => onBannerClick(currentItem)}
    >
      <div className={`flex-1 ${bgColor} rounded-lg ${isFlipping ? 'scale-95' : 'scale-100'} transition-transform duration-300 overflow-hidden hover:scale-105 relative`}>
        {/* 데이터 신선도 표시 */}
        {!isMarketOpen && (
          <div className="absolute top-1 right-1 text-xs text-gray-400 bg-black/20 px-1 rounded">
            종가
          </div>
        )}
        
        <div className="flip-container h-full">
          <div className={`flip-content h-full ${isFlipping ? 'flipping' : ''}`}>
            <div className="h-full p-4 flex flex-col justify-center space-y-2">
              {/* 심볼 */}
              <div className="text-center">
                <div className="text-lg font-bold">{currentItem.symbol}</div>
              </div>
              
              {/* 회사명 */}
              <div className="text-center">
                <div className="text-xs text-foreground/70 truncate">{currentItem.name}</div>
              </div>
              
              {/* 주가 */}
              <div className="text-center">
                <div className="text-sm font-semibold">{formatPrice(currentItem.price)}</div>
              </div>
              
              {/* 변화율 */}
              <div className="text-center">
                <div className={`text-sm font-medium flex items-center justify-center space-x-1 ${
                  currentItem.change_percent >= 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {currentItem.change_percent >= 0 ? (
                    <TrendingUp size={12} />
                  ) : (
                    <TrendingDown size={12} />
                  )}
                  <span>
                    {currentItem.change_percent >= 0 ? '+' : ''}{currentItem.change_percent.toFixed(1)}%
                  </span>
                </div>
              </div>
              
              {/* 거래량 */}
              <div className="text-center">
                <div className="text-xs text-foreground/60">
                  Vol: {formatVolume(currentItem.volume)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 메인 EnhancedTopGainersBanner 컴포넌트
// ============================================================================

const EnhancedTopGainersBanner: React.FC = () => {
  // =========================================================================
  // 상태 관리
  // =========================================================================
  
  const { 
    topGainersData, 
    lastUpdated, 
    isEmpty
  } = useTopGainersData();

  const { 
    connectionStatuses, 
    isConnected, 
    reconnect 
  } = useWebSocketConnection();

  // 시장 상태 관리
  const [marketSession, setMarketSession] = useState<MarketSession>(getMarketStatus());

  // 시장 상태 업데이트 (1분마다)
  useEffect(() => {
    const interval = setInterval(() => {
      setMarketSession(getMarketStatus());
    }, 60000); // 1분마다 업데이트

    return () => clearInterval(interval);
  }, []);

  const isTopGainersConnected = isConnected('topgainers');
  const topGainersStatus = connectionStatuses.topgainers;

  // =========================================================================
  // 시장 상태에 따른 데이터 처리
  // =========================================================================

  // 시장 상태에 따라 다른 메시지 표시
  const getDataSourceMessage = () => {
    if (marketSession.isOpen) {
      return isTopGainersConnected ? '실시간 데이터' : '연결 중...';
    } else {
      return '최종 거래가 기준';
    }
  };

  // =========================================================================
  // 배너 데이터 분류
  // =========================================================================

  const banners = [
    {
      title: "급상승",
      icon: TrendingUp,
      color: "text-green-400",
      bgColor: "bg-gradient-to-br from-green-500/10 to-green-600/5",
      borderColor: "border-green-500/20",
      data: topGainersData.filter(item => item.change_percent > 0).slice(0, 6)
    },
    {
      title: "급하락", 
      icon: TrendingDown,
      color: "text-red-400",
      bgColor: "bg-gradient-to-br from-red-500/10 to-red-600/5",
      borderColor: "border-red-500/20",
      data: topGainersData.filter(item => item.change_percent < 0).slice(0, 6)
    },
    {
      title: "거래량",
      icon: Activity,
      color: "text-blue-400", 
      bgColor: "bg-gradient-to-br from-blue-500/10 to-blue-600/5",
      borderColor: "border-blue-500/20",
      data: [...topGainersData].sort((a, b) => b.volume - a.volume).slice(0, 6)
    }
  ];

  // =========================================================================
  // 이벤트 핸들러
  // =========================================================================

  const handleRetry = () => {
    reconnect('topgainers');
  };

  const handleBannerClick = (item: any) => {
    // 마켓 페이지로 이동하고 해당 종목으로 스크롤
    window.dispatchEvent(new CustomEvent('navigateToMarkets', { detail: { symbol: item.symbol } }));
  };

  // =========================================================================
  // 렌더링 조건부 로직
  // =========================================================================

  // 연결 중 상태 (시장 시간과 관계없이)
  if ((topGainersStatus.status === 'connecting' || topGainersStatus.status === 'reconnecting') && isEmpty) {
    return (
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="p-4">
          <MarketTimeDisplay session={marketSession} />
        </div>
        <div className="p-6 text-center">
          <RefreshCw className="animate-spin text-blue-400 mx-auto mb-2" size={24} />
          <div className="font-medium">실시간 데이터 로딩 중...</div>
          <div className="text-sm text-foreground/60">Top Gainers 연결 중</div>
        </div>
      </div>
    );
  }

  // 연결 실패 상태 (시장 시간 중에만 에러로 표시)
  if (topGainersStatus.status === 'disconnected' && isEmpty && marketSession.isOpen) {
    return (
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="p-4">
          <MarketTimeDisplay session={marketSession} />
        </div>
        <div className="p-6 text-center">
          <WifiOff className="mx-auto mb-2 text-red-400" size={32} />
          <div className="font-medium text-red-400 mb-1">실시간 연결 실패</div>
          <div className="text-sm text-foreground/60 mb-3">실시간 데이터를 가져올 수 없습니다</div>
          <button
            onClick={handleRetry}
            className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors text-sm"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  // 장 마감 시간이고 데이터가 없는 경우
  if (isEmpty && !marketSession.isOpen) {
    return (
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="p-4">
          <MarketTimeDisplay session={marketSession} />
        </div>
        <div className="p-6 text-center">
          <Activity className="mx-auto mb-2 opacity-50" size={32} />
          <div className="font-medium">장 마감</div>
          <div className="text-sm mt-1 text-foreground/60">
            마지막 거래 데이터 준비 중
          </div>
          <div className="text-xs mt-2 text-blue-400">
            {marketSession.timeUntilNext}
          </div>
        </div>
      </div>
    );
  }

  // 데이터 없음 (일반적인 경우)
  if (isEmpty) {
    return (
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="p-4">
          <MarketTimeDisplay session={marketSession} />
        </div>
        <div className="p-6 text-center">
          <Activity className="mx-auto mb-2 opacity-50" size={32} />
          <div>데이터 준비 중</div>
          <div className="text-sm mt-1 text-foreground/60">잠시 후 표시됩니다</div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 메인 렌더링
  // =========================================================================

  return (
    <div className="glass-card rounded-xl overflow-hidden">
      {/* 시장 시간 표시 */}
      <div className="p-4 border-b border-white/5">
        <MarketTimeDisplay session={marketSession} />
      </div>

      {/* 메인 배너 섹션 */}
      <div className="grid grid-cols-3 gap-3 p-4">
        {banners.map((banner, index) => {
          const Icon = banner.icon;
          return (
            <div key={index} className="flex flex-col h-36">
              {/* 헤더 */}
              <div className={`${banner.bgColor} px-3 py-2 rounded-t-lg border-b border-white/10 flex-shrink-0`}>
                <div className="flex items-center justify-center space-x-2">
                  <Icon size={16} className={banner.color} />
                  <span className="text-sm font-medium">{banner.title}</span>
                </div>
              </div>
              
              {/* Enhanced Flip Board */}
              <div className="flex-1">
                <EnhancedFlipBoard 
                  data={banner.data} 
                  color={banner.color}
                  bgColor={banner.bgColor}
                  onBannerClick={handleBannerClick}
                  isMarketOpen={marketSession.isOpen}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* 하단 상태 표시 */}
      <div className="px-4 py-3 border-t border-white/10 bg-white/[0.02]">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {/* 연결 상태 */}
            <div className="flex items-center space-x-1">
              {isTopGainersConnected && marketSession.isOpen ? (
                <>
                  <Wifi className="text-green-400" size={14} />
                  <span className="text-xs text-green-400">실시간</span>
                </>
              ) : marketSession.isOpen ? (
                <>
                  <WifiOff className="text-yellow-400" size={14} />
                  <span className="text-xs text-yellow-400">연결 중</span>
                </>
              ) : (
                <>
                  <div className="w-3 h-3 bg-gray-400 rounded-full" />
                  <span className="text-xs text-gray-400">장 마감</span>
                </>
              )}
            </div>
            
            {/* 데이터 개수 */}
            <span className="text-xs text-foreground/60">
              {topGainersData.length}개 종목
            </span>
            
            {/* 데이터 소스 */}
            <span className="text-xs text-foreground/50">
              {getDataSourceMessage()}
            </span>
            
            {/* 마지막 업데이트 시간 */}
            {lastUpdated && (
              <span className="text-xs text-foreground/50">
                {lastUpdated.toLocaleTimeString('ko-KR', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })} 업데이트
              </span>
            )}
          </div>
          
          {/* 안내 텍스트 */}
          <div className="text-xs text-foreground/60">
            클릭하여 상세보기
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedTopGainersBanner;