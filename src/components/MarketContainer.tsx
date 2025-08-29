// components/MarketContainer.tsx (새로 생성)
import React, { useState } from 'react';
import EnhancedMarketTabs from './MarketPage';
import { StockDetailPage } from './MarketDetail';

const MarketContainer: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<'market' | 'detail'>('market');
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);

  const handleStockClick = (symbol: string) => {
    setSelectedSymbol(symbol);
    setCurrentPage('detail');
  };

  const handleBackToMarket = () => {
    setCurrentPage('market');
    setSelectedSymbol(null);
  };

  if (currentPage === 'detail' && selectedSymbol) {
    return (
      <StockDetailPage
        symbol={selectedSymbol}
        onBack={handleBackToMarket}
      />
    );
  }

  return (
    <EnhancedMarketTabs onStockClick={handleStockClick} />
  );
};

export default MarketContainer;