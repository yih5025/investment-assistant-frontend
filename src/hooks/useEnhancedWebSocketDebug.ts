// hooks/useEnhancedWebSocketDebug.ts
// 강화된 WebSocket 디버깅 훅들

import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  enhancedWebSocketService, 
  WebSocketType, 
  ConnectionStatus, 
  DebugInfo, 
  ConnectionMetrics,
  WebSocketMessage 
} from '../services/enhancedWebSocketService';

// ============================================================================
// 1. 🎯 통합 디버깅 대시보드 훅
// ============================================================================

export interface DebugDashboardData {
  connectionHealth: Record<WebSocketType, any>;
  realtimeMetrics: Record<WebSocketType, ConnectionMetrics>;
  recentLogs: DebugInfo[];
  diagnosticReport: any;
  isDebugMode: boolean;
}

export function useWebSocketDebugDashboard() {
  const [dashboardData, setDashboardData] = useState<DebugDashboardData>({
    connectionHealth: {} as any,
    realtimeMetrics: {} as any,
    recentLogs: [],
    diagnosticReport: {},
    isDebugMode: true
  });

  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(2000); // 2초

  // 실시간 데이터 업데이트
  const refreshDashboard = useCallback(() => {
    const newData: DebugDashboardData = {
      connectionHealth: enhancedWebSocketService.checkConnectionHealth(),
      realtimeMetrics: enhancedWebSocketService.getAllMetrics(),
      recentLogs: enhancedWebSocketService.getDebugLogs().slice(-20),
      diagnosticReport: enhancedWebSocketService.generateDiagnosticReport(),
      isDebugMode: enhancedWebSocketService.toggleDebugMode() // 현재 상태 확인
    };
    
    setDashboardData(newData);
  }, []);

  // 자동 새로고침
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(refreshDashboard, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, refreshDashboard]);

  // 디버그 이벤트 구독
  useEffect(() => {
    const unsubscribeDebug = enhancedWebSocketService.subscribe('debug', (debugInfo: DebugInfo) => {
      setDashboardData(prev => ({
        ...prev,
        recentLogs: [...prev.recentLogs.slice(-19), debugInfo]
      }));
    });

    const unsubscribeMetrics = enhancedWebSocketService.subscribe('metrics', ({ type, metrics }: { type: WebSocketType; metrics: ConnectionMetrics }) => {
      setDashboardData(prev => ({
        ...prev,
        realtimeMetrics: {
          ...prev.realtimeMetrics,
          [type]: metrics
        }
      }));
    });

    // 초기 데이터 로드
    refreshDashboard();

    return () => {
      unsubscribeDebug();
      unsubscribeMetrics();
    };
  }, [refreshDashboard]);

  const toggleDebugMode = useCallback(() => {
    const newMode = enhancedWebSocketService.toggleDebugMode();
    setDashboardData(prev => ({ ...prev, isDebugMode: newMode }));
    return newMode;
  }, []);

  const toggleAutoRefresh = useCallback(() => {
    setAutoRefresh(prev => !prev);
  }, []);

  const simulateMessage = useCallback((type: WebSocketType, messageType: string) => {
    enhancedWebSocketService.simulateMessage(type, messageType);
  }, []);

  return {
    dashboardData,
    refreshDashboard,
    toggleDebugMode,
    toggleAutoRefresh,
    simulateMessage,
    autoRefresh,
    setRefreshInterval,
    refreshInterval
  };
}

// ============================================================================
// 2. 🎯 연결 상태 건강성 모니터링 훅
// ============================================================================

export interface HealthStatus {
  overall: 'healthy' | 'warning' | 'critical';
  details: Record<WebSocketType, {
    status: 'healthy' | 'warning' | 'critical';
    issues: string[];
    lastSeen: Date | null;
    messageRate: number; // 분당 메시지 수
  }>;
  summary: {
    connectedCount: number;
    totalErrors: number;
    avgMessageRate: number;
  };
}

