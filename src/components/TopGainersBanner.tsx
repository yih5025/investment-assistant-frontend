import React, { useState, useEffect, useRef, useCallback } from 'react';
import { TrendingUp, TrendingDown, Activity, Wifi, WifiOff, RefreshCw, Clock } from 'lucide-react';
import { useTopGainersBanner } from '../hooks/useTopgainers';
import { getFormattedEasternTime } from '../utils/marketTime';
import type { TopGainerBannerItem } from '../hooks/useTopgainers';

// 마스터 동기화된 슬롯 룰렛 컴포넌트
interface SlotReelProps {
  items: TopGainerBannerItem[];
  color: string;
  bgColor: string;
  bannerIndex: number;
  onClick: (item: TopGainerBannerItem) => void;
  masterAnimationSpeed: number;
  isPaused: boolean;
  isMarketOpen: boolean;
}

function SlotReel({ items, color, bgColor, bannerIndex, onClick, masterAnimationSpeed, isPaused, isMarketOpen }: SlotReelProps) {
  const reelRef = useRef<HTMLDivElement>(null);

  // 무한 스크롤용 데이터 복제
  const extendedItems = items.length > 0 ? [...items, ...items, ...items] : [];
  
  const formatPrice = (price: number) => {
    if (price < 1) return `$${price.toFixed(4)}`;
    return `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // 마스터 애니메이션 속도로 CSS 변수 업데이트
  useEffect(() => {
    if (reelRef.current) {
      const duration = `${8 / masterAnimationSpeed}s`;
      reelRef.current.style.setProperty('--animation-duration', duration);
      reelRef.current.style.setProperty('--animation-play-state', !isPaused ? 'running' : 'paused');
    }
  }, [masterAnimationSpeed, isPaused]);

  if (items.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="animate-spin mx-auto mb-1 opacity-50" size={16} />
          <div className="text-xs text-foreground/60">
            {isMarketOpen ? '실시간 로딩...' : '데이터 준비 중...'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="slot-machine h-full relative overflow-hidden">
      {/* 일시정지 표시 */}
      {isPaused && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/20 backdrop-blur-sm">
          <div className="text-xs text-white/80 font-medium px-2 py-1 rounded-lg bg-white/10">
            일시정지
          </div>
        </div>
      )}

      {/* 장 상태 표시 */}
      {!isMarketOpen && (
        <div className="absolute top-1 right-1 z-10">
          <div className="text-[8px] text-orange-400 bg-black/20 px-1 rounded">
            종가
          </div>
        </div>
      )}
      
      <div 
        ref={reelRef}
        className="slot-reel-interactive"
        style={{
          animationDuration: `var(--animation-duration, 8s)`,
          animationPlayState: `var(--animation-play-state, running)`
        }}
      >
        {extendedItems.map((item, index) => (
          <div
            key={`${item.symbol}-${index}`}
            className="p-2 cursor-pointer hover:bg-white/10 transition-colors"
            onClick={() => !isPaused && onClick(item)}
          >
            <div className="text-center space-y-1">
              <div className="font-bold text-sm">{item.symbol}</div>
              <div className="text-xs font-medium">{formatPrice(item.price)}</div>
              <div className={`text-xs font-medium ${item.change_percent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {item.change_percent >= 0 ? '+' : ''}{item.change_percent.toFixed(1)}%
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* 그라데이션 마스크 */}
      <div className="absolute top-0 left-0 right-0 h-4 bg-gradient-to-b from-black/30 to-transparent pointer-events-none z-10"></div>
      <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-black/30 to-transparent pointer-events-none z-10"></div>
    </div>
  );
}

// 시장 시간 표시 컴포넌트
interface MarketTimeDisplayProps {
  marketStatus: any;
  isRealtime: boolean;
  connectionStatus: any;
}

