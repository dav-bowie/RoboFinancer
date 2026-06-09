import { useState, useCallback } from 'react';
import {
  fetchAIRecommendation,
  RecommendationContext,
} from '../utils/aiRecommendations';

export interface UseAIRecommendationReturn {
  loading: boolean;
  error: string | null;
  getRecommendation: (context: RecommendationContext, message: string) => Promise<string>;
}

/**
 * Hook that manages loading/error state for AI recommendation requests.
 * The actual network call goes through the /api/recommend serverless proxy.
 *
 * @returns loading flag, error string (or null), and getRecommendation async function
 */
export function useAIRecommendation(): UseAIRecommendationReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getRecommendation = useCallback(
    async (context: RecommendationContext, message: string): Promise<string> => {
      setLoading(true);
      setError(null);
      try {
        const result = await fetchAIRecommendation(context, message);
        if (result.error) {
          setError(result.error);
          return '';
        }
        return result.response;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { loading, error, getRecommendation };
}
