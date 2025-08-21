// components/OptimizedMarketPage.tsx
// 디버깅 기능이 추가된 최적화된 마켓 페이지

import React, { useState, useCallback } from 'react';
import { Search, TrendingUp, TrendingDown, Star, Wifi, WifiOff, AlertCircle, RefreshCw, Bug, Settings } from 'lucide-react';
import { 
  useMarketData, 
  useWatchlist, 
  useMarketFilter, 
  useWebSocketConnection,
  useWebSocketErrors,
  MarketItem 
} from '../hooks/useMarketData';

// 🎯 디버깅 훅 추가
import { useDebugConsole, debugUtils } from '../hooks/useEnhancedWebSocketDebug';

// ============================================================================
// 서브 컴포넌트들
// ============================================================================

interface ConnectionStatusProps {
  status: string;
  onReconnect: () => void;
  debugData?: any; // 🎯 디버깅 데이터 추가
  showDebugInfo?: boolean; // 🎯 디버깅 정보 표시 여부
}

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ 
  status, 
  onReconnect, 
  debugData,
  showDebugInfo = false 
}) => {
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
      
      {/* 🎯 디버깅 정보 추가 표시 */}
      {showDebugInfo && debugData && (
        <div className="flex items-center space-x-2 ml-2 text-xs text-gray-500">
          <span>•</span>
          <span>{debugData.connectionRatio}</span>
          <span>•</span>
          <span>{debugData.totalMessages}/min</span>
          {debugData.activeAlerts > 0 && (
            <>
              <span>•</span>
              <span className="text-red-400">{debugData.activeAlerts} 알림</span>
            </>
          )}
        </div>
      )}
      
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
  debugInfo?: { // 🎯 디버깅 정보 추가
    messageRate?: number;
    lastUpdate?: Date;
    connectionStatus?: string;
  };
  showDebugInfo?: boolean; // 🎯 디버깅 정보 표시 여부
}

