/** Stable portal root — never removed; React alone manages children. */
const PORTAL_ROOT_ID = 'app-portal-root'

export function getPortalRoot(): HTMLElement {
  if (typeof document === 'undefined') {
    throw new Error('document is not available')
  }
  let root = document.getElementById(PORTAL_ROOT_ID)
  if (!root) {
    root = document.createElement('div')
    root.id = PORTAL_ROOT_ID
    document.body.appendChild(root)
  }
  return root
}
