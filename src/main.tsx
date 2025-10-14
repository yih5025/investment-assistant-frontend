import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// globals.css는 useTheme 훅에서 동적으로 로드됨
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
