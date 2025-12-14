// EarningsCalendar.tsx
// 백엔드 API와 연동된 실적 발표 + IPO 통합 캘린더 컴포넌트

import { useState } from "react";
import { 
  Calendar, 
  TrendingUp, 
  Building2, 
  ChevronLeft, 
  ChevronRight, 
  ArrowLeft, 
  ExternalLink,
  Loader2,
  AlertCircle,
  Rocket,
  Mail,
  Bell,
  Check,
  X
} from "lucide-react";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { useEarningsCalendar } from "../hooks/useEarningsCalendar";
import { useEmailSubscription } from "../hooks/useEmailSubscription";
import { CalendarDateUtils } from "../services/earningsCalendarService";
import { 
  UnifiedCalendarEvent,
  CalendarEventDisplay,
  IPOEventDisplay,
  EarningsNewsResponse, 
  WeeklyEarningsNewsResponse,
  CalendarLoadingState,
  CalendarErrorState,
  isEarningsEvent,
  isIPOEvent
} from "../types/calendar";

// ============================================================================
// 메인 컴포넌트
// ============================================================================

export function EarningsCalendar() {
  // ============ 상태 관리 ============
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // 3단계 네비게이션 상태
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<UnifiedCalendarEvent | null>(null);
  
  // 커스텀 훅으로 데이터 관리
  const {
    calendarData,
    ipoData,
    weeklyNewsData,
    selectedEventNews,
    loading,
    errors,
    getEventsForDate,
    getThisWeekEvents,
    getThisMonthEvents,
    fetchEventNews,
    fetchWeeklyNewsData,
    refreshAll,
    clearErrors,
    clearSelectedNews,
    hasAnyData,
    hasAnyError,
    isInitialLoading
  } = useEarningsCalendar();

  // 현재 달 정보
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const today = new Date();
  
  // 달력에 표시할 날짜들
  const calendarDays = CalendarDateUtils.getCalendarDays(year, month);

  // ============================================================================
  // 이벤트 핸들러
  // ============================================================================

  /**
   * 월 변경 핸들러
   */
  const handlePreviousMonth = () => {
    setCurrentDate(prevDate => {
      const newDate = new Date(prevDate);
      newDate.setMonth(prevDate.getMonth() - 1);
      return newDate;
    });
  };

  const handleNextMonth = () => {
    setCurrentDate(prevDate => {
      const newDate = new Date(prevDate);
      newDate.setMonth(prevDate.getMonth() + 1);
      return newDate;
    });
  };

  /**
   * 날짜 클릭 → 날짜별 이벤트 리스트 페이지로 이동
   */
  const handleDateClick = (date: Date) => {
    const events = getEventsForDate(date);
    if (events.length > 0) {
      setSelectedDate(date);
      setSelectedEvent(null); // 이벤트 선택 초기화
    }
  };

  /**
   * 이벤트 클릭 → 뉴스 페이지로 이동 (Earnings만)
   */
  const handleEventClick = async (event: UnifiedCalendarEvent) => {
    setSelectedEvent(event);
    
    // 이벤트의 날짜를 selectedDate로 설정 (Level 3 렌더링을 위해 필요)
    if (isEarningsEvent(event)) {
      setSelectedDate(new Date(event.report_date));
      // Earnings 이벤트만 뉴스 조회
      if (event.total_news_count > 0) {
        await fetchEventNews(event.id);
      }
    } else if (isIPOEvent(event)) {
      setSelectedDate(new Date(event.ipo_date));
    }
  };

  /**
   * SP500Detail 페이지로 이동 (App.tsx의 handleStockClick 호출)
   */
  const navigateToStockDetail = (symbol: string) => {
    const event = new CustomEvent('navigateToStockDetail', { detail: { symbol } });
    window.dispatchEvent(event);
  };

  // ============================================================================
  // 유틸리티 함수
  // ============================================================================

  /**
   * 이벤트 타입별 색상
   */
  const getEventColor = (event: UnifiedCalendarEvent) => {
    if (isIPOEvent(event)) {
      // IPO는 초록색
      return "bg-success/20 text-success border border-success/30";
    }
    
    // Earnings는 중요도별 파란색
    const importance = event.importance;
    switch (importance) {
      case "high": 
        return "bg-primary/30 text-primary-light border border-primary/50";
      case "medium": 
        return "bg-primary/20 text-primary border border-primary/30";
      case "low": 
        return "bg-primary/10 text-primary/80 border border-primary/20";
      default: 
        return "bg-blue-100 text-blue-800 border border-blue-200";
    }
  };

  /**
   * 이벤트 아이콘
   */
  const getEventIcon = (event: UnifiedCalendarEvent) => {
    if (isIPOEvent(event)) {
      return <Rocket size={12} />;
    }
    
    switch (event.event_type) {
      case "earnings_report": return <TrendingUp size={12} />;
      case "guidance": return <Building2 size={12} />;
      case "conference": return <Calendar size={12} />;
      default: return <TrendingUp size={12} />;
    }
  };

  /**
   * 시간 포맷팅
   */
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / 3600000);
    
    if (diffHours < 1) {
      return "방금 전";
    } else if (diffHours < 24) {
      return `${diffHours}시간 전`;
    } else {
      return date.toLocaleDateString("ko-KR", { 
        month: "short", 
        day: "numeric"
      });
    }
  };

  /**
   * 에러 표시 컴포넌트
   */
  const ErrorDisplay = ({ error, onRetry }: { error: string; onRetry: () => void }) => (
    <div className="glass-subtle p-4 rounded-lg border border-red-500/20">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <AlertCircle size={16} className="text-red-400" />
          <span className="text-sm text-red-400">{error}</span>
        </div>
        <button
          onClick={onRetry}
          className="text-xs text-red-400 hover:text-red-300 underline"
        >
          다시 시도
        </button>
      </div>
    </div>
  );

  /**
   * 로딩 스피너 컴포넌트
   */
  const LoadingSpinner = ({ size = 16 }: { size?: number }) => (
    <Loader2 size={size} className="animate-spin text-primary" />
  );

  // ============================================================================
  // 렌더링: 3단계 네비게이션
  // ============================================================================

  // ============ Level 3: 기업 뉴스 상세 페이지 ============
  if (selectedEvent && selectedDate) {
    // IPO는 뉴스가 없으므로 정보만 표시
    if (isIPOEvent(selectedEvent)) {
      return (
        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => {
                setSelectedEvent(null);
                // 날짜 리스트로 돌아가기
              }}
              className="flex items-center space-x-2 px-3 py-1.5 glass-subtle rounded-lg hover:glass transition-all"
            >
              <ArrowLeft size={16} />
              <span className="text-sm">기업 리스트로 돌아가기</span>
            </button>
          </div>

          <div className="glass-subtle rounded-lg p-6 text-center">
            <Rocket size={48} className="mx-auto mb-4 text-success" />
            <h2 className="text-lg font-bold mb-2">{selectedEvent.company_name}</h2>
            <p className="text-sm text-foreground/70 mb-4">
              {selectedEvent.symbol} • {selectedEvent.exchange}
            </p>
            
            {selectedEvent.price_range_low && selectedEvent.price_range_high && (
              <div className="glass-card p-3 rounded-lg mb-4">
                <p className="text-xs text-foreground/60 mb-1">예상 IPO 가격</p>
                <p className="text-lg font-bold text-success">
                  ${selectedEvent.price_range_low} - ${selectedEvent.price_range_high}
                </p>
              </div>
            )}
            
            <p className="text-sm text-foreground/60 mt-6">
              IPO 기업은 상세 페이지 및 뉴스가 제공되지 않습니다.
            </p>
          </div>
        </div>
      );
    }

    // Earnings 이벤트 뉴스 페이지
    const earningsEvent = selectedEvent as CalendarEventDisplay;
    const newsData = selectedEventNews;
    
    return (
      <div className="glass-card rounded-xl p-4">
        {/* 뒤로가기 헤더 */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => {
              setSelectedEvent(null);
              clearSelectedNews();
            }}
            className="flex items-center space-x-2 px-3 py-1.5 glass-subtle rounded-lg hover:glass transition-all"
          >
            <ArrowLeft size={16} />
            <span className="text-sm">기업 리스트로 돌아가기</span>
          </button>
          
          <div className="text-sm text-foreground/70">
            {earningsEvent.total_news_count}개 뉴스
          </div>
        </div>

        {/* 기업 정보 + 상세보기 버튼 */}
        <div className="glass-subtle rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-lg font-bold">{earningsEvent.company_name}</h2>
              <div className="text-sm text-foreground/70 mt-1">
                {earningsEvent.display_time} • {earningsEvent.symbol}
              </div>
              {earningsEvent.estimate && (
                <div className="text-sm text-foreground/60 mt-1">
                  예상 EPS: ${earningsEvent.estimate}
                </div>
              )}
            </div>
            <Badge className={getEventColor(earningsEvent)}>
              {earningsEvent.event_type === 'earnings_report' ? '실적발표' : 
               earningsEvent.event_type === 'guidance' ? '가이던스' : '컨퍼런스'}
            </Badge>
          </div>
          
          {/* 기업 상세 페이지로 이동 버튼 */}
          <button
            onClick={() => navigateToStockDetail(earningsEvent.symbol)}
            className="w-full py-2.5 px-4 glass-strong rounded-lg hover:bg-primary/20 transition-all flex items-center justify-center space-x-2"
          >
            <Building2 size={16} />
            <span className="text-sm font-medium">기업 상세 페이지 보기</span>
            <ExternalLink size={14} />
          </button>
        </div>

        {/* 뉴스 로딩 상태 */}
        {loading.news && (
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner size={24} />
            <span className="ml-2 text-sm text-foreground/70">뉴스를 불러오는 중...</span>
          </div>
        )}

        {/* 뉴스 에러 상태 */}
        {errors.news && (
          <ErrorDisplay 
            error={errors.news} 
            onRetry={() => fetchEventNews(earningsEvent.id)} 
          />
        )}

        {/* 관련 뉴스 리스트 */}
        {newsData && !loading.news && (
          <div className="space-y-3">
            <h3 className="font-medium text-sm text-foreground/70 mb-3">관련 뉴스</h3>
            {newsData.forecast_news.length > 0 ? (
              newsData.forecast_news.map((news, index) => (
                <article
                  key={index}
                  className="glass-subtle p-4 rounded-lg cursor-pointer hover:glass transition-all group"
                  onClick={() => window.open(news.url, '_blank')}
                >
                  <div className="flex gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-foreground/90">{news.source}</span>
                        <span className="text-xs text-foreground/50">
                          {formatTimestamp(news.published_at)}
                        </span>
                      </div>
                      
                      <h3 className="font-medium mb-2 line-clamp-2 group-hover:text-primary transition-colors leading-tight">
                        {news.title}
                      </h3>
                      
                      <p className="text-sm text-foreground/70 line-clamp-2 mb-3 leading-snug">
                        {news.summary}
                      </p>
                      
                      <div className="flex items-center justify-between">
                        <ExternalLink size={14} className="text-foreground/40 group-hover:text-primary transition-colors" />
                      </div>
                    </div>
                  </div>
                </article>
              ))
            ) : (
              <div className="glass-subtle p-8 rounded-lg text-center">
                <Calendar size={48} className="mx-auto mb-4 text-foreground/30" />
                <p className="text-foreground/70">관련 뉴스가 없습니다</p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ============ Level 2: 날짜별 이벤트 리스트 페이지 ============
  if (selectedDate) {
    const eventsForDate = getEventsForDate(selectedDate);
    const dateString = selectedDate.toLocaleDateString('ko-KR', { 
      year: 'numeric',
      month: 'long', 
      day: 'numeric',
      weekday: 'long'
    });

    return (
      <div className="glass-card rounded-xl p-4">
        {/* 뒤로가기 헤더 */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => {
              setSelectedDate(null);
              setSelectedEvent(null);
            }}
            className="flex items-center space-x-2 px-3 py-1.5 glass-subtle rounded-lg hover:glass transition-all"
          >
            <ArrowLeft size={16} />
            <span className="text-sm">캘린더로 돌아가기</span>
          </button>
          
          <div className="text-sm text-foreground/70">
            {eventsForDate.length}개 일정
          </div>
        </div>

        {/* 날짜 정보 */}
        <div className="glass-subtle rounded-lg p-4 mb-4 text-center">
          <h2 className="text-lg font-bold">{dateString}</h2>
        </div>

        {/* 안내 문구 */}
        <div className="glass-subtle p-3 rounded-lg mb-4 text-center">
          <p className="text-xs text-foreground/60">
            IPO 기업은 상세 페이지 및 뉴스가 제공되지 않습니다
          </p>
        </div>

        {/* 이벤트 리스트 */}
        <div className="space-y-3">
          {eventsForDate.map((event, index) => {
            const isIPO = isIPOEvent(event);
            
            return (
              <div
                key={index}
                className="glass-subtle p-4 rounded-lg cursor-pointer hover:glass transition-all group"
                onClick={() => handleEventClick(event)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 flex-1">
                    <div className={`p-2 rounded ${getEventColor(event)} flex-shrink-0`}>
                      {getEventIcon(event)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <div className="font-medium text-sm group-hover:text-primary transition-colors">
                          {event.symbol} - {event.company_name}
                        </div>
                        {isIPO && (
                          <Badge className="bg-success/20 text-success text-xs">IPO</Badge>
                        )}
                      </div>
                      
                      <div className="text-xs text-foreground/60">
                        {isIPO ? (
                          <>
                            {event.exchange}
                            {event.price_range_low && event.price_range_high && (
                              <span className="ml-2">
                                ${event.price_range_low} - ${event.price_range_high}
                              </span>
                            )}
                          </>
                        ) : (
                          <>
                            {event.display_time}
                            {event.estimate && (
                              <span className="ml-2">예상 EPS: ${event.estimate}</span>
                            )}
                          </>
                        )}
                      </div>
                      
                      {!isIPO && (
                        <div className="text-xs text-foreground/50 mt-1">
                          {event.gics_sector} • 뉴스 {event.total_news_count}개
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <ChevronRight size={16} className="text-foreground/40 group-hover:text-primary transition-colors flex-shrink-0" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ============ Level 1: 메인 캘린더 화면 ============
  return (
    <div className="glass-card rounded-xl p-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Calendar size={20} className="text-primary" />
          <h3 className="font-medium">실적 발표 캘린더</h3>
        </div>
        
        <div className="flex items-center space-x-2">
          {/* 월 네비게이션 */}
          <button 
            onClick={handlePreviousMonth}
            className="p-1 glass-subtle rounded hover:glass transition-all"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-medium min-w-[120px] text-center">
            {year}년 {CalendarDateUtils.getMonthName(month)}
          </span>
          <button 
            onClick={handleNextMonth}
            className="p-1 glass-subtle rounded hover:glass transition-all"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* 전체 에러 표시 */}
      {hasAnyError && (
        <div className="mb-4">
          {errors.calendar && (
            <ErrorDisplay 
              error={errors.calendar} 
              onRetry={() => refreshAll()} 
            />
          )}
        </div>
      )}

      {/* 초기 로딩 상태 */}
      {isInitialLoading && (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size={32} />
          <span className="ml-3 text-foreground/70">실적 데이터를 불러오는 중...</span>
        </div>
      )}

      {/* 데이터가 있을 때만 탭 표시 */}
      {hasAnyData && !isInitialLoading && (
        <Tabs defaultValue="calendar" className="w-full">
          <TabsList className="grid w-full grid-cols-3 glass-card">
            <TabsTrigger value="calendar">캘린더</TabsTrigger>
            <TabsTrigger value="thisweek">이번주</TabsTrigger>
            <TabsTrigger value="thismonth">이번달</TabsTrigger>
          </TabsList>

          {/* 캘린더 탭 */}
          <TabsContent value="calendar">
            {/* 요일 헤더 */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['일', '월', '화', '수', '목', '금', '토'].map((day, index) => (
                <div key={index} className="text-center text-xs font-medium text-foreground/70 py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* 달력 그리드 */}
            <div className="calendar-grid-enhanced mb-4">
              {calendarDays.map((date, index) => {
                const isCurrentMonth = date.getMonth() === month;
                const isToday = date.toDateString() === today.toDateString();
                const events = getEventsForDate(date);
                
                return (
                  <div
                    key={index}
                    className={`calendar-day-enhanced relative ${
                      isCurrentMonth ? 'text-foreground' : 'text-foreground/30'
                    } ${
                      isToday ? 'bg-primary/20 text-primary' : ''
                    } ${
                      events.length > 0 ? 'has-event' : ''
                    }`}
                    onClick={() => events.length > 0 && handleDateClick(date)}
                  >
                    {/* 날짜 표시 */}
                    <span className="calendar-date-number text-xs font-medium">
                      {date.getDate()}
                    </span>
                    
                    {/* 이벤트 표시 */}
                    {events.length > 0 && (
                      <div className="calendar-events-container">
                        {events.slice(0, 3).map((event, eventIndex) => (
                          <div
                            key={eventIndex}
                            className={`event-badge ${getEventColor(event)} ${isIPOEvent(event) ? 'ipo-event-bg' : ''}`}
                            title={`${event.symbol} - ${event.company_name}${
                              isIPOEvent(event) ? ' (IPO)' : `\n뉴스: ${event.total_news_count || 0}개`
                            }`}
                          >
                            {event.symbol}
                          </div>
                        ))}
                        
                        {events.length > 3 && (
                          <div 
                            className="event-badge-more"
                            title={`총 ${events.length}개 일정`}
                          >
                            +{events.length - 3}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </TabsContent>
          
          {/* 이번주 탭 */}
          <TabsContent value="thisweek" className="mt-4">
            <div className="space-y-3">
              {getThisWeekEvents()
                .filter(event => !isIPOEvent(event) && event.total_news_count > 0)
                .map((event, index) => {
                const isIPO = isIPOEvent(event);
                
                return (
                  <div
                    key={index}
                    className="glass-subtle p-3 rounded-lg cursor-pointer hover:glass transition-all group"
                    onClick={() => handleEventClick(event)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded ${getEventColor(event)} flex-shrink-0`}>
                          {getEventIcon(event)}
                        </div>
                        
                        <div>
                          <div className="flex items-center space-x-2 mb-1">
                            <div className="font-medium text-sm group-hover:text-primary transition-colors">
                              {event.symbol} - {event.company_name}
                            </div>
                            {isIPO && (
                              <Badge className="bg-success/20 text-success text-xs">IPO</Badge>
                            )}
                          </div>
                          
                          <div className="text-xs text-foreground/60">
                            {event.display_time}
                            {!isIPO && event.estimate && (
                              <span className="ml-2">예상 EPS: ${event.estimate}</span>
                            )}
                          </div>
                          
                          {!isIPO && (
                            <div className="text-xs text-foreground/50">
                              {event.gics_sector} • 뉴스 {event.total_news_count}개
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <ChevronRight size={16} className="text-foreground/40 group-hover:text-primary transition-colors" />
                    </div>
                  </div>
                );
              })}
              
              {getThisWeekEvents().filter(event => !isIPOEvent(event) && event.total_news_count > 0).length === 0 && (
                <div className="glass-subtle p-8 rounded-lg text-center">
                  <Calendar size={48} className="mx-auto mb-4 text-foreground/30" />
                  <p className="text-foreground/70">이번 주 뉴스가 있는 실적 발표가 없습니다</p>
                </div>
              )}
            </div>
          </TabsContent>
          
          {/* 이번달 탭 */}
          <TabsContent value="thismonth" className="mt-4">
            <div className="space-y-3">
              {getThisMonthEvents()
                .filter(event => !isIPOEvent(event) && event.total_news_count > 0)
                .map((event, index) => {
                const isIPO = isIPOEvent(event);
                
                return (
                  <div
                    key={index}
                    className="glass-subtle p-3 rounded-lg cursor-pointer hover:glass transition-all group"
                    onClick={() => handleEventClick(event)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded ${getEventColor(event)} flex-shrink-0`}>
                          {getEventIcon(event)}
                        </div>
                        
                        <div>
                          <div className="flex items-center space-x-2 mb-1">
                            <div className="font-medium text-sm group-hover:text-primary transition-colors">
                              {event.symbol} - {event.company_name}
                            </div>
                            {isIPO && (
                              <Badge className="bg-success/20 text-success text-xs">IPO</Badge>
                            )}
                          </div>
                          
                          <div className="text-xs text-foreground/60">
                            {event.display_time}
                            {!isIPO && event.estimate && (
                              <span className="ml-2">예상 EPS: ${event.estimate}</span>
                            )}
                          </div>
                          
                          {!isIPO && (
                            <div className="text-xs text-foreground/50">
                              {event.gics_sector} • 뉴스 {event.total_news_count}개
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <ChevronRight size={16} className="text-foreground/40 group-hover:text-primary transition-colors" />
                    </div>
                  </div>
                );
              })}
              
              {getThisMonthEvents().filter(event => !isIPOEvent(event) && event.total_news_count > 0).length === 0 && (
                <div className="glass-subtle p-8 rounded-lg text-center">
                  <Calendar size={48} className="mx-auto mb-4 text-foreground/30" />
                  <p className="text-foreground/70">이번 달 뉴스가 있는 실적 발표가 없습니다</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      )}

      {/* 데이터 없음 상태 */}
      {!hasAnyData && !isInitialLoading && !hasAnyError && (
        <div className="glass-subtle p-8 rounded-lg text-center">
          <Calendar size={48} className="mx-auto mb-4 text-foreground/30" />
          <p className="text-foreground/70 mb-2">일정 데이터가 없습니다</p>
          <button
            onClick={refreshAll}
            className="text-sm text-primary hover:text-primary/80 underline"
          >
            다시 시도
          </button>
        </div>
      )}

      {/* 이메일 구독 섹션 */}
      {!isInitialLoading && hasAnyData && (
        <EmailSubscriptionSection />
      )}

      {/* 주간 뉴스 섹션 */}
      {!isInitialLoading && weeklyNewsData && (
        <EarningsNewsSection 
          weeklyNewsData={weeklyNewsData}
          loading={loading}
          errors={errors}
          onRefreshNews={fetchWeeklyNewsData}
          formatTimestamp={formatTimestamp}
          onEventClick={handleEventClick}
        />
      )}
    </div>
  );
}

// ============================================================================
// 주간 뉴스 섹션 (하단 피드)
// ============================================================================

interface EarningsNewsSectionProps {
  weeklyNewsData: WeeklyEarningsNewsResponse;
  loading: CalendarLoadingState;
  errors: CalendarErrorState;
  onRefreshNews: () => void;
  formatTimestamp: (timestamp: string) => string;
  onEventClick: (event: UnifiedCalendarEvent) => void;
}

function EarningsNewsSection({
  weeklyNewsData,
  loading,
  errors,
  onRefreshNews,
  formatTimestamp,
  onEventClick
}: EarningsNewsSectionProps) {
  
  return (
    <div className="mt-6 pt-6 border-t border-foreground/10">
      {/* 주간 뉴스 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <TrendingUp size={20} className="text-primary" />
          <h4 className="font-medium">이번 주 실적 뉴스</h4>
          <span className="text-sm text-foreground/60">
            ({weeklyNewsData.week_start} ~ {weeklyNewsData.week_end})
          </span>
        </div>
      </div>

      {/* 로딩 상태 */}
      {loading.weekly && !weeklyNewsData && (
        <div className="flex items-center justify-center py-8">
          <Loader2 size={24} className="animate-spin text-primary" />
          <span className="ml-3 text-foreground/70">이번 주 뉴스를 불러오는 중...</span>
        </div>
      )}

      {/* 에러 상태 */}
      {errors.weekly && (
        <div className="glass-subtle p-4 rounded-lg border border-red-500/20 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertCircle size={16} className="text-red-400" />
              <span className="text-sm text-red-400">{errors.weekly}</span>
            </div>
            <button
              onClick={onRefreshNews}
              className="text-xs text-red-400 hover:text-red-300 underline"
            >
              다시 시도
            </button>
          </div>
        </div>
      )}

      {/* 뉴스 리스트 */}
      {weeklyNewsData && !loading.weekly && (
        <div className="space-y-4">
          {weeklyNewsData.earnings_with_news.map((earning, earningIndex) => (
            <div key={earningIndex} className="border-l-2 border-primary/20 pl-4">
              {/* 기업 헤더 */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <Badge variant="outline" className="text-xs font-mono">
                    {earning.calendar_info.symbol}
                  </Badge>
                  <span className="font-medium text-sm">{earning.calendar_info.company_name}</span>
                  <span className="text-xs text-foreground/50">
                    {new Date(earning.calendar_info.report_date).toLocaleDateString('ko-KR', { 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </span>
                </div>
                <span className="text-xs text-foreground/40 bg-foreground/5 px-2 py-1 rounded">
                  {earning.news_count}개
                </span>
              </div>

              {/* 뉴스 리스트 */}
              <div className="space-y-2">
                {earning.forecast_news.slice(0, 3).map((news, newsIndex) => (
                  <div
                    key={newsIndex}
                    className="p-3 rounded-lg bg-background/50 border border-foreground/5 hover:border-primary/20 hover:bg-primary/5 transition-all cursor-pointer group"
                    onClick={() => window.open(news.url, '_blank')}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs text-foreground/60 font-medium">{news.source}</span>
                          <span className="text-xs text-foreground/40">
                            {formatTimestamp(news.published_at)}
                          </span>
                        </div>
                        
                        <h5 className="text-sm font-medium mb-1 line-clamp-1 group-hover:text-primary transition-colors">
                          {news.title}
                        </h5>
                        
                        <p className="text-xs text-foreground/60 line-clamp-2 leading-relaxed">
                          {news.summary}
                        </p>
                      </div>
                      
                      <ExternalLink size={14} className="text-foreground/30 group-hover:text-primary transition-colors flex-shrink-0 mt-1" />
                    </div>
                  </div>
                ))}
                
                {/* 더 보기 버튼 */}
                {earning.news_count > 3 && (
                  <button
                    onClick={() => {
                      // 해당 기업의 이벤트 객체 생성하여 클릭
                      const mockEvent: CalendarEventDisplay = {
                        id: earning.calendar_info.id,
                        symbol: earning.calendar_info.symbol,
                        company_name: earning.calendar_info.company_name,
                        report_date: earning.calendar_info.report_date,
                        fiscal_date_ending: earning.calendar_info.report_date,
                        estimate: parseFloat(earning.calendar_info.estimate),
                        currency: 'USD',
                        gics_sector: earning.calendar_info.gics_sector,
                        gics_sub_industry: '',
                        headquarters: '',
                        event_type: 'earnings_report',
                        event_title: earning.calendar_info.event_title,
                        event_description: '',
                        total_news_count: earning.news_count,
                        forecast_news_count: earning.forecast_news_count,
                        reaction_news_count: earning.reaction_news_count,
                        created_at: '',
                        updated_at: '',
                        importance: earning.news_count >= 10 ? 'high' : earning.news_count >= 5 ? 'medium' : 'low',
                        display_time: new Date(earning.calendar_info.report_date).toLocaleDateString('ko-KR'),
                        has_news: earning.news_count > 0
                      };
                      onEventClick(mockEvent);
                    }}
                    className="w-full text-center py-2 text-xs text-primary hover:text-primary/80 hover:bg-primary/5 rounded transition-all"
                  >
                    +{earning.news_count - 3}개 뉴스 더 보기
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 뉴스 없음 상태 */}
      {weeklyNewsData && weeklyNewsData.earnings_with_news.length === 0 && !loading.weekly && (
        <div className="glass-subtle p-8 rounded-lg text-center">
          <TrendingUp size={48} className="mx-auto mb-4 text-foreground/30" />
          <p className="text-foreground/70 mb-2">이번 주 실적 관련 뉴스가 없습니다</p>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 이메일 구독 섹션
// ============================================================================

function EmailSubscriptionSection() {
  const [email, setEmail] = useState('');
  const [showUnsubscribe, setShowUnsubscribe] = useState(false);
  
  const {
    loading,
    error,
    success,
    message,
    subscribe,
    unsubscribe,
    clearState
  } = useEmailSubscription();

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    await subscribe(email.trim());
  };

  const handleUnsubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    await unsubscribe(email.trim());
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (success || error) clearState();
  };

  const resetForm = () => {
    setEmail('');
    clearState();
  };

  return (
    <div className="mt-4">
      <div className="glass-subtle rounded-xl p-4">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-lg bg-primary/20">
              <Bell size={14} className="text-primary" />
            </div>
            <div>
              <h4 className="font-medium text-xs">주간 실적 발표 알림</h4>
              <p className="text-[10px] text-foreground/60">매주 일요일 다음 주 일정을 이메일로 받아보세요</p>
            </div>
          </div>
          <button
            onClick={() => { setShowUnsubscribe(!showUnsubscribe); resetForm(); }}
            className="text-[10px] text-foreground/50 hover:text-foreground/70"
          >
            {showUnsubscribe ? '구독하기' : '구독 취소'}
          </button>
        </div>

        {/* 성공/에러 메시지 */}
        {(success || error) && (
          <div className={`mb-3 p-2 rounded-lg flex items-center justify-between ${
            success 
              ? 'bg-success/10 border border-success/20' 
              : 'bg-red-500/10 border border-red-500/20'
          }`}>
            <div className="flex items-center space-x-1.5">
              {success ? (
                <Check size={12} className="text-success flex-shrink-0" />
              ) : (
                <AlertCircle size={12} className="text-red-400 flex-shrink-0" />
              )}
              <span className={`text-[10px] ${success ? 'text-success' : 'text-red-400'}`}>
                {message}
              </span>
            </div>
            <button 
              onClick={resetForm}
              className="p-0.5 hover:bg-foreground/10 rounded"
            >
              <X size={12} className="text-foreground/50" />
            </button>
          </div>
        )}

        {/* 구독 폼 */}
        {!showUnsubscribe ? (
          <form onSubmit={handleSubscribe} className="flex gap-2">
            <div className="relative flex-1">
              <Mail size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-foreground/40" />
              <input
                type="email"
                value={email}
                onChange={handleEmailChange}
                placeholder="이메일 주소를 입력하세요"
                className="w-full pl-7 pr-2 py-2 rounded-lg bg-background/50 border border-foreground/10 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/20 text-xs placeholder:text-foreground/40"
                required
                disabled={loading}
              />
            </div>
            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="px-3 py-2 rounded-lg bg-primary hover:bg-primary/90 disabled:bg-primary/50 disabled:cursor-not-allowed text-white font-medium text-xs flex items-center space-x-1"
            >
              {loading ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <>
                  <Bell size={12} />
                  <span>구독</span>
                </>
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleUnsubscribe} className="flex gap-2">
            <div className="relative flex-1">
              <Mail size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-foreground/40" />
              <input
                type="email"
                value={email}
                onChange={handleEmailChange}
                placeholder="구독 취소할 이메일 주소"
                className="w-full pl-7 pr-2 py-2 rounded-lg bg-background/50 border border-foreground/10 focus:border-red-500/50 focus:outline-none focus:ring-1 focus:ring-red-500/20 text-xs placeholder:text-foreground/40"
                required
                disabled={loading}
              />
            </div>
            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="px-3 py-2 rounded-lg bg-red-500/80 hover:bg-red-500 disabled:bg-red-500/40 disabled:cursor-not-allowed text-white font-medium text-xs flex items-center space-x-1"
            >
              {loading ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <>
                  <X size={12} />
                  <span>취소</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}