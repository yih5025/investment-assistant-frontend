// src/hooks/useSNSData.ts

import { useState, useEffect, useCallback } from 'react';
import { SNSService } from '../services/SNSService';
import { 
  SNSPost, 
  SNSPostAnalysisListResponse, 
  SNSPostAnalysisDetailResponse 
} from '../types/sns-type';

// SNS 피드 데이터 훅
export function useSNSFeed() {
  const [posts, setPosts] = useState<SNSPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [skip, setSkip] = useState(0);
  
  const snsService = new SNSService();
  const limit = 20;

  // 초기 데이터 로드
  const loadInitialPosts = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await snsService.getAnalyzedPosts({ skip: 0, limit });
      const transformedPosts = response.map(item => snsService.transformToSNSPost(item));
      
      setPosts(transformedPosts);
      setSkip(limit);
      setHasMore(response.length === limit);
    } catch (err) {
      setError(err instanceof Error ? err.message : '데이터를 불러오는데 실패했습니다.');
      console.error('SNS 피드 로드 실패:', err);
    } finally {
      setLoading(false);
    }
  }, [snsService, limit]);

  // 추가 데이터 로드 (무한 스크롤)
  const loadMorePosts = useCallback(async () => {
    if (loading || !hasMore) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await snsService.getAnalyzedPosts({ skip, limit });
      const transformedPosts = response.map(item => snsService.transformToSNSPost(item));
      
      setPosts(prev => [...prev, ...transformedPosts]);
      setSkip(prev => prev + limit);
      setHasMore(response.length === limit);
    } catch (err) {
      setError(err instanceof Error ? err.message : '추가 데이터를 불러오는데 실패했습니다.');
      console.error('SNS 피드 추가 로드 실패:', err);
    } finally {
      setLoading(false);
    }
  }, [snsService, skip, limit, loading, hasMore]);

  // 새로고침
  const refresh = useCallback(async () => {
    setSkip(0);
    setHasMore(true);
    await loadInitialPosts();
  }, [loadInitialPosts]);

  // 컴포넌트 마운트 시 초기 데이터 로드
  useEffect(() => {
    loadInitialPosts();
  }, [loadInitialPosts]);

  return {
    posts,
    loading,
    error,
    hasMore,
    loadMorePosts,
    refresh,
  };
}

// SNS 게시글 상세 데이터 훅
export function useSNSPostDetail(postSource: string, postId: string) {
  const [post, setPost] = useState<SNSPost | null>(null);
  const [detailData, setDetailData] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const snsService = new SNSService();

  const loadPostDetail = useCallback(async () => {
    if (!postSource || !postId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await snsService.getAnalyzedPostDetail(postSource, postId);
      
      // 기본 게시글 정보 변환
      const transformedPost = snsService.transformToSNSPost({
        analysis: response.analysis,
        original_post: response.original_post,
        engagement: response.engagement,
        media: response.media,
      });
      
      // 자산별 상세 데이터 추출
      const assetData = snsService.extractAssetData(response);
      
      setPost(transformedPost);
      setDetailData(assetData);
    } catch (err) {
      setError(err instanceof Error ? err.message : '상세 데이터를 불러오는데 실패했습니다.');
      console.error('SNS 게시글 상세 로드 실패:', err);
    } finally {
      setLoading(false);
    }
  }, [snsService, postSource, postId]);

  // postSource나 postId가 변경될 때 데이터 로드
  useEffect(() => {
    loadPostDetail();
  }, [loadPostDetail]);

  // 새로고침
  const refresh = useCallback(async () => {
    await loadPostDetail();
  }, [loadPostDetail]);

  return {
    post,
    detailData,
    loading,
    error,
    refresh,
  };
}

// SNS 서비스 유틸리티 훅
export function useSNSUtils() {
  const snsService = new SNSService();

  return {
    formatNumber: snsService.formatNumber.bind(snsService),
    formatPrice: snsService.formatPrice.bind(snsService),
    formatRelativeTime: snsService.formatRelativeTime.bind(snsService),
    getChangeColor: snsService.getChangeColor.bind(snsService),
    generateSNSLink: snsService.generateSNSLink.bind(snsService),
  };
}
