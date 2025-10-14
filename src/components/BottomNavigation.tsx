import { Home, TrendingUp, MessageSquare, Newspaper, BarChart3, Menu } from "lucide-react";

interface BottomNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onMenuClick: () => void;
}

export function BottomNavigation({ activeTab, onTabChange, onMenuClick }: BottomNavigationProps) {
  const tabs = [
    { id: "home", label: "홈", icon: Home },
    { id: "markets", label: "시장", icon: TrendingUp },
    { id: "sns", label: "SNS", icon: MessageSquare },
    { id: "economy", label: "경제", icon: BarChart3 },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border shadow-lg">
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-around px-2 py-1">
          {/* 메뉴 버튼 (좌측 끝) */}
          <button
            onClick={onMenuClick}
            className="flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-all hover:bg-secondary active:scale-95"
            aria-label="메뉴 열기"
          >
            <Menu size={24} strokeWidth={2} />
            <span className="text-xs font-semibold">메뉴</span>
          </button>

          {/* 탭 버튼들 */}
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-all active:scale-95 ${
                  isActive 
                    ? "text-primary bg-accent" 
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
                aria-label={tab.label}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                <span className="text-xs font-semibold">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}