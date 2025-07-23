import React, { useState, useEffect } from 'react';
import { Clock, User, Edit, Plus, Archive, RotateCcw, ChevronDown, ChevronUp, Filter, Calendar as CalendarIcon, X } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { Calendar } from '../components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Label } from '../components/ui/label';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { getActivityLogs } from '../lib/supabaseQueries';
import { format } from 'date-fns';
import { cn } from '../lib/utils';
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
        dateFrom?: Date;
        dateTo?: Date;
    }>({});
    const [showFilters, setShowFilters] = useState(false);

    useDocumentTitle('Activity History');
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
        if (filter.dateFrom) {
            const activityDate = new Date(activity.changed_at);
            const fromDate = new Date(filter.dateFrom);
            fromDate.setHours(0, 0, 0, 0);
            if (activityDate < fromDate) {
                return false;
            }
        }
        if (filter.dateTo) {
            const activityDate = new Date(activity.changed_at);
            const toDate = new Date(filter.dateTo);
            toDate.setHours(23, 59, 59, 999);
            if (activityDate > toDate) {
                return false;
            }
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

    const hasActiveFilters = filter.entityType || filter.action || filter.dateFrom || filter.dateTo;

    return (
        <div className="min-h-screen animate-in fade-in duration-500 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-foreground">
                        History
                    </h2>
                    <p className="text-muted-foreground">
                        View and manage activity logs for meals and ingredients.
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
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="space-y-2">
                                <Label className="text-sm font-medium">Entity Type</Label>
                                <Select
                                    value={filter.entityType || 'all'}
                                    onValueChange={(value) => setFilter(prev => ({
                                        ...prev,
                                        entityType: value === 'all' ? undefined : value as EntityType
                                    }))}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="All Types" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Types</SelectItem>
                                        <SelectItem value="meal">Meals</SelectItem>
                                        <SelectItem value="ingredient">Ingredients</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-sm font-medium">Action</Label>
                                <Select
                                    value={filter.action || 'all'}
                                    onValueChange={(value) => setFilter(prev => ({
                                        ...prev,
                                        action: value === 'all' ? undefined : value as AuditAction
                                    }))}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="All Actions" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Actions</SelectItem>
                                        <SelectItem value="created">Created</SelectItem>
                                        <SelectItem value="updated">Updated</SelectItem>
                                        <SelectItem value="archived">Archived</SelectItem>
                                        <SelectItem value="restored">Restored</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-sm font-medium">From Date</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            className={cn(
                                                "w-full justify-start text-left font-normal",
                                                !filter.dateFrom && "text-muted-foreground"
                                            )}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {filter.dateFrom ? format(filter.dateFrom, "PPP") : "Pick a date"}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={filter.dateFrom}
                                            onSelect={(date) => setFilter(prev => ({ ...prev, dateFrom: date }))}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-sm font-medium">To Date</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            className={cn(
                                                "w-full justify-start text-left font-normal",
                                                !filter.dateTo && "text-muted-foreground"
                                            )}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {filter.dateTo ? format(filter.dateTo, "PPP") : "Pick a date"}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={filter.dateTo}
                                            onSelect={(date) => setFilter(prev => ({ ...prev, dateTo: date }))}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-2 mt-4">
                            <Button
                                variant="outline"
                                onClick={clearFilters}
                                disabled={!hasActiveFilters}
                            >
                                Clear All Filters
                            </Button>
                            
                            {/* Active filter chips */}
                            {filter.entityType && (
                                <div className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-sm">
                                    Type: {filter.entityType}
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-4 w-4 p-0 hover:bg-blue-200"
                                        onClick={() => setFilter(prev => ({ ...prev, entityType: undefined }))}
                                    >
                                        <X className="h-3 w-3" />
                                    </Button>
                                </div>
                            )}
                            {filter.action && (
                                <div className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded-md text-sm">
                                    Action: {getActionLabel(filter.action)}
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-4 w-4 p-0 hover:bg-green-200"
                                        onClick={() => setFilter(prev => ({ ...prev, action: undefined }))}
                                    >
                                        <X className="h-3 w-3" />
                                    </Button>
                                </div>
                            )}
                            {filter.dateFrom && (
                                <div className="flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-800 rounded-md text-sm">
                                    From: {format(filter.dateFrom, "MMM dd, yyyy")}
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-4 w-4 p-0 hover:bg-purple-200"
                                        onClick={() => setFilter(prev => ({ ...prev, dateFrom: undefined }))}
                                    >
                                        <X className="h-3 w-3" />
                                    </Button>
                                </div>
                            )}
                            {filter.dateTo && (
                                <div className="flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-800 rounded-md text-sm">
                                    To: {format(filter.dateTo, "MMM dd, yyyy")}
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-4 w-4 p-0 hover:bg-orange-200"
                                        onClick={() => setFilter(prev => ({ ...prev, dateTo: undefined }))}
                                    >
                                        <X className="h-3 w-3" />
                                    </Button>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Summary Stats */}
            <Card>
                <CardContent className="pt-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                        <div className="space-y-2">
                            <div className="text-2xl font-bold text-foreground">{total}</div>
                            <div className="text-sm text-muted-foreground">Total Activities</div>
                        </div>
                        <div className="space-y-2">
                            <div className="text-2xl font-bold text-green-600">
                                {filteredActivities.filter(a => a.action === 'created').length}
                            </div>
                            <div className="text-sm text-muted-foreground">Created</div>
                        </div>
                        <div className="space-y-2">
                            <div className="text-2xl font-bold text-blue-600">
                                {filteredActivities.filter(a => a.action === 'updated').length}
                            </div>
                            <div className="text-sm text-muted-foreground">Updated</div>
                        </div>
                        <div className="space-y-2">
                            <div className="text-2xl font-bold text-red-600">
                                {filteredActivities.filter(a => a.action === 'archived').length}
                            </div>
                            <div className="text-sm text-muted-foreground">Archived</div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Activity List */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        <span>Recent Activity</span>
                        <div className="flex items-center gap-2">
                            {filteredActivities.length > 0 && (
                                <span className="text-sm font-normal text-muted-foreground">
                                    {filteredActivities.length} item{filteredActivities.length !== 1 ? 's' : ''}
                                </span>
                            )}
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={loadActivities}
                                disabled={loading}
                                className="h-8 w-8 p-0"
                            >
                                <RotateCcw className={cn("h-4 w-4", loading && "animate-spin")} />
                            </Button>
                        </div>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                            <p className="mt-4 text-sm text-muted-foreground">Loading activities...</p>
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <div className="rounded-full bg-destructive/10 p-3 mb-4">
                                <Clock className="w-6 h-6 text-destructive" />
                            </div>
                            <p className="text-sm text-destructive mb-4 text-center">{error}</p>
                            <Button onClick={loadActivities} variant="outline" size="sm">
                                Try Again
                            </Button>
                        </div>
                    ) : filteredActivities.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <div className="rounded-full bg-muted p-3 mb-4">
                                <Clock className="w-6 h-6 text-muted-foreground" />
                            </div>
                            <p className="text-sm text-muted-foreground">
                                {hasActiveFilters ? 'No activities match your filters.' : 'No activities found.'}
                            </p>
                            {hasActiveFilters && (
                                <Button 
                                    onClick={clearFilters} 
                                    variant="outline" 
                                    size="sm" 
                                    className="mt-2"
                                >
                                    Clear Filters
                                </Button>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {filteredActivities.map((activity) => (
                                <Card key={activity.log_id} className="hover:shadow-md transition-all duration-200">
                                    <CardContent className="p-4">
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-start space-x-3 flex-1">
                                                <div className="mt-0.5 p-2 rounded-full bg-gray-50">
                                                    {getActionIcon(activity.action)}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center space-x-2 mb-2">
                                                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getActionColor(activity.action)}`}>
                                                            {getActionLabel(activity.action)}
                                                        </span>
                                                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-secondary text-secondary-foreground border">
                                                            {activity.entity_type}
                                                        </span>
                                                    </div>

                                                    <h4 className="text-sm font-medium text-foreground mb-2 truncate">
                                                        {activity.entity_name}
                                                    </h4>

                                                    <div className="flex items-center space-x-4 text-xs text-muted-foreground mb-2">
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
                                                            className="p-0 h-auto text-xs text-primary hover:text-primary/80 font-medium"
                                                        >
                                                            {expandedLogs.has(activity.log_id) ? (
                                                                <>
                                                                    <ChevronUp className="w-3 h-3 mr-1" />
                                                                    Hide details
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <ChevronDown className="w-3 h-3 mr-1" />
                                                                    Show details
                                                                </>
                                                            )}
                                                        </Button>
                                                    )}

                                                    {expandedLogs.has(activity.log_id) && (
                                                        <div className="mt-3 space-y-3 pt-3 border-t">
                                                            {activity.changes && Object.keys(activity.changes).length > 0 && (
                                                                <div className="bg-muted rounded-lg p-3">
                                                                    <p className="text-xs font-medium text-muted-foreground mb-2">Changes:</p>
                                                                    <div className="space-y-1">
                                                                        {Object.entries(activity.changes).map(([key, value]) => (
                                                                            <div key={key} className="text-xs">
                                                                                <span className="font-medium text-muted-foreground">{key}:</span>{' '}
                                                                                <span className="text-foreground">
                                                                                    {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                                                                </span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {activity.notes && (
                                                                <div className="bg-blue-50 dark:bg-blue-950/50 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
                                                                    <p className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">Notes:</p>
                                                                    <p className="text-xs text-blue-800 dark:text-blue-200">{activity.notes}</p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}

                    {/* Pagination */}
                    {total > ITEMS_PER_PAGE && (
                        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-6 pt-6 border-t">
                            <p className="text-sm text-muted-foreground">
                                Showing <span className="font-medium">{page * ITEMS_PER_PAGE + 1}</span> to{' '}
                                <span className="font-medium">{Math.min((page + 1) * ITEMS_PER_PAGE, total)}</span> of{' '}
                                <span className="font-medium">{total}</span> activities
                            </p>
                            <div className="flex items-center space-x-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPage(0)}
                                    disabled={page === 0}
                                >
                                    First
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPage(page - 1)}
                                    disabled={page === 0}
                                >
                                    Previous
                                </Button>
                                <div className="flex items-center space-x-1">
                                    <span className="text-sm font-medium">
                                        Page {page + 1} of {Math.ceil(total / ITEMS_PER_PAGE)}
                                    </span>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPage(page + 1)}
                                    disabled={(page + 1) * ITEMS_PER_PAGE >= total}
                                >
                                    Next
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPage(Math.ceil(total / ITEMS_PER_PAGE) - 1)}
                                    disabled={(page + 1) * ITEMS_PER_PAGE >= total}
                                >
                                    Last
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};
