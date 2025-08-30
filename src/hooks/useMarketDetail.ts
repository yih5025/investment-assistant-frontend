import { useState, useEffect, useCallback } from 'react';

// 백엔드 API 응답 구조에 맞는 타입 정의
interface APIStockPrice {
  symbol: string;
  current_price: number;
  change_amount: number;
  change_percentage: number;
  volume: number;
  previous_close: number;
  market_status: {
    is_open: boolean;
    status: string;
  };
}

interface APICompanyData {
  name: string;
  sector: string;
  industry: string;
  description: string;
  website: string;
  market_cap: number;
  pe_ratio: number;
  dividend_yield: number;
  beta: number;
  roe: number;
  profit_margin: number;
  batch_id: number;
}

interface APIFinancialData {
  key_metrics: {
    total_assets: number;
    total_liabilities: number;
    shareholders_equity: number;
    cash_and_equivalents: number;
    fiscal_date_ending: string;
  };
  key_ratios: {
    current_ratio?: {
      value: number;
      status: string;
      description: string;
    };
    debt_to_asset?: {
      value: number;
      status: string;
      description: string;
    };
  };
  financial_health: {
    grade: string;
    score: number;
    status: string;
  };
  latest_period: string;
}

interface APIDataAvailability {
  current_price: boolean;
  company_overview: boolean;
  balance_sheet: boolean;
}

interface APIResponse {
  symbol: string;
  data_case: 'complete_data' | 'company_only' | 'financial_only' | 'basic_only';
  timestamp: string;
  current_price: APIStockPrice;
  data_availability: APIDataAvailability;
  company_info: {
    available: boolean;
    data?: APICompanyData;
    status?: string;
    message?: string;
  };
  financial_data: {
    available: boolean;
    data?: APIFinancialData;
    status?: string;
    message?: string;
  };
  integrated_analysis?: {
    available: boolean;
    summary?: string;
    investment_perspective?: string;
    key_highlights?: string[];
    message?: string;
  };
}

interface ChartDataPoint {
  timestamp: string;
  price: number;
  volume: number;
}

interface FinancialRatios {
  currentRatio: number;
  debtToAssetRatio: number;
  equityRatio: number;
  cashRatio: number;
}

interface InvestmentGrades {
  profitability: string;
  stability: string;
  valuation: string;
}

interface InvestmentRisk {
  level: 'high' | 'medium' | 'low';
  title: string;
  description: string;
}

interface SectorComparison {
  roe_vs_sector: number;
  pe_vs_sector: number;
  debt_vs_sector: number;
}

// 프론트엔드 데이터 가용성 타입 (camelCase)
interface DataAvailability {
  currentPrice: boolean;
  companyOverview: boolean;
  balanceSheet: boolean;
  integratedAnalysis: boolean;
}

interface UseMarketDetailReturn {
  // 로딩 및 에러 상태
  loading: boolean;
  chartLoading: boolean; // 차트 전용 로딩 상태
  error: string | null;
  
  // 데이터 케이스
  dataCase: 'complete_data' | 'company_only' | 'financial_only' | 'basic_only';
  
  // API 원본 데이터
  stockPrice: APIStockPrice | null;
  companyData: APICompanyData | null;
  financialData: APIFinancialData | null;
  chartData: ChartDataPoint[];
  
  // 데이터 가용성 (camelCase)
  dataAvailability: DataAvailability;
  
  // 계산된 분석 결과 (complete_data일 때만)
  ratios: FinancialRatios | null;
  grades: InvestmentGrades | null;
  risks: InvestmentRisk[];
  sectorComparison: SectorComparison | null;
  
  // 액션 함수들
  refreshData: () => Promise<void>;
  changeTimeframe: (timeframe: '1H' | '1D' | '1W' | '1MO') => Promise<void>;
  toggleFavorite: () => void;
  
  // UI 상태
  isFavorite: boolean;
  selectedTimeframe: '1H' | '1D' | '1W' | '1MO';
  
  // 통합 분석 정보
  integratedAnalysis: {
    available: boolean;
    summary?: string;
    investment_perspective?: string;
    key_highlights?: string[];
    message?: string;
  } | null;
}

