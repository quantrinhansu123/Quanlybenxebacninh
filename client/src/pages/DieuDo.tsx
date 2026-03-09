import {
  Search,
  FileCheck,
  Plus,
  Bus,
  FileText,
  RefreshCw,
  ShieldCheck,
  Banknote,
  ArrowRightLeft,
  ArrowRight,
  Pencil,
  Trash2,
  Activity,
  Radar,
  Sparkles,
  User,
} from "lucide-react";
import { useSmartNavigation } from "@/lib/navigation-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { ChoXeVaoBenDialog } from "@/components/dispatch/ChoXeVaoBenDialog";
import { XeTraKhachDialog } from "@/components/dispatch/XeTraKhachDialog";
import { CapPhepDialog } from "@/components/dispatch/CapPhepDialog";
import { ThanhToanTheoThangDialog } from "@/components/dispatch/ThanhToanTheoThangDialog";
import { ChoXeRaBenDialog } from "@/components/dispatch/ChoXeRaBenDialog";
import { CapLenhXuatBenDialog } from "@/components/dispatch/CapLenhXuatBenDialog";
import { ChoNhieuXeRaBenDialog } from "@/components/dispatch/ChoNhieuXeRaBenDialog";
import { BusPlusIcon, BusEnterIcon } from "@/components/dispatch/icons";
import {
  columnConfig,
  type DisplayStatus,
  RadarPulse,
  ActionButton,
  FloatingDotsEmpty,
  VehicleCard,
} from "@/components/dispatch/common";
import { useDieuDo } from "@/hooks/useDieuDo";
import { cn } from "@/lib/utils";
import type { DispatchRecord } from "@/types";

