// components/TopGainersBanner.tsx
// 새로운 백엔드 구조에 맞춘 TopGainers 배너 컴포넌트

import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Activity, Wifi, WifiOff, RefreshCw, Clock } from 'lucide-react';
import { useTopGainersBanner } from '../hooks/useTopgainers';
import { getFormattedEasternTime } from '../utils/marketTime';
import type { TopGainerBannerItem } from '../hooks/useTopgainers';

// ============================================================================
// 시장 시간 표시 컴포넌트
// ============================================================================

interface MarketTimeDisplayProps {
  marketStatus: any;
  isRealtime: boolean;
}

const MarketTimeDisplay: React.FC<MarketTimeDisplayProps> = ({ marketStatus, isRealtime }) => {
  return (
    <div className="flex items-center justify-between text-xs mb-2 px-1">
      <div className="flex items-center space-x-2">
        <Clock size={12} className="text-gray-400" />
        <span className="text-gray-400">{getFormattedEasternTime()}</span>
      </div>
      <div className="flex items-center space-x-1">
        <div className={`w-2 h-2 rounded-full ${
          marketStatus.isOpen && isRealtime ? 'bg-green-400 animate-pulse' : 'bg-gray-400'
        }`} />
        <span className={`font-medium ${
          marketStatus.isOpen ? 'text-green-400' : 'text-gray-400'
        }`}>
          {marketStatus.isOpen ? '장중' : '장마감'}
        </span>
      </div>
    </div>
  );
};

// ============================================================================
// 777 룰렛 스타일 슬라이딩 배너 컴포넌트
// ============================================================================

interface SlotMachineSliderProps {
  items: TopGainerBannerItem[];
  currentIndex: number;
  isTransitioning: boolean;
  color: string;
  bgColor: string;
  onBannerClick: (item: TopGainerBannerItem) => void;
  isMarketOpen: boolean;
}

