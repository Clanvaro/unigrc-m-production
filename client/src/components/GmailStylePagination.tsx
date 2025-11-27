import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SelectAllBannerProps {
  selectedCount: number;
  totalCount: number;
  pageSize: number;
  totalItems: number;
  currentPage: number;
  onSelectAll: () => void;
  onClearAll: () => void;
  itemName?: string;
}

export function SelectAllBanner({
  selectedCount,
  totalCount,
  pageSize,
  totalItems,
  currentPage,
  onSelectAll,
  onClearAll,
  itemName = "elementos"
}: SelectAllBannerProps) {
  const startIndex = (currentPage - 1) * pageSize + 1;
  const showBanner = selectedCount > 0 && 
                     selectedCount === Math.min(pageSize, totalItems - startIndex + 1) && 
                     totalCount > selectedCount;

  if (!showBanner) return null;

  return (
    <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4 flex items-center justify-between">
      <p className="text-sm text-blue-900 dark:text-blue-100">
        Todos los <span className="font-semibold">{selectedCount} {itemName}</span> en esta página están seleccionados.{' '}
        <button 
          onClick={onSelectAll}
          className="font-semibold underline hover:no-underline"
          data-testid="button-select-all-items"
        >
          Seleccionar los {totalCount} {itemName}
        </button>
      </p>
      <Button
        variant="ghost"
        size="sm"
        onClick={onClearAll}
        data-testid="button-clear-selection"
      >
        Limpiar selección
      </Button>
    </div>
  );
}

interface PaginationControlsProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  itemName?: string;
}

export function PaginationControls({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
  itemName = "elementos"
}: PaginationControlsProps) {
  const totalPages = Math.ceil(totalItems / pageSize);
  const startIndex = (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(currentPage * pageSize, totalItems);
  
  const hasPrevious = currentPage > 1;
  const hasNext = currentPage < totalPages;

  return (
    <div className="flex items-center justify-between border-t pt-4">
      <div className="text-sm text-muted-foreground">
        {totalItems > 0 ? (
          <span>
            <span className="font-medium">{startIndex}-{endIndex}</span> de{' '}
            <span className="font-medium">{totalItems}</span>
          </span>
        ) : (
          <span>No hay {itemName}</span>
        )}
      </div>
      
      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={!hasPrevious}
          data-testid="button-previous-page"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Anterior
        </Button>
        
        <span className="text-sm text-muted-foreground">
          Página {currentPage} de {totalPages || 1}
        </span>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={!hasNext}
          data-testid="button-next-page"
        >
          Siguiente
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}

interface GmailStylePaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  selectedCount?: number;
  totalCount?: number;
  onSelectAll?: () => void;
  onClearAll?: () => void;
  itemName?: string;
}

export function GmailStylePagination({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
  selectedCount = 0,
  totalCount,
  onSelectAll,
  onClearAll,
  itemName = "elementos"
}: GmailStylePaginationProps) {
  return (
    <div>
      {selectedCount > 0 && totalCount && onSelectAll && onClearAll && (
        <SelectAllBanner
          selectedCount={selectedCount}
          totalCount={totalCount}
          pageSize={pageSize}
          totalItems={totalItems}
          currentPage={currentPage}
          onSelectAll={onSelectAll}
          onClearAll={onClearAll}
          itemName={itemName}
        />
      )}
      
      <PaginationControls
        currentPage={currentPage}
        totalItems={totalItems}
        pageSize={pageSize}
        onPageChange={onPageChange}
        itemName={itemName}
      />
    </div>
  );
}
