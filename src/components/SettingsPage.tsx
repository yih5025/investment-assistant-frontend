import { Moon, Sun, ChevronRight } from "lucide-react";

interface SettingsPageProps {
  onBack: () => void;
  onLogout?: () => void;
  theme: "light" | "dark" | "system";
  onThemeChange: (theme: "light" | "dark" | "system") => void;
}

export function SettingsPage({ onBack, theme, onThemeChange }: SettingsPageProps) {
  // system 모드인 경우 실제 적용된 테마 확인
  const isDarkMode = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);

  const handleToggle = () => {
    const newTheme = isDarkMode ? "light" : "dark";
    onThemeChange(newTheme);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* 헤더 */}
      <div className="sticky top-0 z-10 glass-card border-b border-border/50">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 glass-subtle hover:glass rounded-xl transition-all"
            aria-label="뒤로 가기"
          >
            <ChevronRight size={24} className="rotate-180" />
          </button>
          <h1 className="text-xl font-bold">설정</h1>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-6 space-y-6">
        {/* 테마 토글 섹션 */}
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground mb-3 px-2">화면 모드</h2>
          <div className="glass-card rounded-2xl p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl transition-all ${isDarkMode ? "glass" : "glass-subtle"}`}>
                  {isDarkMode ? (
                    <Moon size={24} className="text-primary" />
                  ) : (
                    <Sun size={24} className="text-amber-500" />
                  )}
                </div>
                <div>
                  <div className="font-semibold text-lg">
                    {isDarkMode ? "다크 모드" : "라이트 모드"}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {isDarkMode ? "어두운 테마로 보기" : "밝은 테마로 보기"}
                  </div>
                </div>
              </div>

              {/* 커스텀 토글 스위치 */}
              <button
                onClick={handleToggle}
                className={`relative inline-flex h-8 w-14 items-center rounded-full transition-all duration-300 ${
                  isDarkMode 
                    ? "bg-primary shadow-lg shadow-primary/30" 
                    : "bg-amber-500 shadow-lg shadow-amber-500/30"
                }`}
                aria-label="테마 토글"
              >
                <span
                  className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-lg transition-transform duration-300 ${
                    isDarkMode ? "translate-x-7" : "translate-x-1"
                  }`}
                >
                  {isDarkMode ? (
                    <Moon size={14} className="m-auto mt-1 text-primary" />
                  ) : (
                    <Sun size={14} className="m-auto mt-1 text-amber-500" />
                  )}
                </span>
              </button>
            </div>

            {/* 설명 */}
            <div className="mt-4 pt-4 border-t border-border/50">
              <p className="text-xs text-muted-foreground leading-relaxed">
                {isDarkMode 
                  ? "🌙 다크 모드는 어두운 환경에서 눈의 피로를 줄여줍니다."
                  : "☀️ 라이트 모드는 밝은 환경에서 더 편안하게 볼 수 있습니다."}
              </p>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}