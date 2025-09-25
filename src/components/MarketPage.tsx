// components/MarketPage.tsx
// 로딩 UI가 추가된 탭 기반 마켓 페이지

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Search, TrendingUp, TrendingDown, Star, Clock, BarChart3, Coins, Loader2, PieChart } from 'lucide-react';
import { useMarketData } from '../hooks/useMarketData';

interface MarketPageProps {
  onStockClick?: (symbol: string) => void;
  onCryptoClick?: (symbol: string) => void;
  onETFClick?: (symbol: string) => void;
}

type TabType = 'crypto' | 'stocks' | 'etf';

// 로딩 스켈레톤 컴포넌트 (MarketDetailPage와 동일한 스타일)
const LoadingSkeleton = ({ count = 8 }: { count?: number }) => (
  <div className="space-y-2">
    {Array.from({ length: count }).map((_, index) => (
      <div key={index} className="animate-pulse">
        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <div className="h-6 bg-gray-700 rounded w-16"></div>
                <div className="h-5 bg-gray-700 rounded w-12"></div>
              </div>
              <div className="h-4 bg-gray-700 rounded w-32 mb-2"></div>
              <div className="h-3 bg-gray-700 rounded w-24"></div>
            </div>
            <div className="text-right">
              <div className="h-7 bg-gray-700 rounded w-20 mb-2"></div>
              <div className="h-4 bg-gray-700 rounded w-16"></div>
            </div>
          </div>
        </div>
      </div>
    ))}
  </div>
);

// 로딩 상태 컴포넌트
const LoadingState = ({ message, subMessage }: { message: string; subMessage?: string }) => (
  <div className="space-y-4">
    <div className="flex items-center justify-center py-12">
      <div className="text-center">
        <Loader2 className="animate-spin mx-auto mb-4" size={32} />
        <h3 className="text-lg font-medium mb-2">{message}</h3>
        {subMessage && (
          <p className="text-sm text-foreground/70">{subMessage}</p>
        )}
      </div>
    </div>
    <LoadingSkeleton count={6} />
  </div>
);