export function useConnectionHealth() {
  const [healthStatus, setHealthStatus] = useState<HealthStatus>({
    overall: 'critical',
    details: {} as any,
    summary: { connectedCount: 0, totalErrors: 0, avgMessageRate: 0 }
  });

  const [alerts, setAlerts] = useState<Array<{
    id: string;
    type: WebSocketType;
    severity: 'warning' | 'critical';
    message: string;
    timestamp: Date;
  }>>([]);

  const checkHealth = useCallback(() => {
    const connectionHealth = enhancedWebSocketService.checkConnectionHealth();
    const metrics = enhancedWebSocketService.getAllMetrics();

    const details: HealthStatus['details'] = {} as any;
    let connectedCount = 0;
    let totalErrors = 0;
    let totalMessageRate = 0;

    (['crypto', 'sp500', 'topgainers'] as WebSocketType[]).forEach(type => {
      const health = connectionHealth[type];
      const metric = metrics[type];

      // 건강성 평가
      let status: 'healthy' | 'warning' | 'critical' = 'critical';
      const issues: string[] = [];

      if (health.connected) {
        connectedCount++;
        
        if (health.isHealthy) {
          status = 'healthy';
        } else {
          status = 'warning';
          issues.push(...health.issues);
        }
      } else {
        issues.push(`연결되지 않음 (${health.status})`);
      }

      // 메시지 레이트 계산 (분당)
      const messageRate = metric.averageMessageInterval > 0 
        ? 60000 / metric.averageMessageInterval 
        : 0;

      totalErrors += metric.errorCount;
      totalMessageRate += messageRate;

      details[type] = {
        status,
        issues,
        lastSeen: metric.lastMessageAt,
        messageRate
      };

      // 알림 생성
      if (status === 'critical' || (status === 'warning' && issues.length > 0)) {
        const alertId = `${type}-${Date.now()}`;
        setAlerts(prev => {
          // 중복 알림 방지
          const exists = prev.some(alert => 
            alert.type === type && 
            alert.message === issues[0] &&
            Date.now() - alert.timestamp.getTime() < 30000 // 30초 내 중복 방지
          );
          
          if (!exists && issues.length > 0) {
            return [...prev.slice(-9), {
              id: alertId,
              type,
              severity: status === 'critical' ? 'critical' : 'warning',
              message: issues[0],
              timestamp: new Date()
            }];
          }
          return prev;
        });
      }
    });

    // 전체 건강성 평가
    let overall: 'healthy' | 'warning' | 'critical' = 'critical';
    if (connectedCount === 3) {
      const hasWarnings = Object.values(details).some(d => d.status === 'warning');
      overall = hasWarnings ? 'warning' : 'healthy';
    } else if (connectedCount > 0) {
      overall = 'warning';
    }

    setHealthStatus({
      overall,
      details,
      summary: {
        connectedCount,
        totalErrors,
        avgMessageRate: totalMessageRate / 3
      }
    });
  }, []);

  // 정기적인 건강성 체크
  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 5000); // 5초마다
    return () => clearInterval(interval);
  }, [checkHealth]);

  const clearAlerts = useCallback(() => {
    setAlerts([]);
  }, []);

  const dismissAlert = useCallback((alertId: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== alertId));
  }, []);

  return {
    healthStatus,
    alerts,
    clearAlerts,
    dismissAlert,
    checkHealth,
    isHealthy: healthStatus.overall === 'healthy',
    hasWarnings: healthStatus.overall === 'warning',
    isCritical: healthStatus.overall === 'critical'
  };
}

// ============================================================================
// 3. 🎯 실시간 메시지 모니터링 훅
// ============================================================================

export interface MessageActivity {
  type: WebSocketType;
  recentMessages: Array<{
    timestamp: Date;
    messageType: string;
    hasData: boolean;
    dataCount?: number;
    size: number;
  }>;
  messageRate: number; // 초당 메시지 수
  lastActivity: Date | null;
  isActive: boolean;
}

