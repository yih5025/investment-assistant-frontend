// EarningsCalendar.tsx
// 백엔드 API와 연동된 실적 발표 캘린더 컴포넌트

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
  Loader2
} from "lucide-react";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { useEarningsCalendar } from "../hooks/useEarningsCalendar";
import { CalendarDateUtils } from "../services/earningsCalendarService";
import { 
  CalendarEventDisplay, 
  EarningsNewsResponse, 
  WeeklyEarningsNewsResponse,
  CalendarLoadingState,
  CalendarErrorState 
} from "../types/calendar";

export function EarningsCalendar() {
  // 캘린더 상태
  const [currentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEventDisplay | null>(null);
  const [showNewsDetail, setShowNewsDetail] = useState(false);
  
  // 커스텀 훅으로 데이터 관리
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

  // 현재 달 정보
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const today = new Date();
  
  // 달력에 표시할 날짜들
  const calendarDays = CalendarDateUtils.getCalendarDays(year, month);

  /**
   * 이벤트 클릭 처리
   */
  const handleEventClick = async (event: CalendarEventDisplay) => {
    setSelectedEvent(event);
    
    if (event.total_news_count > 0) {
      await fetchEventNews(event.id);
    }
    
    setShowNewsDetail(true);
  };
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

  const getEventIcon = (type: string) => {
    switch (type) {
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
        {/* 뒤로가기 헤더 */}
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

        {/* 이벤트 정보 */}
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
            onRetry={() => fetchEventNews(selectedEvent.id)} 
          />
        )}

        {/* 관련 뉴스 리스트 */}
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
                        <Badge variant="outline" className="text-xs">
                          {news.news_section === 'forecast' ? '예측' : '반응'}
                        </Badge>
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
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Calendar size={20} className="text-primary" />
          <h3 className="font-medium">실적 발표 캘린더</h3>
        </div>
        
        <div className="flex items-center space-x-2">
          {/* 새로고침 버튼 */}
          <button 
            onClick={refreshAll}
            disabled={loading.overall}
            className="p-1 glass-subtle rounded hover:glass transition-all disabled:opacity-50"
            title="데이터 새로고침"
          >
            {loading.overall ? <LoadingSpinner size={16} /> : <RefreshCw size={16} />}
          </button>
          
          {/* 월 네비게이션 */}
          <button className="p-1 glass-subtle rounded hover:glass transition-all">
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-medium min-w-[120px] text-center">
            {year}년 {CalendarDateUtils.getMonthName(month)}
          </span>
          <button className="p-1 glass-subtle rounded hover:glass transition-all">
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
          <TabsContent value="calendar" className="mt-4">
            {/* 요일 헤더 */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['일', '월', '화', '수', '목', '금', '토'].map((day, index) => (
                <div key={index} className="text-center text-xs font-medium text-foreground/70 py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* 달력 그리드 - 목업 스타일 그대로 사용 */}
            <div className="calendar-grid mb-4">
              {calendarDays.map((date, index) => {
                const isCurrentMonth = date.getMonth() === month;
                const isToday = date.toDateString() === today.toDateString();
                const events = getEventsForDate(date);
                
                return (
                  <div
                    key={index}
                    className={`calendar-day relative ${
                      isCurrentMonth ? 'text-foreground' : 'text-foreground/30'
                    } ${
                      isToday ? 'bg-primary/20 text-primary' : ''
                    } ${
                      events.length > 0 ? 'has-event' : ''
                    }`}
                  >
                    {/* 날짜 표시 */}
                    <span className="text-xs">{date.getDate()}</span>
                    
                    {/* 이벤트 표시 - 스택형 심볼 (목업 디자인 + 개선된 표시) */}
                    {events.length > 0 && (
                      <div className="absolute inset-x-1 bottom-1 flex flex-col gap-0.5">
                        {events.slice(0, 3).map((event, eventIndex) => (
                          <div
                            key={eventIndex}
                            onClick={() => handleEventClick(event)}
                            className={`text-center font-medium cursor-pointer transition-all hover:scale-105 ${getImportanceColor(event.importance)}`}
                            style={{
                              fontSize: '9px',
                              padding: '1px 2px',
                              lineHeight: '1'
                            }}
                            title={`${event.symbol} - ${event.company_name}\n뉴스: ${event.total_news_count || 0}개`}
                          >
                            {event.symbol}
                          </div>
                        ))}
                        
                        {events.length > 3 && (
                          <div 
                            className="text-center text-foreground/60 bg-foreground/10 cursor-pointer hover:bg-foreground/20 transition-all"
                            onClick={() => handleEventClick(events[0])}
                            style={{
                              fontSize: '8px',
                              padding: '1px',
                              lineHeight: '1'
                            }}
                            title={`총 ${events.length}개 실적 발표`}
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
              {getThisWeekEvents().map((event, index) => (
                <div
                  key={index}
                  className="glass-subtle p-3 rounded-lg cursor-pointer hover:glass transition-all group"
                  onClick={() => handleEventClick(event)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded ${getImportanceColor(event.importance)} flex-shrink-0`}>
                        {getEventIcon(event.event_type)}
                      </div>
                      
                      <div>
                        <div className="font-medium text-sm group-hover:text-primary transition-colors">
                          {event.symbol} - {event.company_name}
                        </div>
                        <div className="text-xs text-foreground/60">
                          {event.display_time}
                          {event.estimate && (
                            <span className="ml-2">예상 EPS: ${event.estimate}</span>
                          )}
                        </div>
                        <div className="text-xs text-foreground/50">
                          {event.gics_sector} • 뉴스 {event.total_news_count}개
                        </div>
                      </div>
                    </div>
                    
                    <ChevronRight size={16} className="text-foreground/40 group-hover:text-primary transition-colors" />
                  </div>
                </div>
              ))}
              
              {getThisWeekEvents().length === 0 && (
                <div className="glass-subtle p-8 rounded-lg text-center">
                  <Calendar size={48} className="mx-auto mb-4 text-foreground/30" />
                  <p className="text-foreground/70">이번 주 실적 발표가 없습니다</p>
                </div>
              )}
            </div>
          </TabsContent>
          
          {/* 이번달 탭 */}
          <TabsContent value="thismonth" className="mt-4">
            <div className="space-y-3">
              {getThisMonthEvents().map((event, index) => (
                <div
                  key={index}
                  className="glass-subtle p-3 rounded-lg cursor-pointer hover:glass transition-all group"
                  onClick={() => handleEventClick(event)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded ${getImportanceColor(event.importance)} flex-shrink-0`}>
                        {getEventIcon(event.event_type)}
                      </div>
                      
                      <div>
                        <div className="font-medium text-sm group-hover:text-primary transition-colors">
                          {event.symbol} - {event.company_name}
                        </div>
                        <div className="text-xs text-foreground/60">
                          {event.display_time}
                          {event.estimate && (
                            <span className="ml-2">예상 EPS: ${event.estimate}</span>
                          )}
                        </div>
                        <div className="text-xs text-foreground/50">
                          {event.gics_sector} • 뉴스 {event.total_news_count}개
                        </div>
                      </div>
                    </div>
                    
                    <ChevronRight size={16} className="text-foreground/40 group-hover:text-primary transition-colors" />
                  </div>
                </div>
              ))}
              
              {getThisMonthEvents().length === 0 && (
                <div className="glass-subtle p-8 rounded-lg text-center">
                  <Calendar size={48} className="mx-auto mb-4 text-foreground/30" />
                  <p className="text-foreground/70">이번 달 실적 발표가 없습니다</p>
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
          <p className="text-foreground/70 mb-2">실적 데이터가 없습니다</p>
          <button
            onClick={refreshAll}
            className="text-sm text-primary hover:text-primary/80 underline"
          >
            다시 시도
          </button>
        </div>
      )}

      {/* 뉴스 섹션 */}
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

/**
 * 뉴스 섹션 컴포넌트 (분리하여 가독성 향상)
 */
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
  
  // 특정 기업 선택된 경우
  if (selectedEvent && selectedEventNews) {
    return (
      <div className="mt-6 pt-6 border-t border-foreground/10">
        {/* 선택된 기업 뉴스 헤더 */}
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

        {/* 선택된 기업의 뉴스 리스트 */}
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
                    <Badge variant="outline" className="text-xs">
                      {news.news_section === 'forecast' ? '예측' : '반응'}
                    </Badge>
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

  // 기본 상태: 이번 주 주요 실적 뉴스
  return (
    <div className="mt-6 pt-6 border-t border-foreground/10">
      {/* 주간 뉴스 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <TrendingUp size={20} className="text-primary" />
          <h4 className="font-medium">이번 주 주요 실적 뉴스</h4>
          {weeklyNewsData && (
            <span className="text-sm text-foreground/60">
              ({weeklyNewsData.week_start} ~ {weeklyNewsData.week_end})
            </span>
          )}
        </div>
        <button
          onClick={onRefreshNews}
          disabled={loading.weekly}
          className="p-1 glass-subtle rounded hover:glass transition-all disabled:opacity-50"
          title="뉴스 새로고침"
        >
          {loading.weekly ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
        </button>
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
      {weeklyNewsData && !loading.weekly && (
        <div className="space-y-4">
          {weeklyNewsData.earnings_with_news.map((earning, earningIndex) => (
            <div key={earningIndex} className="border-l-2 border-primary/20 pl-4">
              {/* 기업 헤더 - 한 줄로 간결하게 */}
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

              {/* 뉴스 리스트 - 간결한 카드 */}
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
                
                {/* 더 보기 버튼 - 간결하게 */}
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