const MarketPage: React.FC<MarketPageProps> = ({ onStockClick, onCryptoClick, onETFClick }) => {
  const [activeTab, setActiveTab] = useState<TabType>('stocks');
  
  const {
    allMarketData,
    cryptoData,
    sp500Data,
    etfData,
    overallStatus,
    isEmpty,
    refreshData,
    loadMoreSP500,
    getSP500PaginationState,
    loadMoreETF,
    getETFPaginationState
  } = useMarketData();

  // 주식 클릭 핸들러
  const handleStockClick = useCallback((symbol: string) => {
    if (onStockClick) {
      onStockClick(symbol);
    }
  }, [onStockClick]);

  // 암호화폐 클릭 핸들러
  const handleCryptoClick = useCallback((symbol: string) => {
    if (onCryptoClick) {
      onCryptoClick(symbol);
    }
  }, [onCryptoClick]);

  // ETF 클릭 핸들러
  const handleETFClick = useCallback((symbol: string) => {
    if (onETFClick) {
      onETFClick(symbol);
    }
  }, [onETFClick]);

  // 페이지 마운트 시 연결 상태 확인 (재연결 방지)
  useEffect(() => {
    console.log('📊 MarketPage 마운트 - 연결 상태 확인');
    
    // WebSocket 서비스가 초기화되지 않은 경우에만 새로고침
    const status = overallStatus;
    const hasData = !isEmpty;
    
    if (status === 'disconnected' || (!hasData && status !== 'connecting')) {
      console.log('🔄 연결 또는 데이터 없음 - 새로고침 필요');
      refreshData();
    } else {
      console.log('✅ 이미 연결되고 데이터 있음 - 새로고침 불필요');
    }
  }, []); // 🎯 빈 의존성 배열로 변경 - 마운트 시 한번만 실행

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="glass-card rounded-2xl p-4">
        <h2 className="text-xl font-bold mb-3 flex items-center">
          <BarChart3 className="mr-2" size={22} />
          실시간 SP500 & Crypto & ETF 데이터 분석
        </h2>
        <div className="text-sm text-foreground/70 leading-relaxed">
        {activeTab === 'stocks' ? (
          <p>
            S&P 500(스탠더드 앤드 푸어스 500)은 미국 증권거래소에 상장된 500개의 대형 기업의 주가 성과를 추적하는 대표적인 주가 지수입니다.<br />
            S&P 500 기업들의 실시간 주가 데이터를 확인하고, 각 기업의 상세 정보와 재무 상태를 분석할 수 있습니다.<br />
            관심 있는 주식을 클릭하여 심층적인 투자 정보를 확인해보세요.
          </p>
        ) : activeTab === 'crypto' ? (
          <p>
            암호화폐(Cryptocurrency)는 블록체인 기술을 기반으로 한 디지털 자산으로, 암호학적 보안 기술을 통해 거래의 안전성을 보장합니다.<br />
            주요 암호화폐의 실시간 가격 데이터를 확인하고, 각 코인의 프로젝트 정보와 기술 분석을 확인할 수 있습니다.<br />
            24시간 실시간 거래되는 암호화폐 시장의 동향을 파악하고 투자 기회를 모색해보세요.
          </p>
        ) : (
          <p>
            ETF(Exchange Traded Fund, 상장지수펀드)는 특정 지수 또는 자산군의 수익률을 추종하는 인덱스 펀드로, 거래소에서 주식처럼 실시간 거래가 가능합니다.<br />
            주요 ETF의 실시간 가격 데이터를 확인하고, 각 ETF의 섹터별 구성 비중과 주요 보유종목을 분석할 수 있습니다.<br />
            관심 있는 ETF를 클릭하여 상세 페이지에서 펀드 정보, 보유종목 구성, 운용 수수료 등의 투자 정보를 확인해보세요.
          </p>
        )}
        </div>
      </div>

      {/* 탭 네비게이션 */}
      <div className="flex space-x-1 glass-card rounded-xl p-1">
        <button
          onClick={() => setActiveTab('stocks')}
          className={`flex-1 py-3 px-4 rounded-lg transition-all text-sm font-medium ${
            activeTab === 'stocks' 
              ? 'glass-strong text-primary' 
              : 'text-foreground/70 hover:text-foreground'
          }`}
        >
          <div className="flex items-center justify-center space-x-2">
            <BarChart3 size={16} />
            <span>S&P 500</span>
          </div>
        </button>
        
        <button
          onClick={() => setActiveTab('crypto')}
          className={`flex-1 py-3 px-4 rounded-lg transition-all text-sm font-medium ${
            activeTab === 'crypto' 
              ? 'glass-strong text-primary' 
              : 'text-foreground/70 hover:text-foreground'
          }`}
        >
          <div className="flex items-center justify-center space-x-2">
            <Coins size={16} />
            <span>Crypto</span>
          </div>
        </button>
        
        <button
          onClick={() => setActiveTab('etf')}
          className={`flex-1 py-3 px-4 rounded-lg transition-all text-sm font-medium ${
            activeTab === 'etf' 
              ? 'glass-strong text-primary' 
              : 'text-foreground/70 hover:text-foreground'
          }`}
        >
          <div className="flex items-center justify-center space-x-2">
            <PieChart size={16} />
            <span>ETF</span>
          </div>
        </button>
      </div>

      {/* 탭 콘텐츠 */}
      {activeTab === 'stocks' ? (
        <StockMarketTab 
          stockData={sp500Data}
          onStockClick={handleStockClick}
          isLoading={overallStatus === 'connecting' || overallStatus === 'reconnecting' || (isEmpty && overallStatus === 'disconnected')}
          connectionStatus={overallStatus}
          loadMoreSP500={loadMoreSP500}
          getSP500PaginationState={getSP500PaginationState}
        />
      ) : activeTab === 'crypto' ? (
        <CryptoMarketTab 
          cryptoData={cryptoData}
          onCryptoClick={handleCryptoClick}
          isLoading={overallStatus === 'connecting' || overallStatus === 'reconnecting' || (isEmpty && overallStatus === 'disconnected')}
          connectionStatus={overallStatus}
        />
      ) : (
        <ETFMarketTab 
          etfData={etfData}
          onETFClick={handleETFClick}
          isLoading={overallStatus === 'connecting' || overallStatus === 'reconnecting' || (isEmpty && overallStatus === 'disconnected')}
          connectionStatus={overallStatus}
          loadMoreETF={loadMoreETF}
          getETFPaginationState={getETFPaginationState}
        />
      )}
    </div>
  );
};

// 미국 주식 탭 컴포넌트
interface StockMarketTabProps {
  stockData: any[];
  onStockClick: (symbol: string) => void;
  isLoading?: boolean;
  connectionStatus?: string;
  loadMoreSP500?: () => Promise<boolean>;
  getSP500PaginationState?: () => any;
}

