// Debug component to display cache status and controls
import { useState } from 'react';
import { useCache } from '../hooks/useCache';
import { performanceMonitor } from '../lib/performance';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

export const CacheDebugPanel = () => {
  const [isVisible, setIsVisible] = useState(false);
  const { getCacheStats, clearAllCaches, forceRefresh } = useCache();
  const [stats, setStats] = useState<any>(null);
  const [perfMetrics, setPerfMetrics] = useState<any>(null);

  const refreshStats = () => {
    setStats(getCacheStats());
    setPerfMetrics(performanceMonitor.getMetrics());
  };

  const handleClearAllCaches = () => {
    clearAllCaches();
    refreshStats();
  };

  const handleResetMetrics = () => {
    performanceMonitor.reset();
    refreshStats();
  };

  const handleForceRefresh = (type: string) => {
    const patterns = {
      meals: ['getAllMeals', 'getArchivedMeals', 'getMealById'],
      ingredients: ['getAllIngredients', 'getArchivedIngredients'],
      dashboard: ['getDashboardStats', 'getRecentActivities'],
      users: ['fetchUsers', 'getCurrentUserRole', 'isCurrentUserAdmin']
    };
    
    forceRefresh(patterns[type as keyof typeof patterns] || []);
    refreshStats();
  };

  if (!isVisible) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button 
          onClick={() => setIsVisible(true)}
          variant="outline"
          size="sm"
        >
          Cache Debug
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Cache Status</CardTitle>
            <Button
              onClick={() => setIsVisible(false)}
              variant="ghost"
              size="sm"
            >
              ×
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Button onClick={refreshStats} size="sm" variant="outline">
              Refresh Stats
            </Button>
            <Button onClick={handleClearAllCaches} size="sm" variant="destructive">
              Clear All
            </Button>
            <Button onClick={handleResetMetrics} size="sm" variant="outline">
              Reset Metrics
            </Button>
          </div>
          
          {perfMetrics && (
            <div className="space-y-2 text-xs border-t pt-2">
              <div className="font-semibold">Performance Metrics</div>
              <div>Cache Hit Rate: {perfMetrics.cacheHitRate.toFixed(1)}%</div>
              <div>API Calls Saved: {perfMetrics.apiCallsSaved}</div>
              <div>Total Requests: {perfMetrics.totalRequests}</div>
              <div>Avg Response: {perfMetrics.averageResponseTime.toFixed(0)}ms</div>
              <div>Time Saved: {(perfMetrics.estimatedTimeSaved / 1000).toFixed(1)}s</div>
            </div>
          )}
          
          {stats && (
            <div className="space-y-2 text-xs">
              <div>
                <div className="font-semibold">Static Cache</div>
                <div>Size: {stats.static.size}/{stats.static.maxSize}</div>
                <div>Expired: {stats.static.entries.filter((e: any) => e.isExpired).length}</div>
              </div>
              
              <div>
                <div className="font-semibold">Dynamic Cache</div>
                <div>Size: {stats.dynamic.size}/{stats.dynamic.maxSize}</div>
                <div>Expired: {stats.dynamic.entries.filter((e: any) => e.isExpired).length}</div>
              </div>
              
              <div>
                <div className="font-semibold">User Cache</div>
                <div>Size: {stats.user.size}/{stats.user.maxSize}</div>
                <div>Expired: {stats.user.entries.filter((e: any) => e.isExpired).length}</div>
              </div>
            </div>
          )}

          <div className="space-y-1">
            <div className="font-semibold text-xs">Force Refresh:</div>
            <div className="flex gap-1">
              <Button onClick={() => handleForceRefresh('meals')} size="sm" variant="outline" className="text-xs px-2">
                Meals
              </Button>
              <Button onClick={() => handleForceRefresh('ingredients')} size="sm" variant="outline" className="text-xs px-2">
                Ingredients
              </Button>
            </div>
            <div className="flex gap-1">
              <Button onClick={() => handleForceRefresh('dashboard')} size="sm" variant="outline" className="text-xs px-2">
                Dashboard
              </Button>
              <Button onClick={() => handleForceRefresh('users')} size="sm" variant="outline" className="text-xs px-2">
                Users
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
