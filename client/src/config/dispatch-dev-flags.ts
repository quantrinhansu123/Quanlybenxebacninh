/**
 * Chặn cấp phép trên UI (giấy tờ, validate, cảnh báo trip limit…): mặc định TẮT.
 * Bật lại: VITE_DISPATCH_PERMIT_RELAX_ELIGIBLE_CHECKS=false (Vercel → rebuild).
 */
export const relaxPermitEligibleChecks =
  import.meta.env.VITE_DISPATCH_PERMIT_RELAX_ELIGIBLE_CHECKS !== 'false'

/** Banner nhắc chỉ khi bật rõ ràng VITE_*=true */
export const showPermitRelaxBanner =
  import.meta.env.VITE_DISPATCH_PERMIT_RELAX_ELIGIBLE_CHECKS === 'true'
