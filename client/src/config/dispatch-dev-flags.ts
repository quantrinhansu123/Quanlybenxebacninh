/**
 * Nút "Đủ điều kiện" luôn bỏ qua chặn UI (giấy tờ, validate form, trip limit, số tiền 0…).
 * (Trước đây có thể tắt bằng VITE_DISPATCH_PERMIT_RELAX_ELIGIBLE_CHECKS=false — đã bỏ để prod/Vercel thống nhất.)
 */
export const relaxPermitEligibleChecks = true

/** Banner gợi ý (tùy chọn): chỉ khi VITE_DISPATCH_PERMIT_RELAX_BANNER=true */
export const showPermitRelaxBanner =
  import.meta.env.VITE_DISPATCH_PERMIT_RELAX_BANNER === 'true'
