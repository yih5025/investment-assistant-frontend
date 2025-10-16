import { useState, useEffect } from "react";

type Theme = "light" | "dark" | "system";

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    // localStorage에서 테마 불러오기 (기본값: dark)
    const saved = localStorage.getItem("theme") as Theme;
    return saved || "dark";
  });

  useEffect(() => {
    // 테마 적용 함수
    const applyTheme = (selectedTheme: Theme) => {
      let finalTheme: "light" | "dark";

      if (selectedTheme === "system") {
        // 시스템 테마 감지
        const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        finalTheme = systemPrefersDark ? "dark" : "light";
      } else {
        finalTheme = selectedTheme;
      }

      console.log('🎨 테마 변경:', selectedTheme, '→', finalTheme);

      const html = document.documentElement;
      const body = document.body;

      // HTML과 Body에 테마 적용
      if (finalTheme === 'light') {
        html.setAttribute('data-theme', 'light');
        body.setAttribute('data-theme', 'light');
        html.classList.remove('dark');
        html.classList.add('light');
      } else {
        html.setAttribute('data-theme', 'dark');
        body.setAttribute('data-theme', 'dark');
        html.classList.remove('light');
        html.classList.add('dark');
      }

      // localStorage에 저장
      localStorage.setItem("theme", selectedTheme);
      
      console.log('✅ 테마 적용 완료:', finalTheme, 'HTML classes:', html.className);
    };

    // 테마 적용
    applyTheme(theme);

    // 시스템 테마 변경 감지 (system 모드일 때만)
    if (theme === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handleChange = () => applyTheme("system");
      
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }
  }, [theme]);

  return { theme, setTheme };
}