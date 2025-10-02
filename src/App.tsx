import { useState, useEffect } from "react";
import { QueryClient, QueryClientProvider } from 'react-query';
import { ReactQueryDevtools } from 'react-query/devtools';

// 최적화된 WebSocket 서비스 import
import { webSocketManager } from './services/WebSocketManager';

import { BottomNavigation } from "./components/BottomNavigation";
import EnhancedTopGainersBanner from "./components/TopGainersBanner";
import { EarningsCalendar } from "./components/EarningsCalendar";
import MarketPage from "./components/MarketPage";
import { MarketDetailPage } from "./components/SP500Detail";
import { CryptoDetailPage } from "./components/CryptoDetailPage"; // 추가
import { ETFDetailPage } from "./components/ETFDetailPage"; // ETF 상세 페이지 추가
import { NewsPage } from "./components/NewsPage"; 
import { NewsDetailPage } from "./components/NewsDetailPage";
import { NewsItem as DetailNewsItem } from "./services/newsApi";
import { SNSPage } from "./components/SNSPage";
import { SNSDetailPage } from "./components/SNSDetailPage";
import { snsApiService, type SNSPost } from "./services/SNSService";
import { HeroSection } from "./components/HeroSection";
import { CheatsheetPage } from "./components/CheatsheetPage";
import OptimizedEconomicDashboard from "./components/EconomicDashboard";
import { LoginPage } from "./components/auth/LoginPage";
import { SignupPage } from "./components/auth/SignupPage";
import { UserProfile } from "./components/user/UserProfile";
import { NotificationSystem } from "./components/notifications/NotificationSystem";
import { WelcomePage } from "./components/WelcomePage";
import { TrendingUp, MessageSquare, Newspaper, Bot, BarChart3, Bell, User, LogIn, ArrowLeft } from "lucide-react";

// ============================================================================
// React Query 클라이언트 설정
// ============================================================================

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000,
      cacheTime: 300000,
      retry: (failureCount, error) => {
        if (error && typeof error === 'object' && 'status' in error) {
          const status = (error as any).status;
          if ([404, 401, 403].includes(status)) return false;
        }
        return failureCount < 2;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      refetchInterval: 300000,
      refetchOnMount: 'always',
    },
    mutations: {
      retry: 1,
      retryDelay: 1000,
    }
  }
});

// 개발환경 디버깅
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).__REACT_QUERY_CLIENT__ = queryClient;
  (window as any).debugQueryCache = () => {
    const cache = queryClient.getQueryCache();
    console.table(
      cache.getAll().map(query => ({
        queryKey: JSON.stringify(query.queryKey),
        status: query.state.status,
        dataUpdatedAt: new Date(query.state.dataUpdatedAt).toLocaleTimeString(),
        error: query.state.error instanceof Error ? query.state.error.message : 
               query.state.error ? String(query.state.error) : 'None'
      }))
    );
  };
  (window as any).clearQueryCache = () => {
    queryClient.clear();
    //console.log('🗑️ React Query 캐시 클리어됨');
  };
}

// ============================================================================
// 타입 정의
// ============================================================================

type AuthState = "guest" | "login" | "signup" | "authenticated";
type ViewState = "welcome" | "main" | "auth" | "profile" | "sns-detail" | "stock-news" | "news-detail" | "stock-detail" | "crypto-detail" | "etf-detail" | "cheatsheet";


interface StockNewsItem {
  symbol: string;
  source: string;
  url: string;
  title: string;
  description: string;
  content: string;
  published_at: string;
  fetched_at?: string;
}

// ============================================================================
// 메인 App 컴포넌트
// ============================================================================

