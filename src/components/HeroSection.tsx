// components/HeroSection.tsx
import { motion } from "motion/react";
import { TrendingUp, Calendar, Newspaper, MessageSquare, BookOpen, ChevronRight, Wallet, PieChart } from "lucide-react";
import { useHeroStats } from "../hooks/useHeroStats";

interface HeroSectionProps {
  onCheatsheetClick: () => void;
}

export function HeroSection({ onCheatsheetClick }: HeroSectionProps) {
  // 커스텀 훅으로 통계 데이터 관리
  const { stats } = useHeroStats();
  
  const currentTime = new Date();
  
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('ko-KR', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      weekday: 'short'
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-4">
      {/* 메인 Hero 카드 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-3xl p-6 relative overflow-hidden"
      >
        {/* 배경 그라데이션 */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-primary/10 via-purple-500/10 to-blue-500/10 rounded-full blur-3xl" />
        
        <div className="relative space-y-4">
          {/* 상단: 날짜와 인사 */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-foreground/60 mb-1">{formatDate(currentTime)}</div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-white via-white to-white/80 bg-clip-text">
                투자자님 안녕하세요,
              </h1>
              <p className="text-foreground/70 mt-1 text-sm">오늘도 현명한 투자 되세요</p>
            </div>
            
            <div className="text-right">
              <div className="text-3xl font-bold text-primary">{formatTime(currentTime)}</div>
              <div className="text-xs text-foreground/60 mt-1">실시간 업데이트</div>
            </div>
          </div>

          {/* Quick Stats - 6열 그리드 (2행 3열) */}
          <div className="grid grid-cols-3 gap-2.5 pt-4 border-t border-white/10">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="glass-subtle rounded-xl p-2.5"
            >
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <TrendingUp size={12} className="text-green-400" />
                <div className="text-xs text-foreground/60">주식</div>
              </div>
              <div className="text-center font-bold text-base">{stats.stockCount.toLocaleString()}</div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.15 }}
              className="glass-subtle rounded-xl p-2.5"
            >
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <PieChart size={12} className="text-blue-400" />
                <div className="text-xs text-foreground/60">ETF</div>
              </div>
              <div className="text-center font-bold text-base">{stats.etfCount.toLocaleString()}</div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="glass-subtle rounded-xl p-2.5"
            >
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <Wallet size={12} className="text-amber-400" />
                <div className="text-xs text-foreground/60">암호화폐</div>
              </div>
              <div className="text-center font-bold text-base">{stats.cryptoCount.toLocaleString()}</div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.25 }}
              className="glass-subtle rounded-xl p-2.5"
            >
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <Calendar size={12} className="text-purple-400" />
                <div className="text-xs text-foreground/60">기업 일정</div>
              </div>
              <div className="text-center font-bold text-base">{stats.eventCount.toLocaleString()}</div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="glass-subtle rounded-xl p-2.5"
            >
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <MessageSquare size={12} className="text-cyan-400" />
                <div className="text-xs text-foreground/60">새 SNS</div>
              </div>
              <div className="text-center font-bold text-base">{stats.snsCount.toLocaleString()}</div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.35 }}
              className="glass-subtle rounded-xl p-2.5"
            >
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <Newspaper size={12} className="text-yellow-400" />
                <div className="text-xs text-foreground/60">새 뉴스</div>
              </div>
              <div className="text-center font-bold text-base">{stats.newsCount.toLocaleString()}</div>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Investment Cheatsheet 버튼 */}
      <motion.button
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        onClick={onCheatsheetClick}
        className="w-full glass-card rounded-2xl p-5 hover:glass-strong transition-all group relative overflow-hidden"
      >
        {/* 호버 그라데이션 */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-purple-500/5 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
        
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl glass-strong flex items-center justify-center group-hover:scale-110 transition-transform">
              <BookOpen size={24} className="text-primary" />
            </div>
            
            <div className="text-left">
              <div className="font-bold text-lg mb-1">Investment Cheatsheet</div>
              <div className="text-sm text-foreground/70">
                초보자를 위한 투자 가이드 · 용어부터 전략까지
              </div>
            </div>
          </div>
          
          <ChevronRight 
            size={24} 
            className="text-foreground/40 group-hover:text-primary group-hover:translate-x-1 transition-all" 
          />
        </div>

        {/* 배지 */}
        <div className="relative mt-3 flex gap-2">
          <span className="px-2 py-1 rounded-lg text-xs glass-subtle">
            주식 · 암호화폐 · ETF
          </span>
          <span className="px-2 py-1 rounded-lg text-xs glass-subtle">
            경제 지표 · 재무제표
          </span>
          <span className="px-2 py-1 rounded-lg text-xs bg-primary/20 text-primary">
            120+ 용어
          </span>
        </div>
      </motion.button>
    </div>
  );
}