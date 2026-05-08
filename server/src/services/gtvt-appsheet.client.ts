type AppSheetFindResponse = {
  Rows?: unknown[]
}

function getRequiredEnv(name: string): string {
  const v = (process.env[name] || '').trim()
  if (!v) throw new Error(`[GTVT] Missing env ${name}`)
  return v
}

function sanitizeAppSheetKey(raw: string): string {
  const v = raw.trim()
  // Some env files store the key as "{V2-...}" — AppSheet expects raw "V2-..."
  if (v.startsWith('{') && v.endsWith('}')) return v.slice(1, -1).trim()
  return v
}

function buildUrl(endpoint: string): string {
  const base = getRequiredEnv('GTVT_APPSHEET_BASE_URL').replace(/\/$/, '')
  const ep = endpoint.replace(/^\//, '')
  return `${base}/${ep}`
}

async function appsheetFindByEndpoint(endpoint: string): Promise<unknown[]> {
  const url = buildUrl(endpoint)

  const headerName = (process.env.GTVT_APPSHEET_AUTH_HEADER || 'ApplicationAccessKey').trim()
  const apiKey = sanitizeAppSheetKey(getRequiredEnv('GTVT_APPSHEET_API_KEY'))
  const timeoutMs = Number(process.env.GTVT_APPSHEET_TIMEOUT_MS || 30000)

  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        [headerName]: apiKey,
      },
      body: JSON.stringify({ Action: 'Find', Properties: {}, Rows: [] }),
      signal: controller.signal,
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      if (res.status === 403 && text.includes('ApplicationAccessKey')) {
        throw new Error(
          `[GTVT] AppSheet 403: ApplicationAccessKey không hợp lệ. ` +
          `Kiểm tra GTVT_APPSHEET_API_KEY (không bọc trong {}), và đúng AppID.`,
        )
      }
      throw new Error(`[GTVT] AppSheet request failed (${res.status}): ${text.slice(0, 500)}`)
    }

    const json = (await res.json()) as unknown
    // AppSheet responses are inconsistent:
    // - Sometimes: { Rows: [...] }
    // - Sometimes: [...] (raw array)
    if (Array.isArray(json)) return json
    const obj = json as AppSheetFindResponse & { rows?: unknown[] }
    if (Array.isArray(obj.Rows)) return obj.Rows
    if (Array.isArray(obj.rows)) return obj.rows
    return []
  } finally {
    clearTimeout(t)
  }
}

export async function appsheetFind(endpointEnv: string): Promise<unknown[]> {
  const endpointRaw = getRequiredEnv(endpointEnv)
  const endpoints = endpointRaw
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)
  if (endpoints.length <= 1) {
    return appsheetFindByEndpoint(endpointRaw)
  }
  const batches = await Promise.all(endpoints.map((ep) => appsheetFindByEndpoint(ep)))
  return batches.flat()
}

