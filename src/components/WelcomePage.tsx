import { useState, useEffect } from "react";
import { TrendingUp, MessageSquare, Newspaper, BarChart3, DollarSign, Target, Brain, Sparkles, ChevronRight, Play, SkipForward, X } from "lucide-react";
import { webSocketManager } from '../services/WebSocketManager';

interface WelcomePageProps {
  onComplete: () => void;
  onSkip: () => void;
}

export function WelcomePage({ onComplete, onSkip }: WelcomePageProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [showContent, setShowContent] = useState(false);
  const [backgroundLoading, setBackgroundLoading] = useState({
    isActive: false,
    completed: 0,
    total: 0,
    currentService: ''
  });

  // 로딩 단계별 메시지 (최적화된 버전)
  const loadingSteps = [
    "암호화폐 실시간 연결 중...",
    "SNS 데이터 로딩 중...",
    "S&P500 데이터 로딩 중...",
    "ETF 데이터 로딩 중...",
    "서비스 준비 완료!"
  ];

  useEffect(() => {
    // 백그라운드 로딩 상태 모니터링
    const backgroundStartUnsubscribe = webSocketManager.subscribe('background_loading_start', ({ services }) => {
      console.log('🚀 백그라운드 로딩 시작:', services);
      setBackgroundLoading({
        isActive: true,
        completed: 0,
        total: services.length,
        currentService: services[0] || ''
      });
    });

    const backgroundCompleteUnsubscribe = webSocketManager.subscribe('background_loading_complete', ({ service }) => {
      console.log('✅ 백그라운드 로딩 완료:', service);
      setBackgroundLoading(prev => ({
        ...prev,
        completed: prev.completed + 1,
        currentService: service
      }));
    });

    const backgroundProgressUnsubscribe = webSocketManager.subscribe('background_loading_progress', ({ completed, total }) => {
      const progress = (completed / total) * 100;
      setLoadingProgress(progress);
      setCurrentStep(Math.min(completed, loadingSteps.length - 1));
      
      if (completed >= total) {
        setTimeout(() => {
          setShowContent(true);
        }, 500); // 0.5초 후 콘텐츠 표시
      }
    });

    // 폴백: 백그라운드 로딩이 시작되지 않으면 기본 로딩
    const fallbackTimeout = setTimeout(() => {
      if (!backgroundLoading.isActive) {
        console.log('🔄 폴백 로딩 시작');
        const totalTime = 3000;
        const stepTime = totalTime / loadingSteps.length;
        
        const interval = setInterval(() => {
          setCurrentStep(prev => {
            if (prev < loadingSteps.length - 1) {
              return prev + 1;
            }
            return prev;
          });
        }, stepTime);

        const progressInterval = setInterval(() => {
          setLoadingProgress(prev => {
            if (prev >= 100) {
              clearInterval(progressInterval);
              clearInterval(interval);
              setShowContent(true);
              return 100;
            }
            return prev + 3.33;
          });
        }, totalTime / 30);
      }
    }, 1000); // 1초 대기

    return () => {
      backgroundStartUnsubscribe();
      backgroundCompleteUnsubscribe();
      backgroundProgressUnsubscribe();
      clearTimeout(fallbackTimeout);
    };
  }, [backgroundLoading.isActive]);

  if (!showContent) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 relative">

        {/* 로고 및 앱 이름 */}
        <div className="text-center mb-12">
          <div className="w-28 h-28 mx-auto mb-8 glass-strong rounded-3xl flex items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-blue-600/20 animate-pulse"></div>
            <TrendingUp size={48} className="text-primary relative z-10 drop-shadow-lg" />
          </div>
          <h1 className="text-5xl font-bold mb-3 bg-gradient-to-r from-primary via-blue-300 to-primary bg-clip-text text-transparent drop-shadow-md">
            W.E.I
          </h1>
          <p className="text-xl text-foreground/90 font-medium tracking-wide">Wise & Easy Investing</p>
        </div>

        {/* 로딩 애니메이션 */}
        <div className="w-full max-w-md space-y-8">
          {/* 프로그레스 바 */}
          <div className="glass-strong rounded-2xl p-4">
            <div className="w-full bg-white/10 rounded-xl h-3 overflow-hidden relative">
              <div 
                className="h-full bg-gradient-to-r from-primary via-blue-400 to-primary rounded-xl transition-all duration-300 ease-out relative"
                style={{ width: `${loadingProgress}%` }}
              >
                <div className="absolute inset-0 bg-white/20 animate-pulse rounded-xl"></div>
              </div>
            </div>
          </div>

          {/* 로딩 메시지 */}
          <div className="text-center glass-card rounded-xl p-4 space-y-2">
            <p className="text-foreground/80 font-medium text-lg animate-pulse">
              {loadingSteps[currentStep]}
            </p>
            {backgroundLoading.isActive && (
              <div className="text-xs text-foreground/60">
                서비스 {backgroundLoading.completed}/{backgroundLoading.total} 완료
                {backgroundLoading.currentService && (
                  <span className="ml-2 text-primary">({backgroundLoading.currentService})</span>
                )}
              </div>
            )}
          </div>

          {/* 로딩 점들 */}
          <div className="flex justify-center space-x-3">
            {[0, 1, 2, 3, 4].map((index) => (
              <div
                key={index}
                className={`w-3 h-3 rounded-full transition-all duration-500 ${
                  index <= currentStep 
                    ? 'bg-primary shadow-lg shadow-primary/50 scale-110' 
                    : 'bg-white/30'
                }`}
              />
            ))}
          </div>
        </div>

        {/* 하단 힌트 텍스트 */}
        <div className="absolute bottom-8 left-0 right-0 text-center px-6">
          <p className="text-sm text-foreground/60 glass-subtle rounded-full py-2 px-4 inline-block">
            우리 같이 현명한 투자를 시작해요
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-6 py-8 space-y-8 animate-in fade-in duration-700 relative">
      {/* 건너뛰기 버튼 */}
      <button
        onClick={onSkip}
        className="absolute top-6 right-6 glass-card rounded-full p-3 hover:glass-strong transition-all duration-300 group z-10"
        aria-label="건너뛰기"
      >
        <X size={20} className="text-primary group-hover:text-white transition-colors" />
      </button>

      {/* 헤더 */}
      <div className="text-center space-y-6 pt-8">
        <div className="w-20 h-20 mx-auto glass-strong rounded-3xl flex items-center justify-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-blue-600/10"></div>
          <TrendingUp size={36} className="text-primary relative z-10 drop-shadow-md" />
        </div>
        <div>
          <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-primary via-blue-300 to-primary bg-clip-text text-transparent drop-shadow-sm">
            W.E Investing
          </h1>
          <p className="text-foreground/80 text-lg font-medium">Your Investment Cheatsheet</p>
        </div>
      </div>

      {/* 메인 메시지 */}
      <div className="glass-strong rounded-3xl p-8 text-center space-y-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-blue-600/5"></div>
        <Sparkles className="w-16 h-16 mx-auto text-primary drop-shadow-md relative z-10" />
        <h2 className="text-2xl font-bold leading-tight relative z-10">
          투자를,<br />
          데이터를 기반으로<br />
          <span className="text-primary drop-shadow-sm">쉽고 현명하게</span> 투자하세요
        </h2>
      </div>

      {/* SNS 영향력 섹션 */}
      <div className="glass-card rounded-3xl p-6 space-y-5 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5"></div>
        <div className="flex items-center space-x-4 relative z-10">
          <div className="w-12 h-12 rounded-xl glass-subtle flex items-center justify-center">
            <MessageSquare className="text-primary" size={28} />
          </div>
          <h3 className="font-bold text-lg">SNS가 투자에 미치는 영향이 궁금하신가요?</h3>
        </div>
        <div className="space-y-4 text-foreground/80 leading-relaxed pl-16 relative z-10">
          <p className="font-medium">일론 머스크의 트윗 하나로 테슬라 주가가 움직이고,</p>
          <p className="font-medium">트럼프의 Truth Social 게시글로 관련 코인이 요동칩니다.</p>
        </div>
      </div>

      {/* 학습 내용 */}
      <div className="glass-card rounded-3xl p-6 space-y-5 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-emerald-500/5"></div>
        <div className="flex items-center space-x-4 relative z-10">
          <div className="w-12 h-12 rounded-xl glass-subtle flex items-center justify-center">
            <Brain className="text-primary" size={28} />
          </div>
          <h3 className="font-bold text-lg">무엇을 배울 수 있나요?</h3>
        </div>
        <div className="space-y-4 relative z-10">
          {[
            {
              icon: <BarChart3 size={20} className="text-blue-400" />,
              text: "S&P500 기업들의 재무제표 데이터로 재무제표 분석"
            },
            {
              icon: <DollarSign size={20} className="text-yellow-400" />,
              text: "암호화폐 공급량, 전세계 거래소 비교로 디테일하게 알아보는 암호화폐 분석"
            },
            {
              icon: <TrendingUp size={20} className="text-green-400" />,
              text: "다양한 경제 지표들의 데이터로 서로 간의 상관관계 분석"
            }
          ].map((item, index) => (
            <div key={index} className="flex items-start space-x-4 glass-subtle rounded-2xl p-4 hover:glass-card transition-all duration-300">
              <div className="w-10 h-10 rounded-xl glass-subtle flex items-center justify-center flex-shrink-0">
                {item.icon}
              </div>
              <p className="text-foreground/80 leading-relaxed flex-1 font-medium">
                {item.text}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* 서비스 제공 내용 */}
      <div className="glass-card rounded-3xl p-6 space-y-5 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-red-500/5"></div>
        <div className="flex items-center space-x-4 relative z-10">
          <div className="w-12 h-12 rounded-xl glass-subtle flex items-center justify-center">
            <Target className="text-primary" size={28} />
          </div>
          <h3 className="font-bold text-lg">어떤 서비스를 제공하나요?</h3>
        </div>
        <div className="space-y-4 relative z-10">
          {[
            {
              icon: <BarChart3 size={20} className="text-blue-400" />,
              text: "S&P 500 기업의 실적 발표 캘린더와 IPO 캘린더로 미리 준비하는 투자 전략"
            },
            {
              icon: <TrendingUp size={20} className="text-green-400" />,
              text: "실시간 S&P 500, 암호화폐, ETF 데이터로 시장 동향 파악"
            },
            {
              icon: <Newspaper size={20} className="text-orange-400" />,
              text: "S&P 500 기업, ETF 분석"
            },
            {
              icon: <MessageSquare size={20} className="text-purple-400" />,
              text: "SNS 글이 시장에 미치는 영향 분석"
            },
            {
              icon: <DollarSign size={20} className="text-yellow-400" />,
              text: "암호화폐 김치 프리미엄 계산"
            }
          ].map((item, index) => (
            <div key={index} className="flex items-start space-x-4 glass-subtle rounded-2xl p-4 hover:glass-card transition-all duration-300">
              <div className="w-10 h-10 rounded-xl glass-subtle flex items-center justify-center flex-shrink-0">
                {item.icon}
              </div>
              <p className="text-foreground/80 leading-relaxed flex-1 font-medium">
                {item.text}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* 시작하기 버튼 */}
      <div className="pt-6">
        <button
          onClick={onComplete}
          className="w-full glass-strong rounded-2xl py-6 px-8 hover:glass transition-all duration-300 group relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-blue-600/10 group-hover:from-primary/20 group-hover:to-blue-600/20 transition-all duration-300"></div>
          <div className="flex items-center justify-center space-x-4 relative z-10">
            <Play size={24} className="text-primary group-hover:scale-110 transition-transform" />
            <span className="font-bold text-lg">투자 여정 시작하기</span>
            <ChevronRight size={24} className="text-primary group-hover:translate-x-2 transition-transform" />
          </div>
        </button>
      </div>

      {/* 하단 메시지 */}
      <div className="text-center pt-6 pb-8">
        <p className="text-sm text-foreground/60 glass-subtle rounded-full py-2 px-6 inline-block">
          로그인이 필요 없습니다.
        </p>
      </div>
    </div>
  );
}