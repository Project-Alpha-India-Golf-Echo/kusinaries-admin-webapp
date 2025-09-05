// React hook for managing cache in components
import { useCallback } from 'react';
import { dynamicCache, invalidateCache, staticCache, userCache } from '../lib/cache';

export const useCache = () => {
  // Clear all caches
  const clearAllCaches = useCallback(() => {
    staticCache.clear();
    dynamicCache.clear();
    userCache.clear();
  }, []);

  // Invalidate specific cache patterns
  const invalidateCachePattern = useCallback((operation: Parameters<typeof invalidateCache>[0]) => {
    invalidateCache(operation);
  }, []);

  // Get cache statistics for debugging
  const getCacheStats = useCallback(() => {
    return {
      static: staticCache.getStats(),
      dynamic: dynamicCache.getStats(),
      user: userCache.getStats()
    };
  }, []);

  // Force refresh data by clearing relevant caches
  const forceRefresh = useCallback((patterns: string[]) => {
    staticCache.invalidate(patterns);
    dynamicCache.invalidate(patterns);
    userCache.invalidate(patterns);
  }, []);

  return {
    clearAllCaches,
    invalidateCachePattern,
    getCacheStats,
    forceRefresh
  };
};

export default useCache;
