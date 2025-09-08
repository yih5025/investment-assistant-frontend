// components/MarketPage.tsx
// 클릭 이벤트가 추가된 탭 기반 마켓 페이지

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Search, TrendingUp, TrendingDown, Star, Clock, BarChart3, Coins } from 'lucide-react';
import { useMarketData } from '../hooks/useMarketData';

interface MarketPageProps {
  onStockClick?: (symbol: string) => void;
  onCryptoClick?: (symbol: string) => void;
}

type TabType = 'crypto' | 'stocks';

const MarketPage: React.FC<MarketPageProps> = ({ onStockClick, onCryptoClick }) => {
  const [activeTab, setActiveTab] = useState<TabType>('stocks');
  
  const {
    allMarketData,
    cryptoData,
    sp500Data,
    overallStatus,
    isEmpty,
    refreshData
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
          <BarChart3 className="mr-2" size={24} />
          S&P 500 & Crypto Currency
        </h2>
        <div className="text-sm text-foreground/70 leading-relaxed">
          {activeTab === 'stocks' ? (
            <p>
              S&P 500 기업들의 실시간 주가 데이터를 확인하고, 각 기업의 상세 정보와 재무 상태를 분석할 수 있습니다.<br />
              관심 있는 주식을 클릭하여 심층적인 투자 정보를 확인해보세요.
            </p>
          ) : (
            <p>
              주요 암호화폐의 실시간 가격 데이터를 모니터링하고, 각 코인의 프로젝트 정보와 기술적 분석을 확인할 수 있습니다.<br />
              24시간 실시간 거래되는 암호화폐 시장의 동향을 파악해보세요.
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
            <span>Crypto Currencies</span>
          </div>
        </button>
      </div>

      {/* 탭 콘텐츠 */}
      {activeTab === 'stocks' ? (
        <StockMarketTab 
          stockData={sp500Data}
          onStockClick={handleStockClick}
        />
      ) : (
        <CryptoMarketTab 
          cryptoData={cryptoData}
          onCryptoClick={handleCryptoClick}
        />
      )}
    </div>
  );
};

// 미국 주식 탭 컴포넌트
interface StockMarketTabProps {
  stockData: any[];
  onStockClick: (symbol: string) => void;
}

const StockMarketTab: React.FC<StockMarketTabProps> = ({ stockData, onStockClick }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'price' | 'change' | 'volume'>('change');
  const [displayCount, setDisplayCount] = useState(100); // 초기 100개 표시

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

  // 현재 표시할 데이터
  const displayedStocks = filteredAndSortedStocks.slice(0, displayCount);
  const hasMore = displayCount < filteredAndSortedStocks.length;

  const handleLoadMore = () => {
    setDisplayCount(prev => prev + 100);
  };

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
        {displayedStocks.map((stock) => (
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

      {/* 더보기 버튼 */}
      {hasMore && (
        <div className="text-center pt-4">
          <button
            onClick={handleLoadMore}
            className="flex items-center space-x-2 mx-auto px-6 py-3 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors"
          >
            <span>더보기</span>
          </button>
        </div>
      )}
    </div>
  );
};

// 암호화폐 탭 컴포넌트
interface CryptoMarketTabProps {
  cryptoData: any[];
  onCryptoClick?: (symbol: string) => void;
}

const CryptoMarketTab: React.FC<CryptoMarketTabProps> = ({ cryptoData, onCryptoClick }) => {
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

export default MarketPage;