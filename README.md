# W.E Investing - Investment Assistant Frontend

> **Wise & Easy Investing** - Your Investment Cheatsheet

투자자를 위한 실시간 금융 정보 플랫폼 프론트엔드입니다. 실시간 시장 데이터, SNS 분석, 경제 뉴스, 그리고 경제 지표를 한 곳에서 확인할 수 있습니다.

## 📱 주요 기능

### 1. 홈 대시보드
- 실시간 시장 개요 및 주요 지표
- 실적 발표 캘린더
- IPO 캘린더
- 빠른 네비게이션

![홈 화면](./screenshots/home.png)
*홈 화면 - 실시간 시장 개요와 실적 발표 캘린더*

### 2. 실시간 시장 정보
- **주식 시장**: S&P 500, NASDAQ, 개별 종목 정보
- **암호화폐**: 비트코인, 이더리움 등 주요 암호화폐
- **ETF**: 주요 ETF 정보 및 분석
- 실시간 가격 차트 및 기술적 지표

![시장 정보](./screenshots/markets.png)
*시장 정보 - 실시간 주식, 암호화폐, ETF 정보*

![종목 상세](./screenshots/stock-detail.png)
*종목 상세 - 실시간 차트 및 상세 정보*

### 3. SNS 분석
- X (Twitter) 게시물 실시간 분석
- AI 기반 투자 심리 분석
- 주요 키워드 및 트렌드 추출
- 관련 종목 및 섹터 분석

![SNS 분석](./screenshots/sns.png)
*SNS 분석 - AI 기반 투자 심리 분석*

![SNS 상세](./screenshots/sns-detail.png)
*SNS 상세 - 게시물 분석 결과*

### 4. 경제 뉴스
- 실시간 금융 뉴스 피드
- 뉴스 요약 및 분석
- 관련 종목 연결
- 북마크 및 공유 기능

![뉴스](./screenshots/news.png)
*경제 뉴스 - 실시간 금융 뉴스 피드*

### 5. 경제 지표
- 주요 경제 지표 대시보드
- 금리, 인플레이션, GDP 등
- 역사적 데이터 및 트렌드
- 시각화 차트

![경제 지표](./screenshots/economy.png)
*경제 지표 - 주요 경제 지표 대시보드*

## 🚀 기술 스택

### Frontend Framework
- **React 18** - UI 라이브러리
- **TypeScript** - 타입 안전성
- **Vite** - 빌드 도구 및 개발 서버

### UI/UX
- **Tailwind CSS** - 유틸리티 우선 CSS 프레임워크
- **Radix UI** - 접근성 높은 UI 컴포넌트
- **Lucide React** - 아이콘
- **Framer Motion** - 애니메이션

### 차트 및 시각화
- **Recharts** - 차트 라이브러리
- **Lightweight Charts** - 실시간 금융 차트

### 상태 관리 및 데이터 페칭
- **React Query** - 서버 상태 관리
- **Zustand** - 클라이언트 상태 관리
- **SWR** - 데이터 페칭 및 캐싱
- **Axios** - HTTP 클라이언트

### 실시간 통신
- **Socket.IO Client** - WebSocket 실시간 데이터

### 라우팅 및 Form
- **React Router DOM** - 클라이언트 사이드 라우팅
- **React Hook Form** - Form 관리

### 기타
- **date-fns** - 날짜 처리
- **next-themes** - 다크 모드 지원

## 📦 설치 및 실행

### 필수 요구사항
- Node.js 18.x 이상
- npm 또는 yarn

### 설치

```bash
# 의존성 설치
npm install
```

### 개발 서버 실행

```bash
# 개발 서버 시작 (http://localhost:5173)
npm run dev
```

### 빌드

```bash
# 프로덕션 빌드
npm run build

# 빌드 미리보기
npm run preview
```

### 린트

```bash
# ESLint 실행
npm run lint
```

## 📂 프로젝트 구조

