'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, Receipt, Users, DollarSign, LogOut, Search, Calendar } from 'lucide-react'
import { format } from 'date-fns'

interface SplitBill {
  id: string
  title: string
  description: string | null
  createdAt: string
  updatedAt: string
  creator: {
    id: string
    name: string
    email: string
  }
  _count: {
    participants: number
    expenses: number
  }
}

export default function DashboardClient() {
  const router = useRouter()
  const [splitBills, setSplitBills] = useState<SplitBill[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchUser()
    fetchSplitBills()
  }, [])

  const fetchUser = async () => {
    try {
      const res = await fetch('/api/auth/me')
      const data = await res.json()
      if (res.ok) {
        setUser(data.user)
      }
    } catch (error) {
      console.error('Failed to fetch user:', error)
    }
  }

  const fetchSplitBills = async () => {
    try {
      const res = await fetch('/api/splitbills')
      const data = await res.json()
      if (res.ok) {
        setSplitBills(data.splitBills)
      }
    } catch (error) {
      console.error('Failed to fetch split bills:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      router.push('/')
      router.refresh()
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  const filteredBills = splitBills.filter(bill =>
    bill.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    bill.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-100">
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">
                Welcome back, {user?.name || 'User'}!
              </h1>
              <p className="text-gray-600">Manage your split bills</p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>

        {/* Search and Create */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search split bills..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900"
            />
          </div>
          <Link
            href="/dashboard/new"
            className="flex items-center justify-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 transition-colors shadow-lg"
          >
            <Plus className="w-5 h-5" />
            <span>New Split Bill</span>
          </Link>
        </div>

        {/* Split Bills List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : filteredBills.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <Receipt className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {searchQuery ? 'No split bills found' : 'No split bills yet'}
            </h3>
            <p className="text-gray-600 mb-6">
              {searchQuery
                ? 'Try a different search term'
                : 'Create your first split bill to get started'}
            </p>
            {!searchQuery && (
              <Link
                href="/dashboard/new"
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 transition-colors"
              >
                <Plus className="w-5 h-5" />
                Create Split Bill
              </Link>
            )}
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredBills.map((bill) => (
              <Link
                key={bill.id}
                href={`/dashboard/splitbills/${bill.id}`}
                className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow"
              >
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{bill.title}</h3>
                    {bill.description && (
                      <p className="text-gray-600 mb-3">{bill.description}</p>
                    )}
                    <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        <span>{bill._count.participants} participants</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Receipt className="w-4 h-4" />
                        <span>{bill._count.expenses} expenses</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>{format(new Date(bill.updatedAt), 'MMM d, yyyy')}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-primary-600">
                    <span className="font-semibold">View</span>
                    <DollarSign className="w-5 h-5" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

