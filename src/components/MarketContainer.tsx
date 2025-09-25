// components/MarketContainer.tsx (새로 생성)
import React, { useState } from 'react';
import MarketPage from './MarketPage';
import { MarketDetailPage } from './SP500Detail';

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
      <MarketDetailPage
        symbol={selectedSymbol}
        onBack={handleBackToMarket}
      />
    );
  }

  return (
    <MarketPage onStockClick={handleStockClick} />
  );
};

export default MarketContainer;