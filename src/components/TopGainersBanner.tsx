// components/TopGainersBanner.tsx
// 홈페이지 상단 TopGainers 배너 컴포넌트 - HomeStockBanner 스타일 완전 적용

import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Activity, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { useTopGainersData, useWebSocketConnection } from '../hooks/useMarketData';

// ============================================================================
// FlipBoard 컴포넌트 (HomeStockBanner와 동일한 스타일)
// ============================================================================

interface FlipBoardProps {
  data: any[];
  color: string;
  bgColor: string;
  onBannerClick: (item: any) => void;
}

function FlipBoard({ data, color, bgColor, onBannerClick }: FlipBoardProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipping, setIsFlipping] = useState(false);

  useEffect(() => {
    if (data.length === 0) return;

    const interval = setInterval(() => {
      setIsFlipping(true);
      setTimeout(() => {
        const newIndex = (currentIndex + 1) % data.length;
        setCurrentIndex(newIndex);
        setIsFlipping(false);
      }, 300);
    }, 4000);

    return () => clearInterval(interval);
  }, [currentIndex, data.length]);

  if (data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="animate-spin mx-auto mb-1 opacity-50" size={16} />
          <div className="text-xs text-foreground/60">로딩 중...</div>
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
      <div className={`flex-1 ${bgColor} rounded-lg ${isFlipping ? 'scale-95' : 'scale-100'} transition-transform duration-300 overflow-hidden hover:scale-105`}>
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
                <div className={`text-sm font-medium ${currentItem.change_percent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {currentItem.change_percent >= 0 ? '+' : ''}{currentItem.change_percent.toFixed(1)}%
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
// 메인 TopGainersBanner 컴포넌트
// ============================================================================

const TopGainersBanner: React.FC = () => {
  // =========================================================================
  // 데이터 및 상태 관리
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

  const isTopGainersConnected = isConnected('topgainers');
  const topGainersStatus = connectionStatuses.topgainers;

  // =========================================================================
  // 배너 데이터 분류 (HomeStockBanner와 동일한 구조)
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
    // 마켓 페이지로 이동
    window.dispatchEvent(new CustomEvent('navigateToMarkets'));
  };

  // =========================================================================
  // 렌더링 조건부 로직
  // =========================================================================

  // 로딩 상태
  if (topGainersStatus === 'connecting' || topGainersStatus === 'reconnecting') {
    return (
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="p-6 text-center">
          <RefreshCw className="animate-spin text-blue-400 mx-auto mb-2" size={24} />
          <div className="font-medium">실시간 데이터 로딩 중...</div>
          <div className="text-sm text-foreground/60">Top Gainers 연결 중</div>
        </div>
      </div>
    );
  }

  // 에러 상태
  if (topGainersStatus === 'disconnected' && isEmpty) {
    return (
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="p-6 text-center">
          <WifiOff className="mx-auto mb-2 text-red-400" size={32} />
          <div className="font-medium text-red-400 mb-1">연결 실패</div>
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

  // 데이터 없음
  if (isEmpty) {
    return (
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="p-6 text-center">
          <Activity className="mx-auto mb-2 opacity-50" size={32} />
          <div>아직 데이터가 없습니다</div>
          <div className="text-sm mt-1 text-foreground/60">잠시 후 실시간 데이터가 표시됩니다</div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 메인 렌더링 (HomeStockBanner와 완전 동일한 구조)
  // =========================================================================

  return (
    <div className="glass-card rounded-xl overflow-hidden">
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
              
              {/* Flip Board */}
              <div className="flex-1">
                <FlipBoard 
                  data={banner.data} 
                  color={banner.color}
                  bgColor={banner.bgColor}
                  onBannerClick={handleBannerClick}
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
            {isTopGainersConnected ? (
              <div className="flex items-center space-x-1">
                <Wifi className="text-green-400" size={14} />
                <span className="text-xs text-green-400">실시간</span>
              </div>
            ) : (
              <div className="flex items-center space-x-1">
                <WifiOff className="text-red-400" size={14} />
                <span className="text-xs text-red-400">연결 끊김</span>
              </div>
            )}
            
            {/* 데이터 개수 */}
            <span className="text-xs text-foreground/60">
              {topGainersData.length}개 종목
            </span>
            
            {/* 마지막 업데이트 시간 */}
            {lastUpdated && (
              <span className="text-xs text-foreground/50">
                {lastUpdated.toLocaleTimeString('ko-KR')} 업데이트
              </span>
            )}
          </div>
          
          {/* 안내 텍스트 */}
          <div className="text-xs text-foreground/60">
            배너를 클릭하면 마켓으로 이동
          </div>
        </div>
      </div>
    </div>
  );
};

export default TopGainersBanner;