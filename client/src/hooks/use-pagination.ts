import { useState, useMemo } from "react";

interface UsePaginationOptions {
  pageSize?: number;
}

export function usePagination<T>({ pageSize = 50 }: UsePaginationOptions = {}) {
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectAllMode, setSelectAllMode] = useState(false);

  const offset = useMemo(() => (currentPage - 1) * pageSize, [currentPage, pageSize]);
  const limit = pageSize;

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Clear page-level selection when changing pages, but keep selectAllMode
    if (!selectAllMode) {
      setSelectedIds(new Set());
    }
  };

  const handleSelectItem = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
      setSelectAllMode(false); // Deselecting breaks "select all" mode
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleSelectPage = (items: T[], getItemId: (item: T) => string, checked: boolean) => {
    const newSelected = new Set(selectedIds);
    if (checked) {
      items.forEach(item => newSelected.add(getItemId(item)));
    } else {
      items.forEach(item => newSelected.delete(getItemId(item)));
      setSelectAllMode(false);
    }
    setSelectedIds(newSelected);
  };

  const handleSelectAll = (allItems: T[], getItemId: (item: T) => string) => {
    const allIds = new Set(allItems.map(getItemId));
    setSelectedIds(allIds);
    setSelectAllMode(true);
  };

  const handleClearAll = () => {
    setSelectedIds(new Set());
    setSelectAllMode(false);
  };

  const resetPagination = () => {
    setCurrentPage(1);
    setSelectedIds(new Set());
    setSelectAllMode(false);
  };

  return {
    currentPage,
    pageSize,
    offset,
    limit,
    selectedIds,
    selectAllMode,
    handlePageChange,
    handleSelectItem,
    handleSelectPage,
    handleSelectAll,
    handleClearAll,
    resetPagination,
  };
}
