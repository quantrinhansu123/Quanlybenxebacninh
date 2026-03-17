import { useEffect, useMemo, useState } from "react"
import { Operator } from "@/types"
import { Check, X } from "lucide-react"
import { appsheetClient } from "@/services/appsheet-client.service"
import { normalizeBadgeRows } from "@/services/appsheet-normalize-badges"
import { buildIdXeToPlateMap } from "@/services/appsheet-normalize-vehicles"

interface OperatorViewProps {
  operator: Operator
}

export function OperatorView({ operator }: OperatorViewProps) {
  const [appsheetPlates, setAppsheetPlates] = useState<string[]>([])
  const [appsheetLoading, setAppsheetLoading] = useState(false)
  const [appsheetError, setAppsheetError] = useState<string | null>(null)
  const [appsheetDebug, setAppsheetDebug] = useState<{
    operatorId: string
    badgesTotal: number
    vehiclesTotal: number
    matchedBadges: number
    sampleBadge?: { badgeNumber?: string; vehicleRef?: string; plateNumber?: string; operatorRef?: string }
    sampleVehicleKeys?: string[]
    sampleVehicleRow?: Record<string, unknown> | null
  } | null>(null)

  // AppSheet operator id thường là 8 ký tự hex (IDDoanhNghiep)
  const appsheetOperatorId = useMemo(() => {
    const codeOrId = String(operator.code || operator.id || "").trim()
    const isLikelyHex8 = /^[0-9a-f]{8}$/i.test(codeOrId)
    return isLikelyHex8 ? codeOrId : ""
  }, [operator.code, operator.id])

  useEffect(() => {
    let cancelled = false
    async function loadAppsheetVehicles() {
      if (!appsheetOperatorId) {
        setAppsheetPlates([])
        setAppsheetError(null)
        return
      }

      setAppsheetLoading(true)
      setAppsheetError(null)
      try {
        const esc = (s: string) => s.replace(/"/g, '\\"').trim()
        // TrangThai thực tế thường là "Hiệu lực"; lấy cả "Hoạt động" để tương thích UI
        const badgeSelector = `Filter(PHUHIEUXE, And(Lower([Ref_DonViCapPhuHieu]) = "${esc(appsheetOperatorId).toLowerCase()}", Or([TrangThai] = "Hoạt động", [TrangThai] = "Hiệu lực")))`
        const badgeRows = await appsheetClient.findByName("badges", { selector: badgeSelector })

        const badges = normalizeBadgeRows(badgeRows)
        const vehicleRefs = Array.from(
          new Set(badges.map((b) => (b.vehicleRef || "").trim()).filter(Boolean)),
        )

        const CHUNK = 200
        const vehicleRows: Record<string, unknown>[] = []
        for (let i = 0; i < vehicleRefs.length; i += CHUNK) {
          const chunk = vehicleRefs.slice(i, i + CHUNK)
          const rows = chunk.map((id) => ({ IDXe: id }))
          const res = await appsheetClient.findByName("vehicles", { rows }).catch(() => [])
          vehicleRows.push(...res)
        }

        const idXeToPlate = buildIdXeToPlateMap(vehicleRows)

        // Đã lọc server-side bằng Selector; giữ lại để debug/count
        const relevant = badges.filter(
          (b) =>
            (b.operatorRef || "").trim().toLowerCase() ===
            appsheetOperatorId.trim().toLowerCase(),
        )

        // Lấy hết xe thỏa mãn (không lọc TrangThai), dedup theo biển số
        const plates = new Set<string>()
        for (const b of relevant) {
          const plate =
            (b.vehicleRef && idXeToPlate.get(b.vehicleRef)) || b.plateNumber || ""
          const normalized = plate.trim()
          if (normalized) plates.add(normalized)
        }

        if (!cancelled) {
          setAppsheetPlates(Array.from(plates))

          const sampleBadge = relevant[0]
            ? {
                badgeNumber: relevant[0].badgeNumber,
                vehicleRef: relevant[0].vehicleRef,
                plateNumber: relevant[0].plateNumber,
                operatorRef: relevant[0].operatorRef,
              }
            : undefined

          const sampleVehicleKeys =
            vehicleRows && vehicleRows[0]
              ? Object.keys(vehicleRows[0]).slice(0, 30)
              : []

          const sampleVehicleRow =
            sampleBadge?.vehicleRef
              ? (vehicleRows.find((r) => {
                  const id = typeof r["IDXe"] === "string" ? r["IDXe"].trim() : String(r["IDXe"] ?? "").trim()
                  return id && id === String(sampleBadge.vehicleRef).trim()
                }) ?? null)
              : null

          setAppsheetDebug({
            operatorId: appsheetOperatorId,
            badgesTotal: badges.length,
            vehiclesTotal: vehicleRows.length,
            matchedBadges: relevant.length,
            sampleBadge,
            sampleVehicleKeys,
            sampleVehicleRow,
          })
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Không tải được dữ liệu AppSheet"
        if (!cancelled) {
          setAppsheetError(msg)
          setAppsheetPlates([])
          setAppsheetDebug(null)
        }
      } finally {
        if (!cancelled) setAppsheetLoading(false)
      }
    }

    void loadAppsheetVehicles()
    return () => {
      cancelled = true
    }
  }, [appsheetOperatorId])

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
      {appsheetOperatorId && (
        <div className="space-y-2">
          <h3 className="text-lg font-medium border-b pb-2">
            Danh sách xe (AppSheet)
            <span className="ml-2 text-xs font-normal text-gray-500">
              IDDoanhNghiep: {appsheetOperatorId.toUpperCase()}
            </span>
          </h3>

          {appsheetLoading ? (
            <div className="text-sm text-gray-500">Đang tải danh sách xe từ AppSheet…</div>
          ) : appsheetError ? (
            <div className="text-sm text-red-600">Lỗi AppSheet: {appsheetError}</div>
          ) : appsheetPlates.length === 0 ? (
            <div className="text-sm text-gray-500">Không tìm thấy xe trong PHUHIEUXE cho đơn vị này.</div>
          ) : (
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              <div className="font-semibold mb-2">
                Tìm thấy {appsheetPlates.length} xe:
              </div>
              <ul className="flex flex-wrap gap-2">
                {appsheetPlates.map((p) => (
                  <li
                    key={p}
                    className="px-2 py-0.5 rounded-md bg-white border border-slate-200"
                  >
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Debug payload to identify real Xe column names */}
          {appsheetDebug && (
            <details className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700">
              <summary className="cursor-pointer font-semibold">Debug AppSheet (cột Xe/PHUHIEUXE)</summary>
              <div className="mt-2 space-y-2">
                <div>
                  <span className="font-medium">Counts:</span>{" "}
                  badges={appsheetDebug.badgesTotal}, xe={appsheetDebug.vehiclesTotal}, matchedBadges={appsheetDebug.matchedBadges}
                </div>
                {appsheetDebug.sampleBadge && (
                  <div>
                    <span className="font-medium">Sample badge:</span>{" "}
                    SoPH={appsheetDebug.sampleBadge.badgeNumber || "?"},{" "}
                    Ref_DonViCapPhuHieu={appsheetDebug.sampleBadge.operatorRef || "?"},{" "}
                    BienSoXe={appsheetDebug.sampleBadge.vehicleRef || "?"},{" "}
                    BienSo={appsheetDebug.sampleBadge.plateNumber || "?"}
                  </div>
                )}
                <div>
                  <span className="font-medium">Sample Xe keys (first row):</span>{" "}
                  {appsheetDebug.sampleVehicleKeys?.join(", ") || "(none)"}
                </div>
                <div className="overflow-auto max-h-40 rounded bg-slate-50 p-2">
                  <span className="font-medium">Xe row for BienSoXe (matched IDXe):</span>
                  <pre className="mt-1 whitespace-pre-wrap break-words">
{JSON.stringify(appsheetDebug.sampleVehicleRow, null, 2)}
                  </pre>
                </div>
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  )
}
