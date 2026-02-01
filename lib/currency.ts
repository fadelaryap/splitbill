/**
 * Currency formatting utilities for Indonesian Rupiah (IDR)
 */

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatCurrencyWithDecimals(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function parseCurrency(value: string): number {
  // Remove currency symbols, spaces, and dots (thousand separators)
  const cleaned = value
    .replace(/[Rp\s.]/g, '')
    .replace(',', '.')
  
  return parseFloat(cleaned) || 0
}

