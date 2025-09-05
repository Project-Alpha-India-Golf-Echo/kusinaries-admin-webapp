// Performance monitoring for cache effectiveness
interface PerformanceMetrics {
  cacheHits: number;
  cacheMisses: number;
  apiCallsSaved: number;
  totalApiCalls: number;
  averageResponseTime: number;
  lastUpdated: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics = {
    cacheHits: 0,
    cacheMisses: 0,
    apiCallsSaved: 0,
    totalApiCalls: 0,
    averageResponseTime: 0,
    lastUpdated: Date.now()
  };

  private responseTimes: number[] = [];
  private maxResponseTimeHistory = 100;

  // Record a cache hit
  recordCacheHit(): void {
    this.metrics.cacheHits++;
    this.metrics.apiCallsSaved++;
    this.updateTimestamp();
  }

  // Record a cache miss (API call made)
  recordCacheMiss(responseTime: number): void {
    this.metrics.cacheMisses++;
    this.metrics.totalApiCalls++;
    
    // Track response time
    this.responseTimes.push(responseTime);
    if (this.responseTimes.length > this.maxResponseTimeHistory) {
      this.responseTimes.shift();
    }
    
    // Update average response time
    this.metrics.averageResponseTime = 
      this.responseTimes.reduce((sum, time) => sum + time, 0) / this.responseTimes.length;
    
    this.updateTimestamp();
  }

  // Get current metrics
  getMetrics(): PerformanceMetrics & {
    cacheHitRate: number;
    totalRequests: number;
    estimatedTimeSaved: number; // in milliseconds
  } {
    const totalRequests = this.metrics.cacheHits + this.metrics.cacheMisses;
    const cacheHitRate = totalRequests > 0 ? (this.metrics.cacheHits / totalRequests) * 100 : 0;
    const estimatedTimeSaved = this.metrics.apiCallsSaved * this.metrics.averageResponseTime;

    return {
      ...this.metrics,
      cacheHitRate,
      totalRequests,
      estimatedTimeSaved
    };
  }

  // Reset metrics
  reset(): void {
    this.metrics = {
      cacheHits: 0,
      cacheMisses: 0,
      apiCallsSaved: 0,
      totalApiCalls: 0,
      averageResponseTime: 0,
      lastUpdated: Date.now()
    };
    this.responseTimes = [];
  }

  // Export metrics for logging/analytics
  exportMetrics(): string {
    const metrics = this.getMetrics();
    return JSON.stringify({
      ...metrics,
      exportedAt: new Date().toISOString()
    }, null, 2);
  }

  private updateTimestamp(): void {
    this.metrics.lastUpdated = Date.now();
  }
}

// Create global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();

// Enhanced cache wrapper that includes performance monitoring
export const withCacheAndMetrics = <T extends any[], R>(
  cache: any,
  functionName: string,
  fn: (...args: T) => Promise<R>,
  customTTL?: number
) => {
  return async (...args: T): Promise<R> => {
    const startTime = Date.now();
    
    // Try to get from cache first
    const cached = cache.get(functionName, args) as R | null;
    if (cached !== null) {
      performanceMonitor.recordCacheHit();
      return cached;
    }

    // If not in cache, execute function
    const result = await fn(...args);
    const responseTime = Date.now() - startTime;
    
    performanceMonitor.recordCacheMiss(responseTime);
    
    // Cache the result if it's successful
    if (result && typeof result === 'object' && 'success' in result && result.success) {
      cache.set(functionName, args, result, customTTL);
    }

    return result;
  };
};

export default { performanceMonitor, withCacheAndMetrics };
