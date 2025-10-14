import { useState, useEffect } from "react";
import { Moon, Sun, Monitor, ChevronRight, Info, Bell, Lock, HelpCircle, LogOut } from "lucide-react";

interface SettingsPageProps {
  onBack: () => void;
  onLogout?: () => void;
}

type Theme = "light" | "dark" | "system";

export function SettingsPage({ onBack, onLogout }: SettingsPageProps) {
  const [theme, setTheme] = useState<Theme>(() => {
    // localStorage에서 테마 불러오기
    const saved = localStorage.getItem("theme") as Theme;
    return saved || "system";
  });

  useEffect(() => {
    // 테마 적용 로직
    const applyTheme = (selectedTheme: Theme) => {
      const root = document.documentElement;
      
      if (selectedTheme === "system") {
        // 시스템 설정 따르기
        const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        root.classList.toggle("dark", systemPrefersDark);
      } else {
        root.classList.toggle("dark", selectedTheme === "dark");
      }
    };

    applyTheme(theme);
    localStorage.setItem("theme", theme);

    // 시스템 테마 변경 감지
    if (theme === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handleChange = () => applyTheme("system");
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }
  }, [theme]);

  const themeOptions = [
    { value: "light" as Theme, label: "라이트 모드", icon: Sun, description: "밝은 테마" },
    { value: "dark" as Theme, label: "다크 모드", icon: Moon, description: "어두운 테마" },
    { value: "system" as Theme, label: "시스템 설정", icon: Monitor, description: "기기 설정 따르기" },
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* 헤더 */}
      <div className="sticky top-0 z-10 bg-card border-b border-border">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-secondary rounded-lg transition-colors"
            aria-label="뒤로 가기"
          >
            <ChevronRight size={24} className="rotate-180" />
          </button>
          <h1 className="text-xl font-bold">설정</h1>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-6 space-y-6">
        {/* 테마 설정 섹션 */}
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground mb-3 px-2">테마</h2>
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            {themeOptions.map((option, index) => {
              const Icon = option.icon;
              const isActive = theme === option.value;
              
              return (
                <button
                  key={option.value}
                  onClick={() => setTheme(option.value)}
                  className={`w-full flex items-center gap-3 px-4 py-4 transition-colors ${
                    index !== themeOptions.length - 1 ? "border-b border-border" : ""
                  } ${
                    isActive 
                      ? "bg-accent text-accent-foreground" 
                      : "hover:bg-secondary text-foreground"
                  }`}
                >
                  <div className={`p-2 rounded-lg ${isActive ? "bg-primary/20" : "bg-muted"}`}>
                    <Icon size={20} className={isActive ? "text-primary" : "text-muted-foreground"} />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-semibold">{option.label}</div>
                    <div className="text-xs text-muted-foreground">{option.description}</div>
                  </div>
                  {isActive && (
                    <div className="w-2 h-2 rounded-full bg-primary" />
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {/* 알림 설정 */}
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground mb-3 px-2">알림</h2>
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <SettingItem
              icon={Bell}
              label="푸시 알림"
              description="중요한 시장 변동 알림 받기"
              hasSwitch
            />
          </div>
        </section>

        {/* 계정 설정 */}
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground mb-3 px-2">계정</h2>
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <SettingItem
              icon={Lock}
              label="보안 설정"
              description="비밀번호 및 2단계 인증"
            />
            <SettingItem
              icon={Info}
              label="앱 정보"
              description="버전 1.0.0"
              hasChevron={false}
            />
          </div>
        </section>

        {/* 고객 지원 */}
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground mb-3 px-2">지원</h2>
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <SettingItem
              icon={HelpCircle}
              label="도움말"
              description="사용 가이드 및 FAQ"
            />
          </div>
        </section>

        {/* 로그아웃 버튼 */}
        {onLogout && (
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-destructive/10 text-destructive rounded-xl hover:bg-destructive/20 transition-colors font-semibold"
          >
            <LogOut size={20} />
            <span>로그아웃</span>
          </button>
        )}
      </div>
    </div>
  );
}

// 설정 아이템 컴포넌트
interface SettingItemProps {
  icon: any;
  label: string;
  description: string;
  hasChevron?: boolean;
  hasSwitch?: boolean;
  onClick?: () => void;
}

function SettingItem({ 
  icon: Icon, 
  label, 
  description, 
  hasChevron = true, 
  hasSwitch = false,
  onClick 
}: SettingItemProps) {
  const [enabled, setEnabled] = useState(false);

  return (
    <button
      onClick={hasSwitch ? undefined : onClick}
      className="w-full flex items-center gap-3 px-4 py-4 hover:bg-secondary transition-colors text-left border-b border-border last:border-b-0"
    >
      <div className="p-2 rounded-lg bg-muted">
        <Icon size={20} className="text-muted-foreground" />
      </div>
      <div className="flex-1">
        <div className="font-semibold">{label}</div>
        <div className="text-xs text-muted-foreground">{description}</div>
      </div>
      {hasSwitch ? (
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-muted rounded-full peer peer-checked:bg-primary transition-colors peer-focus:ring-2 peer-focus:ring-primary/50">
            <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${enabled ? "translate-x-5" : ""}`} />
          </div>
        </label>
      ) : hasChevron ? (
        <ChevronRight size={20} className="text-muted-foreground" />
      ) : null}
    </button>
  );
}