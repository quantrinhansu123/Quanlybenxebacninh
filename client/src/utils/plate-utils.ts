/** Normalize plate: remove dots, dashes, spaces → uppercase */
export const normPlate = (raw: string): string =>
  (raw || '').replace(/[\s.\-]/g, '').toUpperCase()
