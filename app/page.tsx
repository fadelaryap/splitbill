import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import Link from 'next/link'
import { Receipt, Users, TrendingUp, Shield } from 'lucide-react'

export default async function Home() {
  const user = await getCurrentUser()
  
  if (user) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-100">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center">
          <div className="mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-primary-500 rounded-2xl mb-6 shadow-lg">
              <Receipt className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-4">
              SplitBill
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Split your bills easily with friends and family
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <div className="bg-white p-6 rounded-2xl shadow-md">
              <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center mb-4 mx-auto">
                <Users className="w-6 h-6 text-primary-600" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Easy Group Management</h3>
              <p className="text-gray-600 text-sm">Add registered users or guests to your bills</p>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-md">
              <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center mb-4 mx-auto">
                <TrendingUp className="w-6 h-6 text-primary-600" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Smart Tax Splitting</h3>
              <p className="text-gray-600 text-sm">Include or separate tax calculations</p>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-md">
              <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center mb-4 mx-auto">
                <Shield className="w-6 h-6 text-primary-600" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Secure & Private</h3>
              <p className="text-gray-600 text-sm">Your data is safe and encrypted</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/signup"
              className="px-8 py-4 bg-primary-600 text-white rounded-xl font-semibold shadow-lg hover:bg-primary-700 transition-colors"
            >
              Get Started
            </Link>
            <Link
              href="/login"
              className="px-8 py-4 bg-white text-primary-600 rounded-xl font-semibold shadow-lg hover:bg-gray-50 transition-colors border-2 border-primary-600"
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}


