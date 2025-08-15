import { useEffect, useState } from 'react';
import { updateUserAccount } from '../lib/supabaseQueries';
import type { User, UserRole } from '../types';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

interface EditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onUserUpdated: (updated: Partial<User> & { id: string }) => void;
}

export const EditUserModal = ({ isOpen, onClose, user, onUserUpdated }: EditUserModalProps) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('user');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setFullName(user.user_metadata?.full_name || user.user_metadata?.display_name || '');
      setEmail(user.email);
      setRole((user.app_metadata?.role as UserRole) || 'user');
      setError(null);
      setSuccess(null);
    }
  }, [user, isOpen]);

  if (!isOpen || !user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await updateUserAccount(user.id, { fullName, email, role });
      if (result.success) {
        onUserUpdated({ id: user.id, user_metadata: { ...user.user_metadata, full_name: fullName }, email, app_metadata: { ...user.app_metadata, role } });
        setSuccess('User updated successfully');
        setTimeout(() => { setSuccess(null); onClose(); }, 1200);
      } else {
        setError(result.error || 'Failed to update user');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-150">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 animate-in zoom-in-95 duration-150">
        <Card className="border-0 shadow-none">
          <div className="p-6 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Edit User</h3>
            <button
              onClick={onClose}
              disabled={loading}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-800 px-3 py-2 rounded text-sm">{error}</div>
            )}
            {success && (
              <div className="bg-green-50 border border-green-200 text-green-800 px-3 py-2 rounded text-sm">{success}</div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input id="fullName" value={fullName} onChange={e => setFullName(e.target.value)} disabled={loading} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} disabled={loading} required />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="role">Role</Label>
                <Select value={role} onValueChange={(value) => setRole(value as UserRole)} disabled={loading}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="family_head">Family Head</SelectItem>
                    <SelectItem value="cook">Cook</SelectItem>
                    <SelectItem value="admin">Administrator</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center justify-end space-x-3 pt-2">
              <Button type="button" variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    <span>Saving...</span>
                  </div>
                ) : 'Save Changes'}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};