const SlotMachineSlider: React.FC<SlotMachineSliderProps> = ({
  items,
  currentIndex,
  isTransitioning,
  color,
  bgColor,
  onBannerClick,
  isMarketOpen
}) => {
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

  if (items.length === 0) {
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

  const currentItem = items[currentIndex];
  const nextIndex = (currentIndex + 1) % items.length;
  const nextItem = items[nextIndex];

  return (
    <div 
      className="h-full flex flex-col cursor-pointer relative overflow-hidden"
      onClick={() => onBannerClick(currentItem)}
    >
      <div className={`flex-1 ${bgColor} rounded-lg transition-all duration-300 hover:scale-105 relative`}>
        {/* 데이터 신선도 표시 */}
        {!isMarketOpen && (
          <div className="absolute top-1 right-1 text-xs text-gray-400 bg-black/20 px-1 rounded z-10">
            종가
          </div>
        )}
        
        {/* 777 룰렛 스타일 슬라이딩 컨테이너 */}
        <div className="h-full relative overflow-hidden">
          {/* 현재 아이템 */}
          <div className={`absolute inset-0 p-4 flex flex-col justify-center space-y-2 transition-transform duration-300 ease-in-out ${
            isTransitioning ? '-translate-y-full opacity-0' : 'translate-y-0 opacity-100'
          }`}>
            <StockCard item={currentItem} color={color} formatPrice={formatPrice} formatVolume={formatVolume} />
          </div>
          
          {/* 다음 아이템 (슬라이딩 준비) */}
          <div className={`absolute inset-0 p-4 flex flex-col justify-center space-y-2 transition-transform duration-300 ease-in-out ${
            isTransitioning ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
          }`}>
            <StockCard item={nextItem} color={color} formatPrice={formatPrice} formatVolume={formatVolume} />
          </div>
        </div>
        
        {/* 슬라이딩 인디케이터 */}
        <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 flex space-x-1">
          {items.slice(0, Math.min(5, items.length)).map((_, index) => (
            <div
              key={index}
              className={`w-1 h-1 rounded-full transition-all duration-200 ${
                index === currentIndex % Math.min(5, items.length) 
                  ? 'bg-white/80' 
                  : 'bg-white/30'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

// 개별 주식 카드 컴포넌트
interface StockCardProps {
  item: TopGainerBannerItem;
  color: string;
  formatPrice: (price: number) => string;
  formatVolume: (volume: number) => string;
}

const StockCard: React.FC<StockCardProps> = ({ item, color, formatPrice, formatVolume }) => {
  return (
    <>
      {/* 심볼 */}
      <div className="text-center">
        <div className="text-lg font-bold">{item.symbol}</div>
      </div>
      
      {/* 회사명 */}
      <div className="text-center">
        <div className="text-xs text-foreground/70 truncate">{item.name}</div>
      </div>
      
      {/* 주가 */}
      <div className="text-center">
        <div className="text-sm font-semibold">{formatPrice(item.price)}</div>
      </div>
      
      {/* 변화율 */}
      <div className="text-center">
        <div className={`text-sm font-medium flex items-center justify-center space-x-1 ${
          item.change_percent >= 0 ? 'text-green-400' : 'text-red-400'
        }`}>
          {item.change_percent >= 0 ? (
            <TrendingUp size={12} />
          ) : (
            <TrendingDown size={12} />
          )}
          <span>
            {item.change_percent >= 0 ? '+' : ''}{item.change_percent.toFixed(1)}%
          </span>
        </div>
      </div>
      
      {/* 거래량 */}
      <div className="text-center">
        <div className="text-xs text-foreground/60">
          Vol: {formatVolume(item.volume)}
        </div>
      </div>
      
      {/* 순위 표시 (있는 경우) */}
      {item.rank_position && (
        <div className="absolute top-1 left-1 text-xs text-white bg-black/30 rounded px-1">
          #{item.rank_position}
        </div>
      )}
    </>
  );
};

// ============================================================================
// 메인 TopGainers 배너 컴포넌트
// ============================================================================

const TopGainersBanner: React.FC = () => {
  // =========================================================================
  // 훅을 통한 상태 관리
  // =========================================================================
  
  const {
    connectionStatus,
    isConnected,
    isRealtime,
    reconnect,
    isEmpty,
    lastUpdated,
    marketStatus,
    bannerConfigs,
    handleBannerClick,
    getDataSourceMessage,
    categoryStats
  } = useTopGainersBanner();

  // =========================================================================
  // 아이콘 매핑
  // =========================================================================
  
  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'TrendingUp': return TrendingUp;
      case 'TrendingDown': return TrendingDown;
      case 'Activity': return Activity;
      default: return Activity;
    }
  };

  // =========================================================================
  // 렌더링 조건부 로직
  // =========================================================================

  // 연결 중 상태
  if ((connectionStatus.status === 'connecting' || connectionStatus.status === 'reconnecting') && isEmpty) {
    return (
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="p-4">
          <MarketTimeDisplay marketStatus={marketStatus} isRealtime={isRealtime} />
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
  if (connectionStatus.status === 'disconnected' && isEmpty && marketStatus.isOpen) {
    return (
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="p-4">
          <MarketTimeDisplay marketStatus={marketStatus} isRealtime={isRealtime} />
        </div>
        <div className="p-6 text-center">
          <WifiOff className="mx-auto mb-2 text-red-400" size={32} />
          <div className="font-medium text-red-400 mb-1">실시간 연결 실패</div>
          <div className="text-sm text-foreground/60 mb-3">실시간 데이터를 가져올 수 없습니다</div>
          <button
            onClick={reconnect}
            className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors text-sm"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  // 장 마감 시간이고 데이터가 없는 경우
  if (isEmpty && !marketStatus.isOpen) {
    return (
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="p-4">
          <MarketTimeDisplay marketStatus={marketStatus} isRealtime={isRealtime} />
        </div>
        <div className="p-6 text-center">
          <Activity className="mx-auto mb-2 opacity-50" size={32} />
          <div className="font-medium">장 마감</div>
          <div className="text-sm mt-1 text-foreground/60">
            마지막 거래 데이터 준비 중
          </div>
          <div className="text-xs mt-2 text-blue-400">
            {marketStatus.timeUntilNext || '다음 장 개장까지 대기 중'}
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
          <MarketTimeDisplay marketStatus={marketStatus} isRealtime={isRealtime} />
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
        <MarketTimeDisplay marketStatus={marketStatus} isRealtime={isRealtime} />
      </div>

      {/* 메인 배너 섹션 */}
      <div className="grid grid-cols-3 gap-3 p-4">
        {bannerConfigs.map((banner, index) => {
          const Icon = getIcon(banner.icon);
          return (
            <div key={index} className="flex flex-col h-36">
              {/* 헤더 */}
              <div className={`${banner.bgColor} px-3 py-2 rounded-t-lg border-b border-white/10 flex-shrink-0`}>
                <div className="flex items-center justify-center space-x-2">
                  <Icon size={16} className={banner.color} />
                  <span className="text-sm font-medium">{banner.title}</span>
                  {/* 카테고리 개수 표시 */}
                  <span className="text-xs text-foreground/60">
                    ({banner.items.length})
                  </span>
                </div>
              </div>
              
              {/* 777 룰렛 스타일 슬라이더 */}
              <div className="flex-1">
                <SlotMachineSlider
                  items={banner.items}
                  currentIndex={banner.slider.sliderState.currentIndex}
                  isTransitioning={banner.slider.sliderState.isTransitioning}
                  color={banner.color}
                  bgColor={banner.bgColor}
                  onBannerClick={handleBannerClick}
                  isMarketOpen={marketStatus.isOpen}
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
              {isConnected && marketStatus.isOpen ? (
                <>
                  <Wifi className="text-green-400" size={14} />
                  <span className="text-xs text-green-400">
                    {connectionStatus.mode === 'websocket' ? '실시간' : 'API'}
                  </span>
                </>
              ) : marketStatus.isOpen ? (
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
            
            {/* 총 데이터 개수 */}
            {categoryStats && (
              <span className="text-xs text-foreground/60">
                총 {categoryStats.total}개 종목
              </span>
            )}
            
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
            
            {/* 배치 ID 표시 (디버깅용) */}
            {categoryStats && process.env.NODE_ENV === 'development' && (
              <span className="text-xs text-foreground/40">
                Batch #{categoryStats.batch_id}
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

export default TopGainersBanner;