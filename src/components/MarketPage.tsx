// components/EnhancedMarketPage.tsx
// 디버깅 제거, 페이징 추가, 시장 시간 표시가 포함된 마켓 페이지

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Search, TrendingUp, TrendingDown, Star, RefreshCw, ChevronDown, Clock } from 'lucide-react';
import { 
  useMarketData, 
  useWatchlist, 
  useMarketFilter, 
  useWebSocketConnection,
  useWebSocketErrors,
  MarketItem 
} from '../hooks/useMarketData';
import { getMarketStatus, getMarketStatusText, getFormattedEasternTime, MarketSession } from '../utils/marketTime';

// ============================================================================
// 시장 시간 표시 컴포넌트
// ============================================================================

interface MarketTimeHeaderProps {
  session: MarketSession;
}

const MarketTimeHeader: React.FC<MarketTimeHeaderProps> = ({ session }) => {
  const statusInfo = getMarketStatusText(session);
  
  return (
    <div className="flex items-center justify-between text-sm mb-3">
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2">
          <Clock size={16} className="text-gray-400" />
          <span className="text-gray-400">{getFormattedEasternTime()}</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${
            statusInfo.isLive ? 'bg-green-400 animate-pulse' : 'bg-gray-400'
          }`} />
          <span className={`${statusInfo.color} font-medium`}>
            미국 증시 {statusInfo.status}
          </span>
          {statusInfo.time && (
            <span className="text-gray-400 text-xs">
              ({statusInfo.time})
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 향상된 마켓 아이템 카드
// ============================================================================

interface EnhancedMarketItemCardProps {
  item: MarketItem;
  isInWatchlist: boolean;
  onToggleWatchlist: (symbol: string) => void;
  isMarketOpen: boolean;
}

const EnhancedMarketItemCard: React.FC<EnhancedMarketItemCardProps> = ({ 
  item, 
  isInWatchlist, 
  onToggleWatchlist,
  isMarketOpen
}) => {
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
    <div className="glass-card rounded-xl p-4 transition-all duration-300 hover:scale-[1.02] cursor-pointer relative">
      {/* 데이터 타입 및 상태 표시 */}
      <div className="absolute top-2 right-2 flex items-center space-x-1">
        {item.type === 'stock' && !isMarketOpen && (
          <div className="text-xs text-gray-400 bg-black/20 px-1 rounded">
            종가
          </div>
        )}
      </div>

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
// 메인 EnhancedMarketPage 컴포넌트
// ============================================================================

const EnhancedMarketPage: React.FC = () => {
  // =========================================================================
  // 상태 관리
  // =========================================================================
  
  const {
    allMarketData,
    overallStatus,
    isEmpty
  } = useMarketData();

  const { watchlist, toggleWatchlist, isInWatchlist, count: watchlistCount } = useWatchlist();
  const { reconnectAll } = useWebSocketConnection();
  const { hasErrors, latestError, clearErrors } = useWebSocketErrors();

  // 시장 상태
  const [marketSession, setMarketSession] = useState<MarketSession>(getMarketStatus());

  // 페이징 상태
  const [displayCount, setDisplayCount] = useState(20); // 초기 20개 (crypto 10개 + stock 10개)
  const [sortBy, setSortBy] = useState<'price' | 'volume' | 'realtime'>('price');
  const [filterType, setFilterType] = useState<'all' | 'crypto' | 'stock'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // 시장 상태 업데이트 (1분마다)
  useEffect(() => {
    const interval = setInterval(() => {
      setMarketSession(getMarketStatus());
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  // =========================================================================
  // 데이터 처리 및 정렬
  // =========================================================================

  // 검색 필터링
  const searchFilteredData = useMemo(() => {
    if (!searchQuery.trim()) return allMarketData;
    
    const query = searchQuery.toLowerCase();
    return allMarketData.filter(item => 
      item.name.toLowerCase().includes(query) ||
      item.symbol.toLowerCase().includes(query)
    );
  }, [allMarketData, searchQuery]);

  // 타입 필터링
  const typeFilteredData = useMemo(() => {
    if (filterType === 'all') return searchFilteredData;
    return searchFilteredData.filter(item => item.type === filterType);
  }, [searchFilteredData, filterType]);

  // 정렬 및 교차 배치
  const sortedAndInterleavedData = useMemo(() => {
    // 먼저 각 타입별로 분리
    const cryptoData = typeFilteredData.filter(item => item.type === 'crypto');
    const stockData = typeFilteredData.filter(item => item.type === 'stock');

    // 각각 정렬
    const sortFunction = (a: MarketItem, b: MarketItem) => {
      switch (sortBy) {
        case 'price':
          return b.price - a.price; // 높은 가격 순
        case 'volume':
          // volume이 문자열이므로 숫자로 변환하여 비교
          const aVol = parseFloat(a.volume.replace(/[^\d.-]/g, '')) || 0;
          const bVol = parseFloat(b.volume.replace(/[^\d.-]/g, '')) || 0;
          return bVol - aVol; // 높은 거래량 순
        case 'realtime':
          // 최근 변동이 있었던 것부터 (임시로 changePercent 절댓값 기준)
          return Math.abs(b.changePercent) - Math.abs(a.changePercent);
        default:
          return b.price - a.price;
      }
    };

    cryptoData.sort(sortFunction);
    stockData.sort(sortFunction);

    // 타입 필터가 설정된 경우 해당 타입만 반환
    if (filterType === 'crypto') return cryptoData;
    if (filterType === 'stock') return stockData;

    // 교차 배치 (crypto 1개, stock 1개 순서로)
    const interleavedData: MarketItem[] = [];
    const maxLength = Math.max(cryptoData.length, stockData.length);

    for (let i = 0; i < maxLength; i++) {
      if (cryptoData[i]) interleavedData.push(cryptoData[i]);
      if (stockData[i]) interleavedData.push(stockData[i]);
    }

    return interleavedData;
  }, [typeFilteredData, sortBy, filterType]);

  // 현재 표시할 데이터 (페이징)
  const displayedData = useMemo(() => {
    return sortedAndInterleavedData.slice(0, displayCount);
  }, [sortedAndInterleavedData, displayCount]);

  // 관심종목 데이터
  const watchlistItems = useMemo(() => {
    return allMarketData.filter(item => watchlist.includes(item.symbol));
  }, [allMarketData, watchlist]);

  // =========================================================================
  // 이벤트 핸들러
  // =========================================================================

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setDisplayCount(20); // 검색 시 처음부터 다시 시작
  }, []);

  const handleFilterChange = useCallback((type: 'all' | 'crypto' | 'stock') => {
    setFilterType(type);
    setDisplayCount(20); // 필터 변경 시 처음부터 다시 시작
  }, []);

  const handleSortChange = useCallback((sort: 'price' | 'volume' | 'realtime') => {
    setSortBy(sort);
    setDisplayCount(20); // 정렬 변경 시 처음부터 다시 시작
  }, []);

  const handleLoadMore = useCallback(() => {
    setDisplayCount(prev => prev + 20);
  }, []);

  const handleToggleWatchlist = useCallback((symbol: string) => {
    toggleWatchlist(symbol);
  }, [toggleWatchlist]);

  const handleReconnect = useCallback(() => {
    reconnectAll();
  }, [reconnectAll]);

  const resetFilters = useCallback(() => {
    setSearchQuery('');
    setFilterType('all');
    setSortBy('price');
    setDisplayCount(20);
  }, []);

  // =========================================================================
  // 로딩 및 에러 상태 확인
  // =========================================================================

  const hasMoreData = displayCount < sortedAndInterleavedData.length;
  const isLoading = overallStatus === 'connecting' || overallStatus === 'reconnecting';

  // =========================================================================
  // 렌더링
  // =========================================================================

  return (
    <div className="space-y-6">
      {/* 페이지 헤더 */}
      <div className="glass-card rounded-2xl p-6">
        <div className="mb-4">
          {/* 시장 시간 표시 */}
          <MarketTimeHeader session={marketSession} />
          
          <h2 className="text-2xl font-bold mb-3 flex items-center">
            📈 실시간 마켓
            {!isEmpty && (
              <span className="ml-3 text-sm font-normal text-foreground/70">
                총 {sortedAndInterleavedData.length}개 종목
              </span>
            )}
          </h2>
          
          <p className="text-base text-foreground/80 leading-relaxed">
            암호화폐와 미국 주식의 {marketSession.isOpen ? '실시간' : '최종'} 시세를 확인하고, 관심있는 종목을 저장해보세요.
          </p>
        </div>

        {/* 검색 */}
        <div className="glass rounded-xl p-3 flex items-center space-x-3 mb-4">
          <Search size={20} className="text-foreground/60" />
          <input 
            type="text" 
            placeholder="주식, 코인, 기업명을 검색하세요..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="flex-1 bg-transparent placeholder-foreground/50 outline-none"
          />
        </div>

        {/* 에러 알림 */}
        {hasErrors && latestError && (
          <div className="mt-3 p-3 glass rounded-xl border border-red-500/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
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
            {watchlistItems.slice(0, 6).map((item) => (
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

      {/* 필터 및 정렬 */}
      <div className="flex flex-wrap items-center gap-2">
        {/* 타입 필터 */}
        {[
          { key: "all", label: "전체" },
          { key: "stock", label: "주식" },
          { key: "crypto", label: "암호화폐" }
        ].map((filterOption) => (
          <button
            key={filterOption.key}
            onClick={() => handleFilterChange(filterOption.key as any)}
            className={`px-4 py-2 rounded-lg text-sm transition-all ${
              filterType === filterOption.key
                ? "bg-primary/20 text-primary border border-primary/30"
                : "bg-white/10 text-foreground/70 hover:bg-white/20"
            }`}
          >
            {filterOption.label}
          </button>
        ))}
        
        <div className="flex-1"></div>
        
        {/* 정렬 옵션 */}
        {[
          { key: "price", label: "현재가순" },
          { key: "volume", label: "거래량순" },
          { key: "realtime", label: "실시간순" }
        ].map((sortOption) => (
          <button
            key={sortOption.key}
            onClick={() => handleSortChange(sortOption.key as any)}
            className={`px-3 py-2 rounded-lg text-sm transition-all ${
              sortBy === sortOption.key
                ? "bg-blue-500/20 text-blue-400"
                : "bg-white/10 text-foreground/60 hover:bg-white/20"
            }`}
          >
            {sortOption.label}
          </button>
        ))}

        {/* 필터 리셋 */}
        {(searchQuery || filterType !== 'all' || sortBy !== 'price') && (
          <button
            onClick={resetFilters}
            className="px-3 py-2 rounded-lg text-sm bg-gray-500/20 text-gray-400 hover:bg-gray-500/30"
          >
            초기화
          </button>
        )}
      </div>

      {/* 시장 데이터 리스트 */}
      <div className="space-y-2">
        {isEmpty ? (
          <div className="text-center py-12 text-foreground/60">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <RefreshCw className={`opacity-50 ${isLoading ? 'animate-spin' : ''}`} size={24} />
              <span>{isLoading ? '실시간 데이터 로딩 중...' : '데이터를 가져오는 중...'}</span>
            </div>
            <p className="text-sm">
              {marketSession.isOpen ? 'WebSocket 연결을 통해 최신 시세를 가져오고 있습니다.' : '마지막 거래 데이터를 불러오고 있습니다.'}
            </p>
            {!marketSession.isOpen && (
              <p className="text-xs text-blue-400 mt-2">
                {marketSession.timeUntilNext}
              </p>
            )}
          </div>
        ) : displayedData.length === 0 ? (
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
            <div className="flex items-center justify-between text-sm text-foreground/60 mb-2">
              <span>
                {displayedData.length}개 종목 표시 중 
                {displayedData.length < sortedAndInterleavedData.length && 
                  ` (총 ${sortedAndInterleavedData.length}개)`
                }
              </span>
              <span className="text-xs">
                {marketSession.isOpen ? '실시간 업데이트' : '최종 거래가 기준'}
              </span>
            </div>
            
            {/* 마켓 아이템들 */}
            {displayedData.map((item) => (
              <EnhancedMarketItemCard
                key={`${item.type}-${item.symbol}`}
                item={item}
                isInWatchlist={isInWatchlist(item.symbol)}
                onToggleWatchlist={handleToggleWatchlist}
                isMarketOpen={marketSession.isOpen}
              />
            ))}

            {/* 더보기 버튼 */}
            {hasMoreData && (
              <div className="text-center pt-4">
                <button
                  onClick={handleLoadMore}
                  className="flex items-center space-x-2 mx-auto px-6 py-3 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors"
                >
                  <span>더보기</span>
                  <ChevronDown size={16} />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* 하단 정보 */}
      {!isEmpty && (
        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center justify-between text-sm text-foreground/60">
            <div className="flex items-center space-x-4">
              <span className="flex items-center space-x-1">
                <div className={`w-2 h-2 rounded-full ${
                  marketSession.isOpen ? 'bg-green-400 animate-pulse' : 'bg-gray-400'
                }`} />
                <span>{marketSession.isOpen ? '실시간 업데이트' : '최종 거래가'}</span>
              </span>
              <span>📊 {sortedAndInterleavedData.length}개 종목</span>
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

export default EnhancedMarketPage;