const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isUuidString(value: string | undefined | null): boolean {
  if (value === undefined || value === null) return false
  return UUID_REGEX.test(String(value).trim())
}
