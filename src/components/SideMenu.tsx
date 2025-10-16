import { motion, AnimatePresence } from "motion/react";
import { X, Home, TrendingUp, MessageSquare, Newspaper, BarChart3, Settings } from "lucide-react";

interface SideMenuProps {
  isOpen: boolean;
  isLoggedIn: boolean; // App.tsx와의 호환성을 위해 유지
  onClose: () => void;
  onNavigate: (tab: string) => void;
  onLogin: () => void; // App.tsx와의 호환성을 위해 유지
  onLogout: () => void; // App.tsx와의 호환성을 위해 유지
  onProfile: () => void; // App.tsx와의 호환성을 위해 유지
  onSettings: () => void;
  activeTab: string;
  user?: { // App.tsx와의 호환성을 위해 유지
    name: string;
    email: string;
  };
}

export function SideMenu({ 
  isOpen, 
  onClose, 
  onNavigate, 
  onSettings,
  activeTab,
}: SideMenuProps) {
  const menuItems = [
    { id: "home", label: "투자 캘린더", icon: Home },
    { id: "markets", label: "투자 시장", icon: TrendingUp },
    { id: "sns", label: "SNS 분석", icon: MessageSquare },
    { id: "news", label: "경제 뉴스", icon: Newspaper },
    { id: "economy", label: "경제 지표", icon: BarChart3 },
  ];

  const handleItemClick = (tabId: string) => {
    onNavigate(tabId);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Side Menu */}
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed left-0 top-0 bottom-0 w-72 bg-background/95 backdrop-blur-xl z-50 shadow-2xl border-r border-border/50"
          >
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between p-5 border-b border-border/50">
                <div>
                  <h2 className="text-xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                    W.E Investing
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Wise & Easy Investing
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="w-9 h-9 flex items-center justify-center rounded-xl glass-subtle hover:glass transition-all"
                  aria-label="메뉴 닫기"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Menu Items */}
              <div className="flex-1 overflow-y-auto p-3 space-y-1 scrollbar-hide">
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleItemClick(item.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                        isActive
                          ? "glass text-primary scale-[1.02] shadow-lg"
                          : "text-foreground/70 hover:text-foreground hover:glass-subtle hover:scale-[1.02]"
                      }`}
                      aria-current={isActive ? "page" : undefined}
                    >
                      <Icon size={20} />
                      <span className="font-medium">{item.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Footer */}
              <div className="p-3 border-t border-border/50">
                <button
                  onClick={() => {
                    onSettings();
                    onClose();
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-foreground/70 hover:text-foreground hover:glass-subtle hover:scale-[1.02] transition-all duration-300"
                >
                  <Settings size={20} />
                  <span className="font-medium">설정</span>
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}