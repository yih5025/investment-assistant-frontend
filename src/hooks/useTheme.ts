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

      // body에 data-theme 속성 설정
      document.body.setAttribute('data-theme', finalTheme);

      // 기존 테마 링크 제거
      const existingThemeLinks = document.querySelectorAll('link[data-theme-css]');
      existingThemeLinks.forEach(el => el.remove());

      // Vite의 style 태그 중 globals 관련 것 제거
      const allStyles = document.querySelectorAll('style');
      allStyles.forEach(style => {
        const viteId = style.getAttribute('data-vite-dev-id');
        if (viteId && (viteId.includes('globals-light') || viteId.includes('globals-dark'))) {
          style.remove();
        }
      });

      // 새 CSS 파일을 link 태그로 추가
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.setAttribute('data-theme-css', finalTheme);
      
      // 개발 환경과 프로덕션 환경 구분
      if (import.meta.env.DEV) {
        // Vite dev server에서는 절대 경로 사용
        link.href = `/src/styles/globals-${finalTheme}.css`;
      } else {
        // 프로덕션에서는 빌드된 CSS 경로 사용  
        link.href = `/assets/globals-${finalTheme}.css`;
      }
      
      // 캐시 방지를 위한 timestamp 추가
      link.href += `?t=${Date.now()}`;
      
      // head 끝에 추가하여 우선순위 높임
      document.head.appendChild(link);

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