function AppContent() {
  const [activeTab, setActiveTab] = useState("home");
  const [authState, setAuthState] = useState<AuthState>("guest");
  const [viewState, setViewState] = useState<ViewState>(() => {
    // 첫 방문 체크 (localStorage 사용)
    const hasVisited = localStorage.getItem('wei-has-visited');
    return hasVisited ? "main" : "welcome";
  });
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedSNSPost, setSelectedSNSPost] = useState<SNSPost | null>(null);
  const [selectedStockNews, setSelectedStockNews] = useState<{ news: StockNewsItem[], symbol: string } | null>(null);
  const [selectedNewsItem, setSelectedNewsItem] = useState<DetailNewsItem | null>(null);
  const [selectedStockSymbol, setSelectedStockSymbol] = useState<string | null>(null);
  const [selectedCryptoSymbol, setSelectedCryptoSymbol] = useState<string | null>(null); // 추가
  const [selectedETFSymbol, setSelectedETFSymbol] = useState<string | null>(null); // ETF 상세 페이지용
  
  // 브라우저 히스토리 관리를 위한 상태
  const [historyStack, setHistoryStack] = useState<Array<{
    viewState: ViewState;
    activeTab: string;
    selectedData?: any;
  }>>([]);
  
  // 모의 사용자 데이터
  const [user] = useState({
    name: "김투자",
    email: "investor@wei.com",
    phone: "010-1234-5678",
    profileImage: "",
    memberSince: "2023년 3월",
    totalReturn: 12.8,
    portfolioValue: 125000
  });

  const isLoggedIn = authState === "authenticated";

  // ============================================================================
  // 브라우저 히스토리 관리
  // ============================================================================
  
  // 현재 상태를 히스토리에 푸시
  const pushToHistory = (newViewState: ViewState, newActiveTab: string, selectedData?: any) => {
    // 현재 상태를 히스토리에 추가
    const currentState = {
      viewState,
      activeTab,
      selectedData: {
        selectedSNSPost,
        selectedStockNews,
        selectedNewsItem,
        selectedStockSymbol,
        selectedCryptoSymbol,
        selectedETFSymbol
      }
    };
    
    setHistoryStack(prev => [...prev, currentState]);
    
    // 브라우저 히스토리에도 추가
    const historyState = {
      viewState: newViewState,
      activeTab: newActiveTab,
      selectedData
    };
    
    window.history.pushState(historyState, '', `#${newViewState}`);
  };

  // 브라우저 뒤로가기 처리
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (historyStack.length > 0) {
        // 히스토리 스택에서 이전 상태 복원
        const previousState = historyStack[historyStack.length - 1];
        setHistoryStack(prev => prev.slice(0, -1));
        
        setViewState(previousState.viewState);
        setActiveTab(previousState.activeTab);
        
        // 선택된 데이터 복원
        if (previousState.selectedData) {
          setSelectedSNSPost(previousState.selectedData.selectedSNSPost || null);
          setSelectedStockNews(previousState.selectedData.selectedStockNews || null);
          setSelectedNewsItem(previousState.selectedData.selectedNewsItem || null);
          setSelectedStockSymbol(previousState.selectedData.selectedStockSymbol || null);
          setSelectedCryptoSymbol(previousState.selectedData.selectedCryptoSymbol || null);
          setSelectedETFSymbol(previousState.selectedData.selectedETFSymbol || null);
        }
      } else {
        // 히스토리가 없으면 메인으로
        setViewState("main");
        setActiveTab("home");
        setSelectedSNSPost(null);
        setSelectedStockNews(null);
        setSelectedNewsItem(null);
        setSelectedStockSymbol(null);
        setSelectedCryptoSymbol(null);
        setSelectedETFSymbol(null);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [historyStack, viewState, activeTab, selectedSNSPost, selectedStockNews, selectedNewsItem, selectedStockSymbol, selectedCryptoSymbol, selectedETFSymbol]);

  // ============================================================================
  // 최적화된 WebSocket 서비스 초기화 (앱 수준 - 한 번만 실행)
  // ============================================================================
  
  useEffect(() => {
    console.log('🚀 App 시작 - WebSocket 서비스 앱 수준 초기화');
    
    // 서비스가 아직 초기화되지 않은 경우에만 초기화
    if (!webSocketManager.getStatus().initialized) {
      //console.log('🔧 WebSocket 서비스 초기화 중...');
      webSocketManager.initialize();
    } else {
      console.log('✅ WebSocket 서비스 이미 초기화됨 - 기존 연결 활용');
    }

    // 연결 상태 모니터링 (선택사항)
    const unsubscribeConnection = webSocketManager.subscribe('connection_change', ({ type, status, mode }) => {
      // console.log(`🔄 ${type} 연결 상태: ${status} (${mode} 모드)`);
    });

    // 앱 완전 종료 시에만 서비스 정리
    const handleBeforeUnload = () => {
      //console.log('🛑 브라우저/앱 종료 - WebSocket 서비스 정리');
      webSocketManager.shutdown();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      //console.log('📦 App 컴포넌트 정리 - WebSocket 연결은 유지');
      unsubscribeConnection();
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // 여기서 webSocketService.shutdown() 호출하지 않음!
      // 페이지 전환 시에도 연결 유지
    };
  }, []); // 빈 의존성 배열 - 앱 생명주기 동안 한 번만 실행

  // ============================================================================
  // 페이지 Visibility 최적화 (백그라운드/포그라운드 처리)
  // ============================================================================
  
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // console.log('📱 앱 백그라운드 이동 - 연결 유지 (최적화됨)');
        // 연결을 끊지 않고 유지
      } else {
        // console.log('📱 앱 포그라운드 복귀');
        
        // 필요한 경우에만 재연결 (끊어진 연결이 있는지 확인)
        const statuses = webSocketManager.getAllConnectionStatuses();
        const needsReconnection = Object.entries(statuses).some(([type, info]) => {
          // crypto는 WebSocket이 끊어진 경우, 나머지는 API 폴링이 멈춘 경우
          if (type === 'crypto' && info.mode === 'websocket' && info.status === 'disconnected') {
            return true;
          }
          if (type !== 'crypto' && info.mode === 'api' && info.status !== 'api_mode') {
            return true;
          }
          return false;
        });
        
        if (needsReconnection) {
          //console.log('🔄 필요한 연결만 복구');
          webSocketManager.reconnectAll();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // ============================================================================
  // 이벤트 핸들러들
  // ============================================================================

  useEffect(() => {
    const handleNavigateToSNS = () => {
      pushToHistory("main", "sns");
      setActiveTab("sns");
    };
    const handleNavigateToNews = () => {
      pushToHistory("main", "news");
      setActiveTab("news");
    };
    const handleNavigateToMarkets = () => {
      pushToHistory("main", "markets");
      setActiveTab("markets");
    };

    window.addEventListener('navigateToSNS', handleNavigateToSNS);
    window.addEventListener('navigateToNews', handleNavigateToNews);
    window.addEventListener('navigateToMarkets', handleNavigateToMarkets);
    
    return () => {
      window.removeEventListener('navigateToSNS', handleNavigateToSNS);
      window.removeEventListener('navigateToNews', handleNavigateToNews);
      window.removeEventListener('navigateToMarkets', handleNavigateToMarkets);
    };
  }, []);

  const handleLogin = (email: string, password: string) => {
    console.log("로그인:", email, password);
    setAuthState("authenticated");
    setViewState("main");
  };

  const handleSignup = (userData: any) => {
    console.log("회원가입:", userData);
    setAuthState("authenticated");
    setViewState("main");
  };

  const handleLogout = () => {
    setAuthState("guest");
    setViewState("main");
    setActiveTab("home");
    setShowNotifications(false);
  };

  const handleLoginClick = () => {
    pushToHistory("auth", activeTab);
    setAuthState("login");
    setViewState("auth");
  };

  const handleUserIconClick = () => {
    if (isLoggedIn) {
      pushToHistory("profile", activeTab);
      setViewState("profile");
    } else {
      handleLoginClick();
    }
  };

  const handleNotificationClick = () => {
    if (isLoggedIn) {
      setShowNotifications(true);
    } else {
      handleLoginClick();
    }
  };

  const handleBackToMain = () => {
    setViewState("main");
    setSelectedSNSPost(null);
    setSelectedStockNews(null);
    setSelectedStockSymbol(null);
    setSelectedCryptoSymbol(null); // 추가
    if (!isLoggedIn) {
      setAuthState("guest");
    }
  };

  // 초기 히스토리 상태 설정
  useEffect(() => {
    // 초기 상태를 브라우저 히스토리에 설정
    const initialState = {
      viewState: viewState,
      activeTab: activeTab,
      selectedData: null
    };
    window.history.replaceState(initialState, '', `#${viewState}`);
  }, []);

  // 웰컴 페이지 완료 후 메인으로 이동
  const handleWelcomeComplete = () => {
    localStorage.setItem('wei-has-visited', 'true');
    pushToHistory("main", "home");
    setViewState("main");
  };

  // 웰컴 페이지 건너뛰기
  const handleWelcomeSkip = () => {
    localStorage.setItem('wei-has-visited', 'true');
    pushToHistory("main", "home");
    setViewState("main");
  };

  const handleSNSPostClick = (post: SNSPost) => {
    if (post.analysis.analysis_status === 'complete') {
      pushToHistory("sns-detail", activeTab, { selectedSNSPost: post });
      setSelectedSNSPost(post);
      setViewState("sns-detail");
    }
  };

  const handleStockNewsClick = (stockNews: StockNewsItem[], symbol: string) => {
    pushToHistory("stock-news", activeTab, { selectedStockNews: { news: stockNews, symbol } });
    setSelectedStockNews({ news: stockNews, symbol });
    setViewState("stock-news");
  };

  const handleNewsClick = (newsItem: DetailNewsItem) => {
    pushToHistory("news-detail", activeTab, { selectedNewsItem: newsItem });
    setSelectedNewsItem(newsItem);
    setViewState("news-detail");
  };

  const handleStockClick = (symbol: string) => {
    pushToHistory("stock-detail", activeTab, { selectedStockSymbol: symbol });
    setSelectedStockSymbol(symbol);
    setViewState("stock-detail");
  };

  // 암호화폐 클릭 핸들러 추가
  const handleCryptoClick = (symbol: string) => {
    pushToHistory("crypto-detail", activeTab, { selectedCryptoSymbol: symbol });
    setSelectedCryptoSymbol(symbol);
    setViewState("crypto-detail");
  };

  // ETF 클릭 핸들러 추가
  const handleETFClick = (symbol: string) => {
    pushToHistory("etf-detail", activeTab, { selectedETFSymbol: symbol });
    setSelectedETFSymbol(symbol);
    setViewState("etf-detail");
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / 3600000);
    
    if (diffHours < 1) {
      return "방금 전";
    } else if (diffHours < 24) {
      return `${diffHours}시간 전`;
    } else {
      return date.toLocaleDateString("ko-KR", { 
        month: "short", 
        day: "numeric"
      });
    }
  };

  // ============================================================================
  // 렌더링 함수들
  // ============================================================================

  // 웰컴 페이지 렌더링
  if (viewState === "welcome") {
    return (
      <div className="min-h-screen relative z-10">
        <WelcomePage
          onComplete={handleWelcomeComplete}
          onSkip={handleWelcomeSkip}
        />
      </div>
    );
  }

  // 인증 페이지 렌더링
  if (viewState === "auth") {
    if (authState === "login") {
      return (
        <div className="min-h-screen relative z-10">
          <LoginPage
            onBack={handleBackToMain}
            onLogin={handleLogin}
            onNavigateToSignup={() => setAuthState("signup")}
            onForgotPassword={() => console.log("비밀번호 찾기")}
          />
        </div>
      );
    }

    if (authState === "signup") {
      return (
        <div className="min-h-screen relative z-10">
          <SignupPage
            onBack={() => setAuthState("login")}
            onSignup={handleSignup}
            onNavigateToLogin={() => setAuthState("login")}
          />
        </div>
      );
    }
  }

  if (viewState === "cheatsheet") {
    return (
      <div className="min-h-screen relative z-10">
        <CheatsheetPage onBack={handleBackToMain} />
      </div>
    );
  }

  // SNS 상세 페이지
  if (viewState === "sns-detail" && selectedSNSPost) {
    return (
      <div className="min-h-screen relative z-10">
        <div className="max-w-md mx-auto px-4 pt-4 pb-20">
          <SNSDetailPage
            postSource={selectedSNSPost.analysis.post_source}
            postId={selectedSNSPost.analysis.post_id}
            onBack={() => {
              setViewState("main");
              setSelectedSNSPost(null);
            }}
          />
        </div>
      </div>
    );
  }

  // 주식 뉴스 상세 페이지
  if (viewState === "stock-news" && selectedStockNews) {
    return (
      <div className="min-h-screen relative z-10">
        <div className="max-w-md mx-auto px-4 pt-4 pb-20">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <button
                onClick={handleBackToMain}
                className="flex items-center space-x-2 px-3 py-1.5 glass-subtle rounded-lg hover:glass transition-all"
              >
                <ArrowLeft size={16} />
                <span className="text-sm">홈으로 돌아가기</span>
              </button>
              
              <div className="text-sm text-foreground/70">
                {selectedStockNews.news.length}개 뉴스
              </div>
            </div>

            <div className="glass-card rounded-xl p-4">
              <h2 className="text-lg font-bold text-center">{selectedStockNews.symbol} 관련 뉴스</h2>
            </div>

            <div className="space-y-3">
              {selectedStockNews.news.map((news, index) => (
                <article
                  key={index}
                  className="glass-card p-4 rounded-xl cursor-pointer hover:glass transition-all group"
                  onClick={() => window.open(news.url, '_blank')}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground/90">{news.source}</span>
                      <span className="text-xs text-foreground/50">
                        {formatTimestamp(news.published_at)}
                      </span>
                    </div>
                    
                    <h3 className="font-medium line-clamp-2 group-hover:text-primary transition-colors leading-tight">
                      {news.title}
                    </h3>
                    
                    <p className="text-sm text-foreground/70 line-clamp-3 leading-snug">
                      {news.description}
                    </p>
                    
                    <div className="flex items-center justify-between pt-2 border-t border-white/10">
                      <span className="text-xs text-primary font-medium">{news.symbol}</span>
                      <span className="text-xs text-foreground/50">자세히 보기 →</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 뉴스 상세 페이지
  if (viewState === "news-detail" && selectedNewsItem) {
    return (
      <div className="min-h-screen relative z-10">
        <div className="max-w-md mx-auto px-4 pt-4 pb-20">
          <NewsDetailPage
            newsItem={selectedNewsItem}
            onBack={() => {
              setViewState("main");
              setSelectedNewsItem(null);
            }}
          />
        </div>
      </div>
    );
  }

  // 마켓 상세 페이지 (주식)
  if (viewState === "stock-detail" && selectedStockSymbol) {
    return (
      <div className="min-h-screen relative z-10">
        <MarketDetailPage
          symbol={selectedStockSymbol}
          onBack={() => {
            setViewState("main");
            setSelectedStockSymbol(null);
          }}
        />
      </div>
    );
  }

  // 암호화폐 상세 페이지 추가
  if (viewState === "crypto-detail" && selectedCryptoSymbol) {
    return (
      <div className="min-h-screen relative z-10">
        <CryptoDetailPage
          symbol={selectedCryptoSymbol}
          onBack={() => {
            setViewState("main");
            setSelectedCryptoSymbol(null);
          }}
        />
      </div>
    );
  }

  // ETF 상세 페이지 추가
  if (viewState === "etf-detail" && selectedETFSymbol) {
    return (
      <div className="min-h-screen relative z-10">
        <ETFDetailPage
          symbol={selectedETFSymbol}
          onBack={() => {
            setViewState("main");
            setSelectedETFSymbol(null);
          }}
        />
      </div>
    );
  }

  // 사용자 프로필 페이지
  if (viewState === "profile" && isLoggedIn) {
    return (
      <div className="min-h-screen relative z-10">
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-between p-3">
            <button
              onClick={handleBackToMain}
              className="p-2 rounded-lg glass hover:glass-strong transition-all"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="m15 18-6-6 6-6"/>
              </svg>
            </button>
            <h1 className="text-lg font-bold">프로필</h1>
            <div className="w-10" />
          </div>
          
          <div className="px-4 pb-8">
            <UserProfile
              user={user}
              onLogout={handleLogout}
              onEditProfile={() => console.log("프로필 편집")}
            />
          </div>
        </div>
      </div>
    );
  }

  const renderHeader = () => {
    if (activeTab !== "home") return null;

    return (
      <div className="flex items-center justify-between mb-3">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
            W.E.I
          </h1>
          <p className="text-xs text-foreground/70">
            {isLoggedIn ? `${user.name}님, 안녕하세요` : "Wise & Easy Investing"}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {isLoggedIn ? (
            <>
              <button
                onClick={handleNotificationClick}
                className="relative w-8 h-8 rounded-full glass flex items-center justify-center hover:glass-strong transition-all"
              >
                <Bell size={16} />
                <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full shadow-lg"></div>
              </button>
              <button
                onClick={handleUserIconClick}
                className="w-8 h-8 rounded-full glass flex items-center justify-center hover:glass-strong transition-all"
              >
                <User size={16} />
              </button>
            </>
          ) : (
            <button
              onClick={handleLoginClick}
              className="flex items-center space-x-2 px-3 py-1.5 glass-strong rounded-lg hover:bg-white/10 transition-all"
            >
              <LogIn size={16} />
              <span className="text-xs font-medium">로그인</span>
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case "home":
        return (
          <div className="space-y-4 relative z-10">
            {renderHeader()}
            <HeroSection
              onCheatsheetClick={() => {
                pushToHistory("cheatsheet", "home");
                setViewState("cheatsheet");
              }}
            />
            <EnhancedTopGainersBanner />
            <EarningsCalendar />
          </div>
        );

      case "markets":
        return (
          <div className="space-y-6 relative z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl glass">
                  <TrendingUp size={24} className="text-primary" />
                </div>
                <h1 className="text-2xl font-bold">실시간 투자 시장</h1>
              </div>
            </div>
            <MarketPage 
              onStockClick={handleStockClick} 
              onCryptoClick={handleCryptoClick} 
              onETFClick={handleETFClick} // ETF 클릭 핸들러 추가
            />
          </div>
        );

      case "sns":
        return (
          <div className="space-y-6 relative z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl glass">
                  <MessageSquare size={24} className="text-primary" />
                </div>
                <h1 className="text-2xl font-bold">SNS 분석</h1>
              </div>
            </div>
            <SNSPage 
              onPostClick={handleSNSPostClick}
            />
          </div>
        );

      case "news":
        return (
          <div className="space-y-6 relative z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl glass">
                  <Newspaper size={24} className="text-primary" />
                </div>
                <h1 className="text-2xl font-bold">경제 뉴스</h1>
              </div>
            </div>
            <NewsPage 
              isLoggedIn={isLoggedIn} 
              onLoginPrompt={handleLoginClick} 
              onNewsClick={handleNewsClick} 
            />
          </div>
        );

      case "economy":
        return (
          <div className="space-y-6 relative z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl glass">
                  <BarChart3 size={24} className="text-primary" />
                </div>
                <h1 className="text-2xl font-bold">경제 지표</h1>
              </div>
            </div>
            <OptimizedEconomicDashboard isLoggedIn={true} onLoginPrompt={handleLoginClick} />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen relative">
      <div className="max-w-md mx-auto relative z-10">
        <div className="px-4 pt-4 pb-20">
          {renderContent()}
        </div>

        <BottomNavigation 
          activeTab={activeTab} 
          onTabChange={(tab) => {
            if (tab !== activeTab) {
              pushToHistory("main", tab);
              setActiveTab(tab);
            }
          }} 
        />

        {isLoggedIn && (
          <NotificationSystem
            isVisible={showNotifications}
            onClose={() => setShowNotifications(false)}
          />
        )}
      </div>
    </div>
  );
}

// ============================================================================
// React Query Provider로 감싸진 메인 App
// ============================================================================

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
      
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools 
          initialIsOpen={false}
          position="bottom-right"
        />
      )}
    </QueryClientProvider>
  );
}