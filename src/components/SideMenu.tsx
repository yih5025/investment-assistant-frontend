import { motion, AnimatePresence } from "motion/react";
import { X, Home, TrendingUp, MessageSquare, Newspaper, Bot, BarChart3, User, LogIn, LogOut, Bell, Settings } from "lucide-react";

interface SideMenuProps {
  isOpen: boolean;
  isLoggedIn: boolean;
  onClose: () => void;
  onNavigate: (tab: string) => void;
  onLogin: () => void;
  onLogout: () => void;
  onProfile: () => void;
  onSettings: () => void;
  activeTab: string;
  user?: {
    name: string;
    email: string;
  };
}

export function SideMenu({ 
  isOpen, 
  isLoggedIn, 
  onClose, 
  onNavigate, 
  onLogin, 
  onLogout,
  onProfile,
  onSettings,
  activeTab,
  user
}: SideMenuProps) {
  const menuItems = [
    { id: "home", label: "홈", icon: Home },
    { id: "markets", label: "시장 & 재무", icon: TrendingUp },
    { id: "sns", label: "SNS 피드", icon: MessageSquare },
    { id: "news", label: "뉴스", icon: Newspaper },
    { id: "ai", label: "AI 분석", icon: Bot },
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
            className="fixed left-0 top-0 bottom-0 w-80 bg-background z-50 shadow-2xl border-r border-border"
          >
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-border">
                <h2 className="text-xl font-bold text-foreground">W.E.I</h2>
                <button
                  onClick={onClose}
                  className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-secondary transition-colors"
                  aria-label="메뉴 닫기"
                >
                  <X size={20} />
                </button>
              </div>

              {/* User Section */}
              {isLoggedIn && user ? (
                <div className="p-4 border-b border-border">
                  <button
                    onClick={() => {
                      onProfile();
                      onClose();
                    }}
                    className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-secondary transition-colors text-left"
                  >
                    <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold">
                      {user.name.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-foreground">{user.name}</div>
                      <div className="text-sm text-muted-foreground">{user.email}</div>
                    </div>
                  </button>
                </div>
              ) : (
                <div className="p-4 border-b border-border">
                  <button
                    onClick={() => {
                      onLogin();
                      onClose();
                    }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-all font-semibold"
                  >
                    <LogIn size={20} />
                    <span>로그인</span>
                  </button>
                </div>
              )}

              {/* Menu Items */}
              <div className="flex-1 overflow-y-auto p-2 scrollbar-hide">
                {menuItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleItemClick(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors mb-1 ${
                      activeTab === item.id
                        ? "bg-accent text-accent-foreground"
                        : "hover:bg-secondary text-foreground"
                    }`}
                    aria-current={activeTab === item.id ? "page" : undefined}
                  >
                    <item.icon size={20} />
                    <span className="font-medium">{item.label}</span>
                  </button>
                ))}
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-border space-y-2">
                {/* 설정 버튼 */}
                <button
                  onClick={() => {
                    onSettings();
                    onClose();
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-secondary transition-colors text-foreground"
                >
                  <Settings size={20} />
                  <span className="font-medium">설정</span>
                </button>

                {/* 로그아웃 버튼 */}
                {isLoggedIn && (
                  <button
                    onClick={() => {
                      onLogout();
                      onClose();
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-destructive/10 text-destructive transition-colors"
                  >
                    <LogOut size={20} />
                    <span className="font-medium">로그아웃</span>
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}