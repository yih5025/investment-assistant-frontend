// components/OptimizedMarketPage.tsx
// 최적화된 마켓 페이지 - services와 hooks로 완전 분리

import React, { useState, useCallback } from 'react';
import { Search, TrendingUp, TrendingDown, Star, Wifi, WifiOff, AlertCircle, RefreshCw } from 'lucide-react';
import { 
  useMarketData, 
  useWatchlist, 
  useMarketFilter, 
  useWebSocketConnection,
  useWebSocketErrors,
  MarketItem 
} from '../hooks/useMarketData';

// ============================================================================
// 서브 컴포넌트들
// ============================================================================

interface ConnectionStatusProps {
  status: string;
  onReconnect: () => void;
}

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ status, onReconnect }) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'connected':
        return {
          icon: <Wifi className="text-green-400" size={16} />,
          text: '실시간 연결',
          color: 'text-green-400'
        };
      case 'connecting':
      case 'reconnecting':
        return {
          icon: <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-400"></div>,
          text: '연결 중...',
          color: 'text-yellow-400'
        };
      default:
        return {
          icon: <WifiOff className="text-red-400" size={16} />,
          text: '연결 끊김',
          color: 'text-red-400'
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div className="flex items-center space-x-2">
      {config.icon}
      <span className={`text-xs ${config.color}`}>{config.text}</span>
      {status === 'disconnected' && (
        <button
          onClick={onReconnect}
          className="ml-2 text-xs text-blue-400 hover:text-blue-300 underline"
        >
          재연결
        </button>
      )}
    </div>
  );
};

interface MarketItemCardProps {
  item: MarketItem;
  isInWatchlist: boolean;
  onToggleWatchlist: (symbol: string) => void;
}

