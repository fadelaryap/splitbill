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
import { formatCurrency, parseCurrency } from '@/lib/currency'

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

interface ExpenseItem {
  id: string
  name: string
  quantity: number
  price: number
  taxAmount: number
  participantId: string
  participant: Participant
}

interface ExpenseParticipant {
  id: string
  amount: number
  participant: Participant
}

interface Expense {
  id: string
  title: string
  date?: string
  taxAmount: number
  taxIncluded: boolean
  description: string | null
  createdAt: string
  items?: ExpenseItem[]
  participants?: ExpenseParticipant[]
  // Backward compatibility
  amount?: number
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
  const [expenseDate, setExpenseDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [expenseItems, setExpenseItems] = useState<Array<{
    name: string
    quantity: number
    price: string
    taxAmount: string
    participantId: string
  }>>([])
  const [expenseTaxAmount, setExpenseTaxAmount] = useState('')
  const [expenseTaxIncluded, setExpenseTaxIncluded] = useState(false)
  const [expenseDescription, setExpenseDescription] = useState('')
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

    if (!expenseTitle || expenseItems.length === 0) {
      setError('Please fill title and add at least one item')
      return
    }

    // Validate all items
    for (const item of expenseItems) {
      if (!item.name || !item.participantId || !item.price || parseFloat(item.price) <= 0) {
        setError('All items must have name, participant, and valid price')
        return
      }
    }

    try {
      const items = expenseItems.map(item => ({
        name: item.name,
        quantity: item.quantity || 1,
        price: parseCurrency(item.price),
        taxAmount: parseCurrency(item.taxAmount || '0'),
        participantId: item.participantId,
      }))

      const res = await fetch(`/api/splitbills/${splitBillId}/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: expenseTitle,
          date: expenseDate,
          items,
          taxAmount: parseCurrency(expenseTaxAmount || '0'),
          taxIncluded: expenseTaxIncluded,
          description: expenseDescription || null,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to add expense')
      }

      // Reset form
      setExpenseTitle('')
      setExpenseDate(format(new Date(), 'yyyy-MM-dd'))
      setExpenseItems([])
      setExpenseTaxAmount('')
      setExpenseTaxIncluded(false)
      setExpenseDescription('')
      setShowAddExpense(false)
      fetchSplitBill()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const addExpenseItem = () => {
    if (!splitBill || splitBill.participants.length === 0) {
      setError('Please add participants first')
      return
    }
    setExpenseItems([...expenseItems, {
      name: '',
      quantity: 1,
      price: '',
      taxAmount: '',
      participantId: splitBill.participants[0].id,
    }])
  }

  const updateExpenseItem = (index: number, field: string, value: any) => {
    const updated = [...expenseItems]
    updated[index] = { ...updated[index], [field]: value }
    setExpenseItems(updated)
  }

  const removeExpenseItem = (index: number) => {
    setExpenseItems(expenseItems.filter((_, i) => i !== index))
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


  const calculateTotal = () => {
    if (!splitBill) return { total: 0, byParticipant: {} }

    const byParticipant: Record<string, number> = {}

    splitBill.expenses.forEach((expense) => {
      // Calculate from items if available, otherwise use participants (backward compatibility)
      if (expense.items && expense.items.length > 0) {
        expense.items.forEach((item) => {
          const itemTotal = (item.price * item.quantity) + (item.taxAmount || 0)
          byParticipant[item.participantId] = (byParticipant[item.participantId] || 0) + itemTotal
        })
      } else if (expense.participants) {
        expense.participants.forEach((ep) => {
          byParticipant[ep.participant.id] =
            (byParticipant[ep.participant.id] || 0) + ep.amount
        })
      }
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
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Title <span className="text-red-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowScanner(true)}
                      className="flex items-center gap-1 px-2 py-1 text-xs bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all shadow-md"
                    >
                      <Camera className="w-3 h-3" />
                      Scan
                    </button>
                  </div>
                  <input
                    type="text"
                    value={expenseTitle}
                    onChange={(e) => setExpenseTitle(e.target.value)}
                    required
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                    placeholder="e.g., Warung Makan ABC"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="date"
                      value={expenseDate}
                      onChange={(e) => setExpenseDate(e.target.value)}
                      required
                      className="w-full pl-10 pr-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                    />
                  </div>
                </div>
              </div>

              {/* Items Section */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Items <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={addExpenseItem}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Add Item
                  </button>
                </div>
                <div className="space-y-3 max-h-96 overflow-y-auto p-3 bg-gray-50 rounded-lg border-2 border-gray-200">
                  {expenseItems.length === 0 ? (
                    <div className="text-center py-6 text-gray-500">
                      <Receipt className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                      <p>No items yet. Click "Add Item" to start.</p>
                    </div>
                  ) : (
                    expenseItems.map((item, index) => (
                      <div key={index} className="bg-white p-4 rounded-lg border-2 border-gray-200 shadow-sm">
                        <div className="flex items-start justify-between mb-3">
                          <span className="text-sm font-semibold text-primary-600">Item {index + 1}</span>
                          <button
                            type="button"
                            onClick={() => removeExpenseItem(index)}
                            className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="grid sm:grid-cols-2 gap-3">
                          <div className="sm:col-span-2">
                            <label className="block text-xs font-medium text-gray-600 mb-1">Item Name</label>
                            <input
                              type="text"
                              value={item.name}
                              onChange={(e) => updateExpenseItem(index, 'name', e.target.value)}
                              required
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900 text-sm"
                              placeholder="e.g., Ikan Bakar"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Quantity</label>
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => updateExpenseItem(index, 'quantity', parseInt(e.target.value) || 1)}
                              required
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900 text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Price (Rp)</label>
                            <input
                              type="text"
                              value={item.price}
                              onChange={(e) => updateExpenseItem(index, 'price', e.target.value)}
                              required
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900 text-sm"
                              placeholder="30000"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Tax (Rp)</label>
                            <input
                              type="text"
                              value={item.taxAmount}
                              onChange={(e) => updateExpenseItem(index, 'taxAmount', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900 text-sm"
                              placeholder="0"
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <label className="block text-xs font-medium text-gray-600 mb-1">Assigned To</label>
                            <select
                              value={item.participantId}
                              onChange={(e) => updateExpenseItem(index, 'participantId', e.target.value)}
                              required
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900 text-sm"
                            >
                              {splitBill.participants.map((p) => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                              ))}
                            </select>
                          </div>
                          {item.price && item.quantity && (
                            <div className="sm:col-span-2 text-right">
                              <span className="text-xs text-gray-500">Subtotal: </span>
                              <span className="font-semibold text-primary-600">
                                {formatCurrency((parseCurrency(item.price) * (item.quantity || 1)) + parseCurrency(item.taxAmount || '0'))}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Additional Tax (Rp)
                  </label>
                  <div className="relative">
                    <Percent className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={expenseTaxAmount}
                      onChange={(e) => setExpenseTaxAmount(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                      placeholder="0"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="taxIncluded"
                    checked={expenseTaxIncluded}
                    onChange={(e) => setExpenseTaxIncluded(e.target.checked)}
                    className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                  />
                  <label htmlFor="taxIncluded" className="text-sm text-gray-700">
                    Tax included in total
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={expenseDescription}
                  onChange={(e) => setExpenseDescription(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                  placeholder="Optional description..."
                />
              </div>

              <div className="flex gap-4 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddExpense(false)
                    setExpenseItems([])
                    setExpenseTitle('')
                    setExpenseDate(format(new Date(), 'yyyy-MM-dd'))
                    setExpenseDescription('')
                    setExpenseTaxAmount('')
                    setExpenseTaxIncluded(false)
                  }}
                  className="flex-1 px-4 py-2.5 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-lg font-semibold hover:from-primary-700 hover:to-primary-800 transition-all shadow-lg"
                >
                  Add Expense
                </button>
              </div>
            </form>
          )}

          <div className="space-y-4 mt-4">
            {splitBill.expenses.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Receipt className="w-16 h-16 mx-auto mb-3 text-gray-400" />
                <p className="text-lg font-medium">No expenses yet</p>
                <p className="text-sm">Add your first expense to get started!</p>
              </div>
            ) : (
              splitBill.expenses.map((expense) => {
                // Calculate totals from items if available
                let totalExpense = 0
                const itemsTotal = expense.items && expense.items.length > 0
                  ? expense.items.reduce((sum, item) => sum + (item.price * item.quantity) + (item.taxAmount || 0), 0)
                  : 0
                
                if (itemsTotal > 0) {
                  totalExpense = itemsTotal + (expense.taxAmount || 0)
                } else {
                  // Backward compatibility
                  totalExpense = expense.taxIncluded
                    ? (expense as any).amount + expense.taxAmount
                    : (expense as any).amount + expense.taxAmount
                }

                return (
                  <div
                    key={expense.id}
                    className="bg-gradient-to-br from-white to-gray-50 border-2 border-gray-200 rounded-xl p-5 hover:shadow-lg transition-all"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center shadow-md">
                            <Receipt className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <h3 className="font-bold text-lg text-gray-900">
                              {expense.title}
                            </h3>
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <Calendar className="w-3 h-3" />
                              <span>{format(new Date(expense.date || expense.createdAt), 'MMM d, yyyy')}</span>
                            </div>
                          </div>
                        </div>
                        {expense.description && (
                          <p className="text-sm text-gray-600 mt-2 ml-12">
                            {expense.description}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => handleRemoveExpense(expense.id)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Items List */}
                    {expense.items && expense.items.length > 0 ? (
                      <div className="mb-4 ml-12 space-y-2">
                        {expense.items.map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between p-2 bg-white rounded-lg border border-gray-200">
                            <div className="flex-1">
                              <div className="font-medium text-gray-900">{item.name}</div>
                              <div className="text-xs text-gray-500">
                                {item.quantity}x × {formatCurrency(item.price)}
                                {item.taxAmount > 0 && ` + Pajak ${formatCurrency(item.taxAmount)}`}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-semibold text-primary-600">
                                {formatCurrency((item.price * item.quantity) + (item.taxAmount || 0))}
                              </div>
                              <div className="text-xs text-gray-500">
                                {expense.items?.find(i => i.participantId === item.participantId)?.participant.name || 'Unknown'}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      // Backward compatibility - show participants
                      expense.participants && expense.participants.length > 0 && (
                        <div className="mb-4 ml-12">
                          <div className="text-xs text-gray-500 mb-2">Split between:</div>
                          <div className="flex flex-wrap gap-2">
                            {expense.participants.map((ep) => (
                              <div
                                key={ep.id}
                                className="px-3 py-1.5 bg-primary-100 rounded-lg text-xs font-medium text-primary-700 border border-primary-200"
                              >
                                {ep.participant.name}: {formatCurrency(ep.amount)}
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    )}

                    {/* Total */}
                    <div className="ml-12 pt-3 border-t border-gray-200">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-700">Total Expense:</span>
                        <span className="text-xl font-bold text-primary-600">
                          {formatCurrency(totalExpense)}
                        </span>
                      </div>
                      {expense.taxAmount > 0 && (
                        <div className="text-xs text-gray-500 mt-1">
                          Additional Tax: {formatCurrency(expense.taxAmount)}
                          {expense.taxIncluded && ' (included)'}
                        </div>
                      )}
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
            <div className="flex justify-between text-lg mb-4">
              <span>Total Amount:</span>
              <span className="font-bold text-2xl">{formatCurrency(total)}</span>
            </div>
            <div className="pt-4 border-t border-primary-400">
              <div className="text-sm font-medium mb-3">Per Participant:</div>
              <div className="space-y-2">
                {Object.entries(byParticipant).map(([participantId, amount]) => {
                  const participant = splitBill.participants.find((p) => p.id === participantId)
                  return (
                    <div
                      key={participantId}
                      className="flex justify-between items-center py-2 px-3 bg-white bg-opacity-20 rounded-lg"
                    >
                      <span className="font-medium">{participant?.name || 'Unknown'}:</span>
                      <span className="font-bold">{formatCurrency(amount)}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Receipt Scanner Modal */}
        {showScanner && (
          <ReceiptScanner
            onScanComplete={(data) => {
              setExpenseTitle(data.title)
              // Create an item from scanned data
              if (data.amount && splitBill && splitBill.participants.length > 0) {
                setExpenseItems([{
                  name: 'Scanned Item',
                  quantity: 1,
                  price: data.amount,
                  taxAmount: data.taxAmount || '',
                  participantId: splitBill.participants[0].id,
                }])
              }
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

