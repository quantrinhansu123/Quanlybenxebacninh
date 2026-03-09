import { useState, useEffect, useRef } from "react"
import { QrCode } from "lucide-react"
import { Html5Qrcode } from "html5-qrcode"
import { Button } from "@/components/ui/button"

interface QRScannerProps {
  onScanSuccess: (text: string) => void
}

export function QRScanner({ onScanSuccess }: QRScannerProps) {
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const qrCodeRef = useRef<Html5Qrcode | null>(null)
  const scannerId = "qr-reader"

  const stopScanning = async () => {
    if (qrCodeRef.current) {
      try {
        await qrCodeRef.current.stop()
        qrCodeRef.current.clear()
      } catch (err) {
        console.error("Error stopping QR scanner:", err)
      }
      qrCodeRef.current = null
    }
  }

  useEffect(() => {
    if (scanning) {
      const startScanning = async () => {
        try {
          const html5QrCode = new Html5Qrcode(scannerId)
          qrCodeRef.current = html5QrCode

          await html5QrCode.start(
            { facingMode: "environment" },
            {
              fps: 10,
              qrbox: { width: 250, height: 250 },
            },
            (decodedText) => {
              onScanSuccess(decodedText)
              stopScanning()
            },
            (_errorMessage) => {
              // Ignore scanning errors
            }
          )
          setError(null)
        } catch (err: any) {
          console.error("Error starting QR scanner:", err)
          setError("Không thể khởi động camera. Vui lòng kiểm tra quyền truy cập camera.")
          setScanning(false)
        }
      }
      startScanning()
    } else {
      stopScanning()
    }

    return () => {
      stopScanning()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanning])

  return (
    <div className="space-y-4">
      {!scanning ? (
        <div className="space-y-4">
          <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-300 rounded-lg">
            <QrCode className="h-16 w-16 text-gray-400 mb-4" />
            <p className="text-gray-600 mb-4">Nhấn nút bên dưới để bắt đầu quét QR code</p>
            <Button onClick={() => setScanning(true)}>Bắt đầu quét</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div id={scannerId} className="w-full rounded-lg overflow-hidden"></div>
          <Button variant="outline" onClick={() => setScanning(false)} className="w-full">
            Dừng quét
          </Button>
        </div>
      )}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
      <div className="text-sm text-gray-500">
        <p>• Đảm bảo camera có quyền truy cập</p>
        <p>• Đặt QR code trong khung quét</p>
        <p>• Đảm bảo đủ ánh sáng</p>
      </div>
    </div>
  )
}