const StockMarketTab: React.FC<StockMarketTabProps> = ({ 
  stockData, 
  onStockClick, 
  isLoading = false, 
  connectionStatus,
  loadMoreSP500,
  getSP500PaginationState
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'price' | 'change' | 'volume'>('change');
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const filteredAndSortedStocks = useMemo(() => {
    let result = stockData;

    // 검색 필터링
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(stock => 
        stock.symbol.toLowerCase().includes(query) ||
        (stock.name && stock.name.toLowerCase().includes(query))
      );
    }

    // 정렬
    result.sort((a, b) => {
      switch (sortBy) {
        case 'price':
          return b.price - a.price;
        case 'change':
          return Math.abs(b.changePercent) - Math.abs(a.changePercent);
        case 'volume':
          const aVol = parseFloat(a.volume.replace(/[^\d.-]/g, '')) || 0;
          const bVol = parseFloat(b.volume.replace(/[^\d.-]/g, '')) || 0;
          return bVol - aVol;
        default:
          return 0;
      }
    });

    return result;
  }, [stockData, searchQuery, sortBy]);

  // 페이징 상태 조회
  const paginationState = getSP500PaginationState ? getSP500PaginationState() : {
    hasMore: false,
    isLoading: false,
    currentCount: stockData.length,
    totalCount: stockData.length
  };

  // 더보기 핸들러
  const handleLoadMore = async () => {
    if (!loadMoreSP500 || isLoadingMore || !paginationState.hasMore) {
      return;
    }

    setIsLoadingMore(true);
    try {
      const success = await loadMoreSP500();
      if (success) {
        console.log('✅ SP500 더보기 로드 성공');
      } else {
        console.log('⚠️ SP500 더보기 로드 실패 또는 더 이상 데이터 없음');
      }
    } catch (error) {
      console.error('❌ SP500 더보기 로드 오류:', error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  // 로딩 상태일 때
  if (isLoading) {
    return (
      <LoadingState 
        message="S&P 500 데이터 로딩 중"
        subMessage="실시간 주식 데이터를 가져오고 있습니다. 잠시만 기다려주세요."
      />
    );
  }

  // 데이터가 없을 때
  if (stockData.length === 0) {
    return (
      <div className="glass-card rounded-xl p-8 text-center">
        <BarChart3 size={48} className="mx-auto mb-4 text-foreground/30" />
        <h3 className="text-lg font-medium mb-2">주식 데이터 없음</h3>
        <p className="text-sm text-foreground/70 mb-4">
          연결 상태: {connectionStatus}
        </p>
        <p className="text-xs text-foreground/50">
          데이터 연결에 문제가 있을 수 있습니다. 잠시 후 다시 시도해주세요.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 검색 및 필터 */}
      <div className="glass-card rounded-xl p-4 space-y-4">
        {/* 검색 */}
        <div className="glass rounded-xl p-2.5 flex items-center space-x-3">
          <Search size={20} className="text-foreground/60" />
          <input 
            type="text" 
            placeholder="티커, 기업명 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent placeholder-foreground/50 outline-none"
          />
        </div>

        {/* 정렬 옵션 */}
        <div className="flex space-x-2">
          {[
            { key: 'change', label: '변동률순' },
            { key: 'price', label: '주가순' },
            { key: 'volume', label: '거래량순' }
          ].map((option) => (
            <button
              key={option.key}
              onClick={() => setSortBy(option.key as any)}
              className={`px-3 py-2 rounded-lg text-sm transition-all ${
                sortBy === option.key
                  ? 'bg-blue-500/20 text-blue-400'
                  : 'bg-white/10 text-foreground/60 hover:bg-white/20'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* 주식 리스트 */}
      <div className="space-y-2">
        {filteredAndSortedStocks.map((stock) => (
          <div
            key={stock.symbol}
            onClick={() => onStockClick(stock.symbol)}
            className="glass-card rounded-xl p-4 transition-all duration-300 hover:scale-[1.02] cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="font-semibold text-lg">{stock.symbol}</span>
                  <span className="text-xs px-2 py-1 rounded-md bg-blue-500/20 text-blue-300">
                    주식
                  </span>
                </div>
                <p className="text-sm text-foreground/70 truncate">
                  {stock.name || `${stock.symbol} Inc.`}
                </p>
                <p className="text-xs text-foreground/50 mt-1">거래량: {stock.volume}</p>
              </div>

              <div className="text-right">
                <div className="text-xl font-semibold mb-1">
                  ${stock.price.toFixed(2)}
                </div>
                <div className={`flex items-center justify-end space-x-1 ${
                  stock.changePercent >= 0 ? "text-green-400" : "text-red-400"
                }`}>
                  {stock.changePercent >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                  <span className="text-sm">
                    {stock.changePercent >= 0 ? "+" : ""}{stock.change.toFixed(2)}
                  </span>
                  <span className="text-xs">
                    ({stock.changePercent >= 0 ? "+" : ""}{stock.changePercent.toFixed(2)}%)
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 페이징 정보 및 더보기 버튼 */}
      <div className="space-y-4 pt-4">
        {/* 페이징 정보 */}
        <div className="text-center text-sm text-foreground/60">
          {searchQuery ? (
            `검색 결과: ${filteredAndSortedStocks.length}개`
          ) : (
            `표시 중: ${paginationState.currentCount}개 ${paginationState.totalCount > paginationState.currentCount ? `/ 전체 ${paginationState.totalCount}개` : ''}`
          )}
        </div>

        {/* 더보기 버튼 - 검색 중이 아니고 더 가져올 데이터가 있을 때만 표시 */}
        {!searchQuery && paginationState.hasMore && (
          <div className="text-center">
            <button
              onClick={handleLoadMore}
              disabled={isLoadingMore || paginationState.isLoading}
              className="flex items-center space-x-2 mx-auto px-6 py-3 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoadingMore || paginationState.isLoading ? (
                <>
                  <Loader2 className="animate-spin" size={16} />
                  <span>로딩 중...</span>
                </>
              ) : (
                <>
                  <span>더보기 (+50개)</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// 암호화폐 탭 컴포넌트
interface CryptoMarketTabProps {
  cryptoData: any[];
  onCryptoClick?: (symbol: string) => void;
  isLoading?: boolean;
  connectionStatus?: string;
}

const CryptoMarketTab: React.FC<CryptoMarketTabProps> = ({ 
  cryptoData, 
  onCryptoClick, 
  isLoading = false, 
  connectionStatus 
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'price' | 'change' | 'volume'>('change');
  const [displayCount, setDisplayCount] = useState(100); // 초기 100개 표시

  const filteredAndSortedCrypto = useMemo(() => {
    let result = cryptoData;

    // 검색 필터링
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(crypto => 
        crypto.symbol.toLowerCase().includes(query) ||
        crypto.name.toLowerCase().includes(query)
      );
    }

    // 정렬
    result.sort((a, b) => {
      switch (sortBy) {
        case 'price':
          return b.price - a.price;
        case 'change':
          return Math.abs(b.changePercent) - Math.abs(a.changePercent);
        case 'volume':
          const aVol = parseFloat(a.volume.replace(/[^\d.-]/g, '')) || 0;
          const bVol = parseFloat(b.volume.replace(/[^\d.-]/g, '')) || 0;
          return bVol - aVol;
        default:
          return 0;
      }
    });

    return result;
  }, [cryptoData, searchQuery, sortBy]);

  // 현재 표시할 데이터
  const displayedCrypto = filteredAndSortedCrypto.slice(0, displayCount);
  const hasMore = displayCount < filteredAndSortedCrypto.length;

  const handleLoadMore = () => {
    setDisplayCount(prev => prev + 100);
  };

  // 로딩 상태일 때
  if (isLoading) {
    return (
      <LoadingState 
        message="암호화폐 데이터 로딩 중"
        subMessage="실시간 암호화폐 데이터를 가져오고 있습니다. 잠시만 기다려주세요."
      />
    );
  }

  // 데이터가 없을 때
  if (cryptoData.length === 0) {
    return (
      <div className="glass-card rounded-xl p-8 text-center">
        <Coins size={48} className="mx-auto mb-4 text-foreground/30" />
        <h3 className="text-lg font-medium mb-2">암호화폐 데이터 없음</h3>
        <p className="text-sm text-foreground/70 mb-4">
          연결 상태: {connectionStatus}
        </p>
        <p className="text-xs text-foreground/50">
          데이터 연결에 문제가 있을 수 있습니다. 잠시 후 다시 시도해주세요.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 24시간 거래 안내 */}
      <div className="glass-card rounded-xl p-3 flex items-center justify-center space-x-2 bg-green-500/5 border border-green-500/20">
        <Clock size={16} className="text-green-400" />
        <span className="text-sm text-green-400">24시간 실시간 거래</span>
      </div>

      {/* 검색 및 필터 */}
      <div className="glass-card rounded-xl p-4 space-y-4">
        <div className="glass rounded-xl p-2.5 flex items-center space-x-3">
          <Search size={20} className="text-foreground/60" />
          <input 
            type="text" 
            placeholder="코인명, 심볼 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent placeholder-foreground/50 outline-none"
          />
        </div>

        <div className="flex space-x-2">
          {[
            { key: 'change', label: '변동률순' },
            { key: 'price', label: '가격순' },
            { key: 'volume', label: '거래량순' }
          ].map((option) => (
            <button
              key={option.key}
              onClick={() => setSortBy(option.key as any)}
              className={`px-3 py-2 rounded-lg text-sm transition-all ${
                sortBy === option.key
                  ? 'bg-orange-500/20 text-orange-400'
                  : 'bg-white/10 text-foreground/60 hover:bg-white/20'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* 암호화폐 리스트 */}
      <div className="space-y-2">
        {displayedCrypto.map((crypto) => (
          <div
            key={crypto.symbol}
            onClick={() => onCryptoClick?.(crypto.symbol)}
            className="glass-card rounded-xl p-4 transition-all duration-300 hover:scale-[1.01] cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="font-semibold text-lg">{crypto.symbol}</span>
                  <span className="text-xs px-2 py-1 rounded-md bg-orange-500/20 text-orange-300">
                    코인
                  </span>
                </div>
                <p className="text-sm text-foreground/70 truncate">{crypto.name}</p>
                <p className="text-xs text-foreground/50 mt-1">24h 거래량: {crypto.volume}</p>
              </div>

              <div className="text-right">
                <div className="text-xl font-semibold mb-1">
                  ₩{crypto.price >= 1000 
                    ? crypto.price.toLocaleString('ko-KR', { maximumFractionDigits: 0 }) 
                    : crypto.price.toFixed(2)
                  }
                </div>
                <div className={`flex items-center justify-end space-x-1 ${
                  crypto.changePercent >= 0 ? "text-green-400" : "text-red-400"
                }`}>
                  {crypto.changePercent >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                  <span className="text-sm">
                    {crypto.changePercent >= 0 ? "+" : ""}{crypto.changePercent.toFixed(2)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 더보기 버튼 */}
      {hasMore && (
        <div className="text-center pt-4">
          <button
            onClick={handleLoadMore}
            className="flex items-center space-x-2 mx-auto px-6 py-3 bg-orange-500/20 text-orange-400 rounded-lg hover:bg-orange-500/30 transition-colors"
          >
            <span>더보기</span>
          </button>
        </div>
      )}
    </div>
  );
};

// ETF 탭 컴포넌트
interface ETFMarketTabProps {
  etfData: any[];
  onETFClick: (symbol: string) => void;
  isLoading?: boolean;
  connectionStatus?: string;
  loadMoreETF?: () => Promise<boolean>;
  getETFPaginationState?: () => any;
}

const ETFMarketTab: React.FC<ETFMarketTabProps> = ({ 
  etfData, 
  onETFClick, 
  isLoading = false, 
  connectionStatus,
  loadMoreETF,
  getETFPaginationState
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'price' | 'change' | 'volume'>('price');
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const filteredAndSortedETFs = useMemo(() => {
    let result = etfData;

    // 검색 필터링 (심볼만)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(etf => 
        etf.symbol.toLowerCase().includes(query)
      );
    }

    // 정렬 (기본: 주가 내림차순)
    result.sort((a, b) => {
      switch (sortBy) {
        case 'price':
          return b.price - a.price;
        case 'change':
          return Math.abs(b.changePercent) - Math.abs(a.changePercent);
        case 'volume':
          const aVol = parseFloat(a.volume.replace(/[^\d.-]/g, '')) || 0;
          const bVol = parseFloat(b.volume.replace(/[^\d.-]/g, '')) || 0;
          return bVol - aVol;
        default:
          return b.price - a.price;
      }
    });

    return result;
  }, [etfData, searchQuery, sortBy]);

  // 페이징 상태 조회
  const paginationState = getETFPaginationState ? getETFPaginationState() : {
    hasMore: false,
    isLoading: false,
    currentCount: etfData.length,
    totalCount: etfData.length
  };

  // 더보기 핸들러
  const handleLoadMore = async () => {
    if (!loadMoreETF || isLoadingMore || !paginationState.hasMore) {
      return;
    }

    setIsLoadingMore(true);
    try {
      const success = await loadMoreETF();
      if (success) {
        console.log('✅ ETF 더보기 로드 성공');
      } else {
        console.log('⚠️ ETF 더보기 로드 실패 또는 더 이상 데이터 없음');
      }
    } catch (error) {
      console.error('❌ ETF 더보기 로드 오류:', error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  // 로딩 상태일 때
  if (isLoading) {
    return (
      <LoadingState 
        message="ETF 데이터 로딩 중"
        subMessage="실시간 ETF 데이터를 가져오고 있습니다. 잠시만 기다려주세요."
      />
    );
  }

  // 데이터가 없을 때
  if (etfData.length === 0) {
    return (
      <div className="glass-card rounded-xl p-8 text-center">
        <PieChart size={48} className="mx-auto mb-4 text-foreground/30" />
        <h3 className="text-lg font-medium mb-2">ETF 데이터 없음</h3>
        <p className="text-sm text-foreground/70 mb-4">
          연결 상태: {connectionStatus}
        </p>
        <p className="text-xs text-foreground/50">
          데이터 연결에 문제가 있을 수 있습니다. 잠시 후 다시 시도해주세요.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 검색 및 필터 */}
      <div className="glass-card rounded-xl p-4 space-y-4">
        {/* 검색 */}
        <div className="glass rounded-xl p-2.5 flex items-center space-x-3">
          <Search size={20} className="text-foreground/60" />
          <input 
            type="text" 
            placeholder="ETF 심볼 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent placeholder-foreground/50 outline-none"
          />
        </div>

        {/* 정렬 옵션 */}
        <div className="flex space-x-2">
          {[
            { key: 'price', label: '주가순' },
            { key: 'volume', label: '거래량순' },
            { key: 'change', label: '변동률순' }
          ].map((option) => (
            <button
              key={option.key}
              onClick={() => setSortBy(option.key as any)}
              className={`px-3 py-2 rounded-lg text-sm transition-all ${
                sortBy === option.key
                  ? 'bg-green-500/20 text-green-400'
                  : 'bg-white/10 text-foreground/60 hover:bg-white/20'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* ETF 리스트 */}
      <div className="space-y-2">
        {filteredAndSortedETFs.map((etf) => (
          <div
            key={etf.symbol}
            onClick={() => onETFClick(etf.symbol)}
            className="glass-card rounded-xl p-4 transition-all duration-300 hover:scale-[1.02] cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="font-semibold text-lg">{etf.symbol}</span>
                  <span className="text-xs px-2 py-1 rounded-md bg-green-500/20 text-green-300">
                    ETF
                  </span>
                </div>
                <p className="text-sm text-foreground/70 truncate">
                  {etf.name || `${etf.symbol} ETF`}
                </p>
                <p className="text-xs text-foreground/50 mt-1">거래량: {etf.volume}</p>
              </div>

              <div className="text-right">
                <div className="text-xl font-semibold mb-1">
                  ${etf.price.toFixed(2)}
                </div>
                <div className={`flex items-center justify-end space-x-1 ${
                  etf.changePercent >= 0 ? "text-green-400" : "text-red-400"
                }`}>
                  {etf.changePercent >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                  <span className="text-sm">
                    {etf.changePercent >= 0 ? "+" : ""}{etf.change.toFixed(2)}
                  </span>
                  <span className="text-xs">
                    ({etf.changePercent >= 0 ? "+" : ""}{etf.changePercent.toFixed(2)}%)
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 페이징 정보 및 더보기 버튼 */}
      <div className="space-y-4 pt-4">
        {/* 페이징 정보 */}
        <div className="text-center text-sm text-foreground/60">
          {searchQuery ? (
            `검색 결과: ${filteredAndSortedETFs.length}개`
          ) : (
            `표시 중: ${paginationState.currentCount}개 ${paginationState.totalCount > paginationState.currentCount ? `/ 전체 ${paginationState.totalCount}개` : ''}`
          )}
        </div>

        {/* 더보기 버튼 - 검색 중이 아니고 더 가져올 데이터가 있을 때만 표시 */}
        {!searchQuery && paginationState.hasMore && (
          <div className="text-center">
            <button
              onClick={handleLoadMore}
              disabled={isLoadingMore || paginationState.isLoading}
              className="flex items-center space-x-2 mx-auto px-6 py-3 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoadingMore || paginationState.isLoading ? (
                <>
                  <Loader2 className="animate-spin" size={16} />
                  <span>로딩 중...</span>
                </>
              ) : (
                <>
                  <span>더보기 (+50개)</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MarketPage;