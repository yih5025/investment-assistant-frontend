import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// 다크 모드와 라이트 모드 CSS를 모두 로드 (data-theme 속성으로 전환)
import './styles/globals-dark.css'
import './styles/globals-light.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
