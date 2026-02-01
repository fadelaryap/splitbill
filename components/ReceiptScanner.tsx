'use client'

import { useState, useRef } from 'react'
import { Camera, X, Upload, Loader2, Check } from 'lucide-react'
import { createWorker } from 'tesseract.js'

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
    // Simple parsing logic - can be improved
    const lines = text.split('\n').filter(line => line.trim())
    
    // Try to find amount (usually contains currency symbols or numbers)
    const amountRegex = /(?:Rp|IDR|USD|\$)?\s*(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)/gi
    const amounts: number[] = []
    let match
    
    while ((match = amountRegex.exec(text)) !== null) {
      const numStr = match[1].replace(/[.,]/g, '')
      const num = parseInt(numStr)
      if (num > 1000) { // Filter out small numbers
        amounts.push(num)
      }
    }

    // Get the largest amount (usually total)
    const totalAmount = amounts.length > 0 ? Math.max(...amounts) : 0
    const amountStr = totalAmount > 0 ? (totalAmount / 100).toFixed(2) : ''

    // Try to find title (first meaningful line or merchant name)
    let title = 'Receipt'
    for (const line of lines.slice(0, 5)) {
      if (line.length > 3 && line.length < 50 && !line.match(/^\d+$/)) {
        title = line.trim()
        break
      }
    }

    // Try to find tax (look for "PPN", "TAX", "Pajak", etc.)
    const taxRegex = /(?:PPN|TAX|Pajak|Tax)[\s:]*(\d+(?:[.,]\d+)?)/gi
    const taxMatch = taxRegex.exec(text)
    const taxAmount = taxMatch ? parseFloat(taxMatch[1].replace(',', '.')) : undefined

    return {
      title: title.substring(0, 50),
      amount: amountStr,
      taxAmount: taxAmount ? taxAmount.toFixed(2) : undefined,
    }
  }

  const handleUseScannedData = () => {
    if (scannedData) {
      onScanComplete(scannedData)
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900">Scan Receipt</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
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
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  <Camera className="w-5 h-5" />
                  Use Camera
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
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
                        <span className="text-gray-900">${scannedData.amount}</span>
                      </div>
                      {scannedData.taxAmount && (
                        <div>
                          <span className="font-medium text-gray-700">Tax:</span>{' '}
                          <span className="text-gray-900">${scannedData.taxAmount}</span>
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