export default function DieuDo() {
  const { navigateWithReturn } = useSmartNavigation();
  const {
    records,
    searchQuery,
    setSearchQuery,
    isLoading,
    selectedRecord,
    dialogOpen,
    setDialogOpen,
    closeDialog,
    dialogType,
    setDialogType,
    isReadOnly,
    vehicleOptions,
    stats,
    totalActive,
    loadRecords,
    handleDelete,
    handleEdit,
    handleAction,
    handleOpenPermitReadOnly,
    handleRecordExit,
    getRecordsByStatus,
    isMonthlyPaymentVehicle,
    getVehicleStatus,
  } = useDieuDo();

  const getActionButtons = (record: DispatchRecord, status: DisplayStatus) => {
    const buttons: React.ReactNode[] = [];

    if (status === "in-station") {
      if (isMonthlyPaymentVehicle(record)) {
        buttons.push(
          <ActionButton key="monthly-payment" icon={FileCheck} onClick={(e) => { e.stopPropagation(); handleAction(record, "monthly-payment"); }} title="Thanh toán theo tháng" variant="info" />
        );
      }
      buttons.push(
        <ActionButton key="return" icon={User} onClick={(e) => { e.stopPropagation(); handleAction(record, "return"); }} title="Xác nhận trả khách" variant="info" />,
        <ActionButton key="permit" icon={FileCheck} onClick={(e) => { e.stopPropagation(); handleAction(record, "permit"); }} title="Cấp phép" variant="success" />,
        <ActionButton key="edit" icon={Pencil} onClick={(e) => { e.stopPropagation(); handleEdit(record); }} title="Sửa thông tin" variant="warning" />,
        <ActionButton key="delete" icon={Trash2} onClick={(e) => { e.stopPropagation(); handleDelete(record); }} title="Xóa" variant="danger" />
      );
    } else if (status === "permit-issued") {
      buttons.push(
        <ActionButton key="payment" icon={Banknote} onClick={(e) => { e.stopPropagation(); navigateWithReturn(`/thanh-toan/${record.id}`); }} title="Thanh toán" variant="warning" />,
        <ActionButton key="document" icon={FileText} onClick={(e) => { e.stopPropagation(); handleOpenPermitReadOnly(record); }} title="Xem tài liệu" variant="info" />
      );
    } else if (status === "paid") {
      if (record.permitStatus === "approved") {
        buttons.push(<ActionButton key="departure-order" icon={ShieldCheck} onClick={(e) => { e.stopPropagation(); handleAction(record, "departure-order"); }} title="Cấp lệnh xuất bến" variant="success" />);
      }
      if (record.permitStatus === "rejected" || !record.permitStatus) {
        buttons.push(
          <ActionButton key="exit" icon={BusEnterIcon} onClick={async (e) => { e.stopPropagation(); await handleRecordExit(record); }} title="Cho xe ra bến" variant="danger" />,
          <ActionButton key="delete" icon={Trash2} onClick={(e) => { e.stopPropagation(); handleDelete(record); }} title="Xóa" variant="danger" />
        );
      }
    } else if (status === "departed" && record.currentStatus === "departure_ordered") {
      buttons.push(<ActionButton key="depart" icon={BusEnterIcon} onClick={(e) => { e.stopPropagation(); handleAction(record, "depart"); }} title="Cho xe ra bến" variant="success" />);
    }

    return buttons;
  };

  const renderColumn = (status: DisplayStatus) => {
    const config = columnConfig[status];
    const columnRecords = getRecordsByStatus(status);
    const Icon = config.icon;
    const colorMap: Record<DisplayStatus, string> = { "in-station": "sky", "permit-issued": "amber", paid: "emerald", departed: "violet" };

    return (
      <div className="flex flex-col h-full min-h-0 rounded-2xl overflow-hidden shadow-lg border border-white/50 bg-white/60 backdrop-blur-xl">
        {/* Glass Header - Compact */}
        <div className={cn("relative px-3 py-3 bg-gradient-to-r overflow-hidden", config.headerGradient)}>
          <div className="absolute inset-0 bg-white/10 backdrop-blur-sm" />
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0" style={{ backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`, backgroundSize: '20px 20px' }} />
          </div>
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-white/20 backdrop-blur-sm shadow-inner">
                <Icon className="h-5 w-5 text-white drop-shadow" />
              </div>
              <div>
                <h2 className="font-bold text-white text-sm drop-shadow-sm tracking-wide">
                  <span className="hidden lg:inline">{config.title}</span>
                  <span className="lg:hidden">{config.shortTitle}</span>
                </h2>
              </div>
            </div>
            <RadarPulse count={columnRecords.length} color={colorMap[status]} />
          </div>
        </div>

        {/* Content - Compact spacing */}
        <div className={cn("flex-1 overflow-y-auto p-2 space-y-2 min-h-0", `bg-gradient-to-b ${config.gradient}`)}>
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-4 border-slate-200 border-t-blue-500 animate-spin" />
                <Radar className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-slate-400" />
              </div>
              <p className="text-slate-400 font-medium mt-4">Đang quét...</p>
            </div>
          ) : columnRecords.length === 0 ? (
            <FloatingDotsEmpty message="Không có xe" />
          ) : (
            columnRecords.map((record, index) => (
              <VehicleCard
                key={record.id}
                record={record}
                status={status}
                index={index}
                vehicleStatus={getVehicleStatus(record, status)}
                onClick={() => {
                  if (status === "in-station") handleAction(record, "permit");
                  else if (status === "permit-issued") navigateWithReturn(`/thanh-toan/${record.id}`);
                  else if (status === "paid") handleAction(record, "depart");
                }}
                actionButtons={getActionButtons(record, status)}
              />
            ))
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-slate-100 via-slate-50 to-white">
      <style>{`@keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }`}</style>

      {/* Header */}
      <div className="flex-shrink-0 px-4 lg:px-6 py-4 border-b border-slate-200/50 bg-white/80 backdrop-blur-xl shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          <div className="flex items-center gap-4 flex-1">
            <div className="flex items-center gap-4">
              <div className="relative p-3 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 shadow-xl">
                <Activity className="h-7 w-7 text-white" />
                <span className="absolute -top-1 -right-1 flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500" />
                </span>
              </div>
              <div>
                <h1 className="text-xl lg:text-2xl font-black text-slate-900 tracking-tight">Dispatch Control</h1>
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  <span className="font-semibold">{totalActive} xe hoạt động</span>
                </div>
              </div>
            </div>

            <div className="hidden lg:flex items-center gap-3 ml-6 pl-6 border-l border-slate-200">
              {(Object.keys(columnConfig) as DisplayStatus[]).map((key) => (
                <div key={key} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                  <div className={cn("h-3 w-3 rounded-full", columnConfig[key].dotColor)} />
                  <span className="text-sm font-black text-slate-700 tabular-nums">{stats[key]}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative flex-1 lg:w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <Input placeholder="Tìm biển số, tuyến, tài xế..." className="pl-12 h-12 bg-white/80 backdrop-blur border-slate-200 text-slate-900 placeholder:text-slate-400 rounded-xl" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
            <Button variant="outline" size="icon" onClick={() => loadRecords(true)} className="h-12 w-12 rounded-xl border-slate-200 bg-white/80 hover:bg-slate-100">
              <RefreshCw className={cn("h-5 w-5", isLoading && "animate-spin")} />
            </Button>
            <Button variant="outline" onClick={() => { setDialogType("depart-multiple"); setDialogOpen(true); }} className="h-12 gap-2 rounded-xl border-slate-200 bg-white/80 hover:bg-slate-100 hidden sm:flex px-4">
              <ArrowRight className="h-5 w-5" />
              <span className="hidden xl:inline font-semibold">Nhiều xe ra bến</span>
            </Button>
            <Button onClick={() => { setDialogType("entry"); handleAction(null as unknown as DispatchRecord, "entry"); }} className="h-12 gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/30 px-5">
              <Plus className="h-5 w-5" />
              <span className="hidden sm:inline font-semibold">Vào bến</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Kanban Board - Compact */}
      <div className="flex-1 overflow-hidden p-2 lg:p-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2 lg:gap-3 h-full">
          {renderColumn("in-station")}
          {renderColumn("permit-issued")}
          {renderColumn("paid")}
          {renderColumn("departed")}
        </div>
      </div>

      {/* Footer Legend - Compact */}
      <div className="flex-shrink-0 px-3 lg:px-4 py-2 border-t border-slate-200/50 bg-white/80 backdrop-blur-xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-4 lg:gap-6">
            <div className="flex items-center gap-2 text-sm text-slate-600"><div className="p-1.5 rounded-lg bg-slate-100"><Bus className="h-4 w-4" /></div><span className="font-semibold">Tuyến cố định</span></div>
            <div className="flex items-center gap-2 text-sm text-slate-600"><div className="p-1.5 rounded-lg bg-blue-100"><BusPlusIcon className="h-4 w-4 text-blue-600" /></div><span className="font-semibold">Tăng cường</span></div>
            <div className="flex items-center gap-2 text-sm text-slate-600"><div className="p-1.5 rounded-lg bg-violet-100"><ArrowRightLeft className="h-4 w-4 text-violet-600" /></div><span className="font-semibold">Đi thay</span></div>
          </div>
          <div className="flex flex-wrap items-center gap-4 lg:gap-6">
            <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-emerald-500 shadow-sm" /><span className="text-sm text-slate-600 font-semibold">Đủ ĐK</span></div>
            <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-rose-500 shadow-sm" /><span className="text-sm text-slate-600 font-semibold">Thiếu ĐK</span></div>
            <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-sky-500 shadow-sm" /><span className="text-sm text-slate-600 font-semibold">Trả khách</span></div>
            <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-amber-500 shadow-sm" /><span className="text-sm text-slate-600 font-semibold">Vãng lai</span></div>
          </div>
        </div>
      </div>

      {/* Dialogs */}
      {dialogType === "permit" && selectedRecord && (
        <CapPhepDialog key={selectedRecord.id} record={selectedRecord} open={dialogOpen} readOnly={isReadOnly} onClose={closeDialog} onSuccess={loadRecords} />
      )}

      {(dialogType === "entry" || dialogType === "edit") && (
        <ChoXeVaoBenDialog open={dialogOpen} vehicleOptions={vehicleOptions} onClose={closeDialog} onSuccess={loadRecords} editRecord={dialogType === "edit" ? selectedRecord : null} />
      )}

      {dialogType === "depart-multiple" && (
        <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeDialog()}>
          <DialogContent className="max-h-[95vh] overflow-y-auto w-[95vw] max-w-[1800px]">
            <DialogClose onClose={closeDialog} />
            <DialogHeader><DialogTitle>Cho nhiều xe ra bến</DialogTitle></DialogHeader>
            <ChoNhieuXeRaBenDialog records={records.filter((r) => r.currentStatus === "departure_ordered")} onClose={closeDialog} onSuccess={loadRecords} open={dialogOpen} />
          </DialogContent>
        </Dialog>
      )}

      <Dialog open={dialogOpen && !["permit", "entry", "edit", "depart-multiple"].includes(dialogType)} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className={cn("max-h-[95vh] overflow-y-auto w-[95vw]", dialogType === "depart" ? "max-w-xl" : "max-w-5xl")}>
          <DialogClose onClose={closeDialog} />
          <DialogHeader>
            <DialogTitle>
              {dialogType === "return" && "Xác nhận trả khách"}
              {dialogType === "depart" && "Cho xe ra bến"}
              {dialogType === "departure-order" && "Cấp lệnh xuất bến"}
              {dialogType === "monthly-payment" && "Thanh toán theo tháng"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {dialogType === "return" && selectedRecord && <XeTraKhachDialog record={selectedRecord} onClose={closeDialog} onSuccess={loadRecords} />}
            {dialogType === "depart" && selectedRecord && <ChoXeRaBenDialog record={selectedRecord} onClose={closeDialog} onSuccess={loadRecords} />}
            {dialogType === "departure-order" && selectedRecord && <CapLenhXuatBenDialog record={selectedRecord} onClose={closeDialog} onSuccess={loadRecords} />}
            {dialogType === "monthly-payment" && selectedRecord && <ThanhToanTheoThangDialog record={selectedRecord} onClose={closeDialog} onSuccess={loadRecords} />}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
