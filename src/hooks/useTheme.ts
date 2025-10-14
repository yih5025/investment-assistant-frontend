import { useState, useEffect } from "react";

type Theme = "light" | "dark" | "system";

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    // localStorage에서 테마 불러오기 (기본값: dark)
    const saved = localStorage.getItem("theme") as Theme;
    return saved || "dark";
  });

  useEffect(() => {
    // 테마 적용 함수 - 동적 import 사용
    const applyTheme = async (selectedTheme: Theme) => {
      let finalTheme: "light" | "dark";

      if (selectedTheme === "system") {
        // 시스템 테마 감지
        const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        finalTheme = systemPrefersDark ? "dark" : "light";
      } else {
        finalTheme = selectedTheme;
      }

      // 기존의 모든 style 태그 제거 (Vite가 생성한 것들)
      const existingStyles = document.querySelectorAll('style[data-vite-dev-id*="globals"]');
      existingStyles.forEach(style => style.remove());

      // 기존 동적 link 제거
      const existingLight = document.getElementById("theme-light");
      const existingDark = document.getElementById("theme-dark");
      if (existingLight) existingLight.remove();
      if (existingDark) existingDark.remove();

      // 새 CSS를 동적으로 import
      try {
        if (finalTheme === "dark") {
          await import("../styles/globals-dark.css");
        } else {
          await import("../styles/globals-light.css");
        }
      } catch (error) {
        console.error("Failed to load theme CSS:", error);
      }

      // localStorage에 저장
      localStorage.setItem("theme", selectedTheme);
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