export function useMarketDetail(symbol: string): UseMarketDetailReturn {
  // 기본 상태들
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(false); // 차트 전용 로딩 상태
  const [error, setError] = useState<string | null>(null);
  const [dataCase, setDataCase] = useState<'complete_data' | 'company_only' | 'financial_only' | 'basic_only'>('basic_only');
  
  // API 원본 데이터
  const [stockPrice, setStockPrice] = useState<APIStockPrice | null>(null);
  const [companyData, setCompanyData] = useState<APICompanyData | null>(null);
  const [financialData, setFinancialData] = useState<APIFinancialData | null>(null);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [integratedAnalysis, setIntegratedAnalysis] = useState<UseMarketDetailReturn['integratedAnalysis']>(null);
  
  // 데이터 가용성 (camelCase 형태로 관리)
  const [dataAvailability, setDataAvailability] = useState<DataAvailability>({
    currentPrice: false,
    companyOverview: false,
    balanceSheet: false,
    integratedAnalysis: false
  });
  
  // 계산된 분석 결과들
  const [ratios, setRatios] = useState<FinancialRatios | null>(null);
  const [grades, setGrades] = useState<InvestmentGrades | null>(null);
  const [risks, setRisks] = useState<InvestmentRisk[]>([]);
  const [sectorComparison, setSectorComparison] = useState<SectorComparison | null>(null);
  
  // UI 상태들
  const [isFavorite, setIsFavorite] = useState(false);
  const [selectedTimeframe, setSelectedTimeframe] = useState<'1H' | '1D' | '1W' | '1MO'>('1D');

  // 재무비율 계산 함수
  const calculateFinancialRatios = useCallback((financial: APIFinancialData): FinancialRatios => {
    const metrics = financial.key_metrics;
    const currentRatio = financial.key_ratios.current_ratio?.value || 0;
    const debtToAssetRatio = financial.key_ratios.debt_to_asset?.value || 0;
    
    return {
      currentRatio,
      debtToAssetRatio,
      equityRatio: metrics.shareholders_equity / metrics.total_assets || 0,
      cashRatio: metrics.cash_and_equivalents / (metrics.total_liabilities * 0.5) || 0 // 임시 계산
    };
  }, []);

  // 투자 등급 계산 함수
  const calculateInvestmentGrade = useCallback((company: APICompanyData, ratios: FinancialRatios): InvestmentGrades => {
    let profitabilityScore = 0;
    let stabilityScore = 0;
    let valuationScore = 0;

    // 수익성 점수 (ROE 기준)
    if (company.roe > 15) profitabilityScore = 4;
    else if (company.roe > 10) profitabilityScore = 3;
    else if (company.roe > 5) profitabilityScore = 2;
    else profitabilityScore = 1;

    // 안정성 점수 (부채비율, 유동비율 기준)
    const debtScore = ratios.debtToAssetRatio < 0.5 ? 2 : ratios.debtToAssetRatio < 0.7 ? 1 : 0;
    const liquidityScore = ratios.currentRatio > 1.5 ? 2 : ratios.currentRatio > 1.0 ? 1 : 0;
    stabilityScore = debtScore + liquidityScore;

    // 밸류에이션 점수 (PER 기준)
    if (company.pe_ratio < 15) valuationScore = 4;
    else if (company.pe_ratio < 20) valuationScore = 3;
    else if (company.pe_ratio < 30) valuationScore = 2;
    else valuationScore = 1;

    const grades = ['D', 'D+', 'C', 'C+', 'B', 'B+', 'A', 'A+'];
    
    return {
      profitability: grades[Math.min(profitabilityScore + 1, 7)],
      stability: grades[Math.min(stabilityScore + 1, 7)],
      valuation: grades[Math.min(valuationScore + 1, 7)]
    };
  }, []);

  // 투자 리스크 분석 함수
  const analyzeInvestmentRisks = useCallback((company: APICompanyData, ratios: FinancialRatios): InvestmentRisk[] => {
    const risks: InvestmentRisk[] = [];
    
    if (ratios.currentRatio < 1.2) {
      risks.push({
        level: 'high',
        title: '유동성 부족',
        description: `유동비율 ${ratios.currentRatio.toFixed(2)}로 단기 지급능력 부족`
      });
    }
    
    if (ratios.debtToAssetRatio > 0.6) {
      risks.push({
        level: 'medium',
        title: '높은 부채비율',
        description: `부채비율 ${(ratios.debtToAssetRatio * 100).toFixed(1)}%로 부채 부담 높음`
      });
    }
    
    if (company.pe_ratio > 25) {
      risks.push({
        level: 'medium',
        title: '고평가 우려',
        description: `PER ${company.pe_ratio}로 현재 주가가 다소 높은 수준`
      });
    }
    
    return risks;
  }, []);

  // 업종 평균 대비 비교 함수 (임시 데이터)
  const getSectorComparison = useCallback((company: APICompanyData, ratios: FinancialRatios): SectorComparison => {
    const sectorAverages = {
      roe: 8.5,
      pe_ratio: 18.2,
      debt_ratio: 45.0
    };
    
    return {
      roe_vs_sector: company.roe - sectorAverages.roe,
      pe_vs_sector: company.pe_ratio - sectorAverages.pe_ratio,
      debt_vs_sector: (ratios.debtToAssetRatio * 100) - sectorAverages.debt_ratio
    };
  }, []);

  // 통합 API 호출
  const fetchStockData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/stocks/sp500/symbol/${symbol}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const apiData: APIResponse = await response.json();
      
      // 기본 데이터 설정
      setDataCase(apiData.data_case);
      setStockPrice(apiData.current_price);
      
      // 백엔드 snake_case를 프론트엔드 camelCase로 변환
      setDataAvailability({
        currentPrice: apiData.data_availability.current_price,
        companyOverview: apiData.data_availability.company_overview,
        balanceSheet: apiData.data_availability.balance_sheet,
        integratedAnalysis: apiData.integrated_analysis?.available || false
      });
      
      // 조건부 데이터 설정
      if (apiData.company_info.available && apiData.company_info.data) {
        setCompanyData(apiData.company_info.data);
      } else {
        setCompanyData(null);
      }
      
      if (apiData.financial_data.available && apiData.financial_data.data) {
        setFinancialData(apiData.financial_data.data);
      } else {
        setFinancialData(null);
      }
      
      // 통합 분석 설정
      setIntegratedAnalysis(apiData.integrated_analysis || null);
      
      // complete_data인 경우에만 상세 분석 수행
      if (apiData.data_case === 'complete_data' && apiData.company_info.data && apiData.financial_data.data) {
        const calculatedRatios = calculateFinancialRatios(apiData.financial_data.data);
        const calculatedGrades = calculateInvestmentGrade(apiData.company_info.data, calculatedRatios);
        const calculatedRisks = analyzeInvestmentRisks(apiData.company_info.data, calculatedRatios);
        const calculatedSectorComparison = getSectorComparison(apiData.company_info.data, calculatedRatios);
        
        setRatios(calculatedRatios);
        setGrades(calculatedGrades);
        setRisks(calculatedRisks);
        setSectorComparison(calculatedSectorComparison);
      } else {
        // 불완전한 데이터인 경우 분석 결과 초기화
        setRatios(null);
        setGrades(null);
        setRisks([]);
        setSectorComparison(null);
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : '데이터를 가져오는데 실패했습니다.');
      console.error('데이터 로딩 실패:', err);
    } finally {
      setLoading(false);
    }
  }, [symbol, calculateFinancialRatios, calculateInvestmentGrade, analyzeInvestmentRisks, getSectorComparison]);

  // 차트 데이터 가져오기
  const fetchChartData = useCallback(async (timeframe: '1H' | '1D' | '1W' | '1MO') => {
    try {
      setChartLoading(true); // 차트 로딩 시작
      const chartResponse = await fetch(`/api/stocks/sp500/chart/${symbol}?timeframe=${timeframe}`);
      
      if (!chartResponse.ok) {
        console.warn(`Chart API error! status: ${chartResponse.status}`);
        setChartData([]);
        return;
      }
      
      const chartResult = await chartResponse.json();
      setChartData(chartResult.chart_data || []);
      
    } catch (err) {
      console.error('차트 데이터 로딩 실패:', err);
      setChartData([]);
    } finally {
      setChartLoading(false); // 차트 로딩 완료
    }
  }, [symbol]);

  // 즐겨찾기 상태 로드
  const loadFavoriteStatus = useCallback(() => {
    try {
      const favorites = JSON.parse(localStorage.getItem('favoriteStocks') || '[]');
      setIsFavorite(favorites.includes(symbol));
    } catch (err) {
      console.error('즐겨찾기 상태 로드 실패:', err);
    }
  }, [symbol]);

  // 초기 데이터 로드
  useEffect(() => {
    fetchStockData();
    fetchChartData(selectedTimeframe);
    loadFavoriteStatus();
  }, [fetchStockData, fetchChartData, loadFavoriteStatus, selectedTimeframe]);

  // 액션 함수들
  const refreshData = useCallback(async () => {
    await fetchStockData();
    await fetchChartData(selectedTimeframe);
  }, [fetchStockData, fetchChartData, selectedTimeframe]);

  const changeTimeframe = useCallback(async (timeframe: '1H' | '1D' | '1W' | '1MO') => {
    setSelectedTimeframe(timeframe);
    await fetchChartData(timeframe);
  }, [fetchChartData]);

  const toggleFavorite = useCallback(() => {
    try {
      const favorites = JSON.parse(localStorage.getItem('favoriteStocks') || '[]');
      const newFavorites = isFavorite 
        ? favorites.filter((fav: string) => fav !== symbol)
        : [...favorites, symbol];
      
      localStorage.setItem('favoriteStocks', JSON.stringify(newFavorites));
      setIsFavorite(!isFavorite);
    } catch (err) {
      console.error('즐겨찾기 토글 실패:', err);
    }
  }, [isFavorite, symbol]);

  return {
    // 로딩 및 에러 상태
    loading,
    chartLoading,
    error,
    
    // 데이터 케이스
    dataCase,
    
    // API 원본 데이터
    stockPrice,
    companyData,
    financialData,
    chartData,
    
    // 데이터 가용성 (이미 camelCase로 변환됨)
    dataAvailability,
    
    // 계산된 분석 결과
    ratios,
    grades,
    risks,
    sectorComparison,
    
    // 액션 함수들
    refreshData,
    changeTimeframe,
    toggleFavorite,
    
    // UI 상태
    isFavorite,
    selectedTimeframe,
    
    // 통합 분석 정보
    integratedAnalysis
  };
}