export function useMessageMonitor() {
  const [messageActivity, setMessageActivity] = useState<Record<WebSocketType, MessageActivity>>({
    crypto: { type: 'crypto', recentMessages: [], messageRate: 0, lastActivity: null, isActive: false },
    sp500: { type: 'sp500', recentMessages: [], messageRate: 0, lastActivity: null, isActive: false },
    topgainers: { type: 'topgainers', recentMessages: [], messageRate: 0, lastActivity: null, isActive: false }
  });

  const [totalMessageCount, setTotalMessageCount] = useState(0);
  const [messageHistory, setMessageHistory] = useState<Array<{
    type: WebSocketType;
    timestamp: Date;
    messageType: string;
    dataPreview?: any;
  }>>([]);

  // 메시지 활동 업데이트
  const updateActivity = useCallback((type: WebSocketType, debugInfo: DebugInfo) => {
    if (debugInfo.event !== 'message') return;

    const now = new Date();
    setTotalMessageCount(prev => prev + 1);
    
    setMessageActivity(prev => {
      const activity = prev[type];
      const newMessage = {
        timestamp: now,
        messageType: debugInfo.data.analysis?.messageType || 'unknown',
        hasData: debugInfo.data.analysis?.hasData || false,
        dataCount: debugInfo.data.analysis?.dataLength || 0,
        size: debugInfo.metadata?.messageSize || 0
      };

      const recentMessages = [...activity.recentMessages.slice(-19), newMessage];
      
      // 메시지 레이트 계산 (최근 10개 메시지 기준)
      let messageRate = 0;
      if (recentMessages.length >= 2) {
        const timeSpan = now.getTime() - recentMessages[Math.max(0, recentMessages.length - 10)].timestamp.getTime();
        if (timeSpan > 0) {
          messageRate = (Math.min(10, recentMessages.length - 1) * 1000) / timeSpan;
        }
      }

      return {
        ...prev,
        [type]: {
          ...activity,
          recentMessages,
          messageRate,
          lastActivity: now,
          isActive: messageRate > 0
        }
      };
    });

    // 전체 메시지 히스토리 업데이트
    setMessageHistory(prev => [...prev.slice(-49), {
      type,
      timestamp: now,
      messageType: debugInfo.data.analysis?.messageType || 'unknown',
      dataPreview: debugInfo.data.sampleData
    }]);
  }, []);

  // 디버그 이벤트 구독
  useEffect(() => {
    const unsubscribe = enhancedWebSocketService.subscribe('debug', (debugInfo: DebugInfo) => {
      updateActivity(debugInfo.type, debugInfo);
    });

    return unsubscribe;
  }, [updateActivity]);

  const getActivitySummary = useMemo(() => {
    const summary = {
      totalTypes: Object.keys(messageActivity).length,
      activeTypes: Object.values(messageActivity).filter(a => a.isActive).length,
      totalRate: Object.values(messageActivity).reduce((sum, a) => sum + a.messageRate, 0),
      mostActive: Object.values(messageActivity).reduce((max, current) => 
        current.messageRate > max.messageRate ? current : max
      , messageActivity.crypto),
      leastActive: Object.values(messageActivity).reduce((min, current) => 
        current.messageRate < min.messageRate ? current : min
      , messageActivity.crypto)
    };

    return summary;
  }, [messageActivity]);

  const clearHistory = useCallback(() => {
    setMessageHistory([]);
    setTotalMessageCount(0);
  }, []);

  return {
    messageActivity,
    messageHistory,
    totalMessageCount,
    activitySummary: getActivitySummary,
    clearHistory
  };
}

// ============================================================================
// 4. 🎯 문제 해결 도우미 훅
// ============================================================================

export interface TroubleshootingStep {
  id: string;
  title: string;
  description: string;
  action?: () => void;
  actionLabel?: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: string;
}

