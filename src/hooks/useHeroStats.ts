// hooks/useHeroStats.ts
// Hero 섹션 통계 데이터를 관리하는 훅

import { useState, useEffect } from 'react';

export interface HeroStats {
  stockCount: number;
  etfCount: number;
  cryptoCount: number;
  eventCount: number;
  newsCount: number;
  snsCount: number;
}

export function useHeroStats() {
  const [stats, setStats] = useState<HeroStats>({
    stockCount: 0,
    etfCount: 0,
    cryptoCount: 0,
    eventCount: 0,
    newsCount: 0,
    snsCount: 0
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadStats = async () => {
      try {
        setLoading(true);
        setError(null);

        // 모든 통계 API를 병렬로 호출
        const [
          sp500Stats,
          etfStats,
          cryptoData,
          ipoStats,
          earningsStats,
          marketNewsStats,
          financialNewsStats,
          sentimentNewsStats,
          snsStats
        ] = await Promise.allSettled([
          // SP500 통계
          fetch('https://api.investment-assistant.site/api/v1/sp500/stats').then(r => r.json()),
          // ETF 통계
          fetch('https://api.investment-assistant.site/api/v1/etf/stats').then(r => r.json()),
          // Crypto (top 리스트 - limit=1로 total_count만)
          fetch('https://api.investment-assistant.site/api/v1/crypto/top?limit=1').then(r => r.json()),
          // IPO 통계
          fetch('https://api.investment-assistant.site/api/v1/ipo-calendar/statistics').then(r => r.json()),
          // Earnings 통계
          fetch('https://api.investment-assistant.site/api/v1/sp500-earnings-calendar/statistics').then(r => r.json()),
          // Market News 통계
          fetch('https://api.investment-assistant.site/api/v1/market-news/stats').then(r => r.json()),
          // Financial News 통계
          fetch('https://api.investment-assistant.site/api/v1/financial-news/stats').then(r => r.json()),
          // Sentiment News 통계
          fetch('https://api.investment-assistant.site/api/v1/market-sentiment/stats').then(r => r.json()),
          // SNS 통계
          fetch('https://api.investment-assistant.site/api/v1/sns/stats').then(r => r.json())
        ]);

        // 3개의 뉴스 API 통계를 합산
        const totalNewsCount = (
          (marketNewsStats.status === 'fulfilled' ? marketNewsStats.value?.total_count || 0 : 0) +
          (financialNewsStats.status === 'fulfilled' ? financialNewsStats.value?.total_count || 0 : 0) +
          (sentimentNewsStats.status === 'fulfilled' ? sentimentNewsStats.value?.total_count || 0 : 0)
        );

        // console.log('📰 뉴스 통계:', {
          market: marketNewsStats.status === 'fulfilled' ? marketNewsStats.value?.total_count : 0,
          financial: financialNewsStats.status === 'fulfilled' ? financialNewsStats.value?.total_count : 0,
          sentiment: sentimentNewsStats.status === 'fulfilled' ? sentimentNewsStats.value?.total_count : 0,
          total: totalNewsCount
        });

        setStats({
          stockCount: sp500Stats.status === 'fulfilled' ? sp500Stats.value?.total_count || 0 : 0,
          etfCount: etfStats.status === 'fulfilled' ? etfStats.value?.total_count || 0 : 0,
          cryptoCount: cryptoData.status === 'fulfilled' ? (cryptoData.value?.results?.length || cryptoData.value?.total_count || 50) : 50,
          eventCount: (
            (ipoStats.status === 'fulfilled' ? ipoStats.value?.this_month || 0 : 0) +
            (earningsStats.status === 'fulfilled' ? earningsStats.value?.this_week_count || earningsStats.value?.upcoming_count || 0 : 0)
          ),
          newsCount: totalNewsCount,
          snsCount: snsStats.status === 'fulfilled' ? snsStats.value?.total_posts || snsStats.value?.total_count || 0 : 0
        });

        // console.log('✅ Hero stats loaded successfully');
      } catch (err) {
        console.error('❌ Failed to load hero stats:', err);
        setError(err instanceof Error ? err.message : 'Failed to load statistics');
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, []);

  return {
    stats,
    loading,
    error
  };
}