const MarketItemCard: React.FC<MarketItemCardProps> = ({ item, isInWatchlist, onToggleWatchlist }) => {
  const formatPrice = (price: number, type: string): string => {
    if (type === 'crypto') {
      if (price >= 1000000) return `₩${(price / 1000000).toFixed(1)}M`;
      if (price >= 1000) return `₩${price.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}`;
      return `₩${price.toFixed(2)}`;
    } else {
      return `$${price.toFixed(2)}`;
    }
  };

  return (
    <div className="glass-card rounded-xl p-4 transition-all duration-300 hover:scale-[1.02] cursor-pointer">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-1">
            <span className="font-semibold">{item.symbol}</span>
            <span className={`text-xs px-2 py-1 rounded-md ${
              item.type === "stock" 
                ? "bg-blue-500/20 text-blue-300" 
                : "bg-orange-500/20 text-orange-300"
            }`}>
              {item.type === "stock" ? "주식" : "코인"}
            </span>
            {isInWatchlist && (
              <Star size={14} className="text-yellow-400 fill-current" />
            )}
          </div>
          <p className="text-sm text-foreground/70 truncate">{item.name}</p>
          <p className="text-xs text-foreground/50 mt-1">거래량: {item.volume}</p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="text-right">
            <div className="text-lg font-semibold mb-1">
              {formatPrice(item.price, item.type)}
            </div>
            <div className={`flex items-center justify-end space-x-1 ${
              item.change >= 0 ? "text-green-400" : "text-red-400"
            }`}>
              {item.change >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              <span className="text-sm">
                {item.change >= 0 ? "+" : ""}{formatPrice(Math.abs(item.change), item.type)}
              </span>
              <span className="text-xs">
                ({item.changePercent >= 0 ? "+" : ""}{item.changePercent.toFixed(2)}%)
              </span>
            </div>
          </div>

          {/* 관심 종목 토글 버튼 */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleWatchlist(item.symbol);
            }}
            className={`p-2 rounded-lg transition-colors ${
              isInWatchlist 
                ? "bg-yellow-400/20 text-yellow-400 hover:bg-yellow-400/30" 
                : "bg-white/10 text-foreground/60 hover:bg-yellow-400/20 hover:text-yellow-400"
            }`}
          >
            <Star size={16} className={isInWatchlist ? "fill-current" : ""} />
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 메인 컴포넌트
// ============================================================================

const OptimizedMarketPage: React.FC = () => {
  // =========================================================================
  // 상태 관리 (모든 로직이 hooks로 분리됨)
  // =========================================================================
  
  const {
    allMarketData,
    connectionStatuses,
    overallStatus,
    isEmpty,
    cryptoCount,
    stockCount,
    totalCount
  } = useMarketData();

  const { watchlist, toggleWatchlist, isInWatchlist, count: watchlistCount } = useWatchlist();
  
  const [filterType, setFilterType] = useState<'all' | 'crypto' | 'stock'>('all');
  const { 
    filters, 
    filteredData, 
    updateSearch, 
    updateType, 
    updateSort,
    resetFilters,
    resultCount 
  } = useMarketFilter(allMarketData, { type: filterType });

  const { reconnectAll } = useWebSocketConnection();
  const { errors, hasErrors, latestError, clearErrors } = useWebSocketErrors();

  // =========================================================================
  // 이벤트 핸들러들
  // =========================================================================

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    updateSearch(e.target.value);
  }, [updateSearch]);

  const handleFilterChange = useCallback((type: 'all' | 'crypto' | 'stock') => {
    setFilterType(type);
    updateType(type);
  }, [updateType]);

  const handleReconnect = useCallback(() => {
    reconnectAll();
  }, [reconnectAll]);

  const handleToggleWatchlist = useCallback((symbol: string) => {
    toggleWatchlist(symbol);
  }, [toggleWatchlist]);

  // 관심종목에서 사용할 데이터 필터링
  const watchlistItems = allMarketData.filter(item => watchlist.includes(item.symbol));

  // =========================================================================
  // 렌더링
  // =========================================================================

  return (
    <div className="space-y-6">
      {/* 페이지 헤더 */}
      <div className="glass-card rounded-2xl p-6">
        <div className="mb-4">
          <h2 className="text-2xl font-bold mb-3 flex items-center">
            📈 실시간 마켓
            {totalCount > 0 && (
              <span className="ml-3 text-sm font-normal text-foreground/70">
                총 {totalCount}개 종목
              </span>
            )}
          </h2>
          
          <p className="text-base text-foreground/80 leading-relaxed">
            암호화폐와 미국 주식의 실시간 시세를 확인하고, 관심있는 종목을 저장해보세요.
          </p>
        </div>

        {/* 검색 및 연결 상태 */}
        <div className="glass rounded-xl p-3 flex items-center space-x-3 mb-4">
          <Search size={20} className="text-foreground/60" />
          <input 
            type="text" 
            placeholder="주식, 코인, 기업명을 검색하세요..."
            value={filters.search}
            onChange={handleSearchChange}
            className="flex-1 bg-transparent placeholder-foreground/50 outline-none"
          />
        </div>
        
        {/* 상태 정보 */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-foreground/60">
            암호화폐 {cryptoCount}개 • 주식 {stockCount}개
          </div>
          <ConnectionStatus status={overallStatus} onReconnect={handleReconnect} />
        </div>

        {/* 에러 알림 */}
        {hasErrors && latestError && (
          <div className="mt-3 p-3 glass rounded-xl border border-red-500/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <AlertCircle className="text-red-400" size={16} />
                <span className="text-sm font-medium text-red-400">연결 문제 발생</span>
              </div>
              <button
                onClick={clearErrors}
                className="text-xs text-red-400 hover:text-red-300 underline"
              >
                닫기
              </button>
            </div>
            <p className="text-xs text-foreground/70 mt-1">
              {latestError.error} ({latestError.type})
            </p>
          </div>
        )}
      </div>

      {/* 관심 종목 */}
      {watchlistCount > 0 && (
        <div className="glass-card rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium flex items-center">
              <Star className="mr-2 text-yellow-400" size={18} />
              내 관심 종목
            </h3>
            <span className="text-xs text-foreground/60">{watchlistCount}개</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {watchlistItems.map((item) => (
              <button
                key={item.symbol}
                className="glass rounded-lg p-2 text-center hover:glass-strong transition-all"
              >
                <div className="text-sm font-medium">{item.symbol}</div>
                <div className={`text-xs ${item.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {item.change >= 0 ? '+' : ''}{item.changePercent.toFixed(2)}%
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 필터 버튼 */}
      <div className="flex space-x-2">
        {[
          { key: "all", label: "전체" },
          { key: "stock", label: "주식" },
          { key: "crypto", label: "암호화폐" }
        ].map((filterOption) => (
          <button
            key={filterOption.key}
            onClick={() => handleFilterChange(filterOption.key as any)}
            className={`px-4 py-2 rounded-lg text-sm transition-all ${
              filters.type === filterOption.key
                ? "bg-primary/20 text-primary border border-primary/30"
                : "bg-white/10 text-foreground/70 hover:bg-white/20"
            }`}
          >
            {filterOption.label}
          </button>
        ))}
        
        {/* 정렬 옵션 */}
        <div className="flex-1"></div>
        <button
          onClick={() => updateSort('changePercent')}
          className={`px-3 py-2 rounded-lg text-sm transition-all ${
            filters.sortBy === 'changePercent'
              ? "bg-blue-500/20 text-blue-400"
              : "bg-white/10 text-foreground/60 hover:bg-white/20"
          }`}
        >
          변동률순
        </button>
        <button
          onClick={() => updateSort('volume')}
          className={`px-3 py-2 rounded-lg text-sm transition-all ${
            filters.sortBy === 'volume'
              ? "bg-blue-500/20 text-blue-400"
              : "bg-white/10 text-foreground/60 hover:bg-white/20"
          }`}
        >
          거래량순
        </button>
      </div>

      {/* 시장 데이터 리스트 */}
      <div className="space-y-2">
        {isEmpty ? (
          <div className="text-center py-12 text-foreground/60">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <RefreshCw className="animate-spin opacity-50" size={24} />
              <span>실시간 데이터 로딩 중...</span>
            </div>
            <p className="text-sm">WebSocket 연결을 통해 최신 시세를 가져오고 있습니다.</p>
          </div>
        ) : filteredData.length === 0 ? (
          <div className="text-center py-8 text-foreground/60">
            <Search size={48} className="mx-auto mb-4 opacity-50" />
            <p>검색 결과가 없습니다</p>
            <button
              onClick={resetFilters}
              className="mt-2 text-sm text-blue-400 hover:text-blue-300 underline"
            >
              필터 초기화
            </button>
          </div>
        ) : (
          <>
            {/* 결과 요약 */}
            <div className="text-sm text-foreground/60 mb-2">
              {resultCount}개 종목 표시 중
            </div>
            
            {/* 마켓 아이템들 */}
            {filteredData.map((item) => (
              <MarketItemCard
                key={`${item.type}-${item.symbol}`}
                item={item}
                isInWatchlist={isInWatchlist(item.symbol)}
                onToggleWatchlist={handleToggleWatchlist}
              />
            ))}
          </>
        )}
      </div>

      {/* 하단 정보 */}
      {totalCount > 0 && (
        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center justify-between text-sm text-foreground/60">
            <div className="flex items-center space-x-4">
              <span className="flex items-center space-x-1">
                <Wifi size={14} className="text-green-400" />
                <span>실시간 업데이트</span>
              </span>
              <span>📊 {totalCount}개 종목</span>
              <span>⭐ {watchlistCount}개 관심종목</span>
            </div>
            <div className="text-xs text-foreground/50">
              마지막 업데이트: {new Date().toLocaleTimeString('ko-KR')}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OptimizedMarketPage;