import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { toast } from "react-toastify";
import { operatorService } from "@/services/operator.service";
import { quanlyDataService } from "@/services/quanly-data.service";
import { useUIStore } from "@/store/ui.store";
import type { Operator } from "@/types";
import { useAppSheetPolling } from "@/hooks/use-appsheet-polling";
import { normalizeOperatorRows, type NormalizedAppSheetOperator } from "@/services/appsheet-normalize-operators";
import { operatorApi } from "@/features/fleet/operators/api/operatorApi";

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

  // AppSheet realtime polling for operators (subscribe to 1 table ONLY)
  const [appSheetOperators, setAppSheetOperators] = useState<NormalizedAppSheetOperator[]>([]);

  useAppSheetPolling({
    endpointKey: 'operators',
    normalize: normalizeOperatorRows,
    onData: (data: NormalizedAppSheetOperator[]) => setAppSheetOperators(data),
    onSyncToDb: (data) => operatorApi.syncFromAppSheet(data),
    getKey: (op) => op.firebaseId,
    enabled: true,
  });

  // Refs for history management
  const historyPushedRef = useRef(false);
  const closedViaBackButtonRef = useRef(false);

  // Handle browser back button for OperatorDialog
  useEffect(() => {
    if (!dialogOpen) {
      historyPushedRef.current = false;
      return;
    }

    // Prevent duplicate pushState (React StrictMode runs effects twice)
    if (historyPushedRef.current) return;

    closedViaBackButtonRef.current = false;
    historyPushedRef.current = true;

    // Push state with current URL - back button will close dialog and stay on same page
    window.history.pushState({ operatorDialog: true }, "", window.location.href);

    const handlePopState = () => {
      // Back button pressed - close dialog
      closedViaBackButtonRef.current = true;
      historyPushedRef.current = false;
      setDialogOpen(false);
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
      // Note: We don't call history.back() here to avoid triggering popstate
      // The extra history entry will be cleaned up naturally on next navigation
    };
  }, [dialogOpen]);

  useEffect(() => {
    setTitle("Quản lý Đơn vị vận tải");
    loadOperators();
  }, [setTitle]);

  const loadOperators = async (forceRefresh = false) => {
    setIsLoading(true);
    try {
      // Backend pre-filters operators to only those with Buýt/Tuyến cố định badges
      const data = await quanlyDataService.getAll(
        ["operators"],
        forceRefresh
      );
      const filteredOperators = data.operators || [];
      setOperators(filteredOperators as OperatorWithSource[]);
    } catch (error) {
      console.error("Failed to load operators:", error);
      toast.error(
        "Không thể tải danh sách đơn vị vận tải. Vui lòng thử lại sau."
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Merge AppSheet realtime data with backend pre-filtered operators.
  // Backend pre-filters to ~22 operators with Buýt/TCD badges (source of truth for WHICH to show).
  // AppSheet enriches realtime fields (name, phone, province, address, taxCode, representative).
  const mergedOperators = useMemo((): OperatorWithSource[] => {
    if (appSheetOperators.length === 0 || operators.length === 0) return operators;

    // Build lookup: firebaseId (lowercase hex) → AppSheet data
    const appSheetMap = new Map<string, NormalizedAppSheetOperator>();
    for (const op of appSheetOperators) {
      appSheetMap.set(op.firebaseId, op);
    }

    return operators.map((op) => {
      // Backend code = UPPER(firebaseId), so match via code.toLowerCase()
      const appOp = appSheetMap.get(op.code?.toLowerCase() || '');
      if (!appOp) return op;

      return {
        ...op,
        // AppSheet wins for realtime fields
        name: appOp.name || op.name,
        phone: appOp.phone ?? op.phone,
        province: appOp.province ?? op.province,
        address: appOp.address ?? op.address,
        taxCode: appOp.taxCode ?? op.taxCode,
        representativeName: appOp.representative ?? op.representativeName,
        // Backend wins for app-specific flags
        isActive: op.isActive,
        isTicketDelegated: op.isTicketDelegated,
      };
    });
  }, [operators, appSheetOperators]);

  const stats = useMemo(() => {
    const active = mergedOperators.filter((o) => o.isActive).length;
    const inactive = mergedOperators.length - active;
    const delegated = mergedOperators.filter((o) => o.isTicketDelegated).length;

    // Check if province contains "Bắc Ninh" (handles variations like "Tỉnh Bắc Ninh", "Bắc Ninh", etc.)
    const isBacNinh = (province: string | undefined) =>
      province && province.toLowerCase().includes("bắc ninh");

    // Count operators with valid province data
    const bacNinh = mergedOperators.filter((o) => isBacNinh(o.province)).length;
    const ngoaiBacNinh = mergedOperators.filter((o) => o.province && o.province.trim() !== '' && !isBacNinh(o.province)).length;
    const chuaPhanLoai = mergedOperators.filter((o) => !o.province || o.province.trim() === '').length;

    return { total: mergedOperators.length, active, inactive, delegated, bacNinh, ngoaiBacNinh, chuaPhanLoai };
  }, [mergedOperators]);

  const filteredOperators = useMemo(() => {
    return mergedOperators.filter((operator) => {
      if (quickFilter === "active" && !operator.isActive) return false;
      if (quickFilter === "inactive" && operator.isActive) return false;

      // Province filter - check if province contains "Bắc Ninh"
      const isBacNinh = operator.province && operator.province.toLowerCase().includes("bắc ninh");
      const hasNoProvince = !operator.province || operator.province.trim() === '';
      if (filterProvince === "bac_ninh" && !isBacNinh) return false;
      if (filterProvince === "ngoai_bac_ninh") {
        if (hasNoProvince || isBacNinh) return false;
      }
      if (filterProvince === "chua_phan_loai" && !hasNoProvince) return false;

      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          operator.name.toLowerCase().includes(query) ||
          (operator.code || "").toLowerCase().includes(query) ||
          (operator.phone || "").toLowerCase().includes(query) ||
          (operator.address || "").toLowerCase().includes(query) ||
          (operator.province || "").toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }
      if (filterStatus) {
        const isActive = filterStatus === "active";
        if (operator.isActive !== isActive) return false;
      }
      if (filterTicketDelegated) {
        const isDelegated = filterTicketDelegated === "yes" || filterTicketDelegated === "true";
        if (Boolean(operator.isTicketDelegated) !== isDelegated) return false;
      }
      return true;
    });
  }, [mergedOperators, searchQuery, filterStatus, filterTicketDelegated, filterProvince, quickFilter]);

  const totalPages = Math.ceil(filteredOperators.length / ITEMS_PER_PAGE);

  const paginatedOperators = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredOperators.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredOperators, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterStatus, filterTicketDelegated, filterProvince, quickFilter]);

  const handleCreate = () => {
    setSelectedOperator(null);
    setViewMode("create");
    setDialogOpen(true);
    // History management is handled automatically by the useEffect
  };

  const handleView = (operator: Operator) => {
    setSelectedOperator(operator);
    setViewMode("view");
    setDialogOpen(true);
    // History management is handled automatically by the useEffect
  };

  const handleEdit = (operator: OperatorWithSource) => {
    setSelectedOperator(operator);
    setViewMode("edit");
    setDialogOpen(true);
    // History management is handled automatically by the useEffect
  };

  const handleDelete = (operator: OperatorWithSource) => {
    setOperatorToDelete(operator);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!operatorToDelete) return;
    try {
      // Use legacy endpoint for Google Sheets data
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
      console.error("Failed to delete operator:", error);
      toast.error(
        "Không thể xóa đơn vị vận tải. Có thể đơn vị này đang có xe hoặc lái xe hoạt động."
      );
    }
  };

  const handleRowClick = (operator: Operator) => {
    setSelectedOperatorForDetail(operator);
    setDetailDialogOpen(true);
  };

  const handleSaveSuccess = () => {
    // Just close the dialog - history cleanup is handled automatically by the useEffect
    setDialogOpen(false);
    loadOperators(true); // Force refresh after save
  };

  // Wrapper to handle dialog close - history cleanup is handled automatically by the useEffect
  const handleDialogOpenChange = useCallback((open: boolean) => {
    setDialogOpen(open);
  }, []);

  const clearFilters = () => {
    setSearchQuery("");
    setFilterStatus("");
    setFilterTicketDelegated("");
    setFilterProvince("all");
    setQuickFilter("all");
  };

  const hasActiveFilters = searchQuery || filterStatus || filterTicketDelegated || filterProvince !== "all";

  return {
    // Data
    operators: mergedOperators,
    paginatedOperators,
    filteredOperators,
    stats,
    // Search & Filters
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
    // Loading
    isLoading,
    loadOperators,
    // Pagination
    currentPage,
    setCurrentPage,
    totalPages,
    ITEMS_PER_PAGE,
    // Display
    displayMode,
    setDisplayMode,
    // Dialog states
    dialogOpen,
    setDialogOpen: handleDialogOpenChange,
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
    // Handlers
    handleCreate,
    handleView,
    handleEdit,
    handleDelete,
    confirmDelete,
    handleRowClick,
    handleSaveSuccess,
  };
}
