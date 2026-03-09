import {
  Plus,
  Search,
  Building2,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
  RefreshCw,
  SlidersHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { OperatorDialog } from "@/components/operator/OperatorDialog";
import { OperatorDetailDialog } from "@/components/operator/OperatorDetailDialog";
import {
  SkeletonRow,
  QuickFilter,
  OperatorStatsCards,
  OperatorTableRow,
  OperatorGridCard,
  DeleteConfirmDialog,
} from "@/components/operator/common";
import { useOperatorManagement } from "@/hooks/useOperatorManagement";

export default function QuanLyDonViVanTai() {
  const {
    paginatedOperators,
    filteredOperators,
    stats,
    searchQuery,
    setSearchQuery,
    filterStatus,
    setFilterStatus,
    filterTicketDelegated,
    setFilterTicketDelegated,
    filterProvince,
    setFilterProvince,
    quickFilter,
    setQuickFilter,
    hasActiveFilters,
    clearFilters,
    showAdvancedFilters,
    setShowAdvancedFilters,
    isLoading,
    loadOperators,
    currentPage,
    setCurrentPage,
    totalPages,
    ITEMS_PER_PAGE,
    displayMode,
    setDisplayMode,
    dialogOpen,
    setDialogOpen,
    viewMode,
    selectedOperator,
    detailDialogOpen,
    setDetailDialogOpen,
    selectedOperatorForDetail,
    setSelectedOperatorForDetail,
    deleteDialogOpen,
    setDeleteDialogOpen,
    operatorToDelete,
    setOperatorToDelete,
    handleCreate,
    handleView,
    handleEdit,
    handleDelete,
    confirmDelete,
    handleRowClick,
  } = useOperatorManagement();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-orange-50">
      <div className="max-w-[1600px] mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 shadow-xl shadow-orange-500/30">
              <Building2 className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-800 tracking-tight">
                Quản lý Đơn vị vận tải
              </h1>
              <p className="text-slate-500 text-sm mt-1">
                Đơn vị có phù hiệu Buýt hoặc Tuyến cố định
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={() => loadOperators(true)}
              disabled={isLoading}
              className="px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
              Làm mới
            </Button>
            <Button
              onClick={handleCreate}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold hover:from-orange-600 hover:to-amber-600 shadow-lg shadow-orange-500/30 transition-all hover:shadow-xl hover:shadow-orange-500/40 hover:-translate-y-0.5"
            >
              <Plus className="h-4 w-4 mr-2" />
              Thêm đơn vị
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <OperatorStatsCards stats={stats} />

        {/* Search Bar */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-2 flex flex-col lg:flex-row lg:items-center gap-2">
          <div className="flex-1 flex items-center gap-3 px-4 py-2 bg-slate-50 rounded-xl">
            <Search className="w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm kiếm tên, mã đơn vị, số điện thoại..."
              className="flex-1 bg-transparent border-none outline-none text-sm text-slate-700 placeholder-slate-400"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="hidden lg:block w-px h-10 bg-slate-200" />

          <div className="flex items-center gap-2 px-2">
            <QuickFilter
              label="Tất cả"
              count={stats.total}
              active={quickFilter === "all"}
              onClick={() => setQuickFilter("all")}
            />
            <QuickFilter
              label="Hoạt động"
              count={stats.active}
              active={quickFilter === "active"}
              onClick={() => setQuickFilter("active")}
            />
            <QuickFilter
              label="Ngừng"
              count={stats.inactive}
              active={quickFilter === "inactive"}
              onClick={() => setQuickFilter("inactive")}
            />
          </div>

          <div className="hidden lg:block w-px h-10 bg-slate-200" />

          <div className="flex items-center gap-2 px-2">
            <div className="flex items-center bg-slate-100 rounded-xl p-1">
              <button
                onClick={() => setDisplayMode("table")}
                className={`p-2.5 rounded-lg transition-all ${
                  displayMode === "table"
                    ? "bg-white text-orange-600 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <List className="h-4 w-4" />
              </button>
              <button
                onClick={() => setDisplayMode("grid")}
                className={`p-2.5 rounded-lg transition-all ${
                  displayMode === "grid"
                    ? "bg-white text-orange-600 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
            </div>

            <Button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`px-4 py-2.5 rounded-xl border transition-all ${
                showAdvancedFilters || hasActiveFilters
                  ? "bg-orange-50 border-orange-200 text-orange-600"
                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              <SlidersHorizontal className="h-4 w-4 mr-2" />
              Nâng cao
            </Button>
          </div>
        </div>

        {/* Advanced Filters */}
        {showAdvancedFilters && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 animate-in slide-in-from-top-2 duration-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label className="text-sm font-medium text-slate-600 mb-2 block">
                  Trạng thái
                </Label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 transition-all"
                >
                  <option value="">Tất cả trạng thái</option>
                  <option value="active">Đang hoạt động</option>
                  <option value="inactive">Ngừng hoạt động</option>
                </select>
              </div>
              <div>
                <Label className="text-sm font-medium text-slate-600 mb-2 block">
                  Ủy thác vé
                </Label>
                <select
                  value={filterTicketDelegated}
                  onChange={(e) => setFilterTicketDelegated(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 transition-all"
                >
                  <option value="">Tất cả</option>
                  <option value="yes">Có ủy thác</option>
                  <option value="no">Không ủy thác</option>
                </select>
              </div>
              <div>
                <Label className="text-sm font-medium text-slate-600 mb-2 block">
                  Tỉnh/Thành phố
                </Label>
                <select
                  value={filterProvince}
                  onChange={(e) => setFilterProvince(e.target.value as "all" | "bac_ninh" | "ngoai_bac_ninh" | "chua_phan_loai")}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 transition-all"
                >
                  <option value="all">Tất cả tỉnh/thành ({stats.bacNinh + stats.ngoaiBacNinh + stats.chuaPhanLoai})</option>
                  <option value="bac_ninh">Trong Bắc Ninh ({stats.bacNinh})</option>
                  <option value="ngoai_bac_ninh">Ngoài Bắc Ninh ({stats.ngoaiBacNinh})</option>
                  <option value="chua_phan_loai">Chưa phân loại ({stats.chuaPhanLoai})</option>
                </select>
              </div>
            </div>
            {hasActiveFilters && (
              <div className="mt-4 flex justify-end">
                <Button
                  onClick={clearFilters}
                  className="px-4 py-2 rounded-lg text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-all"
                >
                  Xóa bộ lọc
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Results info */}
        <div className="flex items-center justify-between text-sm text-slate-500">
          <span>
            Hiển thị{" "}
            <strong className="text-slate-700">{paginatedOperators.length}</strong>{" "}
            trong tổng số{" "}
            <strong className="text-slate-700">
              {filteredOperators.length.toLocaleString()}
            </strong>{" "}
            đơn vị
          </span>
          {totalPages > 1 && (
            <span>
              Trang {currentPage} / {totalPages}
            </span>
          )}
        </div>

        {/* Table View */}
        {displayMode === "table" && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-slate-800 to-slate-900">
                    <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">
                      Tên đơn vị
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-white uppercase tracking-wider">
                      Số điện thoại
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-white uppercase tracking-wider">
                      Người đại diện
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-white uppercase tracking-wider">
                      Ủy thác vé
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-white uppercase tracking-wider">
                      Trạng thái
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-white uppercase tracking-wider">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoading ? (
                    Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
                  ) : paginatedOperators.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-16 text-center">
                        <div className="flex flex-col items-center">
                          <div className="relative mb-4">
                            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-orange-100 to-amber-100 flex items-center justify-center">
                              <Building2 className="h-12 w-12 text-orange-500" />
                            </div>
                            <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-white border-2 border-orange-500 flex items-center justify-center">
                              <Plus className="w-4 h-4 text-orange-500" />
                            </div>
                          </div>
                          <h3 className="text-lg font-semibold text-slate-800 mb-1">
                            Chưa có đơn vị nào
                          </h3>
                          <p className="text-slate-500 mb-4">
                            Bắt đầu bằng cách thêm đơn vị đầu tiên
                          </p>
                          {hasActiveFilters ? (
                            <Button
                              onClick={clearFilters}
                              className="text-orange-600 hover:text-orange-700"
                            >
                              Xóa bộ lọc
                            </Button>
                          ) : (
                            <Button
                              onClick={handleCreate}
                              className="bg-orange-500 hover:bg-orange-600 text-white rounded-xl px-6 py-2.5"
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              Thêm đơn vị
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedOperators.map((operator, index) => (
                      <OperatorTableRow
                        key={operator.id}
                        operator={operator}
                        index={index}
                        onRowClick={handleRowClick}
                        onView={handleView}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                      />
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Grid View */}
        {displayMode === "grid" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-white rounded-2xl border border-slate-200 p-5 animate-pulse"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-slate-200" />
                    <div className="flex-1">
                      <div className="h-5 bg-slate-200 rounded w-3/4 mb-2" />
                      <div className="h-3 bg-slate-100 rounded w-1/2" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-3 bg-slate-100 rounded" />
                    <div className="h-3 bg-slate-100 rounded w-2/3" />
                  </div>
                </div>
              ))
            ) : paginatedOperators.length === 0 ? (
              <div className="col-span-full py-16 text-center">
                <Building2 className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-800">
                  Không tìm thấy đơn vị nào
                </h3>
              </div>
            ) : (
              paginatedOperators.map((operator, index) => (
                <OperatorGridCard
                  key={operator.id}
                  operator={operator}
                  index={index}
                  onRowClick={handleRowClick}
                  onView={handleView}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))
            )}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-6 py-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-600">
                Hiển thị {(currentPage - 1) * ITEMS_PER_PAGE + 1}-
                {Math.min(currentPage * ITEMS_PER_PAGE, filteredOperators.length)} trong
                tổng số {filteredOperators.length.toLocaleString()} đơn vị
              </p>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(
                      (page) =>
                        page === 1 ||
                        page === totalPages ||
                        (page >= currentPage - 1 && page <= currentPage + 1)
                    )
                    .map((page, index, array) => (
                      <span key={page} className="flex items-center">
                        {index > 0 && array[index - 1] !== page - 1 && (
                          <span className="px-2 text-slate-400">...</span>
                        )}
                        <button
                          onClick={() => setCurrentPage(page)}
                          className={`min-w-[40px] h-10 rounded-xl text-sm font-medium transition-all ${
                            currentPage === page
                              ? "bg-orange-500 text-white shadow-md shadow-orange-500/25"
                              : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          {page}
                        </button>
                      </span>
                    ))}
                </div>

                <Button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Dialogs */}
        <OperatorDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          mode={viewMode}
          operator={selectedOperator}
          onSuccess={loadOperators}
        />

        <OperatorDetailDialog
          open={detailDialogOpen}
          onClose={() => {
            setDetailDialogOpen(false);
            setSelectedOperatorForDetail(null);
          }}
          operator={selectedOperatorForDetail}
        />

        <DeleteConfirmDialog
          open={deleteDialogOpen}
          operatorName={operatorToDelete?.name}
          onConfirm={confirmDelete}
          onCancel={() => {
            setDeleteDialogOpen(false);
            setOperatorToDelete(null);
          }}
        />
      </div>

      {/* CSS Animation */}
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
