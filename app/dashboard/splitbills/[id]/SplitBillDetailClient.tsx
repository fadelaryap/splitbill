'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Users,
  Plus,
  DollarSign,
  Receipt,
  X,
  UserPlus,
  Search,
  Check,
  Percent,
  Loader2,
  Calendar,
  Camera,
} from 'lucide-react'
import { format } from 'date-fns'
import ReceiptScanner from '@/components/ReceiptScanner'

interface Participant {
  id: string
  name: string
  email: string | null
  isRegistered: boolean
  user: {
    id: string
    name: string
    email: string
  } | null
}

interface ExpenseParticipant {
  id: string
  amount: number
  participant: Participant
}

interface Expense {
  id: string
  title: string
  amount: number
  taxAmount: number
  taxIncluded: boolean
  description: string | null
  createdAt: string
  participants: ExpenseParticipant[]
}

interface SplitBill {
  id: string
  title: string
  description: string | null
  createdAt: string
  creator: {
    id: string
    name: string
  }
  participants: Participant[]
  expenses: Expense[]
}

export default function SplitBillDetailClient({ splitBillId }: { splitBillId: string }) {
  const router = useRouter()
  const [splitBill, setSplitBill] = useState<SplitBill | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAddParticipant, setShowAddParticipant] = useState(false)
  const [showAddExpense, setShowAddExpense] = useState(false)
  const [searchUserQuery, setSearchUserQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [newParticipantName, setNewParticipantName] = useState('')
  const [newParticipantEmail, setNewParticipantEmail] = useState('')
  const [expenseTitle, setExpenseTitle] = useState('')
  const [expenseAmount, setExpenseAmount] = useState('')
  const [expenseTaxAmount, setExpenseTaxAmount] = useState('')
  const [expenseTaxIncluded, setExpenseTaxIncluded] = useState(false)
  const [expenseDescription, setExpenseDescription] = useState('')
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([])
  const [error, setError] = useState('')
  const [showScanner, setShowScanner] = useState(false)

  const fetchSplitBill = useCallback(async () => {
    try {
      const res = await fetch(`/api/splitbills/${splitBillId}`)
      const data = await res.json()
      if (res.ok) {
        setSplitBill(data.splitBill)
      } else {
        setError(data.error || 'Failed to load split bill')
      }
    } catch (error) {
      console.error('Failed to fetch split bill:', error)
      setError('Failed to load split bill')
    } finally {
      setLoading(false)
    }
  }, [splitBillId])

  useEffect(() => {
    fetchSplitBill()
  }, [fetchSplitBill])

  const searchUsers = async (query: string) => {
    if (query.length < 2) {
      setSearchResults([])
      return
    }

    try {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`)
      const data = await res.json()
      if (res.ok) {
        setSearchResults(data.users)
      }
    } catch (error) {
      console.error('Failed to search users:', error)
    }
  }

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchUsers(searchUserQuery)
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [searchUserQuery])

  const handleAddRegisteredUser = async (userId: string) => {
    try {
      const res = await fetch(`/api/splitbills/${splitBillId}/participants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to add participant')
      }

      setSearchUserQuery('')
      setSearchResults([])
      setShowAddParticipant(false)
      fetchSplitBill()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleAddGuest = async () => {
    if (!newParticipantName.trim()) {
      setError('Name is required')
      return
    }

    try {
      const res = await fetch(`/api/splitbills/${splitBillId}/participants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newParticipantName,
          email: newParticipantEmail || null,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to add participant')
      }

      setNewParticipantName('')
      setNewParticipantEmail('')
      setShowAddParticipant(false)
      fetchSplitBill()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleRemoveParticipant = async (participantId: string) => {
    if (!confirm('Are you sure you want to remove this participant?')) return

    try {
      const res = await fetch(
        `/api/splitbills/${splitBillId}/participants?participantId=${participantId}`,
        { method: 'DELETE' }
      )

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to remove participant')
      }

      fetchSplitBill()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!expenseTitle || !expenseAmount || selectedParticipants.length === 0) {
      setError('Please fill all required fields and select at least one participant')
      return
    }

    const amount = parseFloat(expenseAmount)
    const taxAmount = parseFloat(expenseTaxAmount) || 0

    if (isNaN(amount) || amount <= 0) {
      setError('Invalid amount')
      return
    }

    try {
      const res = await fetch(`/api/splitbills/${splitBillId}/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: expenseTitle,
          amount: expenseTaxIncluded ? amount - taxAmount : amount,
          taxAmount,
          taxIncluded: expenseTaxIncluded,
          description: expenseDescription || null,
          participantIds: selectedParticipants,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to add expense')
      }

      setExpenseTitle('')
      setExpenseAmount('')
      setExpenseTaxAmount('')
      setExpenseTaxIncluded(false)
      setExpenseDescription('')
      setSelectedParticipants([])
      setShowAddExpense(false)
      fetchSplitBill()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleRemoveExpense = async (expenseId: string) => {
    if (!confirm('Are you sure you want to remove this expense?')) return

    try {
      const res = await fetch(
        `/api/splitbills/${splitBillId}/expenses?expenseId=${expenseId}`,
        { method: 'DELETE' }
      )

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to remove expense')
      }

      fetchSplitBill()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const toggleParticipantSelection = (participantId: string) => {
    setSelectedParticipants((prev) =>
      prev.includes(participantId)
        ? prev.filter((id) => id !== participantId)
        : [...prev, participantId]
    )
  }

  const calculateTotal = () => {
    if (!splitBill) return { total: 0, byParticipant: {} }

    const byParticipant: Record<string, number> = {}

    splitBill.expenses.forEach((expense) => {
      expense.participants.forEach((ep) => {
        byParticipant[ep.participant.id] =
          (byParticipant[ep.participant.id] || 0) + ep.amount
      })
    })

    const total = Object.values(byParticipant).reduce((sum, val) => sum + val, 0)

    return { total, byParticipant }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    )
  }

  if (!splitBill) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-100 flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Split Bill Not Found</h2>
          <Link
            href="/dashboard"
            className="text-primary-600 hover:underline"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  const { total, byParticipant } = calculateTotal()

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-100">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back to Dashboard</span>
        </Link>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{splitBill.title}</h1>
          {splitBill.description && (
            <p className="text-gray-600 mb-4">{splitBill.description}</p>
          )}
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Calendar className="w-4 h-4" />
            <span>Created {format(new Date(splitBill.createdAt), 'MMM d, yyyy')}</span>
          </div>
        </div>

        {/* Participants Section */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Users className="w-6 h-6" />
              Participants ({splitBill.participants.length})
            </h2>
            <button
              onClick={() => setShowAddParticipant(!showAddParticipant)}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <UserPlus className="w-5 h-5" />
              Add Participant
            </button>
          </div>

          {showAddParticipant && (
            <div className="border-t pt-4 mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search Registered Users
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={searchUserQuery}
                    onChange={(e) => setSearchUserQuery(e.target.value)}
                    placeholder="Search by name or email..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900"
                  />
                </div>
                {searchResults.length > 0 && (
                  <div className="mt-2 border border-gray-200 rounded-lg overflow-hidden">
                    {searchResults.map((user) => (
                      <button
                        key={user.id}
                        onClick={() => handleAddRegisteredUser(user.id)}
                        className="w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors flex items-center justify-between"
                      >
                        <div>
                          <div className="font-medium">{user.name}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                        <UserPlus className="w-4 h-4 text-primary-600" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="text-center text-gray-500">OR</div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Add Guest (Name Only)
                </label>
                <div className="space-y-3">
                  <input
                    type="text"
                    value={newParticipantName}
                    onChange={(e) => setNewParticipantName(e.target.value)}
                    placeholder="Guest name"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900"
                  />
                  <input
                    type="email"
                    value={newParticipantEmail}
                    onChange={(e) => setNewParticipantEmail(e.target.value)}
                    placeholder="Email (optional, for later assignment)"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900"
                  />
                  <button
                    onClick={handleAddGuest}
                    className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Add Guest
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="grid gap-3 mt-4">
            {splitBill.participants.map((participant) => (
              <div
                key={participant.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                    <Users className="w-5 h-5 text-primary-600" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{participant.name}</div>
                    {participant.email && (
                      <div className="text-sm text-gray-500">{participant.email}</div>
                    )}
                    {participant.isRegistered ? (
                      <span className="text-xs text-green-600">Registered</span>
                    ) : (
                      <span className="text-xs text-orange-600">Guest</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleRemoveParticipant(participant.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Expenses Section */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Receipt className="w-6 h-6" />
              Expenses ({splitBill.expenses.length})
            </h2>
            <button
              onClick={() => setShowAddExpense(!showAddExpense)}
              disabled={splitBill.participants.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-5 h-5" />
              Add Expense
            </button>
          </div>

          {showAddExpense && (
            <form onSubmit={handleAddExpense} className="border-t pt-4 mt-4 space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowScanner(true)}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm bg-primary-100 text-primary-700 rounded-lg hover:bg-primary-200 transition-colors"
                  >
                    <Camera className="w-4 h-4" />
                    Scan Receipt
                  </button>
                </div>
                <input
                  type="text"
                  value={expenseTitle}
                  onChange={(e) => setExpenseTitle(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900"
                  placeholder="e.g., Dinner, Hotel, etc."
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Amount <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="number"
                      step="0.01"
                      value={expenseAmount}
                      onChange={(e) => setExpenseAmount(e.target.value)}
                      required
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tax Amount
                  </label>
                  <div className="relative">
                    <Percent className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="number"
                      step="0.01"
                      value={expenseTaxAmount}
                      onChange={(e) => setExpenseTaxAmount(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="taxIncluded"
                  checked={expenseTaxIncluded}
                  onChange={(e) => setExpenseTaxIncluded(e.target.checked)}
                  className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                />
                <label htmlFor="taxIncluded" className="text-sm text-gray-700">
                  Tax included in amount
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                  <textarea
                  value={expenseDescription}
                  onChange={(e) => setExpenseDescription(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900"
                  placeholder="Optional description..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Split Between <span className="text-red-500">*</span>
                </label>
                <div className="grid gap-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-2">
                  {splitBill.participants.map((participant) => (
                    <button
                      key={participant.id}
                      type="button"
                      onClick={() => toggleParticipantSelection(participant.id)}
                      className={`flex items-center justify-between p-2 rounded-lg transition-colors ${
                        selectedParticipants.includes(participant.id)
                          ? 'bg-primary-100 border-2 border-primary-500'
                          : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                      }`}
                    >
                      <span className="font-medium">{participant.name}</span>
                      {selectedParticipants.includes(participant.id) && (
                        <Check className="w-5 h-5 text-primary-600" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setShowAddExpense(false)}
                  className="flex-1 px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition-colors"
                >
                  Add Expense
                </button>
              </div>
            </form>
          )}

          <div className="space-y-4 mt-4">
            {splitBill.expenses.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No expenses yet. Add your first expense!
              </div>
            ) : (
              splitBill.expenses.map((expense) => {
                const totalExpense = expense.taxIncluded
                  ? expense.amount + expense.taxAmount
                  : expense.amount + expense.taxAmount
                return (
                  <div
                    key={expense.id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold text-lg text-gray-900">
                          {expense.title}
                        </h3>
                        {expense.description && (
                          <p className="text-sm text-gray-600 mt-1">
                            {expense.description}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => handleRemoveExpense(expense.id)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Base:</span>{' '}
                        <span className="font-medium">
                          ${expense.amount.toFixed(2)}
                        </span>
                      </div>
                      {expense.taxAmount > 0 && (
                        <div>
                          <span className="text-gray-500">Tax:</span>{' '}
                          <span className="font-medium">
                            ${expense.taxAmount.toFixed(2)}
                          </span>
                          {expense.taxIncluded && (
                            <span className="text-xs text-gray-500 ml-1">(included)</span>
                          )}
                        </div>
                      )}
                      <div>
                        <span className="text-gray-500">Total:</span>{' '}
                        <span className="font-semibold text-primary-600">
                          ${totalExpense.toFixed(2)}
                        </span>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t">
                      <div className="text-xs text-gray-500 mb-2">Split between:</div>
                      <div className="flex flex-wrap gap-2">
                        {expense.participants.map((ep) => (
                          <div
                            key={ep.id}
                            className="px-2 py-1 bg-primary-50 rounded text-xs font-medium text-primary-700"
                          >
                            {ep.participant.name}: ${ep.amount.toFixed(2)}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Summary Section */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-2xl shadow-lg p-6 text-white">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <DollarSign className="w-6 h-6" />
            Summary
          </h2>
          <div className="space-y-2">
            <div className="flex justify-between text-lg">
              <span>Total Amount:</span>
              <span className="font-bold">${total.toFixed(2)}</span>
            </div>
            <div className="pt-4 border-t border-primary-400">
              <div className="text-sm font-medium mb-2">Per Participant:</div>
              {Object.entries(byParticipant).map(([participantId, amount]) => {
                const participant = splitBill.participants.find((p) => p.id === participantId)
                return (
                  <div
                    key={participantId}
                    className="flex justify-between py-1"
                  >
                    <span>{participant?.name || 'Unknown'}:</span>
                    <span className="font-semibold">${amount.toFixed(2)}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Receipt Scanner Modal */}
        {showScanner && (
          <ReceiptScanner
            onScanComplete={(data) => {
              setExpenseTitle(data.title)
              setExpenseAmount(data.amount)
              if (data.taxAmount) {
                setExpenseTaxAmount(data.taxAmount)
                setExpenseTaxIncluded(true)
              }
              setShowScanner(false)
            }}
            onClose={() => setShowScanner(false)}
          />
        )}
      </div>
    </div>
  )
}

