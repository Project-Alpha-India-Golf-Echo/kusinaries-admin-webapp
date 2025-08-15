

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useModal } from '../contexts/ModalContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { fetchUsers } from '../lib/supabaseQueries';
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
  // const [updatingRole, setUpdatingRole] = useState<string | null>(null); // removed with new edit modal
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const { user: currentUser, isAdmin } = useAuth();
  const { openCreateUserModal, openEditUserModal } = useModal();

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

  // Removed role change dropdown logic; now handled in edit modal

  useEffect(() => {
    const handler = (e: any) => {
      const updated = e.detail as Partial<User> & { id: string };
      if (!updated) return;
      setUsers(prev => prev.map(u => u.id === updated.id ? { ...u, ...updated, user_metadata: { ...u.user_metadata, ...updated.user_metadata }, app_metadata: { ...u.app_metadata, ...updated.app_metadata } } : u));
    };
    window.addEventListener('userUpdated', handler as any);
    return () => window.removeEventListener('userUpdated', handler as any);
  }, []);

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

        {/* Users Table (Updated UI) */}
        {!loading && !error && (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            {users.length === 0 ? (
              <div className="py-16 text-center">
                <div className="w-12 h-12 mx-auto text-gray-300 mb-4">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-12 h-12">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                  </svg>
                </div>
                <h3 className="text-sm font-medium text-gray-900 mb-1">No users found</h3>
                <p className="text-sm text-gray-500">Try adjusting your filters or create a new user.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr className="text-left text-xs font-semibold text-gray-600 tracking-wide">
                      <th className="px-6 py-3">Username</th>
                      <th className="px-6 py-3">Role</th>
                      <th className="px-6 py-3">Supabase UID</th>
                      <th className="px-6 py-3">Registered</th>
                      <th className="px-6 py-3">Status</th>
                      {isAdmin && <th className="px-6 py-3 text-right">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {users.map(user => {
                      const isCurrentUser = currentUser?.id === user.id;
                      return (
                        <tr
                          key={user.id}
                          className={`${isCurrentUser ? 'bg-blue-50/60' : 'bg-white hover:bg-gray-50'} transition-colors`}
                        >
                          {/* Username */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center space-x-3 max-w-[240px]">
                              <div className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-xs font-medium ${isCurrentUser ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}> 
                                {getInitials(user.user_metadata?.display_name, user.email)}
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium text-gray-900 truncate">
                                  {user.user_metadata?.display_name || user.email}
                                </p>
                                <p className="text-xs text-gray-500 truncate">{user.email}</p>
                              </div>
                              {isCurrentUser && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 text-blue-700">You</span>
                              )}
                            </div>
                          </td>
                          {/* Role */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${roleColorClasses(user.app_metadata?.role)}`}>
                              {roleLabel(user.app_metadata?.role)}
                            </span>
                          </td>
              
                          {/* Supabase UID */}
                          <td className="px-6 py-4 font-mono text-[11px] text-gray-700 max-w-[160px] truncate" title={user.id}>{user.id}</td>
                          {/* Registered */}
                          <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-700">
                            {formatDate(user.created_at).split(',')[0]}
                          </td>
                          {/* Status */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium ${getStatusColor(user.last_sign_in_at)}`}>
                              <span className={`w-2 h-2 rounded-full mr-1.5 ${
                                !user.last_sign_in_at ? 'bg-gray-400' :
                                Math.floor((Date.now() - new Date(user.last_sign_in_at).getTime()) / (1000 * 60 * 60 * 24)) === 0 ? 'bg-green-500' :
                                Math.floor((Date.now() - new Date(user.last_sign_in_at).getTime()) / (1000 * 60 * 60 * 24)) <= 7 ? 'bg-blue-500' :
                                Math.floor((Date.now() - new Date(user.last_sign_in_at).getTime()) / (1000 * 60 * 60 * 24)) <= 30 ? 'bg-yellow-500' :
                                'bg-gray-400'
                              }`} />
                              {getStatusText(user.last_sign_in_at)}
                            </div>
                          </td>
                          {/* Actions (role change) */}
                          {isAdmin && (
                            <td className="px-6 py-4 whitespace-nowrap text-right text-xs">
                              {user.id === currentUser?.id ? (
                                <span className="text-gray-400">—</span>
                              ) : (
                                <button
                                  onClick={() => openEditUserModal(user)}
                                  className="inline-flex items-center px-3 py-1.5 rounded-md bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 shadow-sm text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                                >
                                  <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5h2m-1-1v2m4.2 11.2L5 21l2.8-11.2L17 3l4 4-6.8 12.2z" />
                                  </svg>
                                  Edit
                                </button>
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
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
