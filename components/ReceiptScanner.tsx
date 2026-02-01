'use client'

import { useState, useRef } from 'react'
import { Camera, X, Upload, Loader2, Check, Sparkles } from 'lucide-react'
import { createWorker } from 'tesseract.js'
import { formatCurrency, parseCurrency } from '@/lib/currency'

interface ReceiptScannerProps {
  onScanComplete: (data: { title: string; amount: string; taxAmount?: string }) => void
  onClose: () => void
}

export default function ReceiptScanner({ onScanComplete, onClose }: ReceiptScannerProps) {
  const [isScanning, setIsScanning] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [scannedData, setScannedData] = useState<{ title: string; amount: string; taxAmount?: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [mode, setMode] = useState<'camera' | 'upload'>('upload')

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        streamRef.current = stream
        setMode('camera')
      }
    } catch (error) {
      console.error('Error accessing camera:', error)
      alert('Tidak dapat mengakses kamera. Silakan gunakan upload foto.')
      setMode('upload')
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setMode('upload')
  }

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas')
      canvas.width = videoRef.current.videoWidth
      canvas.height = videoRef.current.videoHeight
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0)
        const dataUrl = canvas.toDataURL('image/jpeg')
        setPreview(dataUrl)
        stopCamera()
        processImage(dataUrl)
      }
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string
        setPreview(dataUrl)
        processImage(dataUrl)
      }
      reader.readAsDataURL(file)
    }
  }

  const processImage = async (imageDataUrl: string) => {
    setIsScanning(true)
    setScannedData(null)

    try {
      const worker = await createWorker('eng', 1, {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            console.log(`Progress: ${Math.round(m.progress * 100)}%`)
          }
        }
      })

      const { data: { text } } = await worker.recognize(imageDataUrl)
      await worker.terminate()

      // Parse the text to extract title and amount
      const parsed = parseReceiptText(text)
      setScannedData(parsed)
    } catch (error) {
      console.error('OCR Error:', error)
      alert('Gagal memproses gambar. Silakan coba lagi atau input manual.')
    } finally {
      setIsScanning(false)
    }
  }

  const parseReceiptText = (text: string): { title: string; amount: string; taxAmount?: string } => {
    // Improved parsing logic for Indonesian receipts
    const lines = text.split('\n').filter(line => line.trim())
    
    // Try to find amounts in Rupiah format
    // Patterns: Rp 50.000, Rp50.000, 50000, 50.000, etc.
    const amountRegex = /(?:Rp|IDR|rp)?\s*(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)/gi
    const amounts: number[] = []
    let match
    
    while ((match = amountRegex.exec(text)) !== null) {
      // Remove dots (thousand separators) and commas (decimal separators)
      const numStr = match[1].replace(/\./g, '').replace(',', '.')
      const num = parseFloat(numStr)
      if (num > 1000) { // Filter out small numbers (likely not prices)
        amounts.push(num)
      }
    }

    // Get the largest amount (usually total)
    const totalAmount = amounts.length > 0 ? Math.max(...amounts) : 0
    const amountStr = totalAmount > 0 ? totalAmount.toString() : ''

    // Try to find title/merchant name (look for capitalized words, common merchant patterns)
    let title = 'Receipt'
    const merchantPatterns = [
      /^[A-Z][A-Z\s]{3,30}$/, // All caps merchant names
      /^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*$/, // Title case names
    ]
    
    for (const line of lines.slice(0, 8)) {
      const trimmed = line.trim()
      if (trimmed.length > 3 && trimmed.length < 50 && !trimmed.match(/^\d+[.,\d\s]*$/)) {
        // Check if it looks like a merchant name
        if (merchantPatterns.some(pattern => pattern.test(trimmed)) || 
            trimmed.includes('RESTORAN') || 
            trimmed.includes('WARUNG') ||
            trimmed.includes('CAFE') ||
            trimmed.includes('TOKO')) {
          title = trimmed
          break
        }
      }
    }

    // If no merchant found, use first meaningful line
    if (title === 'Receipt') {
      for (const line of lines.slice(0, 5)) {
        const trimmed = line.trim()
        if (trimmed.length > 3 && trimmed.length < 50 && !trimmed.match(/^\d+[.,\d\s]*$/)) {
          title = trimmed
          break
        }
      }
    }

    // Try to find tax (look for "PPN", "TAX", "Pajak", "Service", etc.)
    const taxRegex = /(?:PPN|TAX|Pajak|Tax|Service|SERVICE)[\s:]*[Rp]?\s*(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)/gi
    const taxMatch = taxRegex.exec(text)
    let taxAmount: string | undefined = undefined
    
    if (taxMatch) {
      const taxStr = taxMatch[1].replace(/\./g, '').replace(',', '.')
      const taxNum = parseFloat(taxStr)
      if (taxNum > 0) {
        taxAmount = taxNum.toString()
      }
    }

    return {
      title: title.substring(0, 50),
      amount: amountStr,
      taxAmount,
    }
  }

  const handleUseScannedData = () => {
    if (scannedData) {
      onScanComplete(scannedData)
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto border-2 border-gray-200">
        <div className="sticky top-0 bg-gradient-to-r from-primary-600 to-primary-700 text-white border-b p-4 flex justify-between items-center rounded-t-2xl">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            <h2 className="text-xl font-bold">Scan Receipt</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {!preview && !isScanning && (
            <div className="space-y-4">
              <div className="flex gap-4">
                <button
                  onClick={startCamera}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg font-semibold"
                >
                  <Camera className="w-5 h-5" />
                  Use Camera
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all shadow-lg font-semibold"
                >
                  <Upload className="w-5 h-5" />
                  Upload Photo
                </button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          )}

          {mode === 'camera' && !preview && (
            <div className="space-y-4">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full rounded-lg bg-black"
                style={{ maxHeight: '400px' }}
              />
              <div className="flex gap-4">
                <button
                  onClick={capturePhoto}
                  className="flex-1 px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  Capture
                </button>
                <button
                  onClick={stopCamera}
                  className="flex-1 px-4 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {preview && (
            <div className="space-y-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview}
                alt="Receipt preview"
                className="w-full rounded-lg border"
              />

              {isScanning && (
                <div className="flex items-center justify-center gap-2 text-primary-600">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Memproses gambar...</span>
                </div>
              )}

              {scannedData && !isScanning && (
                <div className="space-y-4 border-t pt-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-green-700 mb-3">
                      <Check className="w-5 h-5" />
                      <span className="font-semibold">Data berhasil di-scan!</span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="font-medium text-gray-700">Title:</span>{' '}
                        <span className="text-gray-900">{scannedData.title}</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Amount:</span>{' '}
                        <span className="text-gray-900 font-semibold">
                          {scannedData.amount ? formatCurrency(parseCurrency(scannedData.amount)) : 'N/A'}
                        </span>
                      </div>
                      {scannedData.taxAmount && (
                        <div>
                          <span className="font-medium text-gray-700">Tax:</span>{' '}
                          <span className="text-gray-900 font-semibold">
                            {formatCurrency(parseCurrency(scannedData.taxAmount))}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <button
                      onClick={handleUseScannedData}
                      className="flex-1 px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                    >
                      Use This Data
                    </button>
                    <button
                      onClick={() => {
                        setPreview(null)
                        setScannedData(null)
                      }}
                      className="flex-1 px-4 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                    >
                      Scan Again
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