const MarketTimeDisplay: React.FC<MarketTimeDisplayProps> = ({ marketStatus, isRealtime, connectionStatus }) => {
  const getConnectionIcon = () => {
    switch (connectionStatus.status) {
      case 'connected':
        return <Wifi size={12} className="text-green-400" />;
      case 'connecting':
      case 'reconnecting':
        return <RefreshCw size={12} className="text-yellow-400 animate-spin" />;
      default:
        return <Clock size={12} className="text-gray-400" />;
    }
  };

  return (
    <div className="flex items-center justify-between text-xs mb-2 px-1">
      <div className="flex items-center space-x-2">
        {getConnectionIcon()}
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

// 메인 TopGainers 배너 컴포넌트
const TopGainersBanner: React.FC = () => {
  // 기존 훅 사용
  const {
    connectionStatus,
    isConnected,
    isRealtime,
    isEmpty,
    lastUpdated,
    marketStatus,
    bannerConfigs,
    handleBannerClick,
    getDataSourceMessage,
  } = useTopGainersBanner();

  // 마스터 애니메이션 상태 (3개 룰렛 동기화)
  const [masterAnimationSpeed, setMasterAnimationSpeed] = useState(1);
  const [isPaused, setIsPaused] = useState(false);
  const [touchStartY, setTouchStartY] = useState(0);
  const [touchStartTime, setTouchStartTime] = useState(0);
  const speedTimeoutRef = useRef<NodeJS.Timeout>();
  const pauseTimeoutRef = useRef<NodeJS.Timeout>();

  // 마스터 터치 이벤트 핸들러들
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    setTouchStartY(touch.clientY);
    setTouchStartTime(Date.now());
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (isPaused) return;
    
    const touch = e.touches[0];
    const deltaY = touchStartY - touch.clientY;
    const deltaTime = Date.now() - touchStartTime;
    
    const velocity = Math.abs(deltaY) / Math.max(deltaTime, 1);
    
    if (Math.abs(deltaY) > 20 && velocity > 0.3) {
      const swipeDirection = deltaY > 0 ? 1 : -1;
      const newSpeed = Math.min(4, Math.max(0.2, 1 + velocity * swipeDirection));
      
      setMasterAnimationSpeed(newSpeed);
      
      if (speedTimeoutRef.current) {
        clearTimeout(speedTimeoutRef.current);
      }
      
      speedTimeoutRef.current = setTimeout(() => {
        const returnToNormal = () => {
          setMasterAnimationSpeed(prev => {
            const baseSpeed = 1;
            const diff = prev - baseSpeed;
            const newSpeed = prev - diff * 0.1;
            
            if (Math.abs(newSpeed - baseSpeed) < 0.05) {
              return baseSpeed;
            }
            
            requestAnimationFrame(returnToNormal);
            return newSpeed;
          });
        };
        returnToNormal();
      }, 300);
    }
  }, [touchStartY, touchStartTime, isPaused]);

  const handleTouchEnd = useCallback(() => {
    setTouchStartY(0);
    setTouchStartTime(0);
  }, []);

  const handleTouchStartForPause = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    
    pauseTimeoutRef.current = setTimeout(() => {
      setIsPaused(true);
      
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }
    }, 300);
    
    handleTouchStart(e);
  }, [handleTouchStart]);

  const handleTouchEndForPause = useCallback(() => {
    if (pauseTimeoutRef.current) {
      clearTimeout(pauseTimeoutRef.current);
    }
    
    if (isPaused) {
      setIsPaused(false);
      setMasterAnimationSpeed(1);
    }
    
    handleTouchEnd();
  }, [isPaused, handleTouchEnd]);

  useEffect(() => {
    return () => {
      if (speedTimeoutRef.current) {
        clearTimeout(speedTimeoutRef.current);
      }
      if (pauseTimeoutRef.current) {
        clearTimeout(pauseTimeoutRef.current);
      }
    };
  }, []);

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'TrendingUp': return TrendingUp;
      case 'TrendingDown': return TrendingDown;
      case 'Activity': return Activity;
      default: return Activity;
    }
  };

  // 기존 렌더링 조건들
  if ((connectionStatus.status === 'connecting' || connectionStatus.status === 'reconnecting') && isEmpty) {
    return (
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="p-4">
          <MarketTimeDisplay 
            marketStatus={marketStatus} 
            isRealtime={isRealtime}
            connectionStatus={connectionStatus}
          />
        </div>
        <div className="p-6 text-center">
          <RefreshCw className="animate-spin text-blue-400 mx-auto mb-2" size={24} />
          <div className="font-medium">실시간 데이터 로딩 중...</div>
          <div className="text-sm text-foreground/60">Top Gainers 연결 중</div>
        </div>
      </div>
    );
  }

  if (isEmpty && !marketStatus.isOpen) {
    return (
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="p-4">
          <MarketTimeDisplay 
            marketStatus={marketStatus} 
            isRealtime={isRealtime}
            connectionStatus={connectionStatus}
          />
        </div>
        <div className="p-6 text-center">
          <Activity className="mx-auto mb-2 opacity-50" size={32} />
          <div className="font-medium">장 마감</div>
          <div className="text-sm mt-1 text-foreground/60">마지막 거래 데이터 준비 중</div>
        </div>
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="p-4">
          <MarketTimeDisplay 
            marketStatus={marketStatus} 
            isRealtime={isRealtime}
            connectionStatus={connectionStatus}
          />
        </div>
        <div className="p-6 text-center">
          <Activity className="mx-auto mb-2 opacity-50" size={32} />
          <div>데이터 준비 중</div>
        </div>
      </div>
    );
  }

  // 메인 렌더링 (동기화된 룰렛)
  return (
    <div className="glass-card rounded-xl overflow-hidden">
      <div className="p-4 border-b border-white/5">
        <MarketTimeDisplay 
          marketStatus={marketStatus} 
          isRealtime={isRealtime}
          connectionStatus={connectionStatus}
        />
      </div>

      {/* 마스터 터치 컨트롤 영역 */}
      <div 
        className="p-3 relative"
        onTouchStart={handleTouchStartForPause}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEndForPause}
        style={{ touchAction: 'none' }}
      >
        {/* 마스터 스와이프 인디케이터 */}
        <div className="absolute top-1 right-1 z-20">
          <div className="text-[8px] text-white/40 flex items-center space-x-1">
            <span>↕️</span>
            <span className="font-mono">{masterAnimationSpeed.toFixed(1)}x</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {bannerConfigs.map((banner, index) => {
            const Icon = getIcon(banner.icon);
            
            return (
              <div key={index} className="flex flex-col h-32">
                <div className={`${banner.bgColor} px-2 py-1.5 rounded-t-lg border-b border-white/10 flex-shrink-0`}>
                  <div className="flex items-center justify-center space-x-1.5">
                    <Icon size={14} className={banner.color} />
                    <span className="text-xs font-medium">{banner.title}</span>
                  </div>
                </div>
                
                <div className={`flex-1 ${banner.bgColor} border-l border-r border-white/10 rounded-b-lg overflow-hidden`}>
                  <SlotReel 
                    items={banner.items}
                    color={banner.color}
                    bgColor={banner.bgColor}
                    bannerIndex={index}
                    onClick={handleBannerClick}
                    masterAnimationSpeed={masterAnimationSpeed}
                    isPaused={isPaused}
                    isMarketOpen={marketStatus.isOpen}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="px-3 py-2 border-t border-white/10 bg-white/[0.02]">
        <div className="flex items-center justify-between text-xs">
          <div className="text-foreground/60">
            스와이프: 속도조절 | 꾹 눌러서: 일시정지
          </div>
          <div className="text-foreground/50">
            {getDataSourceMessage()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TopGainersBanner;