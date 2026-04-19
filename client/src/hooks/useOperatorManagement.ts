import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { toast } from "react-toastify";
import { operatorService } from "@/services/operator.service";
import { quanlyDataService } from "@/services/quanly-data.service";
import { useUIStore } from "@/store/ui.store";
import type { Operator } from "@/types";

export interface OperatorWithSource extends Operator {
  source?: "database" | "legacy" | "google_sheets";
  vehicleCount?: number;
}

const ITEMS_PER_PAGE = 50;

export function useOperatorManagement() {
  const [operators, setOperators] = useState<OperatorWithSource[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterTicketDelegated, setFilterTicketDelegated] = useState("");
  const [filterProvince, setFilterProvince] = useState<"all" | "bac_ninh" | "ngoai_bac_ninh" | "chua_phan_loai">("all");
  const [quickFilter, setQuickFilter] = useState<"all" | "active" | "inactive">("all");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedOperator, setSelectedOperator] = useState<Operator | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"create" | "edit" | "view">("create");
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedOperatorForDetail, setSelectedOperatorForDetail] = useState<Operator | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [displayMode, setDisplayMode] = useState<"table" | "grid">("table");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [operatorToDelete, setOperatorToDelete] = useState<OperatorWithSource | null>(null);
  const setTitle = useUIStore((state) => state.setTitle);

  const historyPushedRef = useRef(false);
  const closedViaBackButtonRef = useRef(false);

  useEffect(() => {
    if (!dialogOpen) {
      historyPushedRef.current = false;
      return;
    }

    if (historyPushedRef.current) return;
    closedViaBackButtonRef.current = false;
    historyPushedRef.current = true;
    window.history.pushState({ operatorDialog: true }, "", window.location.href);

    const handlePopState = () => {
      closedViaBackButtonRef.current = true;
      historyPushedRef.current = false;
      setDialogOpen(false);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [dialogOpen]);

  useEffect(() => {
    setTitle("Quản lý Đơn vị vận tải");
  }, [setTitle]);

  useEffect(() => {
    loadOperators();
  }, []);

  const loadOperators = async (forceRefresh = false) => {
    setIsLoading(true);
    try {
      const data = await quanlyDataService.getAll(["operators"], forceRefresh);
      setOperators((data.operators || []) as OperatorWithSource[]);
    } catch (error) {
      console.error("Failed to load operators:", error);
      toast.error("Không thể tải danh sách đơn vị vận tải.");
    } finally {
      setIsLoading(false);
    }
  };

  const stats = useMemo(() => {
    const active = operators.filter((o) => o.isActive).length;
    const inactive = operators.length - active;
    const delegated = operators.filter((o) => o.isTicketDelegated).length;
    const isBacNinh = (province: string | undefined) => province && province.toLowerCase().includes("bắc ninh");
    const bacNinh = operators.filter((o) => isBacNinh(o.province)).length;
    const ngoaiBacNinh = operators.filter((o) => o.province && o.province.trim() !== '' && !isBacNinh(o.province)).length;
    const chuaPhanLoai = operators.filter((o) => !o.province || o.province.trim() === '').length;
    return { total: operators.length, active, inactive, delegated, bacNinh, ngoaiBacNinh, chuaPhanLoai };
  }, [operators]);

  const filteredOperators = useMemo(() => {
    return operators.filter((operator) => {
      if (quickFilter === "active" && !operator.isActive) return false;
      if (quickFilter === "inactive" && operator.isActive) return false;

      const isBacNinh = operator.province && operator.province.toLowerCase().includes("bắc ninh");
      const hasNoProvince = !operator.province || operator.province.trim() === '';
      if (filterProvince === "bac_ninh" && !isBacNinh) return false;
      if (filterProvince === "ngoai_bac_ninh" && (hasNoProvince || isBacNinh)) return false;
      if (filterProvince === "chua_phan_loai" && !hasNoProvince) return false;

      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const queryDigits = query.replace(/\D/g, "");
        const matchesSearch =
          operator.name.toLowerCase().includes(query) ||
          (operator.code || "").toLowerCase().includes(query) ||
          (operator.phone || "").toLowerCase().includes(query) ||
          (queryDigits.length >= 7 && (operator.phone || "").replace(/\D/g, "").includes(queryDigits)) ||
          (operator.address || "").toLowerCase().includes(query) ||
          (operator.province || "").toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }
      if (filterStatus) {
        if (operator.isActive !== (filterStatus === "active")) return false;
      }
      if (filterTicketDelegated) {
        if (Boolean(operator.isTicketDelegated) !== (filterTicketDelegated === "yes" || filterTicketDelegated === "true")) return false;
      }
      return true;
    });
  }, [operators, searchQuery, filterStatus, filterTicketDelegated, filterProvince, quickFilter]);

  const totalPages = Math.ceil(filteredOperators.length / ITEMS_PER_PAGE);

  const paginatedOperators = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredOperators.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredOperators, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterStatus, filterTicketDelegated, filterProvince, quickFilter]);

  const handleCreate = () => { setSelectedOperator(null); setViewMode("create"); setDialogOpen(true); };
  const handleView = (operator: Operator) => { setSelectedOperator(operator); setViewMode("view"); setDialogOpen(true); };
  const handleEdit = (operator: OperatorWithSource) => { setSelectedOperator(operator); setViewMode("edit"); setDialogOpen(true); };
  const handleDelete = (operator: OperatorWithSource) => { setOperatorToDelete(operator); setDeleteDialogOpen(true); };

  const confirmDelete = async () => {
    if (!operatorToDelete) return;
    try {
      if (operatorToDelete.source === "legacy" || operatorToDelete.source === "google_sheets") {
        await operatorService.deleteLegacy(operatorToDelete.id);
      } else {
        await operatorService.delete(operatorToDelete.id);
      }
      toast.success("Xóa đơn vị vận tải thành công");
      setDeleteDialogOpen(false);
      setOperatorToDelete(null);
      loadOperators();
    } catch (error) {
      toast.error("Không thể xóa đơn vị vận tải.");
    }
  };

  const handleRowClick = (operator: Operator) => { setSelectedOperatorForDetail(operator); setDetailDialogOpen(true); };
  const handleSaveSuccess = () => { setDialogOpen(false); loadOperators(true); };
  const handleDialogOpenChange = useCallback((open: boolean) => setDialogOpen(open), []);

  const clearFilters = () => {
    setSearchQuery(""); setFilterStatus(""); setFilterTicketDelegated(""); setFilterProvince("all"); setQuickFilter("all");
  };

  return {
    operators,
    paginatedOperators,
    filteredOperators,
    stats,
    searchQuery, setSearchQuery,
    filterStatus, setFilterStatus,
    filterTicketDelegated, setFilterTicketDelegated,
    filterProvince, setFilterProvince,
    quickFilter, setQuickFilter,
    hasActiveFilters: !!(searchQuery || filterStatus || filterTicketDelegated || filterProvince !== "all"),
    clearFilters,
    showAdvancedFilters, setShowAdvancedFilters,
    isLoading, loadOperators,
    currentPage, setCurrentPage,
    totalPages, ITEMS_PER_PAGE,
    displayMode, setDisplayMode,
    dialogOpen, setDialogOpen: handleDialogOpenChange,
    viewMode, selectedOperator,
    detailDialogOpen, setDetailDialogOpen,
    selectedOperatorForDetail, setSelectedOperatorForDetail,
    deleteDialogOpen, setDeleteDialogOpen,
    operatorToDelete, setOperatorToDelete,
    handleCreate, handleView, handleEdit, handleDelete,
    confirmDelete, handleRowClick, handleSaveSuccess,
  };
}
