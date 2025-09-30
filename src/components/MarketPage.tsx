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
    getETFPaginationState,
    ensureETFInitialized
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
      <div className="glass-card rounded-2xl p-6">
        <h2 className="text-2xl font-bold mb-4 flex items-center">
          {activeTab === 'stocks' ? (
            <>
              <BarChart3 size={24} className="mr-3 text-blue-400" />
              📊 미국 대표 주식 시장
            </>
          ) : activeTab === 'crypto' ? (
            <>
              <Coins size={24} className="mr-3 text-orange-400" />
              🪙 암호화폐 시장
            </>
          ) : (
            <>
              <PieChart size={24} className="mr-3 text-green-400" />
              📈 ETF 시장
            </>
          )}
        </h2>
        
        <div className="space-y-4">
          {activeTab === 'stocks' ? (
            <>
              <p className="text-base text-foreground/80 leading-relaxed">
                S&P 500은 미국 증권거래소에 상장된 500개 주요 기업의 주가를 추적하는 대표 지수예요. 
                애플, 마이크로소프트, 엔비디아 같은 대기업부터 다양한 산업의 기업들이 포함되어 있습니다.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="glass rounded-xl p-4">
                  <h3 className="font-semibold mb-2 text-blue-400 flex items-center">
                    <BarChart3 size={16} className="mr-2" />
                    이런 걸 확인할 수 있어요
                  </h3>
                  <ul className="text-sm text-foreground/70 space-y-1">
                    <li>• <span className="font-medium">실시간 주가</span> - 시장이 열려있는 동안 계속 업데이트돼요</li>
                    <li>• <span className="font-medium">기업 정보</span> - 회사가 어떤 사업을 하는지 알 수 있어요</li>
                    <li>• <span className="font-medium">재무 상태</span> - 회사가 건강한지 분석해드려요</li>
                  </ul>
                </div>
                
                <div className="glass rounded-xl p-4">
                  <h3 className="font-semibold mb-2 text-primary flex items-center">
                    <TrendingUp size={16} className="mr-2" />
                    이렇게 활용하세요
                  </h3>
                  <ul className="text-sm text-foreground/70 space-y-1">
                    <li>• <span className="font-medium">관심 종목 탐색</span> - 마음에 드는 기업을 찾아보세요</li>
                    <li>• <span className="font-medium">가격 변동 확인</span> - 오늘 얼마나 올랐는지 내렸는지 확인해요</li>
                    <li>• <span className="font-medium">상세 정보 보기</span> - 종목을 클릭하면 더 많은 정보를 볼 수 있어요</li>
                  </ul>
                </div>
              </div>
            </>
          ) : activeTab === 'crypto' ? (
            <>
              <p className="text-base text-foreground/80 leading-relaxed">
                암호화폐는 블록체인 기술을 기반으로 한 디지털 자산이에요. 
                비트코인, 이더리움 같은 주요 코인부터 다양한 프로젝트의 코인들을 확인할 수 있습니다.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="glass rounded-xl p-4">
                  <h3 className="font-semibold mb-2 text-orange-400 flex items-center">
                    <Coins size={16} className="mr-2" />
                    이런 걸 확인할 수 있어요
                  </h3>
                  <ul className="text-sm text-foreground/70 space-y-1">
                    <li>• <span className="font-medium">실시간 시세</span> - 24시간 쉬지 않고 거래돼요</li>
                    <li>• <span className="font-medium">프로젝트 정보</span> - 이 코인이 어떤 목적으로 만들어졌는지</li>
                    <li>• <span className="font-medium">가격 변동</span> - 24시간 동안 얼마나 변했는지 확인해요</li>
                  </ul>
                </div>
                
                <div className="glass rounded-xl p-4">
                  <h3 className="font-semibold mb-2 text-primary flex items-center">
                    <Clock size={16} className="mr-2" />
                    이렇게 활용하세요
                  </h3>
                  <ul className="text-sm text-foreground/70 space-y-1">
                    <li>• <span className="font-medium">시세 비교</span> - 여러 코인의 가격을 한눈에 비교해요</li>
                    <li>• <span className="font-medium">거래량 확인</span> - 많이 거래되는 코인을 찾아보세요</li>
                    <li>• <span className="font-medium">상세 분석</span> - 코인을 클릭하면 기술 분석을 볼 수 있어요</li>
                  </ul>
                </div>
              </div>
              
              <div className="glass rounded-xl p-4 border border-green-500/30">
                <div className="flex items-start space-x-3">
                  <div className="text-green-400 mt-0.5">⏰</div>
                  <div>
                    <h4 className="font-semibold text-green-400 mb-1">24시간 거래</h4>
                    <p className="text-sm text-foreground/70">
                      주식과 달리 암호화폐는 주말에도, 밤에도 계속 거래돼요. 
                      전 세계 시장이 항상 열려있기 때문이에요!
                    </p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <p className="text-base text-foreground/80 leading-relaxed">
                ETF(상장지수펀드)는 여러 종목에 한 번에 투자할 수 있는 펀드 상품이에요. 
                개별 주식을 사는 것보다 위험을 분산할 수 있어서 초보 투자자에게 인기가 많습니다.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="glass rounded-xl p-4">
                  <h3 className="font-semibold mb-2 text-green-400 flex items-center">
                    <PieChart size={16} className="mr-2" />
                    이런 걸 확인할 수 있어요
                  </h3>
                  <ul className="text-sm text-foreground/70 space-y-1">
                    <li>• <span className="font-medium">실시간 가격</span> - ETF의 현재 가격을 확인해요</li>
                    <li>• <span className="font-medium">보유 종목</span> - 어떤 회사 주식들로 구성되었는지</li>
                    <li>• <span className="font-medium">섹터 구성</span> - 기술주, 금융주 등 어떤 업종에 투자하는지</li>
                  </ul>
                </div>
                
                <div className="glass rounded-xl p-4">
                  <h3 className="font-semibold mb-2 text-primary flex items-center">
                    <TrendingUp size={16} className="mr-2" />
                    이렇게 활용하세요
                  </h3>
                  <ul className="text-sm text-foreground/70 space-y-1">
                    <li>• <span className="font-medium">분산 투자</span> - 한 번에 여러 종목에 투자할 수 있어요</li>
                    <li>• <span className="font-medium">테마 투자</span> - IT, 에너지 등 원하는 분야에 투자하세요</li>
                    <li>• <span className="font-medium">포트폴리오 구성</span> - ETF를 클릭해서 구성을 분석해보세요</li>
                  </ul>
                </div>
              </div>
              
              <div className="glass rounded-xl p-4 border border-amber-500/30">
                <div className="flex items-start space-x-3">
                  <div className="text-amber-400 mt-0.5">💡</div>
                  <div>
                    <h4 className="font-semibold text-amber-400 mb-1">투자 초보에게 좋은 이유</h4>
                    <p className="text-sm text-foreground/70">
                      개별 주식은 한 회사에만 투자하지만, ETF는 여러 회사에 나눠서 투자해요. 
                      한 회사가 안 좋아도 다른 회사가 잘되면 손실을 줄일 수 있어요!
                    </p>
                  </div>
                </div>
              </div>
            </>
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
          onClick={() => {
            setActiveTab('etf');
            ensureETFInitialized(); // ETF 탭 클릭 시 즉시 초기화
          }}
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
  const [sortBy, setSortBy] = useState<'price' | 'change' | 'volume'>('price'); // 기본값을 주가순으로 변경
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
        message="S&P 500 주식 정보를 불러오고 있는 중이에요"
        subMessage="실시간 데이터를 가져오고 있어요, 10초 정도 걸려요!"
      />
    );
  }

  // 데이터가 없을 때
  if (stockData.length === 0) {
    return (
      <div className="glass-card rounded-xl p-8 text-center">
        <BarChart3 size={48} className="mx-auto mb-4 text-foreground/30" />
        <h3 className="text-lg font-medium mb-2">주식 데이터를 불러오지 못 했습니다.</h3>
        <p className="text-sm text-foreground/70 mb-4">
          연결 상태: {connectionStatus}
        </p>
        <p className="text-xs text-foreground/50">
          서버와 연결 중이에요, 잠시 후 다시 시도해주세요.
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
            placeholder="애플, AAPL 같은 회사명이나, 심볼을 입력하세요"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent placeholder-foreground/50 outline-none"
          />
        </div>

        {/* 정렬 옵션 */}
        <div className="flex space-x-2">
          {[
            { key: 'price', label: '주가순' },
            { key: 'change', label: '변동률순' },
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
                  <span>불러오는 중...</span>
                </>
              ) : (
                <>
                  <span>+ 50개 더보기</span>
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
  const [sortBy, setSortBy] = useState<'price' | 'change' | 'volume'>('price'); // 기본값을 가격순으로 변경
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
        message="암호화폐 데이터를 불러오고 있는 중이에요"
        subMessage="실시간 데이터를 가져오고 있어요, 10초 정도 걸려요!"
      />
    );
  }

  // 데이터가 없을 때
  if (cryptoData.length === 0) {
    return (
      <div className="glass-card rounded-xl p-8 text-center">
        <Coins size={48} className="mx-auto mb-4 text-foreground/30" />
        <h3 className="text-lg font-medium mb-2">암호화폐 데이터를 불러오지 못 했습니다.</h3>
        <p className="text-sm text-foreground/70 mb-4">
          연결 상태: {connectionStatus}
        </p>
        <p className="text-xs text-foreground/50">
          서버와 연결 중이에요, 잠시 후 다시 시도해주세요.
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
            placeholder="비트코인, BTC 같은 코인명이나, 심볼을 입력하세요"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent placeholder-foreground/50 outline-none"
          />
        </div>

        <div className="flex space-x-2">
          {[
            { key: 'price', label: '가격순' },
            { key: 'change', label: '변동률순' },
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
            <span>+ 50개 더보기</span>
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
        message="ETF 정보를 불러오는 중이에요"
        subMessage="실시간 데이터를 가져오고 있어요, 10초 정도 걸려요!"
      />
    );
  }

  // 데이터가 없을 때
  if (etfData.length === 0) {
    return (
      <div className="glass-card rounded-xl p-8 text-center">
        <PieChart size={48} className="mx-auto mb-4 text-foreground/30" />
        <h3 className="text-lg font-medium mb-2">ETF 데이터를 불러오지 못 했습니다.</h3>
        <p className="text-sm text-foreground/70 mb-4">
          연결 상태: {connectionStatus}
        </p>
        <p className="text-xs text-foreground/50">
          서버와 연결 중이에요, 잠시 후 다시 시도해주세요.
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
            placeholder="QQQ, SPY 같은 ETF 심볼을 입력하세요"
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
                  <span>불러오는 중...</span>
                </>
              ) : (
                <>
                  <span>+ 50개 더보기</span>
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