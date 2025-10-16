import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// 기본 다크 모드 CSS (useTheme이 다른 테마로 교체할 수 있음)
import './styles/globals-dark.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
