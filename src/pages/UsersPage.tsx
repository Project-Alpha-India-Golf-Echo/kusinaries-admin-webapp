

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useModal } from '../contexts/ModalContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { fetchUsers, updateUserRole } from '../lib/supabaseQueries';
import type { User } from '../types';

export const UsersPage = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'user' | 'family_head' | 'cook'>('all');
  const PAGE_SIZE = 25;

  useDocumentTitle('User Management');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingRole, setUpdatingRole] = useState<string | null>(null);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const { user: currentUser, isAdmin } = useAuth();
  const { openCreateUserModal } = useModal();

  useEffect(() => {
    const loadUsers = async (reset = false) => {
      try {
        if (reset) {
          setLoading(true);
          setPage(1);
        }
        const currentPage = reset ? 1 : page;
        const result = await fetchUsers({
          page: currentPage,
          pageSize: PAGE_SIZE,
          search: debouncedSearch,
          role: roleFilter,
          orderBy: 'created_at',
          orderDir: 'desc'
        });
        if (result.success && result.users) {
          setUsers(prev => reset ? result.users! : [...prev, ...result.users!]);
          setHasMore(!!result.hasMore);
          if (typeof result.total === 'number') setTotal(result.total);
        } else if (!result.success) {
          setError(result.error || 'Failed to fetch users');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch users');
      } finally {
        setLoading(false);
      }
    };

    loadUsers(true);

    const handleUserCreated = () => loadUsers(true);
    window.addEventListener('userCreated', handleUserCreated);
    return () => window.removeEventListener('userCreated', handleUserCreated);
  }, [debouncedSearch, roleFilter]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  // Load more when page changes (except reset handled above)
  useEffect(() => {
    if (page === 1) return;
    fetchUsers({
      page,
      pageSize: PAGE_SIZE,
      search: debouncedSearch,
      role: roleFilter,
      orderBy: 'created_at',
      orderDir: 'desc'
    }).then(result => {
      if (result.success && result.users) {
        setUsers(prev => [...prev, ...result.users!]);
        setHasMore(!!result.hasMore);
        if (typeof result.total === 'number') setTotal(result.total);
      }
    });
  }, [page]);

  const loadMore = () => {
    if (!hasMore || loading) return;
    setPage(p => p + 1);
  };

  const handleRoleChange = async (userId: string, newRole: 'admin' | 'user' | 'family_head' | 'cook') => {
    if (!isAdmin || userId === currentUser?.id) return;
    
    setUpdatingRole(userId);
    try {
      const result = await updateUserRole(userId, newRole);
      
      if (result.success) {
        // Update the local state
  setUsers(prevUsers => prevUsers.map(u => u.id === userId ? { ...u, app_metadata: { ...u.app_metadata, role: newRole } } : u));
        setNotification({
          type: 'success',
          message: `User role updated to ${newRole} successfully!`
        });
        setTimeout(() => setNotification(null), 5000);
      } else {
        setNotification({
          type: 'error',
          message: `Failed to update role: ${result.error}`
        });
        setTimeout(() => setNotification(null), 5000);
      }
    } catch (error) {
      console.error('Error updating role:', error);
      setNotification({
        type: 'error',
        message: 'An error occurred while updating the role'
      });
      setTimeout(() => setNotification(null), 5000);
    } finally {
      setUpdatingRole(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getInitials = (name: string | undefined, email: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return email.slice(0, 2).toUpperCase();
  };

  const getStatusColor = (lastSignIn: string | undefined) => {
    if (!lastSignIn) return 'bg-gray-100 text-gray-600 border border-gray-200';
    
    const daysSinceSignIn = Math.floor(
      (Date.now() - new Date(lastSignIn).getTime()) / (1000 * 60 * 60 * 24)
    );
    
    if (daysSinceSignIn === 0) return 'bg-green-100 text-green-700 border border-green-200';
    if (daysSinceSignIn <= 7) return 'bg-blue-100 text-blue-700 border border-blue-200';
    if (daysSinceSignIn <= 30) return 'bg-yellow-100 text-yellow-700 border border-yellow-200';
    return 'bg-gray-100 text-gray-600 border border-gray-200';
  };

  const getStatusText = (lastSignIn: string | undefined) => {
    if (!lastSignIn) return 'Never signed in';
    
    const daysSinceSignIn = Math.floor(
      (Date.now() - new Date(lastSignIn).getTime()) / (1000 * 60 * 60 * 24)
    );
    
    if (daysSinceSignIn === 0) return 'Active today';
    if (daysSinceSignIn === 1) return 'Active yesterday';
    if (daysSinceSignIn <= 7) return `Active ${daysSinceSignIn} days ago`;
    if (daysSinceSignIn <= 30) return `Active ${daysSinceSignIn} days ago`;
    return 'Inactive';
  };

  const roleLabel = (role?: string) => {
    switch (role) {
      case 'admin': return 'Administrator';
      case 'family_head': return 'Family Head';
      case 'cook': return 'Cook';
      case 'user': return 'User';
      default: return 'User';
    }
  };

  const roleColorClasses = (role?: string) => {
    switch (role) {
      case 'admin': return 'bg-gradient-to-r from-purple-100 to-purple-200 text-purple-900 border border-purple-300';
      case 'family_head': return 'bg-gradient-to-r from-orange-100 to-orange-200 text-orange-900 border border-orange-300';
      case 'cook': return 'bg-gradient-to-r from-pink-100 to-pink-200 text-pink-900 border border-pink-300';
      default: return 'bg-gradient-to-r from-green-100 to-green-200 text-green-900 border border-green-300';
    }
  };

  return (
    <div className="min-h-screen animate-in fade-in duration-500">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-semibold text-gray-900">Users</h2>
              <p className="mt-1 text-sm text-gray-500">
                Manage and view all registered users in your organization
              </p>
            </div>
            <div className="flex items-center space-x-3">
              {isAdmin && (
                <Button onClick={openCreateUserModal} className="bg-blue-600 hover:bg-blue-700">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Create User
                </Button>
              )}
              <div className="hidden md:flex bg-gradient-to-r from-gray-50 to-white px-4 py-2.5 rounded-lg border border-gray-200 shadow-sm items-center space-x-2">
                <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                </svg>
                <span className="text-sm font-semibold text-gray-900">{total}</span>
                <span className="text-sm text-gray-600">total users</span>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative flex flex-col gap-1">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 1010.5 18.5a7.5 7.5 0 006.15-3.85z" />
              </svg>
            </div>
            <Input
              placeholder="Search name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
            {debouncedSearch && (
              <Button type="button" variant="ghost" size="sm" className="self-end h-7 px-2 -mt-1" onClick={() => setSearch('')}>Clear</Button>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <Select value={roleFilter} onValueChange={(val) => setRoleFilter(val as any)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="admin">Administrator</SelectItem>
                <SelectItem value="family_head">Family Head</SelectItem>
                <SelectItem value="cook">Cook</SelectItem>
                <SelectItem value="user">User</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center text-xs text-gray-500">Showing {users.length} of {total} users</div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center justify-center py-16">
              <div className="flex flex-col items-center space-y-4">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-200 border-t-blue-600"></div>
                <p className="text-sm text-gray-500">Loading users...</p>
              </div>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-white rounded-lg border border-red-200 shadow-sm">
            <div className="p-6">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-5 h-5 text-red-400">
                    <svg fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-red-800">Error loading users</h3>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Notification */}
        {notification && (
          <div className={`fixed top-4 right-4 z-50 max-w-sm w-full bg-white rounded-lg shadow-lg border-l-4 ${
            notification.type === 'success' ? 'border-l-green-500' : 'border-l-red-500'
          } animate-in slide-in-from-right duration-300`}>
            <div className="p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  {notification.type === 'success' ? (
                    <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <div className="ml-3 flex-1">
                  <p className={`text-sm font-medium ${
                    notification.type === 'success' ? 'text-green-800' : 'text-red-800'
                  }`}>
                    {notification.message}
                  </p>
                </div>
                <div className="ml-4 flex-shrink-0">
                  <button
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                    onClick={() => setNotification(null)}
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Users List */}
        {!loading && !error && (
          <div className="space-y-6">
            {users.length === 0 ? (
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                <div className="text-center py-16">
                  <div className="w-12 h-12 mx-auto text-gray-400 mb-4">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-medium text-gray-900 mb-1">No users found</h3>
                  <p className="text-sm text-gray-500">Get started by creating your first user.</p>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-200">
                <div className="divide-y divide-gray-200">
                  {users.map((user) => {
                    const isCurrentUser = currentUser?.id === user.id;
                    return (
                      <div 
                        key={user.id} 
                        className={`p-6 hover:bg-gray-50 transition-all duration-200 border-l-4 ${
                          isCurrentUser 
                            ? 'bg-blue-50 border-l-blue-500 shadow-sm' 
                            : 'border-l-transparent hover:border-l-gray-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            {/* Avatar */}
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
                              isCurrentUser ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                            }`}>
                              {getInitials(user.user_metadata?.display_name, user.email)}
                            </div>
                            
                            {/* User Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {user.user_metadata?.display_name || user.email}
                                </p>
                                {isCurrentUser && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    You
                                  </span>
                                )}
                                {user.app_metadata?.role && (
                                  <div className="flex items-center space-x-3">
                                    {/* Role Badge */}
                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold shadow-sm ${roleColorClasses(user.app_metadata.role)}`}>
                                      <svg className="w-3 h-3 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                                        {user.app_metadata.role === 'admin' && (<path fillRule="evenodd" d="M3 6a3 3 0 013-3h10a1 1 0 01.8 1.6L14.25 8l2.55 3.4A1 1 0 0116 13H6a1 1 0 00-1 1v3a1 1 0 11-2 0V6z" clipRule="evenodd" />)}
                                        {user.app_metadata.role === 'user' && (<path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />)}
                                        {user.app_metadata.role === 'family_head' && (<path fillRule="evenodd" d="M10 2a4 4 0 00-4 4v1H5a2 2 0 00-2 2v1a3 3 0 003 3h8a3 3 0 003-3V9a2 2 0 00-2-2h-1V6a4 4 0 00-4-4zM7 15a3 3 0 016 0v1H7v-1z" clipRule="evenodd" />)}
                                        {user.app_metadata.role === 'cook' && (<path fillRule="evenodd" d="M6 3a1 1 0 00-1 1v1H4a1 1 0 00-1 1v1h14V6a1 1 0 00-1-1h-1V4a1 1 0 00-1-1H6zm11 6H3l1 9a1 1 0 001 .9h10a1 1 0 001-.9l1-9z" clipRule="evenodd" />)}
                                      </svg>
                                      {roleLabel(user.app_metadata.role)}
                                    </span>
                                    
                                    {/* Role Change Dropdown for Admins */}
                                    {isAdmin && user.id !== currentUser?.id && (
                                      <div className="relative">
                                        {updatingRole === user.id ? (
                                          <div className="flex items-center space-x-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5">
                                            <div className="animate-spin rounded-full h-3 w-3 border-2 border-blue-300 border-t-blue-600"></div>
                                            <span className="text-xs text-blue-700 font-medium">Updating...</span>
                                          </div>
                                        ) : (
                                          <div className="flex items-center space-x-2">
                                            <span className="text-xs text-gray-600 font-medium">Change to:</span>
                                            <div className="relative">
                                              <Select value={user.app_metadata.role} onValueChange={(val) => handleRoleChange(user.id, val as any)}>
                                                <SelectTrigger size="sm" className="text-xs pr-6">
                                                  <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                  <SelectItem value="user">� User</SelectItem>
                                                  <SelectItem value="family_head">🏠 Family Head</SelectItem>
                                                  <SelectItem value="cook">👨‍🍳 Cook</SelectItem>
                                                  <SelectItem value="admin">👑 Admin</SelectItem>
                                                </SelectContent>
                                              </Select>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                              <p className="text-sm text-gray-500 truncate">{user.email}</p>
                            </div>
                          </div>

                          {/* Status & Actions */}
                          <div className="flex items-center space-x-4">
                            <div className="text-right">
                              <div className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(user.last_sign_in_at)}`}>
                                <div className={`w-2 h-2 rounded-full mr-1.5 ${
                                  !user.last_sign_in_at ? 'bg-gray-400' :
                                  Math.floor((Date.now() - new Date(user.last_sign_in_at).getTime()) / (1000 * 60 * 60 * 24)) === 0 ? 'bg-green-500' :
                                  Math.floor((Date.now() - new Date(user.last_sign_in_at).getTime()) / (1000 * 60 * 60 * 24)) <= 7 ? 'bg-blue-500' :
                                  Math.floor((Date.now() - new Date(user.last_sign_in_at).getTime()) / (1000 * 60 * 60 * 24)) <= 30 ? 'bg-yellow-500' :
                                  'bg-gray-400'
                                }`} />
                                {getStatusText(user.last_sign_in_at)}
                              </div>
                              <p className="text-xs text-gray-500 mt-1">
                                Joined {formatDate(user.created_at).split(',')[0]}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Expandable Details */}
                        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                          <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-3 border border-gray-200">
                            <dt className="font-semibold text-gray-600 uppercase tracking-wide flex items-center">
                              <svg className="w-3 h-3 mr-1.5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 2a4 4 0 00-4 4v1H5a1 1 0 00-.994.89l-1 9A1 1 0 004 18h12a1 1 0 00.994-1.11l-1-9A1 1 0 0015 7h-1V6a4 4 0 00-4-4zm2 5V6a2 2 0 10-4 0v1h4zm-6 3a1 1 0 112 0 1 1 0 01-2 0zm7-1a1 1 0 100 2 1 1 0 000-2z" clipRule="evenodd" />
                              </svg>
                              User ID
                            </dt>
                            <dd className="mt-2 text-gray-900 font-mono text-xs break-all bg-white rounded px-2 py-1 border">{user.id}</dd>
                          </div>
                          <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-3 border border-gray-200">
                            <dt className="font-semibold text-gray-600 uppercase tracking-wide flex items-center">
                              <svg className="w-3 h-3 mr-1.5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                              </svg>
                              Created
                            </dt>
                            <dd className="mt-2 text-gray-900">{formatDate(user.created_at)}</dd>
                          </div>
                          <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-3 border border-gray-200">
                            <dt className="font-semibold text-gray-600 uppercase tracking-wide flex items-center">
                              <svg className="w-3 h-3 mr-1.5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                              </svg>
                              Last Sign In
                            </dt>
                            <dd className="mt-2 text-gray-900">
                              {user.last_sign_in_at ? formatDate(user.last_sign_in_at) : 'Never'}
                            </dd>
                          </div>
                          {user.phone && (
                            <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-3 border border-gray-200">
                              <dt className="font-semibold text-gray-600 uppercase tracking-wide flex items-center">
                                <svg className="w-3 h-3 mr-1.5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                                </svg>
                                Phone
                              </dt>
                              <dd className="mt-2 text-gray-900">{user.phone}</dd>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
        {/* Load more */}
        {!loading && hasMore && (
          <div className="flex justify-center mt-6">
            <button
              onClick={loadMore}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Load more'}
            </button>
          </div>
        )}
      </div>
  )
}
