import React, { useState, useEffect } from 'react';
import { Clock, User, Edit, Plus, Archive, RotateCcw, ChevronDown, ChevronUp, Filter } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { getActivityLogs } from '../lib/supabaseQueries';
import type { ActivityLog, AuditAction, EntityType } from '../types';

const getActionIcon = (action: AuditAction) => {
  switch (action) {
    case 'created':
      return <Plus className="w-4 h-4 text-green-600" />;
    case 'updated':
      return <Edit className="w-4 h-4 text-blue-600" />;
    case 'archived':
      return <Archive className="w-4 h-4 text-red-600" />;
    case 'restored':
      return <RotateCcw className="w-4 h-4 text-green-600" />;
    default:
      return <Clock className="w-4 h-4 text-gray-600" />;
  }
};

const getActionLabel = (action: AuditAction) => {
  switch (action) {
    case 'created':
      return 'Created';
    case 'updated':
      return 'Updated';
    case 'archived':
      return 'Archived';
    case 'restored':
      return 'Restored';
    default:
      return action;
  }
};

const getActionColor = (action: AuditAction) => {
  switch (action) {
    case 'created':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'updated':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'archived':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'restored':
      return 'bg-green-100 text-green-800 border-green-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const HistoryPage: React.FC = () => {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<{
    entityType?: EntityType;
    action?: AuditAction;
  }>({});
  const [showFilters, setShowFilters] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [expandedLogs, setExpandedLogs] = useState<Set<number>>(new Set());

  const ITEMS_PER_PAGE = 20;

  useEffect(() => {
    loadActivities();
  }, [page]);

  const loadActivities = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await getActivityLogs(ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

      if (result.success && result.data) {
        setActivities(result.data);
        setTotal(result.total || 0);
      } else {
        setError(result.error || 'Failed to load activity logs');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const filteredActivities = activities.filter(activity => {
    if (filter.entityType && activity.entity_type !== filter.entityType) {
      return false;
    }
    if (filter.action && activity.action !== filter.action) {
      return false;
    }
    return true;
  });

  const toggleLogExpansion = (logId: number) => {
    const newExpanded = new Set(expandedLogs);
    if (newExpanded.has(logId)) {
      newExpanded.delete(logId);
    } else {
      newExpanded.add(logId);
    }
    setExpandedLogs(newExpanded);
  };

  const clearFilters = () => {
    setFilter({});
  };

  const hasActiveFilters = filter.entityType || filter.action;

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">System Activity History</h1>
          <p className="text-gray-600 mt-1">
            Track all actions performed on meals and ingredients
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center space-x-2"
        >
          <Filter className="w-4 h-4" />
          <span>Filters</span>
          {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </Button>
      </div>

      {/* Filters */}
      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filter Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-48">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Entity Type
                </label>
                <select
                  value={filter.entityType || ''}
                  onChange={(e) => setFilter(prev => ({ 
                    ...prev, 
                    entityType: e.target.value as EntityType || undefined 
                  }))}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  <option value="">All Types</option>
                  <option value="meal">Meals</option>
                  <option value="ingredient">Ingredients</option>
                </select>
              </div>

              <div className="flex-1 min-w-48">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Action
                </label>
                <select
                  value={filter.action || ''}
                  onChange={(e) => setFilter(prev => ({ 
                    ...prev, 
                    action: e.target.value as AuditAction || undefined 
                  }))}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  <option value="">All Actions</option>
                  <option value="created">Created</option>
                  <option value="updated">Updated</option>
                  <option value="archived">Archived</option>
                  <option value="restored">Restored</option>
                </select>
              </div>

              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={clearFilters}
                  disabled={!hasActiveFilters}
                  className="mb-0"
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Stats */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-gray-900">{total}</div>
              <div className="text-sm text-gray-600">Total Activities</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">
                {filteredActivities.filter(a => a.action === 'created').length}
              </div>
              <div className="text-sm text-gray-600">Created</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {filteredActivities.filter(a => a.action === 'updated').length}
              </div>
              <div className="text-sm text-gray-600">Updated</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-600">
                {filteredActivities.filter(a => a.action === 'archived').length}
              </div>
              <div className="text-sm text-gray-600">Archived</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Activity List */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-green-600"></div>
              <p className="mt-2 text-gray-600">Loading activities...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-600 mb-4">{error}</p>
              <Button onClick={loadActivities} variant="outline">
                Try Again
              </Button>
            </div>
          ) : filteredActivities.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No activities found.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredActivities.map((activity) => (
                <div
                  key={activity.log_id}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      <div className="mt-0.5">
                        {getActionIcon(activity.action)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getActionColor(activity.action)}`}>
                            {getActionLabel(activity.action)}
                          </span>
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
                            {activity.entity_type}
                          </span>
                        </div>
                        
                        <p className="text-sm font-medium text-gray-900 mb-1">
                          {activity.entity_name}
                        </p>
                        
                        <div className="flex items-center space-x-4 text-xs text-gray-600">
                          <span className="flex items-center">
                            <User className="w-3 h-3 mr-1" />
                            {activity.changed_by}
                          </span>
                          <span className="flex items-center">
                            <Clock className="w-3 h-3 mr-1" />
                            {formatDate(activity.changed_at)}
                          </span>
                        </div>

                        {(activity.changes || activity.notes) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleLogExpansion(activity.log_id)}
                            className="mt-2 p-0 h-auto text-xs text-blue-600 hover:text-blue-800"
                          >
                            {expandedLogs.has(activity.log_id) ? 'Hide details' : 'Show details'}
                          </Button>
                        )}

                        {expandedLogs.has(activity.log_id) && (
                          <div className="mt-3 space-y-2">
                            {activity.changes && Object.keys(activity.changes).length > 0 && (
                              <div className="bg-gray-50 rounded-lg p-3">
                                <p className="text-xs font-medium text-gray-700 mb-2">Changes:</p>
                                <div className="space-y-1">
                                  {Object.entries(activity.changes).map(([key, value]) => (
                                    <div key={key} className="text-xs">
                                      <span className="font-medium text-gray-600">{key}:</span>{' '}
                                      <span className="text-gray-800">
                                        {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {activity.notes && (
                              <div className="bg-blue-50 rounded-lg p-3">
                                <p className="text-xs font-medium text-blue-700 mb-1">Notes:</p>
                                <p className="text-xs text-blue-800">{activity.notes}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {total > ITEMS_PER_PAGE && (
            <div className="flex justify-between items-center mt-6">
              <p className="text-sm text-gray-600">
                Showing {page * ITEMS_PER_PAGE + 1} to {Math.min((page + 1) * ITEMS_PER_PAGE, total)} of {total} activities
              </p>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page - 1)}
                  disabled={page === 0}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={(page + 1) * ITEMS_PER_PAGE >= total}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