```
src/
├── components/          # React 컴포넌트
│   ├── auth/           # 인증 관련 컴포넌트
│   ├── notifications/  # 알림 시스템
│   ├── ui/            # 재사용 가능한 UI 컴포넌트
│   ├── user/          # 사용자 프로필
│   ├── figma/         # Figma 디자인 컴포넌트
│   ├── BottomNavigation.tsx
│   ├── CheatsheetPage.tsx
│   ├── CryptoPriceChart.tsx
│   ├── CryptoDetailPage.tsx
│   ├── EconomicDashboard.tsx
│   ├── ETFDetailPage.tsx
│   ├── EarningsCalendar.tsx
│   ├── MarketPage.tsx
│   ├── HeroSection.tsx
│   ├── NewsPage.tsx
│   ├── NewsDetailPage.tsx
│   ├── SNSPage.tsx
│   ├── SNSDetailPage.tsx
│   ├── SideMenu.tsx
│   ├── SP500Detail.tsx
│   ├── SettingsPage.tsx
│   └── WelcomePage.tsx
├── hooks/              # Custom React Hooks
│   ├── useApi.ts
│   ├── useAuth.ts
│   ├── useCryptoDetailHook.ts
│   ├── useEarningsCalendar.ts
│   ├── useEconomicData.ts
│   ├── useETFDetail.ts
│   ├── useHeroStats.ts
│   ├── useIpoCalendar.ts
│   ├── useLocalStorage.ts
│   ├── useMarketData.ts
│   ├── useNews.ts
│   ├── useSNS.ts
│   ├── useSP500.ts
│   ├── useSP500Detail.ts
│   └── useTheme.ts
├── services/           # API 및 서비스
│   ├── api.ts
│   ├── authApi.ts
│   ├── BaseService.ts
│   ├── CryptoService.ts
│   ├── cryptoDetailService.ts
│   ├── ETFService.ts
│   ├── earningsCalendarService.ts
│   ├── newsApi.ts
│   ├── SNSService.ts
│   ├── SP500Service.ts
│   ├── types.ts
│   └── WebSocketManager.ts
├── App.tsx             # 메인 앱 컴포넌트
└── main.tsx           # 엔트리 포인트
```

## 🎨 주요 컴포넌트 설명

### App.tsx
- 메인 애플리케이션 컴포넌트
- React Query 설정
- 브라우저 히스토리 관리
- WebSocket 연결 관리

### WebSocketManager
- 실시간 데이터 스트리밍
- 자동 재연결
- 다중 채널 지원
- 백그라운드/포그라운드 최적화

### Custom Hooks
- `useMarketData`: 실시간 시장 데이터
- `useSNS`: SNS 분석 데이터
- `useNews`: 뉴스 피드
- `useEconomicData`: 경제 지표
- `useTheme`: 다크 모드 지원

## 🔧 환경 변수

프로젝트 루트에 `.env` 파일을 생성하세요:

```env
VITE_API_BASE_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000
```

## 🌐 API 엔드포인트

백엔드 API와 통신하여 다음 데이터를 가져옵니다:

- `/api/sp500` - S&P 500 데이터
- `/api/crypto` - 암호화폐 데이터
- `/api/etf` - ETF 데이터
- `/api/sns` - SNS 분석 데이터
- `/api/news` - 뉴스 데이터
- `/api/economic` - 경제 지표
- `/api/earnings` - 실적 발표 캘린더

WebSocket 엔드포인트:
- `/ws/sp500` - 실시간 주식 데이터
- `/ws/crypto` - 실시간 암호화폐 데이터
- `/ws/sns` - 실시간 SNS 분석

## 📱 반응형 디자인

모바일 우선 디자인으로 다양한 화면 크기를 지원합니다:

- 📱 Mobile: 320px ~ 768px
- 💻 Desktop: 768px 이상
- 최적화된 뷰포트: 최대 448px (md)

## 🎯 주요 기능 구현

### 1. 실시간 데이터 업데이트
- WebSocket을 통한 실시간 데이터 스트리밍
- React Query를 활용한 효율적인 캐싱
- 자동 재연결 및 에러 처리

### 2. 다크 모드
- `next-themes`를 활용한 테마 전환
- 로컬 스토리지 지속성
- 시스템 설정 자동 감지

### 3. 브라우저 히스토리 관리
- 뒤로가기/앞으로가기 지원
- 상태 복원
- URL 기반 네비게이션

### 4. 성능 최적화
- 컴포넌트 lazy loading
- 이미지 최적화
- 메모이제이션
- 가상 스크롤링

## 🐳 Docker 지원

```bash
# Docker 이미지 빌드
docker build -t investment-assistant-frontend .

# 컨테이너 실행
docker run -p 5173:5173 investment-assistant-frontend
```

## 🔒 보안

- HTTPS 지원
- XSS 방지
- CSRF 토큰
- 환경 변수를 통한 민감 정보 관리

## 📄 라이센스

이 프로젝트는 비공개 프로젝트입니다.

## 👥 기여

프로젝트에 기여하고 싶으시다면 이슈를 등록하거나 PR을 제출해주세요.

## 📞 문의

문의사항이 있으시면 이슈를 등록해주세요.

---

**Made with ❤️ by W.E Investing Team**