export function useTroubleshooting() {
  const [troubleshootingSteps, setTroubleshootingSteps] = useState<TroubleshootingStep[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState<string | null>(null);

  const generateTroubleshootingSteps = useCallback((type: WebSocketType) => {
    const health = enhancedWebSocketService.checkConnectionHealth()[type];
    const metrics = enhancedWebSocketService.getMetrics(type);
    
    const steps: TroubleshootingStep[] = [
      {
        id: 'check-connection',
        title: '연결 상태 확인',
        description: `${type} WebSocket 연결 상태를 확인합니다.`,
        status: health.connected ? 'completed' : 'failed',
        result: health.connected ? '연결됨' : `연결 안됨 (${health.status})`
      },
      {
        id: 'check-messages',
        title: '메시지 수신 확인',
        description: '최근 메시지 수신 여부를 확인합니다.',
        status: metrics && metrics.messageCount > 0 ? 'completed' : 'failed',
        result: metrics ? `${metrics.messageCount}개 메시지 수신` : '메시지 없음'
      },
      {
        id: 'simulate-message',
        title: '테스트 메시지 시뮬레이션',
        description: '테스트 데이터로 메시지 처리 로직을 확인합니다.',
        action: () => enhancedWebSocketService.simulateMessage(type, `${type}_update`),
        actionLabel: '테스트 실행',
        status: 'pending'
      },
      {
        id: 'reconnect',
        title: '연결 재시도',
        description: 'WebSocket 연결을 다시 시도합니다.',
        action: () => enhancedWebSocketService.reconnect(type),
        actionLabel: '재연결',
        status: 'pending'
      }
    ];

    // 타입별 특별한 단계들
    if (type === 'sp500' || type === 'topgainers') {
      steps.splice(2, 0, {
        id: 'check-redis-data',
        title: 'Redis 데이터 확인 필요',
        description: '백엔드에서 Redis에 해당 데이터가 있는지 확인이 필요합니다.',
        status: 'pending',
        result: '수동 확인 필요: redis-cli keys "*' + type + '*"'
      });
    }

    setTroubleshootingSteps(steps);
    return steps;
  }, []);

  const runTroubleshootingStep = useCallback(async (stepId: string) => {
    setCurrentStep(stepId);
    setTroubleshootingSteps(prev => 
      prev.map(step => 
        step.id === stepId 
          ? { ...step, status: 'running' }
          : step
      )
    );

    try {
      const step = troubleshootingSteps.find(s => s.id === stepId);
      if (step?.action) {
        await step.action();
        
        // 잠시 대기 후 결과 확인
        setTimeout(() => {
          setTroubleshootingSteps(prev => 
            prev.map(s => 
              s.id === stepId 
                ? { ...s, status: 'completed', result: '실행 완료' }
                : s
            )
          );
        }, 1000);
      }
    } catch (error) {
      setTroubleshootingSteps(prev => 
        prev.map(step => 
          step.id === stepId 
            ? { ...step, status: 'failed', result: `실패: ${error}` }
            : step
        )
      );
    } finally {
      setCurrentStep(null);
    }
  }, [troubleshootingSteps]);

  const runAllSteps = useCallback(async () => {
    setIsRunning(true);
    
    for (const step of troubleshootingSteps) {
      if (step.action) {
        await runTroubleshootingStep(step.id);
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2초 대기
      }
    }
    
    setIsRunning(false);
  }, [troubleshootingSteps, runTroubleshootingStep]);

  const resetSteps = useCallback(() => {
    setTroubleshootingSteps([]);
    setCurrentStep(null);
    setIsRunning(false);
  }, []);

  return {
    troubleshootingSteps,
    generateTroubleshootingSteps,
    runTroubleshootingStep,
    runAllSteps,
    resetSteps,
    isRunning,
    currentStep
  };
}

// ============================================================================
// 5. 🎯 성능 메트릭스 훅
// ============================================================================

export function usePerformanceMetrics() {
  const [performanceData, setPerformanceData] = useState<{
    messageRates: Record<WebSocketType, number[]>;
    errorRates: Record<WebSocketType, number[]>;
    connectionUptime: Record<WebSocketType, number>;
    dataVolume: Record<WebSocketType, number>;
    lastUpdated: Date;
  }>({
    messageRates: { crypto: [], sp500: [], topgainers: [] },
    errorRates: { crypto: [], sp500: [], topgainers: [] },
    connectionUptime: { crypto: 0, sp500: 0, topgainers: 0 },
    dataVolume: { crypto: 0, sp500: 0, topgainers: 0 },
    lastUpdated: new Date()
  });

  // 성능 데이터 수집
  useEffect(() => {
    const interval = setInterval(() => {
      const metrics = enhancedWebSocketService.getAllMetrics();
      const connectionHealth = enhancedWebSocketService.checkConnectionHealth();

      setPerformanceData(prev => {
        const newData = { ...prev };

        (['crypto', 'sp500', 'topgainers'] as WebSocketType[]).forEach(type => {
          const metric = metrics[type];
          const health = connectionHealth[type];

          // 메시지 레이트 히스토리 (최근 30개 포인트)
          const messageRate = metric.averageMessageInterval > 0 
            ? 60000 / metric.averageMessageInterval 
            : 0;
          newData.messageRates[type] = [...prev.messageRates[type].slice(-29), messageRate];

          // 에러 레이트 계산
          const errorRate = metric.messageCount > 0 
            ? (metric.errorCount / metric.messageCount) * 100 
            : 0;
          newData.errorRates[type] = [...prev.errorRates[type].slice(-29), errorRate];

          // 연결 업타임 계산 (분)
          if (metric.connectedAt && health.connected) {
            newData.connectionUptime[type] = 
              (Date.now() - metric.connectedAt.getTime()) / (1000 * 60);
          }

          // 데이터 볼륨 (총 수신 데이터)
          newData.dataVolume[type] = metric.totalDataReceived;
        });

        newData.lastUpdated = new Date();
        return newData;
      });
    }, 5000); // 5초마다 업데이트

    return () => clearInterval(interval);
  }, []);

  const getPerformanceSummary = useMemo(() => {
    const summary = {
      avgMessageRate: Object.values(performanceData.messageRates)
        .flatMap(rates => rates)
        .reduce((sum, rate, _, arr) => sum + rate / arr.length, 0),
      
      avgErrorRate: Object.values(performanceData.errorRates)
        .flatMap(rates => rates)
        .reduce((sum, rate, _, arr) => sum + rate / arr.length, 0),
      
      totalUptime: Object.values(performanceData.connectionUptime)
        .reduce((sum, uptime) => sum + uptime, 0),
      
      totalDataVolume: Object.values(performanceData.dataVolume)
        .reduce((sum, volume) => sum + volume, 0),

      // 성능 등급
      performanceGrade: (() => {
        const avgRate = Object.values(performanceData.messageRates)
          .flatMap(rates => rates.slice(-5)) // 최근 5개 포인트
          .reduce((sum, rate, _, arr) => arr.length > 0 ? sum + rate / arr.length : 0, 0);
        
        if (avgRate > 10) return 'A'; // 매우 좋음
        if (avgRate > 5) return 'B';  // 좋음
        if (avgRate > 1) return 'C';  // 보통
        return 'D'; // 나쁨
      })()
    };

    return summary;
  }, [performanceData]);

  const exportPerformanceData = useCallback(() => {
    const exportData = {
      timestamp: new Date().toISOString(),
      summary: getPerformanceSummary,
      details: performanceData,
      diagnosticReport: enhancedWebSocketService.generateDiagnosticReport()
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
      type: 'application/json' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `websocket-performance-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [performanceData, getPerformanceSummary]);

  return {
    performanceData,
    performanceSummary: getPerformanceSummary,
    exportPerformanceData
  };
}

// ============================================================================
// 6. 🎯 통합 디버깅 컴포넌트 훅
// ============================================================================

export function useDebugConsole() {
  const { dashboardData, refreshDashboard, toggleDebugMode, simulateMessage } = useWebSocketDebugDashboard();
  const { healthStatus, alerts, clearAlerts } = useConnectionHealth();
  const { messageActivity, activitySummary } = useMessageMonitor();
  const { troubleshootingSteps, generateTroubleshootingSteps, runTroubleshootingStep } = useTroubleshooting();
  const { performanceData, performanceSummary } = usePerformanceMetrics();

  const [selectedType, setSelectedType] = useState<WebSocketType>('crypto');
  const [activeTab, setActiveTab] = useState<'overview' | 'messages' | 'troubleshoot' | 'performance'>('overview');

  // 콘솔 명령어 실행
  const executeCommand = useCallback(async (command: string) => {
    const [cmd, ...args] = command.toLowerCase().trim().split(' ');
    
    switch (cmd) {
      case 'status':
        console.log('📊 WebSocket Status:', enhancedWebSocketService.getStatus());
        break;
        
      case 'health':
        console.log('🏥 Connection Health:', enhancedWebSocketService.checkConnectionHealth());
        break;
        
      case 'metrics':
        const type = args[0] as WebSocketType;
        if (type && ['crypto', 'sp500', 'topgainers'].includes(type)) {
          console.log(`📈 ${type} Metrics:`, enhancedWebSocketService.getMetrics(type));
        } else {
          console.log('📈 All Metrics:', enhancedWebSocketService.getAllMetrics());
        }
        break;
        
      case 'simulate':
        const simType = args[0] as WebSocketType;
        const messageType = args[1] || `${simType}_update`;
        if (simType && ['crypto', 'sp500', 'topgainers'].includes(simType)) {
          enhancedWebSocketService.simulateMessage(simType, messageType);
          console.log(`🧪 Simulated ${messageType} for ${simType}`);
        } else {
          console.log('❌ Usage: simulate <crypto|sp500|topgainers> [messageType]');
        }
        break;
        
      case 'reconnect':
        const reconnectType = args[0] as WebSocketType;
        if (reconnectType && ['crypto', 'sp500', 'topgainers'].includes(reconnectType)) {
          enhancedWebSocketService.reconnect(reconnectType);
          console.log(`🔄 Reconnecting ${reconnectType}...`);
        } else if (args[0] === 'all') {
          enhancedWebSocketService.reconnectAll();
          console.log('🔄 Reconnecting all...');
        } else {
          console.log('❌ Usage: reconnect <crypto|sp500|topgainers|all>');
        }
        break;
        
      case 'debug':
        const newMode = enhancedWebSocketService.toggleDebugMode();
        console.log(`🐛 Debug mode: ${newMode ? 'ON' : 'OFF'}`);
        break;
        
      case 'export':
        const report = enhancedWebSocketService.generateDiagnosticReport();
        console.log('📁 Diagnostic Report:', report);
        break;
        
      case 'troubleshoot':
        const troubleType = args[0] as WebSocketType;
        if (troubleType && ['crypto', 'sp500', 'topgainers'].includes(troubleType)) {
          const steps = generateTroubleshootingSteps(troubleType);
          console.log(`🔧 Troubleshooting steps for ${troubleType}:`, steps);
        } else {
          console.log('❌ Usage: troubleshoot <crypto|sp500|topgainers>');
        }
        break;
        
      case 'clear':
        console.clear();
        break;
        
      case 'help':
        console.log(`
🚀 WebSocket Debug Console Commands:

📊 status                    - Show overall WebSocket status
🏥 health                    - Show connection health
📈 metrics [type]            - Show metrics (optional: crypto|sp500|topgainers)
🧪 simulate <type> [msgType] - Simulate message
🔄 reconnect <type|all>      - Reconnect WebSocket
🐛 debug                     - Toggle debug mode
📁 export                    - Export diagnostic report  
🔧 troubleshoot <type>       - Generate troubleshooting steps
🧹 clear                     - Clear console
❓ help                      - Show this help

Examples:
> metrics crypto
> simulate sp500 sp500_update
> reconnect all
> troubleshoot topgainers
        `);
        break;
        
      default:
        console.log(`❌ Unknown command: ${cmd}. Type 'help' for available commands.`);
    }
  }, [generateTroubleshootingSteps]);

  // 빠른 진단 실행
  const runQuickDiagnosis = useCallback(async () => {
    console.log('🔍 Quick Diagnosis Starting...');
    
    // 1. 연결 상태 확인
    const health = enhancedWebSocketService.checkConnectionHealth();
    console.log('1️⃣ Connection Health:', health);
    
    // 2. 메트릭스 확인
    const metrics = enhancedWebSocketService.getAllMetrics();
    console.log('2️⃣ Metrics:', metrics);
    
    // 3. 문제가 있는 연결 찾기
    const problematicConnections = (Object.keys(health) as WebSocketType[])
      .filter(type => !health[type].isHealthy);
    
    if (problematicConnections.length > 0) {
      console.log('3️⃣ Problematic Connections:', problematicConnections);
      
      // 각 문제 연결에 대해 자동 문제해결 시도
      for (const type of problematicConnections) {
        console.log(`🔧 Auto-fixing ${type}...`);
        generateTroubleshootingSteps(type);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } else {
      console.log('3️⃣ ✅ All connections are healthy!');
    }
    
    console.log('🏁 Quick Diagnosis Complete!');
  }, [generateTroubleshootingSteps]);

  // 실시간 모니터링 상태
  const monitoringStatus = useMemo(() => {
    const totalConnections = 3;
    const healthyConnections = Object.values(healthStatus.details)
      .filter(d => d.status === 'healthy').length;
    
    return {
      overallHealth: healthStatus.overall,
      connectionRatio: `${healthyConnections}/${totalConnections}`,
      activeAlerts: alerts.length,
      totalMessages: activitySummary.totalRate.toFixed(2),
      performanceGrade: performanceSummary.performanceGrade,
      uptime: Math.max(...Object.values(performanceData.connectionUptime)).toFixed(1)
    };
  }, [healthStatus, alerts, activitySummary, performanceSummary, performanceData]);

  return {
    // 데이터
    dashboardData,
    healthStatus,
    alerts,
    messageActivity,
    troubleshootingSteps,
    performanceData,
    monitoringStatus,

    // 상태
    selectedType,
    activeTab,
    setSelectedType,
    setActiveTab,

    // 액션
    executeCommand,
    runQuickDiagnosis,
    refreshDashboard,
    toggleDebugMode,
    simulateMessage,
    clearAlerts,
    generateTroubleshootingSteps,
    runTroubleshootingStep,

    // 요약 정보
    activitySummary,
    performanceSummary
  };
}

// ============================================================================
// 7. 🎯 디버깅 유틸리티 함수들
// ============================================================================

export const debugUtils = {
  // WebSocket 상태를 색상으로 표현
  getStatusColor: (status: ConnectionStatus): string => {
    const colors = {
      connected: '#22c55e',    // 녹색
      connecting: '#f59e0b',   // 주황색
      reconnecting: '#ef4444', // 빨간색
      disconnected: '#6b7280'  // 회색
    };
    return colors[status as keyof typeof colors];
  },

  // 건강성 상태를 이모지로 표현
  getHealthEmoji: (health: 'healthy' | 'warning' | 'critical'): string => {
    const emojis = {
      healthy: '✅',
      warning: '⚠️',
      critical: '❌'
    };
    return emojis[health as keyof typeof emojis];
  },

  // 메시지 타입을 이모지로 표현
  getMessageTypeEmoji: (messageType: string): string => {
    const emojis: Record<string, string> = {
      crypto_update: '🪙',
      sp500_update: '📈',
      topgainers_update: '🚀',
      heartbeat: '💓',
      status: '📊',
      error: '❌'
    };
    return emojis[messageType as keyof typeof emojis] || '📨';
  },

  // 숫자를 읽기 쉬운 형태로 포맷
  formatNumber: (num: number, decimals: number = 2): string => {
    if (num >= 1e6) return `${(num / 1e6).toFixed(decimals)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(decimals)}K`;
    return num.toFixed(decimals);
  },

  // 시간 차이를 읽기 쉬운 형태로 표현
  formatTimeDiff: (date: Date | null): string => {
    if (!date) return 'Never';
    
    const diff = Date.now() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) return `${hours}h ${minutes % 60}m ago`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s ago`;
    return `${seconds}s ago`;
  },

  // 데이터 크기를 읽기 쉬운 형태로 표현
  formatBytes: (bytes: number): string => {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
  }
};

// 기본 export
export default {
  useWebSocketDebugDashboard,
  useConnectionHealth,
  useMessageMonitor,
  useTroubleshooting,
  usePerformanceMetrics,
  useDebugConsole,
  debugUtils
};