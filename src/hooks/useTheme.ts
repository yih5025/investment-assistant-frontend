import { useState, useEffect } from "react";

type Theme = "light" | "dark" | "system";

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    // localStorage에서 테마 불러오기
    const saved = localStorage.getItem("theme") as Theme;
    return saved || "system";
  });

  useEffect(() => {
    // 기존 CSS 링크 제거
    const removePreviousStylesheet = () => {
      const existingLight = document.getElementById("theme-light");
      const existingDark = document.getElementById("theme-dark");
      if (existingLight) existingLight.remove();
      if (existingDark) existingDark.remove();
    };

    // 새로운 CSS 파일 로드
    const loadStylesheet = (cssFile: string, id: string) => {
      const link = document.createElement("link");
      link.id = id;
      link.rel = "stylesheet";
      link.href = cssFile;
      document.head.appendChild(link);
    };

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

      // 기존 CSS 제거
      removePreviousStylesheet();

      // 새 CSS 로드
      if (finalTheme === "dark") {
        loadStylesheet("/src/styles/globals-dark.css", "theme-dark");
      } else {
        loadStylesheet("/src/styles/globals-light.css", "theme-light");
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