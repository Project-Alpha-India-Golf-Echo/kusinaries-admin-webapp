import { useState, useEffect } from 'react'
import { Card, CardContent } from '../components/ui/card'
import { Button } from '../components/ui/button'
import {
  Save
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { updateUserProfile, changeUserPassword } from '../lib/supabaseQueries'

export const SettingsPage = () => {
  const { user, refreshUserRole } = useAuth()
  const [isLoading, setIsLoading] = useState(false)

  // Profile form state
  const [profileData, setProfileData] = useState({
    fullName: user?.user_metadata?.full_name || '',
    email: user?.email || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })

  // Update form data when user changes
  useEffect(() => {
    setProfileData(prev => ({
      ...prev,
      fullName: user?.user_metadata?.full_name || '',
      email: user?.email || ''
    }))
  }, [user])

  // Save function
  const handleSave = async () => {
    setIsLoading(true)

    try {
      // Validate passwords if changing password
      if (profileData.newPassword || profileData.confirmPassword) {
        if (!profileData.currentPassword) {
          alert('Current password is required to change password')
          setIsLoading(false)
          return
        }

        if (profileData.newPassword !== profileData.confirmPassword) {
          alert('New passwords do not match')
          setIsLoading(false)
          return
        }

        if (profileData.newPassword.length < 6) {
          alert('New password must be at least 6 characters long')
          setIsLoading(false)
          return
        }
      }

      // Update profile information
      const profileResult = await updateUserProfile({
        fullName: profileData.fullName,
        email: profileData.email
      })

      if (!profileResult.success) {
        alert(`Failed to update profile: ${profileResult.error}`)
        setIsLoading(false)
        return
      }

      // Change password if provided
      if (profileData.currentPassword && profileData.newPassword) {
        const passwordResult = await changeUserPassword(
          profileData.currentPassword,
          profileData.newPassword
        )

        if (!passwordResult.success) {
          alert(`Failed to change password: ${passwordResult.error}`)
          setIsLoading(false)
          return
        }
      }

      // Refresh user role and auth context
      await refreshUserRole()

      // Reset password fields after successful save
      setProfileData(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }))

      alert('Settings saved successfully!')
    } catch (error) {
      console.error('Error saving settings:', error)
      alert('An unexpected error occurred while saving settings')
    } finally {
      setIsLoading(false)
    }
  }

  const renderProfileSettings = () => (
    <div className="space-y-8">
      {/* Profile Information Section */}
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium">Profile Information</h3>
          <p className="text-sm text-muted-foreground">Update your account details</p>
        </div>

        <div className="w-full grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Full Name</label>
            <input
              type="text"
              value={profileData.fullName}
              onChange={(e) => setProfileData(prev => ({ ...prev, fullName: e.target.value }))}
              className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Email</label>
            <input
              type="email"
              value={profileData.email}
              onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
              className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 text-gray-500 cursor-not-allowed"
              disabled
            />
          </div>
        </div>
      </div>

      {/* Security Section */}
      <div className="space-y-6 border-t pt-6">
        <div>
          <h3 className="text-lg font-medium">Security Settings</h3>
          <p className="text-sm text-muted-foreground">Update your account password</p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Current Password</label>
            <input
              type="password"
              value={profileData.currentPassword}
              onChange={(e) => setProfileData(prev => ({ ...prev, currentPassword: e.target.value }))}
              placeholder="Enter current password"
              className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">New Password</label>
            <input
              type="password"
              value={profileData.newPassword}
              onChange={(e) => setProfileData(prev => ({ ...prev, newPassword: e.target.value }))}
              placeholder="Enter new password"
              className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Confirm New Password</label>
            <input
              type="password"
              value={profileData.confirmPassword}
              onChange={(e) => setProfileData(prev => ({ ...prev, confirmPassword: e.target.value }))}
              placeholder="Confirm new password"
              className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="w-full space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
        <p className="mt-1 text-sm text-gray-500">
          Manage your account settings and preferences
        </p>
      </div>

      {/* Settings Content */}
      <Card>
        <CardContent className="p-6">
          {renderProfileSettings()}

          {/* Save Button */}
          <div className="flex justify-end pt-6 border-t mt-6">
            <Button onClick={handleSave} disabled={isLoading}>
              <Save className="h-4 w-4 mr-2" />
              {isLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