const MarketItemCard: React.FC<MarketItemCardProps> = ({ 
  item, 
  isInWatchlist, 
  onToggleWatchlist,
  debugInfo, // 🎯 디버깅 정보 추가
  showDebugInfo = false // 🎯 디버깅 정보 표시 여부
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
      {/* 🎯 디버깅 인디케이터 추가 */}
      {showDebugInfo && debugInfo && (
        <div className="absolute top-2 right-2 flex items-center space-x-1">
          <div className={`w-2 h-2 rounded-full ${
            debugInfo.connectionStatus === 'connected' ? 'bg-green-400' :
            debugInfo.connectionStatus === 'connecting' ? 'bg-yellow-400' :
            'bg-red-400'
          }`} title={`연결 상태: ${debugInfo.connectionStatus}`} />
          {debugInfo.messageRate && debugInfo.messageRate > 0 && (
            <span className="text-xs text-green-400 font-mono">
              {debugInfo.messageRate.toFixed(1)}/min
            </span>
          )}
        </div>
      )}

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
          <div className="flex items-center space-x-2 mt-1">
            <p className="text-xs text-foreground/50">거래량: {item.volume}</p>
            {/* 🎯 디버깅 정보 표시 */}
            {showDebugInfo && debugInfo?.lastUpdate && (
              <span className="text-xs text-gray-400">
                • 업데이트: {debugUtils.formatTimeDiff(debugInfo.lastUpdate)}
              </span>
            )}
          </div>
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

// 🎯 플로팅 디버깅 대시보드 컴포넌트 추가
const FloatingDebugDashboard: React.FC = () => {
  const {
    monitoringStatus,
    healthStatus,
    alerts,
    executeCommand,
    runQuickDiagnosis,
    simulateMessage,
    clearAlerts
  } = useDebugConsole();

  const [isVisible, setIsVisible] = useState(false);
  const [consoleInput, setConsoleInput] = useState('');

  const handleConsoleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (consoleInput.trim()) {
      executeCommand(consoleInput);
      setConsoleInput('');
    }
  };

  const getStatusBadgeClass = (status: string) => {
    const baseClass = "px-2 py-1 rounded-full text-xs font-medium ";
    switch (status) {
      case 'healthy':
      case 'connected':
        return baseClass + "bg-green-100 text-green-800";
      case 'warning':
      case 'connecting':
        return baseClass + "bg-yellow-100 text-yellow-800";
      case 'critical':
      case 'disconnected':
        return baseClass + "bg-red-100 text-red-800";
      default:
        return baseClass + "bg-gray-100 text-gray-800";
    }
  };

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 z-50 bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition-colors"
        title="디버그 대시보드 열기"
      >
        <Bug size={20} />
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-white rounded-lg shadow-2xl border w-80 max-h-96 overflow-hidden">
      {/* 헤더 */}
      <div className="bg-gray-50 px-4 py-2 border-b flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Bug size={16} className="text-blue-600" />
          <h3 className="font-semibold text-gray-900">WebSocket Debug</h3>
        </div>
        <div className="flex items-center space-x-2">
          <span className={getStatusBadgeClass(monitoringStatus.overallHealth)}>
            {debugUtils.getHealthEmoji(monitoringStatus.overallHealth as any)} {monitoringStatus.overallHealth}
          </span>
          <button
            onClick={() => setIsVisible(false)}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>
      </div>

      {/* 빠른 상태 */}
      <div className="p-3 bg-gray-50 border-b">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-gray-500">연결:</span>
            <span className="ml-1 font-medium">{monitoringStatus.connectionRatio}</span>
          </div>
          <div>
            <span className="text-gray-500">메시지:</span>
            <span className="ml-1 font-medium">{monitoringStatus.totalMessages}/min</span>
          </div>
          <div>
            <span className="text-gray-500">성능:</span>
            <span className="ml-1 font-medium">{monitoringStatus.performanceGrade}등급</span>
          </div>
          <div>
            <span className="text-gray-500">알림:</span>
            <span className="ml-1 font-medium text-red-600">{monitoringStatus.activeAlerts}</span>
          </div>
        </div>
      </div>

      {/* 연결 상태 세부사항 */}
      <div className="p-3 max-h-32 overflow-y-auto">
        <h4 className="font-medium text-sm mb-2">연결 상태</h4>
        <div className="space-y-1">
          {(['crypto', 'sp500', 'topgainers'] as const).map(type => {
            const detail = healthStatus.details[type];
            return (
              <div key={type} className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  <span className={getStatusBadgeClass(detail?.status || 'unknown')}>
                    {type}
                  </span>
                  <span className="text-gray-500">
                    {detail?.messageRate?.toFixed(1) || '0'}/min
                  </span>
                </div>
                <div className="flex space-x-1">
                  <button
                    onClick={() => simulateMessage(type, `${type}_update`)}
                    className="text-blue-500 hover:text-blue-700"
                    title="테스트 메시지 전송"
                  >
                    🧪
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 알림 */}
      {alerts.length > 0 && (
        <div className="p-3 border-t bg-yellow-50">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-sm text-yellow-800">알림 ({alerts.length})</h4>
            <button
              onClick={clearAlerts}
              className="text-xs text-yellow-600 hover:text-yellow-800"
            >
              모두 지우기
            </button>
          </div>
          <div className="space-y-1 max-h-16 overflow-y-auto">
            {alerts.slice(-2).map(alert => (
              <div key={alert.id} className="p-1 rounded text-xs bg-yellow-100 text-yellow-800">
                <span className="font-medium">{alert.type}:</span> {alert.message}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 빠른 액션 */}
      <div className="p-3 border-t bg-gray-50">
        <div className="flex space-x-1 mb-2">
          <button
            onClick={runQuickDiagnosis}
            className="flex-1 px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            🔍 빠른진단
          </button>
          <button
            onClick={() => executeCommand('reconnect all')}
            className="flex-1 px-2 py-1 text-xs bg-orange-500 text-white rounded hover:bg-orange-600"
          >
            🔄 재연결
          </button>
        </div>
        
        {/* 콘솔 입력 */}
        <form onSubmit={handleConsoleSubmit} className="flex space-x-1">
          <input
            type="text"
            value={consoleInput}
            onChange={(e) => setConsoleInput(e.target.value)}
            placeholder="명령어 (help 입력)"
            className="flex-1 px-2 py-1 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            실행
          </button>
        </form>
      </div>
    </div>
  );
};

// ============================================================================
// 메인 컴포넌트
// ============================================================================

const OptimizedMarketPage: React.FC = () => {
  // =========================================================================
  // 상태 관리 (기존 로직 유지)
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

  // 🎯 디버깅 관련 상태 추가
  const { monitoringStatus, messageActivity } = useDebugConsole();
  const [showDebugInfo, setShowDebugInfo] = useState(false);

  // =========================================================================
  // 이벤트 핸들러들 (기존 로직 유지)
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

  // 🎯 디버깅 토글 핸들러 추가
  const toggleDebugMode = useCallback(() => {
    setShowDebugInfo(prev => !prev);
  }, []);

  // 관심종목에서 사용할 데이터 필터링 (기존 로직 유지)
  const watchlistItems = allMarketData.filter(item => watchlist.includes(item.symbol));

  // 🎯 디버깅 정보 매핑 함수 추가
  const getDebugInfoForItem = (item: MarketItem) => {
    const type = item.type === 'crypto' ? 'crypto' : 
                 item.type === 'stock' ? 'sp500' : 'topgainers';
    const activity = messageActivity[type];
    
    return {
      messageRate: activity?.messageRate || 0,
      lastUpdate: activity?.lastActivity || undefined,
      connectionStatus: connectionStatuses[type] || 'disconnected'
    };
  };

  // =========================================================================
  // 렌더링 (기존 구조 유지하되 디버깅 기능 추가)
  // =========================================================================

  return (
    <div className="space-y-6">
      {/* 페이지 헤더 */}
      <div className="glass-card rounded-2xl p-6">
        <div className="mb-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold mb-3 flex items-center">
              📈 실시간 마켓
              {totalCount > 0 && (
                <span className="ml-3 text-sm font-normal text-foreground/70">
                  총 {totalCount}개 종목
                </span>
              )}
              {/* 🎯 디버그 모드 표시 추가 */}
              {showDebugInfo && (
                <span className="ml-3 text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded">
                  DEBUG MODE
                </span>
              )}
            </h2>
            
            {/* 🎯 디버그 모드 토글 버튼 추가 */}
            <button
              onClick={toggleDebugMode}
              className={`p-2 rounded-lg transition-colors ${
                showDebugInfo 
                  ? 'bg-blue-500/20 text-blue-400' 
                  : 'bg-gray-500/20 text-gray-400 hover:bg-gray-500/30'
              }`}
              title="디버그 정보 토글"
            >
              <Settings size={16} />
            </button>
          </div>
          
          <p className="text-base text-foreground/80 leading-relaxed">
            암호화폐와 미국 주식의 실시간 시세를 확인하고, 관심있는 종목을 저장해보세요.
            {/* 🎯 디버그 모드 설명 추가 */}
            {showDebugInfo && (
              <span className="block text-sm text-blue-400 mt-1">
                디버그 모드: 연결 상태, 메시지 레이트, 업데이트 시간 등의 상세 정보가 표시됩니다.
              </span>
            )}
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
            {/* 🎯 디버깅 정보 추가 표시 */}
            {showDebugInfo && (
              <span className="ml-2 text-blue-400">
                • 성능 {monitoringStatus.performanceGrade}등급 
                • {monitoringStatus.totalMessages} msg/min
              </span>
            )}
          </div>
          <ConnectionStatus 
            status={overallStatus} 
            onReconnect={handleReconnect}
            debugData={monitoringStatus} // 🎯 디버깅 데이터 전달
            showDebugInfo={showDebugInfo} // 🎯 디버깅 표시 여부 전달
          />
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
            {watchlistItems.map((item) => {
              const debugInfo = showDebugInfo ? getDebugInfoForItem(item) : undefined; // 🎯 디버깅 정보 추가
              return (
                <button
                  key={item.symbol}
                  className="glass rounded-lg p-2 text-center hover:glass-strong transition-all relative"
                >
                  {/* 🎯 디버깅 인디케이터 추가 */}
                  {showDebugInfo && debugInfo && (
                    <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-green-400"></div>
                  )}
                  <div className="text-sm font-medium">{item.symbol}</div>
                  <div className={`text-xs ${item.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {item.change >= 0 ? '+' : ''}{item.changePercent.toFixed(2)}%
                  </div>
                  {/* 🎯 디버깅 정보 표시 */}
                  {showDebugInfo && debugInfo && (
                    <div className="text-xs text-gray-400 mt-1">
                      {debugInfo.messageRate.toFixed(1)}/min
                    </div>
                  )}
                </button>
              );
            })}
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
            {/* 🎯 디버깅 정보 추가 */}
            {showDebugInfo && (
              <div className="mt-4 text-xs text-blue-400">
                <p>디버그: {monitoringStatus.connectionRatio} 연결 • {monitoringStatus.totalMessages} msg/min</p>
              </div>
            )}
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
            <div className="flex items-center justify-between text-sm text-foreground/60 mb-2">
              <span>{resultCount}개 종목 표시 중</span>
              {/* 🎯 디버깅 정보 추가 표시 */}
              {showDebugInfo && (
                <span className="text-blue-400">
                  디버그: 실시간 업데이트 활성화 • 성능 {monitoringStatus.performanceGrade}등급
                </span>
              )}
            </div>
            
            {/* 마켓 아이템들 */}
            {filteredData.map((item) => {
              const debugInfo = showDebugInfo ? getDebugInfoForItem(item) : undefined; // 🎯 디버깅 정보 추가
              
              return (
                <MarketItemCard
                  key={`${item.type}-${item.symbol}`}
                  item={item}
                  isInWatchlist={isInWatchlist(item.symbol)}
                  onToggleWatchlist={handleToggleWatchlist}
                  debugInfo={debugInfo} // 🎯 디버깅 정보 전달
                  showDebugInfo={showDebugInfo} // 🎯 디버깅 표시 여부 전달
                />
              );
            })}
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
              {/* 🎯 디버깅 정보 추가 */}
              {showDebugInfo && (
                <>
                  <span>🔧 디버그모드</span>
                  <span>📈 {monitoringStatus.performanceGrade}등급</span>
                  <span>⚡ {monitoringStatus.totalMessages}/min</span>
                </>
              )}
            </div>
            <div className="text-xs text-foreground/50">
              마지막 업데이트: {new Date().toLocaleTimeString('ko-KR')}
              {/* 🎯 디버깅 정보 추가 */}
              {showDebugInfo && (
                <span className="ml-2 text-blue-400">
                  • 업타임: {monitoringStatus.uptime}m
                </span>
              )}
            </div>
          </div>
          
          {/* 🎯 디버그 모드 추가 상세 정보 */}
          {showDebugInfo && (
            <div className="mt-3 pt-3 border-t border-white/10">
              <div className="grid grid-cols-3 gap-4 text-xs">
                <div>
                  <div className="text-gray-400 mb-1">연결 상태</div>
                  <div className="space-y-1">
                    {Object.entries(connectionStatuses).map(([type, status]) => (
                      <div key={type} className="flex items-center justify-between">
                        <span className="capitalize">{type}:</span>
                        <span className={`px-2 py-1 rounded ${
                          status === 'connected' ? 'bg-green-500/20 text-green-400' :
                          status === 'connecting' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-red-500/20 text-red-400'
                        }`}>
                          {status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div>
                  <div className="text-gray-400 mb-1">메시지 레이트</div>
                  <div className="space-y-1">
                    {Object.entries(messageActivity).map(([type, activity]) => (
                      <div key={type} className="flex items-center justify-between">
                        <span className="capitalize">{type}:</span>
                        <span className="text-blue-400">
                          {activity?.messageRate.toFixed(1) || '0'}/min
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div>
                  <div className="text-gray-400 mb-1">마지막 업데이트</div>
                  <div className="space-y-1">
                    {Object.entries(messageActivity).map(([type, activity]) => (
                      <div key={type} className="flex items-center justify-between">
                        <span className="capitalize">{type}:</span>
                        <span className="text-gray-300">
                          {activity?.lastActivity 
                            ? debugUtils.formatTimeDiff(activity.lastActivity)
                            : 'Never'
                          }
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              {/* 디버그 액션 버튼들 */}
              <div className="flex items-center justify-center space-x-2 mt-3 pt-3 border-t border-white/10">
                <button
                  onClick={() => console.log('WebSocket Status:', { connectionStatuses, messageActivity, monitoringStatus })}
                  className="px-3 py-1 text-xs bg-blue-500/20 text-blue-400 rounded hover:bg-blue-500/30"
                >
                  콘솔 로그
                </button>
                <button
                  onClick={handleReconnect}
                  className="px-3 py-1 text-xs bg-orange-500/20 text-orange-400 rounded hover:bg-orange-500/30"
                >
                  전체 재연결
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 🎯 플로팅 디버그 대시보드 추가 */}
      <FloatingDebugDashboard />
    </div>
  );
};

export default OptimizedMarketPage;