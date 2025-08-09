import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useLocation, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { useAuth } from '../contexts/AuthContext'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { shortVersion } from '../lib/version'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from './ui/form'
import { Input } from './ui/input'

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

type LoginForm = z.infer<typeof loginSchema>

export const LoginForm = () => {
  const { signIn, allowedRoles } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useDocumentTitle('Login');

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  const onSubmit = async (data: LoginForm) => {
    setLoading(true)
    setError(null)
    
    const { error } = await signIn(data.email, data.password)
    
    if (error) {
      setError(error.message)
    } else {
      // Navigate to the intended page or dashboard
      const from = location.state?.from?.pathname || '/'
      navigate(from, { replace: true })
    }
    
    setLoading(false)
  }

  return (
    <div className="min-h-screen w-screen bg-gray-50 flex flex-col">
      {/* Fixed header with logo and brand */}
      <div className="fixed top-0 left-0 right-0 bg-gray-50 z-10 py-6 p-4">
        <div className="flex items-center justify-center space-x-2">
          <img 
            src="/kusinaries.svg" 
            alt="Kusinaries Logo" 
            className="w-24 h-18"
          />
          <h2 className="text-4xl font-bold text-gray-900 font-gochi">
            kusinaries
          </h2>
        </div>
      </div>
      
      {/* Main content area with login form */}
      <div className="flex-1 flex items-center justify-center p-4 ">
        <div className="w-full max-w-md">
        
        <Card className="bg-white shadow-xl">
          <CardHeader className="pb-6">
            <CardTitle className="text-center text-xl font-semibold">Sign In</CardTitle>
            <CardDescription className="text-center">
              Enter your credentials to access the dashboard. Allowed roles: {allowedRoles.join(', ')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="admin@example.com"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Enter your password"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {error && (
                  <div className="text-sm text-red-700 bg-red-50 border border-red-300 p-3 rounded-md">
                    {error}
                  </div>
                )}
                <Button 
                  type="submit" 
                  className="w-full h-11 text-base font-medium bg-black hover:bg-gray-800 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2" 
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Signing in...
                    </>
                  ) : (
                    'Sign In'
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
        </div>
      </div>
        <div className="fixed bottom-2 left-0 right-0 text-center text-xs text-gray-400 select-none">
          v{shortVersion()}
        </div>
    </div>
  )
}
