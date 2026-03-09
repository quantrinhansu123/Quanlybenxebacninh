import type { GtvtContractField, GtvtContractStatus } from '../types/gtvt-sync.types.js'

// Fields that map to env vars checked by Zod in gtvt-appsheet.config.ts
const CONTRACT_FIELDS: Omit<GtvtContractField, 'present'>[] = [
  { name: 'GTVT_APPSHEET_ROUTES_ENDPOINT', label: 'Routes endpoint', required: true },
  { name: 'GTVT_APPSHEET_SCHEDULES_ENDPOINT', label: 'Schedules endpoint', required: true },
  { name: 'GTVT_APPSHEET_API_KEY', label: 'API key', required: true },
  { name: 'GTVT_APPSHEET_BASE_URL', label: 'Base URL', required: false },
  { name: 'GTVT_APPSHEET_NOTIFICATIONS_ENDPOINT', label: 'Notifications endpoint', required: false },
  { name: 'GTVT_APPSHEET_BUS_ROUTES_ENDPOINT', label: 'Bus routes endpoint', required: false },
  { name: 'GTVT_APPSHEET_BUS_SCHEDULES_ENDPOINT', label: 'Bus schedules endpoint', required: false },
  { name: 'GTVT_APPSHEET_BUS_LOOKUP_ENDPOINT', label: 'Bus lookup endpoint', required: false },
]

export function getContractStatus(): GtvtContractStatus {
  const fields: GtvtContractField[] = CONTRACT_FIELDS.map((field) => ({
    ...field,
    present: !!process.env[field.name]?.trim(),
  }))

  const ready = fields.filter((f) => f.required).every((f) => f.present)

  return { ready, fields }
}
