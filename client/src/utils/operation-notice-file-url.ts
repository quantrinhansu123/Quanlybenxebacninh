const APPSHEET_GET_FILE_URL = 'https://www.appsheet.com/template/gettablefileurl'
const APPSHEET_APP_NAME = 'SMARTTRANSPORTBG_V11_Core-822150001'
const APPSHEET_TABLE_THONGBAO = 'THONGBAO_KHAITHAC'

/** Giống AppSheet: gettablefileurl + ENCODEURL([File]) với File = file_path */
export function buildThongBaoFileUrlFromPath(filePath: string | null | undefined): string | null {
  const fileName = String(filePath || '').trim()
  if (!fileName) return null
  const params = new URLSearchParams({
    appName: APPSHEET_APP_NAME,
    tableName: APPSHEET_TABLE_THONGBAO,
    fileName,
  })
  return `${APPSHEET_GET_FILE_URL}?${params.toString()}`
}
