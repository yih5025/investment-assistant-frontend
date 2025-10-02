// src/components/EarningsCalendar.tsx
// 실적 발표 + IPO 통합 캘린더 컴포넌트

import { useState } from "react";
import { 
  Calendar, 
  TrendingUp, 
  Building2, 
  ChevronLeft, 
  ChevronRight, 
  ArrowLeft, 
  ExternalLink,
  RefreshCw,
  AlertCircle,
  Loader2,
  Rocket
} from "lucide-react";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { useEarningsCalendar } from "../hooks/useEarningsCalendar";
import { useIPOCalendar } from "../hooks/useIpoCalendar";
import { CalendarDateUtils } from "../services/earningsCalendarService";
import { 
  CalendarEventDisplay, 
  EarningsNewsResponse, 
  WeeklyEarningsNewsResponse,
  CalendarLoadingState,
  CalendarErrorState 
} from "../types/calendar";
import { IPOEventDisplay } from "../types/ipoCalendar";

export function EarningsCalendar() {
  // 캘린더 상태
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEventDisplay | null>(null);
  const [showNewsDetail, setShowNewsDetail] = useState(false);
  
  // 실적 발표 커스텀 훅
  const {
    calendarData,
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
  
  // IPO 커스텀 훅
  const {
    ipoData,
    loading: ipoLoading,
    error: ipoError,
    getIPOsForDate,
    getThisWeekIPOs,
    getThisMonthIPOs,
    refreshAll: refreshIPO,
    clearError: clearIPOError
  } = useIPOCalendar();

  // 현재 달 정보
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const today = new Date();
  
  // 달력에 표시할 날짜들
  const calendarDays = CalendarDateUtils.getCalendarDays(year, month);

  /**
   * 특정 날짜의 모든 이벤트 조회 (실적 + IPO)
   */
  const getAllEventsForDate = (date: Date): (CalendarEventDisplay | IPOEventDisplay)[] => {
    const earningsEvents = getEventsForDate(date);
    const ipoEvents = getIPOsForDate(date);
    return [...earningsEvents, ...ipoEvents];
  };

  /**
   * 이번 주 모든 이벤트 조회 (실적 + IPO)
   */
  const getAllThisWeekEvents = (): (CalendarEventDisplay | IPOEventDisplay)[] => {
    const earningsEvents = getThisWeekEvents();
    const ipoEvents = getThisWeekIPOs();
    return [...earningsEvents, ...ipoEvents].sort((a, b) => {
      const dateA = 'report_date' in a ? a.report_date : a.ipo_date;
      const dateB = 'report_date' in b ? b.report_date : b.ipo_date;
      return new Date(dateA).getTime() - new Date(dateB).getTime();
    });
  };

  /**
   * 이번 달 모든 이벤트 조회 (실적 + IPO)
   */
  const getAllThisMonthEvents = (): (CalendarEventDisplay | IPOEventDisplay)[] => {
    const earningsEvents = getThisMonthEvents();
    const ipoEvents = getThisMonthIPOs();
    return [...earningsEvents, ...ipoEvents].sort((a, b) => {
      const dateA = 'report_date' in a ? a.report_date : a.ipo_date;
      const dateB = 'report_date' in b ? b.report_date : b.ipo_date;
      return new Date(dateA).getTime() - new Date(dateB).getTime();
    });
  };

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
   * 이벤트 클릭 처리
   */
  const handleEventClick = async (event: CalendarEventDisplay | IPOEventDisplay) => {
    if ('ipo_date' in event) {
      // IPO 이벤트 - 간단한 alert 표시
      const priceInfo = event.price_range_low && event.price_range_high 
        ? `\n공모가: $${event.price_range_low} - $${event.price_range_high}`
        : '';
      const exchangeInfo = event.exchange ? `\n거래소: ${event.exchange}` : '';
      
      alert(`${event.company_name} (${event.symbol})\nIPO 예정일: ${event.ipo_date}${priceInfo}${exchangeInfo}`);
      return;
    }
    
    // 실적 발표 이벤트
    setSelectedEvent(event);
    
    if (event.total_news_count > 0) {
      await fetchEventNews(event.id);
    }
    
    setShowNewsDetail(true);
  };

  /**
   * 이벤트 배지 색상 (실적: 빨강, IPO: 초록)
   */
  const getEventBadgeColor = (event: CalendarEventDisplay | IPOEventDisplay) => {
    if ('ipo_date' in event) {
      return "bg-green-100 text-green-800 border border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800/50";
    }
    return "bg-red-100 text-red-800 border border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800/50";
  };

  /**
   * 실적 발표 중요도별 색상
   */
  const getImportanceColor = (importance: string) => {
    switch (importance) {
      case "high": 
        return "bg-red-100 text-red-800 border border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800/50";
      case "medium": 
        return "bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800/50";
      case "low": 
        return "bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800/50 dark:text-slate-300 dark:border-slate-700/50";
      default: 
        return "bg-blue-100 text-blue-800 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800/50";
    }
  };

  /**
   * 이벤트 아이콘
   */
  const getEventIcon = (event: CalendarEventDisplay | IPOEventDisplay) => {
    if ('ipo_date' in event) {
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

  // 뉴스 상세 페이지 렌더링
  if (showNewsDetail && selectedEvent) {
    const newsData = selectedEventNews;
    
    return (
      <div className="glass-card rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => {
              setShowNewsDetail(false);
              clearSelectedNews();
              setSelectedEvent(null);
            }}
            className="flex items-center space-x-2 px-3 py-1.5 glass-subtle rounded-lg hover:glass transition-all"
          >
            <ArrowLeft size={16} />
            <span className="text-sm">이벤트로 돌아가기</span>
          </button>
          
          <div className="text-sm text-foreground/70">
            {selectedEvent.total_news_count}개 뉴스
          </div>
        </div>

        <div className="glass-subtle rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-bold">{selectedEvent.company_name}</h2>
            <Badge className={getImportanceColor(selectedEvent.importance)}>
              {selectedEvent.event_type === 'earnings_report' ? '실적발표' : 
               selectedEvent.event_type === 'guidance' ? '가이던스' : '컨퍼런스'}
            </Badge>
          </div>
          <div className="text-sm text-foreground/70">
            {selectedEvent.display_time} • {selectedEvent.symbol}
          </div>
          {selectedEvent.estimate && (
            <div className="text-sm text-foreground/60 mt-1">
              예상 EPS: ${selectedEvent.estimate}
            </div>
          )}
        </div>

        {loading.news && (
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner size={24} />
            <span className="ml-2 text-sm text-foreground/70">뉴스를 불러오는 중...</span>
          </div>
        )}

        {errors.news && (
          <ErrorDisplay 
            error={errors.news} 
            onRetry={() => fetchEventNews(selectedEvent.id)} 
          />
        )}

        {newsData && !loading.news && (
          <div className="space-y-3">
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

  // 메인 캘린더 화면 렌더링
  return (
    <div className="glass-card rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Calendar size={20} className="text-primary" />
          <h3 className="font-medium">기업 일정 캘린더</h3>
        </div>
        
        <div className="flex items-center space-x-2">
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

      <div className="flex items-center justify-center space-x-6 mb-4 py-2 glass-subtle rounded-lg">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <span className="text-xs text-foreground/70">실적 발표</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <span className="text-xs text-foreground/70">IPO</span>
        </div>
      </div>

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

      {ipoError && (
        <div className="mb-4">
          <ErrorDisplay 
            error={ipoError} 
            onRetry={() => refreshIPO()} 
          />
        </div>
      )}

      {isInitialLoading && (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size={32} />
          <span className="ml-3 text-foreground/70">실적 데이터를 불러오는 중...</span>
        </div>
      )}

      {hasAnyData && !isInitialLoading && (
        <Tabs defaultValue="calendar" className="w-full">
          <TabsList className="grid w-full grid-cols-3 glass-card">
            <TabsTrigger value="calendar">캘린더</TabsTrigger>
            <TabsTrigger value="thisweek">이번주</TabsTrigger>
            <TabsTrigger value="thismonth">이번달</TabsTrigger>
          </TabsList>

          <TabsContent value="calendar" className="mt-4">
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['일', '월', '화', '수', '목', '금', '토'].map((day, index) => (
                <div key={index} className="text-center text-xs font-medium text-foreground/70 py-2">
                  {day}
                </div>
              ))}
            </div>

            <div className="calendar-grid-enhanced mb-4">
              {calendarDays.map((date, index) => {
                const isCurrentMonth = date.getMonth() === month;
                const isToday = date.toDateString() === today.toDateString();
                const events = getAllEventsForDate(date);
                
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
                  >
                    <span className="calendar-date-number text-xs font-medium">
                      {date.getDate()}
                    </span>
                    
                    {events.length > 0 && (
                      <div className="calendar-events-container">
                        {events.slice(0, 3).map((event, eventIndex) => (
                          <div
                            key={eventIndex}
                            onClick={() => handleEventClick(event)}
                            className={`event-badge ${getEventBadgeColor(event)}`}
                            title={
                              'ipo_date' in event
                                ? `${event.symbol} - ${event.company_name}\nIPO: $${event.price_range_low}-${event.price_range_high}`
                                : `${event.symbol} - ${event.company_name}\n뉴스: ${event.total_news_count || 0}개`
                            }
                          >
                            {event.symbol}
                          </div>
                        ))}
                        
                        {events.length > 3 && (
                          <div 
                            className="event-badge-more"
                            onClick={() => handleEventClick(events[0])}
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
          
          <TabsContent value="thisweek" className="mt-4">
            <div className="space-y-3">
              {getAllThisWeekEvents().map((event, index) => (
                <div
                  key={index}
                  className="glass-subtle p-3 rounded-lg cursor-pointer hover:glass transition-all group"
                  onClick={() => handleEventClick(event)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded ${getEventBadgeColor(event)} flex-shrink-0`}>
                        {getEventIcon(event)}
                      </div>
                      
                      <div>
                        <div className="font-medium text-sm group-hover:text-primary transition-colors">
                          {event.symbol} - {event.company_name}
                        </div>
                        <div className="text-xs text-foreground/60">
                          {event.display_time}
                          {'estimate' in event && event.estimate && (
                            <span className="ml-2">예상 EPS: ${event.estimate}</span>
                          )}
                          {'price_range_low' in event && event.price_range_low && (
                            <span className="ml-2">
                              공모가: ${event.price_range_low}-${event.price_range_high}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-foreground/50">
                          {'gics_sector' in event ? (
                            <>{event.gics_sector} • 뉴스 {event.total_news_count}개</>
                          ) : (
                            <>{event.exchange} • IPO</>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <ChevronRight size={16} className="text-foreground/40 group-hover:text-primary transition-colors" />
                  </div>
                </div>
              ))}
              
              {getAllThisWeekEvents().length === 0 && (
                <div className="glass-subtle p-8 rounded-lg text-center">
                  <Calendar size={48} className="mx-auto mb-4 text-foreground/30" />
                  <p className="text-foreground/70">이번 주 일정이 없습니다</p>
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="thismonth" className="mt-4">
            <div className="space-y-3">
              {getAllThisMonthEvents().map((event, index) => (
                <div
                  key={index}
                  className="glass-subtle p-3 rounded-lg cursor-pointer hover:glass transition-all group"
                  onClick={() => handleEventClick(event)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded ${getEventBadgeColor(event)} flex-shrink-0`}>
                        {getEventIcon(event)}
                      </div>
                      
                      <div>
                        <div className="font-medium text-sm group-hover:text-primary transition-colors">
                          {event.symbol} - {event.company_name}
                        </div>
                        <div className="text-xs text-foreground/60">
                          {event.display_time}
                          {'estimate' in event && event.estimate && (
                            <span className="ml-2">예상 EPS: ${event.estimate}</span>
                          )}
                          {'price_range_low' in event && event.price_range_low && (
                            <span className="ml-2">
                              공모가: ${event.price_range_low}-${event.price_range_high}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-foreground/50">
                          {'gics_sector' in event ? (
                            <>{event.gics_sector} • 뉴스 {event.total_news_count}개</>
                          ) : (
                            <>{event.exchange} • IPO</>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <ChevronRight size={16} className="text-foreground/40 group-hover:text-primary transition-colors" />
                  </div>
                </div>
              ))}
              
              {getAllThisMonthEvents().length === 0 && (
                <div className="glass-subtle p-8 rounded-lg text-center">
                  <Calendar size={48} className="mx-auto mb-4 text-foreground/30" />
                  <p className="text-foreground/70">이번 달 일정이 없습니다</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      )}

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

      {!isInitialLoading && (
        <EarningsNewsSection 
          selectedEvent={selectedEvent}
          selectedEventNews={selectedEventNews}
          weeklyNewsData={weeklyNewsData}
          loading={loading}
          errors={errors}
          onEventSelect={handleEventClick}
          onClearSelection={() => {
            setSelectedEvent(null);
            clearSelectedNews();
          }}
          onRefreshNews={fetchWeeklyNewsData}
          formatTimestamp={formatTimestamp}
        />
      )}
    </div>
  );
}

interface EarningsNewsSectionProps {
  selectedEvent: CalendarEventDisplay | null;
  selectedEventNews: EarningsNewsResponse | null;
  weeklyNewsData: WeeklyEarningsNewsResponse | null;
  loading: CalendarLoadingState;
  errors: CalendarErrorState;
  onEventSelect: (event: CalendarEventDisplay) => void;
  onClearSelection: () => void;
  onRefreshNews: () => void;
  formatTimestamp: (timestamp: string) => string;
}

function EarningsNewsSection({
  selectedEvent,
  selectedEventNews,
  weeklyNewsData,
  loading,
  errors,
  onEventSelect,
  onClearSelection,
  onRefreshNews,
  formatTimestamp
}: EarningsNewsSectionProps) {
  
  if (selectedEvent && selectedEventNews) {
    return (
      <div className="mt-6 pt-6 border-t border-foreground/10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <TrendingUp size={20} className="text-primary" />
            <h4 className="font-medium">
              {selectedEvent.symbol} - {selectedEvent.company_name} 실적 관련 뉴스
            </h4>
          </div>
          <button
            onClick={onClearSelection}
            className="text-sm text-foreground/60 hover:text-foreground underline"
          >
            전체 뉴스 보기
          </button>
        </div>

        <div className="space-y-3">
          {selectedEventNews.forecast_news.map((news, index) => (
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
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 pt-6 border-t border-foreground/10">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <TrendingUp size={20} className="text-primary" />
          <h4 className="font-medium">이번 주 실적 뉴스</h4>
          {weeklyNewsData && (
            <span className="text-sm text-foreground/60">
              ({weeklyNewsData.week_start} ~ {weeklyNewsData.week_end})
            </span>
          )}
        </div>
      </div>

      {loading.weekly && !weeklyNewsData && (
        <div className="flex items-center justify-center py-8">
          <Loader2 size={24} className="animate-spin text-primary" />
          <span className="ml-3 text-foreground/70">이번 주 뉴스를 불러오는 중...</span>
        </div>
      )}

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

      {weeklyNewsData && !loading.weekly && (
        <div className="space-y-4">
          {weeklyNewsData.earnings_with_news.map((earning, earningIndex) => (
            <div key={earningIndex} className="border-l-2 border-primary/20 pl-4">
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
                
                {earning.news_count > 3 && (
                  <button
                    onClick={() => {
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
                      onEventSelect(mockEvent);
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

      {weeklyNewsData && weeklyNewsData.earnings_with_news.length === 0 && !loading.weekly && (
        <div className="glass-subtle p-8 rounded-lg text-center">
          <TrendingUp size={48} className="mx-auto mb-4 text-foreground/30" />
          <p className="text-foreground/70 mb-2">이번 주 실적 관련 뉴스가 없습니다</p>
        </div>
      )}
    </div>
  );
}