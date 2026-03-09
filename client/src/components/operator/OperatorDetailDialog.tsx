import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, Building2, Truck, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/layout/StatusBadge";
import { VehicleCard, VehicleBadgeDetailDialog, EmptyVehicles, VehiclesSkeleton, SummaryCards } from "./detail";
import { useOperatorDetail } from "@/hooks/useOperatorDetail";
import type { Operator, Vehicle } from "@/types";

interface OperatorDetailDialogProps {
  open: boolean;
  onClose: () => void;
  operator: Operator | null;
}

export function OperatorDetailDialog({
  open,
  onClose,
  operator,
}: OperatorDetailDialogProps) {
  const {
    activeTab,
    setActiveTab,
    vehicles,
    invoices,
    allDispatchRecords,
    paidDispatchRecords,
    unpaidDispatchRecords,
    isLoading,
    error,
    loadData,
    unpaidInvoices,
    totalDebt,
    paidInvoices,
    allPaymentHistory,
    totalPaid,
    formatDate,
    formatCurrency,
    resetTab,
  } = useOperatorDetail(operator, open);

  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  // Handle browser back button - close dialog instead of navigating away
  const closedViaBackButtonRef = useRef(false);
  const historyPushedRef = useRef(false);

  // Use ref for callbacks to avoid effect re-runs when parent re-renders
  const onCloseRef = useRef(onClose);
  const resetTabRef = useRef(resetTab);
  onCloseRef.current = onClose;
  resetTabRef.current = resetTab;

  useEffect(() => {
    if (!open) {
      // Reset refs when dialog closes
      historyPushedRef.current = false;
      return;
    }

    // Prevent duplicate pushState (React StrictMode runs effects twice)
    if (historyPushedRef.current) return;

    closedViaBackButtonRef.current = false;
    historyPushedRef.current = true;

    // Push state with current URL - back button will close dialog and stay on same page
    window.history.pushState({ operatorDetailDialogOpen: true }, "", window.location.href);

    const handlePopState = () => {
      // Back button pressed - close dialog (browser already navigated, but URL is same)
      closedViaBackButtonRef.current = true;
      historyPushedRef.current = false;
      resetTabRef.current();
      onCloseRef.current();
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
      // If closed via X button (not back button), clean up the pushed history state
      if (!closedViaBackButtonRef.current && historyPushedRef.current) {
        historyPushedRef.current = false;
        // Note: We don't call history.back() here to avoid triggering popstate
        // The extra history entry will be cleaned up naturally on next navigation
      }
    };
  }, [open]); // Only depend on `open`, use refs for callbacks

  const handleClose = () => {
    resetTab();
    onClose();
  };

  if (!open || !operator) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center"
      onClick={(e) => {
        // Only close when clicking the backdrop itself, not nested dialog overlays
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        className="bg-white w-full h-full overflow-y-auto overflow-x-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="max-w-[1920px] mx-auto p-8">
          {/* Header */}
          <div className="flex justify-between items-center pb-4 border-b mb-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Building2 className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {operator.name}
                </h1>
                <p className="text-sm text-gray-500">Mã: {operator.code}</p>
              </div>
            </div>
            <Button type="button" variant="ghost" size="icon" onClick={handleClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Summary Cards */}
          <SummaryCards
            vehicleCount={vehicles.length}
            totalDebt={totalDebt}
            totalPaid={totalPaid}
            invoiceCount={allDispatchRecords.length}
            formatCurrency={formatCurrency}
          />

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="vehicles">
                Xe trực thuộc ({vehicles.length})
              </TabsTrigger>
              <TabsTrigger value="debt">
                Công nợ ({unpaidDispatchRecords.length + unpaidInvoices.length})
              </TabsTrigger>
              <TabsTrigger value="payment-info">Thông tin thanh toán</TabsTrigger>
              <TabsTrigger value="payment-history">
                Lịch sử thanh toán ({allPaymentHistory.length})
              </TabsTrigger>
            </TabsList>

            {/* Vehicles Tab */}
            <TabsContent value="vehicles" className="mt-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/25">
                    <Truck className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">
                      Danh sách xe trực thuộc
                    </h2>
                    <p className="text-sm text-gray-500">
                      {vehicles.length > 0
                        ? `Tổng cộng ${vehicles.length} xe đang được quản lý`
                        : "Chưa có xe nào được đăng ký"}
                    </p>
                  </div>
                </div>

                {vehicles.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-sm font-medium">
                      <CheckCircle2 className="w-4 h-4" />
                      {vehicles.filter((v) => v.isActive).length} hoạt động
                    </span>
                    {vehicles.filter((v) => !v.isActive).length > 0 && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 text-gray-600 text-sm font-medium">
                        <AlertCircle className="w-4 h-4" />
                        {vehicles.filter((v) => !v.isActive).length} ngừng
                      </span>
                    )}
                  </div>
                )}
              </div>

              {isLoading ? (
                <VehiclesSkeleton />
              ) : vehicles.length === 0 ? (
                <EmptyVehicles />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {vehicles.map((vehicle, index) => (
                    <VehicleCard key={vehicle.id} vehicle={vehicle} index={index} onClick={setSelectedVehicle} />
                  ))}
                </div>
              )}

              <style>{`
                @keyframes slideUp {
                  from { opacity: 0; transform: translateY(20px); }
                  to { opacity: 1; transform: translateY(0); }
                }
              `}</style>
            </TabsContent>

            {/* Debt Tab */}
            <TabsContent value="debt" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Công nợ chưa thanh toán ({unpaidDispatchRecords.length + unpaidInvoices.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="text-center py-8">Đang tải...</div>
                  ) : (unpaidDispatchRecords.length === 0 && unpaidInvoices.length === 0) ? (
                    <div className="text-center py-8 text-gray-500">Không có công nợ</div>
                  ) : (
                    <>
                      <div className="mb-4 p-4 bg-red-50 rounded-lg">
                        <p className="text-sm text-gray-600">
                          Tổng công nợ:{" "}
                          <span className="text-xl font-bold text-red-600">
                            {formatCurrency(totalDebt)}
                          </span>
                        </p>
                      </div>
                      
                      {/* Dispatch Records chưa thanh toán */}
                      {unpaidDispatchRecords.length > 0 && (
                        <>
                          <h4 className="font-medium text-gray-700 mb-3">Đơn hàng chưa thanh toán ({unpaidDispatchRecords.length})</h4>
                          <Table className="mb-6">
                            <TableHeader>
                              <TableRow>
                                <TableHead className="text-center">Mã đơn</TableHead>
                                <TableHead className="text-center">Biển số xe</TableHead>
                                <TableHead className="text-center">Ngày vào bến</TableHead>
                                <TableHead className="text-center">Tuyến</TableHead>
                                <TableHead className="text-center">Trạng thái</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {unpaidDispatchRecords.map((record) => (
                                <TableRow key={record.id}>
                                  <TableCell className="font-medium text-center">
                                    ĐH-{record.id.substring(0, 8).toUpperCase()}
                                  </TableCell>
                                  <TableCell className="text-center">
                                    {record.vehiclePlateNumber || "-"}
                                  </TableCell>
                                  <TableCell className="text-center">
                                    {formatDate(record.entryTime)}
                                  </TableCell>
                                  <TableCell className="text-center">
                                    {record.routeName || "-"}
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <span className="px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800">
                                      Chưa thanh toán
                                    </span>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </>
                      )}
                      
                      {/* Legacy: Invoices chưa thanh toán */}
                      {unpaidInvoices.length > 0 && (
                        <>
                          <h4 className="font-medium text-gray-700 mb-3">Hóa đơn chưa thanh toán ({unpaidInvoices.length})</h4>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="text-center">Số hóa đơn</TableHead>
                                <TableHead className="text-center">Ngày phát hành</TableHead>
                                <TableHead className="text-center">Hạn thanh toán</TableHead>
                                <TableHead className="text-center">Tổng tiền</TableHead>
                                <TableHead className="text-center">Trạng thái</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {unpaidInvoices.map((invoice) => (
                                <TableRow key={invoice.id}>
                                  <TableCell className="font-medium text-center">
                                    {invoice.invoiceNumber}
                                  </TableCell>
                                  <TableCell className="text-center">
                                    {formatDate(invoice.issueDate)}
                                  </TableCell>
                                  <TableCell className="text-center">
                                    {formatDate(invoice.dueDate)}
                                  </TableCell>
                                  <TableCell className="text-center">
                                    {formatCurrency(invoice.totalAmount)}
                                  </TableCell>
                                  <TableCell className="text-center">
                                    {invoice.paymentStatus === "overdue" ? (
                                      <StatusBadge status="inactive" />
                                    ) : (
                                      <span className="px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800">
                                        Chưa thanh toán
                                      </span>
                                    )}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Payment Info Tab */}
            <TabsContent value="payment-info" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Thông tin thanh toán</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h3 className="font-semibold text-lg">Tổng quan đơn hàng</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Tổng số đơn hàng:</span>
                          <span className="font-medium">{allDispatchRecords.length}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Đã thanh toán:</span>
                          <span className="font-medium text-green-600">
                            {paidDispatchRecords.length}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Chưa thanh toán:</span>
                          <span className="font-medium text-red-600">
                            {unpaidDispatchRecords.length}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <h3 className="font-semibold text-lg">Tổng tiền</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Tổng công nợ:</span>
                          <span className="font-medium text-red-600">
                            {formatCurrency(totalDebt)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Đã thanh toán:</span>
                          <span className="font-medium text-green-600">
                            {formatCurrency(totalPaid)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Payment History Tab */}
            <TabsContent value="payment-history" className="mt-6">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>
                      Lịch sử thanh toán ({allPaymentHistory.length})
                    </CardTitle>
                    {error && (
                      <Button variant="outline" size="sm" onClick={loadData}>
                        Tải lại
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="text-center py-8">Đang tải...</div>
                  ) : error ? (
                    <div className="text-center py-8">
                      <p className="text-red-600 mb-4">{error}</p>
                      <Button variant="outline" onClick={loadData}>
                        Thử lại
                      </Button>
                    </div>
                  ) : allPaymentHistory.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <p>Chưa có lịch sử thanh toán</p>
                      <p className="text-sm mt-2">
                        Tổng số hóa đơn: {invoices.length} | Đã thanh toán (invoice):{" "}
                        {paidInvoices.length} | Đã thanh toán (dispatch):{" "}
                        {paidDispatchRecords.length} | Chưa thanh toán:{" "}
                        {unpaidInvoices.length}
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="mb-4 p-4 bg-green-50 rounded-lg">
                        <p className="text-sm text-gray-600">
                          Tổng đã thanh toán:{" "}
                          <span className="text-xl font-bold text-green-600">
                            {formatCurrency(totalPaid)}
                          </span>
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Bao gồm: {paidInvoices.length} hóa đơn và{" "}
                          {paidDispatchRecords.length} đơn hàng đã thanh toán
                        </p>
                      </div>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-center">Số hóa đơn/Mã đơn</TableHead>
                            <TableHead className="text-center">Ngày phát hành</TableHead>
                            <TableHead className="text-center">Ngày thanh toán</TableHead>
                            <TableHead className="text-center">Tổng tiền</TableHead>
                            <TableHead className="text-center">Nguồn</TableHead>
                            <TableHead className="text-center">Trạng thái</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {allPaymentHistory.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell className="font-medium text-center">
                                {item.invoiceNumber}
                                {item.source === "dispatch" && item.vehiclePlateNumber && (
                                  <span className="ml-1 text-xs text-gray-500">
                                    ({item.vehiclePlateNumber})
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="text-center">
                                {formatDate(item.issueDate)}
                              </TableCell>
                              <TableCell className="text-center">
                                {formatDate(item.paymentDate)}
                              </TableCell>
                              <TableCell className="text-center">
                                {formatCurrency(item.totalAmount)}
                              </TableCell>
                              <TableCell className="text-center">
                                <span
                                  className={`px-2 py-1 rounded-full text-xs ${
                                    item.source === "invoice"
                                      ? "bg-blue-100 text-blue-700"
                                      : "bg-purple-100 text-purple-700"
                                  }`}
                                >
                                  {item.source === "invoice" ? "Hóa đơn" : "Đơn hàng"}
                                </span>
                              </TableCell>
                              <TableCell className="text-center">
                                <StatusBadge status="active" />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      <VehicleBadgeDetailDialog
        vehicle={selectedVehicle}
        open={!!selectedVehicle}
        onOpenChange={(open) => { if (!open) setSelectedVehicle(null); }}
      />
    </div>,
    document.body
  );
}
