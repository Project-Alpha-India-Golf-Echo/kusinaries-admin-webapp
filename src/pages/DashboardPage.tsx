import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { 
  Users, 
  ChefHat, 
  Carrot, 
  Activity, 
  Archive, 
  Clock,
  Plus,
  Edit,
  RotateCcw,
  Eye,
  ArrowRight
} from 'lucide-react';
import { getDashboardStats, getRecentActivities } from '../lib/supabaseQueries';
import type { ActivityLog } from '../types';
import { Link } from 'react-router-dom';

interface DashboardStats {
  totalMeals: number;
  totalIngredients: number;
  totalUsers: number;
  activeMeals: number;
  activeIngredients: number;
  archivedMeals: number;
  archivedIngredients: number;
  recentActivities: number;
  mealsByCategory: { category: string; count: number }[];
  ingredientsByCategory: { category: string; count: number }[];
}

const getActionIcon = (action: string) => {
  switch (action) {
    case 'created':
      return <Plus className="w-3 h-3 text-green-600" />;
    case 'updated':
      return <Edit className="w-3 h-3 text-blue-600" />;
    case 'archived':
      return <Archive className="w-3 h-3 text-red-600" />;
    case 'restored':
      return <RotateCcw className="w-3 h-3 text-green-600" />;
    default:
      return <Clock className="w-3 h-3 text-gray-600" />;
  }
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const DashboardPage = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentActivities, setRecentActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useDocumentTitle('Dashboard');

  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [statsResult, activitiesResult] = await Promise.all([
        getDashboardStats(),
        getRecentActivities(5)
      ]);

      if (statsResult.success && statsResult.data) {
        setStats(statsResult.data);
      } else {
        setError(statsResult.error || 'Failed to load dashboard statistics');
      }

      if (activitiesResult.success && activitiesResult.data) {
        setRecentActivities(activitiesResult.data);
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="w-full space-y-8 animate-in fade-in duration-500">
        <div className="flex items-center justify-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full space-y-8 animate-in fade-in duration-500">
        <div className="flex flex-col items-center justify-center py-12">
          <p className="text-destructive mb-4">{error}</p>
          <Button onClick={loadDashboardData} variant="outline">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">
            Dashboard
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Welcome back, <span className="font-medium">{user?.email?.split('@')[0]}</span>! Here's what's happening with your application.
          </p>
        </div>
        <Button onClick={loadDashboardData} variant="outline" size="sm">
          <RotateCcw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Meals</CardTitle>
            <ChefHat className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalMeals || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.activeMeals || 0} active, {stats?.archivedMeals || 0} archived
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Ingredients</CardTitle>
            <Carrot className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalIngredients || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.activeIngredients || 0} active, {stats?.archivedIngredients || 0} archived
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
            <p className="text-xs text-muted-foreground">
              Registered users
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.recentActivities || 0}</div>
            <p className="text-xs text-muted-foreground">
              Last 7 days
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Meals by Category */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ChefHat className="w-5 h-5" />
              Meals by Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats?.mealsByCategory?.map((item, index) => (
                <div key={item.category} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ 
                        backgroundColor: [
                          '#10b981', // green
                          '#3b82f6', // blue
                          '#f59e0b', // yellow
                          '#ef4444'  // red
                        ][index % 4] 
                      }}
                    />
                    <span className="text-sm font-medium">{item.category}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">{item.count}</span>
                </div>
              ))}
              {(!stats?.mealsByCategory || stats.mealsByCategory.length === 0) && (
                <p className="text-sm text-muted-foreground">No meal data available</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Ingredients by Category */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Carrot className="w-5 h-5" />
              Ingredients by Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats?.ingredientsByCategory?.map((item, index) => (
                <div key={item.category} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ 
                        backgroundColor: [
                          '#8b5cf6', // purple
                          '#06b6d4', // cyan
                          '#84cc16'  // lime
                        ][index % 3] 
                      }}
                    />
                    <span className="text-sm font-medium">{item.category}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">{item.count}</span>
                </div>
              ))}
              {(!stats?.ingredientsByCategory || stats.ingredientsByCategory.length === 0) && (
                <p className="text-sm text-muted-foreground">No ingredient data available</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activities */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Recent Activities
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to="/history">
                View All
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentActivities.length > 0 ? (
            <div className="space-y-3">
              {recentActivities.map((activity) => (
                <div key={activity.log_id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    {getActionIcon(activity.action)}
                    <div>
                      <p className="text-sm font-medium">
                        {activity.action.charAt(0).toUpperCase() + activity.action.slice(1)} {activity.entity_type}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {activity.entity_name} by {activity.changed_by}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(activity.changed_at)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8">
              <Activity className="w-8 h-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No recent activities</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button variant="outline" asChild className="h-auto p-4 flex flex-col items-center gap-2">
              <Link to="/meal-curation">
                <ChefHat className="w-6 h-6" />
                <span>Manage Meals</span>
              </Link>
            </Button>
            <Button variant="outline" asChild className="h-auto p-4 flex flex-col items-center gap-2">
              <Link to="/ingredients">
                <Carrot className="w-6 h-6" />
                <span>Manage Ingredients</span>
              </Link>
            </Button>
            <Button variant="outline" asChild className="h-auto p-4 flex flex-col items-center gap-2">
              <Link to="/users">
                <Users className="w-6 h-6" />
                <span>Manage Users</span>
              </Link>
            </Button>
            <Button variant="outline" asChild className="h-auto p-4 flex flex-col items-center gap-2">
              <Link to="/history">
                <Eye className="w-6 h-6" />
                <span>View History</span>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
