import { useEffect, useMemo, useState } from "react"
import { Operator } from "@/types"
import { Check, X } from "lucide-react"
import { appsheetClient } from "@/services/appsheet-client.service"
import { normalizeBadgeRows } from "@/services/appsheet-normalize-badges"

interface OperatorViewProps {
  operator: Operator
}

export function OperatorView({ operator }: OperatorViewProps) {
  const [appsheetBadges, setAppsheetBadges] = useState<ReturnType<typeof normalizeBadgeRows>>([])
  const [appsheetLoading, setAppsheetLoading] = useState(false)
  const [appsheetError, setAppsheetError] = useState<string | null>(null)
  const [resolvedAppsheetOperatorId, setResolvedAppsheetOperatorId] = useState<string>("")
  const [appsheetDebug, setAppsheetDebug] = useState<{
    operatorId: string
    badgesTotal: number
    matchedBadges: number
    sampleBadge?: { badgeNumber?: string; vehicleRef?: string; plateNumber?: string; operatorRef?: string; badgeType?: string; status?: string }
  } | null>(null)

  const isHex8 = (s: string) => /^[0-9a-f]{8}$/i.test((s || "").trim())

  // AppSheet operator id thường là 8 ký tự hex (IDDoanhNghiep)
  const appsheetOperatorIdCandidate = useMemo(() => {
    const codeOrId = String(operator.code || operator.id || "").trim()
    return isHex8(codeOrId) ? codeOrId : ""
  }, [operator.code, operator.id])

  useEffect(() => {
    let cancelled = false
    async function loadAppsheetBadges() {
      const esc = (s: string) => s.replace(/"/g, '\\"').trim()

      const resolveId = async (): Promise<string> => {
        if (appsheetOperatorIdCandidate) return appsheetOperatorIdCandidate

        // Fallback 1: lookup by tax code
        const taxCode = String((operator as any)?.taxCode || "").trim()
        if (taxCode) {
          const selector = `Filter(THONGTINDONVIVANTAI, [MaSoThue] = "${esc(taxCode)}")`
          const rows = await appsheetClient.findByName("operators", { selector }).catch(() => [])
          const row0 = rows?.[0] as any
          const id = String(row0?.IDDoanhNghiep || row0?.id || row0?.firebaseId || "").trim()
          if (isHex8(id)) return id
        }

        // Fallback 2: lookup by exact name
        const name = String((operator as any)?.name || "").trim()
        if (name) {
          const selector = `Filter(THONGTINDONVIVANTAI, [TenDoanhNghiep] = "${esc(name)}")`
          const rows = await appsheetClient.findByName("operators", { selector }).catch(() => [])
          const row0 = rows?.[0] as any
          const id = String(row0?.IDDoanhNghiep || row0?.id || row0?.firebaseId || "").trim()
          if (isHex8(id)) return id
        }

        return ""
      }

      const appsheetOperatorId = await resolveId()
      if (!appsheetOperatorId) {
        setAppsheetBadges([])
        setAppsheetError(null)
        setResolvedAppsheetOperatorId("")
        return
      }

      setResolvedAppsheetOperatorId(appsheetOperatorId)
      setAppsheetLoading(true)
      setAppsheetError(null)
      try {
        // Selector đơn giản, tránh Lower()/IN() để chắc chắn có dữ liệu
        const opUpper = esc(appsheetOperatorId).toUpperCase()
        const opLower = esc(appsheetOperatorId).toLowerCase()
        const badgeSelector = `Filter(PHUHIEUXE, Or([Ref_DonViCapPhuHieu] = "${opUpper}", [Ref_DonViCapPhuHieu] = "${opLower}"))`
        const badgeRows = await appsheetClient.findByName("badges", { selector: badgeSelector })

        const badges = normalizeBadgeRows(badgeRows)

        // Đã lọc server-side bằng Selector; giữ lại để debug/count
        const relevant = badges.filter((b) =>
          (b.operatorRef || "").trim().toLowerCase() === appsheetOperatorId.trim().toLowerCase(),
        )

        // Chỉ lấy LoaiPH = "Tuyến cố định" hoặc "Buýt" (lọc client-side)
        const allowed = new Set(["tuyến cố định", "buýt"])
        const filtered = relevant.filter((b) => allowed.has((b.badgeType || "").trim().toLowerCase()))

        if (!cancelled) {
          setAppsheetBadges(filtered)

          const sampleBadge = filtered[0]
            ? {
                badgeNumber: filtered[0].badgeNumber,
                vehicleRef: filtered[0].vehicleRef,
                plateNumber: filtered[0].plateNumber,
                operatorRef: filtered[0].operatorRef,
                badgeType: filtered[0].badgeType,
                status: filtered[0].status,
              }
            : undefined

          setAppsheetDebug({
            operatorId: appsheetOperatorId,
            badgesTotal: badges.length,
            matchedBadges: filtered.length,
            sampleBadge,
          })
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Không tải được dữ liệu AppSheet"
        if (!cancelled) {
          setAppsheetError(msg)
          setAppsheetBadges([])
          setAppsheetDebug(null)
        }
      } finally {
        if (!cancelled) setAppsheetLoading(false)
      }
    }

    void loadAppsheetBadges()
    return () => {
      cancelled = true
    }
  }, [appsheetOperatorIdCandidate, operator])

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Basic Info */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium border-b pb-2">Thông tin chung</h3>
          
          <div className="grid grid-cols-3 gap-2">
            <span className="font-medium text-gray-500">Tên đơn vị:</span>
            <span className="col-span-2">{operator.name}</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <span className="font-medium text-gray-500">Mã đơn vị:</span>
            <span className="col-span-2">{operator.code}</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <span className="font-medium text-gray-500">Mã số thuế:</span>
            <span className="col-span-2">{operator.taxCode || "N/A"}</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <span className="font-medium text-gray-500">Ủy thác bán vé:</span>
            <span className="col-span-2 flex items-center">
              {operator.isTicketDelegated ? (
                <span className="flex items-center text-green-600"><Check className="h-4 w-4 mr-1" /> Có</span>
              ) : (
                <span className="flex items-center text-gray-500"><X className="h-4 w-4 mr-1" /> Không</span>
              )}
            </span>
          </div>
          
          <div className="grid grid-cols-3 gap-2">
            <span className="font-medium text-gray-500">Trạng thái:</span>
            <span className="col-span-2">
              {operator.isActive ? (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Hoạt động
                </span>
              ) : (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                  Ngừng hoạt động
                </span>
              )}
            </span>
          </div>
        </div>

        {/* Contact Info */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium border-b pb-2">Liên hệ & Địa chỉ</h3>

          <div className="grid grid-cols-3 gap-2">
            <span className="font-medium text-gray-500">Số điện thoại:</span>
            <span className="col-span-2">{operator.phone || "N/A"}</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <span className="font-medium text-gray-500">Email:</span>
            <span className="col-span-2">{operator.email || "N/A"}</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <span className="font-medium text-gray-500">Địa chỉ:</span>
            <span className="col-span-2">
              {[operator.address, operator.district, operator.province].filter(Boolean).join(", ") || "N/A"}
            </span>
          </div>
        </div>

        {/* Representative Info */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium border-b pb-2">Người đại diện</h3>
          
          <div className="grid grid-cols-3 gap-2">
            <span className="font-medium text-gray-500">Họ tên:</span>
            <span className="col-span-2">{operator.representativeName || "N/A"}</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <span className="font-medium text-gray-500">Chức vụ:</span>
            <span className="col-span-2">{operator.representativePosition || "N/A"}</span>
          </div>
        </div>
      </div>

      {/* AppSheet Vehicles (debug/monitor) */}
      {resolvedAppsheetOperatorId && (
        <div className="space-y-2">
          <h3 className="text-lg font-medium border-b pb-2">
            Danh sách phù hiệu (AppSheet)
            <span className="ml-2 text-xs font-normal text-gray-500">
              IDDoanhNghiep: {resolvedAppsheetOperatorId.toUpperCase()}
            </span>
          </h3>

          {appsheetLoading ? (
            <div className="text-sm text-gray-500">Đang tải danh sách phù hiệu từ AppSheet…</div>
          ) : appsheetError ? (
            <div className="text-sm text-red-600">Lỗi AppSheet: {appsheetError}</div>
          ) : appsheetBadges.length === 0 ? (
            <div className="text-sm text-gray-500">Không tìm thấy phù hiệu (LoaiPH = Buýt/Tuyến cố định) cho đơn vị này.</div>
          ) : (
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              <div className="font-semibold mb-2">
                Tìm thấy {appsheetBadges.length} phù hiệu:
              </div>
              <div className="overflow-auto">
                <table className="min-w-full text-xs">
                  <thead className="text-slate-500">
                    <tr>
                      <th className="text-left py-1 pr-3">Số PH</th>
                      <th className="text-left py-1 pr-3">Loại PH</th>
                      <th className="text-left py-1 pr-3">Trạng thái</th>
                      <th className="text-left py-1 pr-3">Biển số</th>
                      <th className="text-left py-1 pr-3">BienSoXe(IDXe)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {appsheetBadges.slice(0, 200).map((b) => (
                      <tr key={b.badgeNumber} className="border-t border-slate-200">
                        <td className="py-1 pr-3 font-medium">{b.badgeNumber}</td>
                        <td className="py-1 pr-3">{b.badgeType || "-"}</td>
                        <td className="py-1 pr-3">{b.status || "-"}</td>
                        <td className="py-1 pr-3">{b.plateNumber || "-"}</td>
                        <td className="py-1 pr-3">{b.vehicleRef || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {appsheetBadges.length > 200 && (
                  <div className="mt-2 text-[11px] text-slate-500">
                    (Đang hiển thị 200/{appsheetBadges.length} dòng để tránh lag)
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Debug payload to identify real Xe column names */}
          {appsheetDebug && (
            <details className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700">
              <summary className="cursor-pointer font-semibold">Debug AppSheet (cột Xe/PHUHIEUXE)</summary>
              <div className="mt-2 space-y-2">
                <div>
                  <span className="font-medium">Counts:</span>{" "}
                  badges={appsheetDebug.badgesTotal}, matchedBadges={appsheetDebug.matchedBadges}
                </div>
                {appsheetDebug.sampleBadge && (
                  <div>
                    <span className="font-medium">Sample badge:</span>{" "}
                    SoPH={appsheetDebug.sampleBadge.badgeNumber || "?"},{" "}
                    Ref_DonViCapPhuHieu={appsheetDebug.sampleBadge.operatorRef || "?"},{" "}
                    BienSoXe={appsheetDebug.sampleBadge.vehicleRef || "?"},{" "}
                    BienSo={appsheetDebug.sampleBadge.plateNumber || "?"},{" "}
                    LoaiPH={appsheetDebug.sampleBadge.badgeType || "?"},{" "}
                    TrangThai={appsheetDebug.sampleBadge.status || "?"}
                  </div>
                )}
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  )
}
