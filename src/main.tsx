import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// 테마별 CSS 로드 - 각 테마가 완전히 분리되어 충돌 없음
import './styles/globals-base.css'  // Tailwind + 공통 스타일
import './styles/globals-dark.css'  // 다크 테마 전용
import './styles/globals-light.css' // 라이트 테마 전용
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
