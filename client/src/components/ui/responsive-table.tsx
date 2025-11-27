import * as React from "react"
import { cn } from "@/lib/utils"
import { ChevronRight } from "lucide-react"

interface ResponsiveTableProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "compact" | "stacked"
  showScrollIndicator?: boolean
}

const ResponsiveTable = React.forwardRef<
  HTMLDivElement,
  ResponsiveTableProps
>(({ className, variant = "default", showScrollIndicator = true, children, ...props }, ref) => {
  const [showLeftIndicator, setShowLeftIndicator] = React.useState(false)
  const [showRightIndicator, setShowRightIndicator] = React.useState(false)
  const tableRef = React.useRef<HTMLDivElement>(null)

  const checkScrollIndicators = React.useCallback(() => {
    if (!tableRef.current || !showScrollIndicator) return

    const { scrollLeft, scrollWidth, clientWidth } = tableRef.current
    setShowLeftIndicator(scrollLeft > 0)
    setShowRightIndicator(scrollLeft < scrollWidth - clientWidth - 1)
  }, [showScrollIndicator])

  React.useEffect(() => {
    checkScrollIndicators()
    
    const tableElement = tableRef.current
    if (!tableElement) return

    tableElement.addEventListener('scroll', checkScrollIndicators)
    window.addEventListener('resize', checkScrollIndicators)

    return () => {
      tableElement.removeEventListener('scroll', checkScrollIndicators)
      window.removeEventListener('resize', checkScrollIndicators)
    }
  }, [checkScrollIndicators])

  return (
    <div 
      ref={ref} 
      className={cn("relative w-full", className)} 
      {...props}
    >
      {/* Left scroll indicator */}
      {showScrollIndicator && showLeftIndicator && (
        <div className="absolute left-0 top-0 bottom-0 z-10 w-4 bg-gradient-to-r from-background via-background/80 to-transparent pointer-events-none flex items-center">
          <ChevronRight className="h-4 w-4 text-muted-foreground rotate-180" />
        </div>
      )}

      {/* Right scroll indicator */}
      {showScrollIndicator && showRightIndicator && (
        <div className="absolute right-0 top-0 bottom-0 z-10 w-4 bg-gradient-to-l from-background via-background/80 to-transparent pointer-events-none flex items-center justify-end">
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </div>
      )}

      {/* Scrollable table container */}
      <div 
        ref={tableRef}
        className={cn(
          "relative w-full min-w-0 overflow-x-auto scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent",
          variant === "compact" && "overflow-x-auto",
          variant === "stacked" && "block sm:overflow-x-auto"
        )}
        style={{ 
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'thin'
        }}
      >
        <div className={cn(
          variant === "stacked" && "block sm:table",
          "min-w-full"
        )}>
          {children}
        </div>
      </div>
    </div>
  )
})
ResponsiveTable.displayName = "ResponsiveTable"

const ResponsiveTableContent = React.forwardRef<
  HTMLTableElement,
  React.HTMLAttributes<HTMLTableElement> & {
    variant?: "default" | "compact" | "stacked"
  }
>(({ className, variant = "default", ...props }, ref) => (
  <table
    ref={ref}
    className={cn(
      "w-full min-w-full table-fixed caption-bottom text-sm",
      variant === "compact" && "min-w-[600px]",
      variant === "stacked" && "block sm:table sm:min-w-[600px]",
      variant === "default" && "min-w-[800px]",
      className
    )}
    {...props}
  />
))
ResponsiveTableContent.displayName = "ResponsiveTableContent"

const ResponsiveTableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement> & {
    variant?: "default" | "compact" | "stacked"
  }
>(({ className, variant = "default", ...props }, ref) => (
  <thead 
    ref={ref} 
    className={cn(
      "[&_tr]:border-b",
      variant === "stacked" && "hidden sm:table-header-group",
      className
    )} 
    {...props} 
  />
))
ResponsiveTableHeader.displayName = "ResponsiveTableHeader"

const ResponsiveTableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement> & {
    variant?: "default" | "compact" | "stacked"
  }
>(({ className, variant = "default", ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn(
      "[&_tr:last-child]:border-0",
      variant === "stacked" && "block sm:table-row-group",
      className
    )}
    {...props}
  />
))
ResponsiveTableBody.displayName = "ResponsiveTableBody"

const ResponsiveTableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement> & {
    variant?: "default" | "compact" | "stacked"
  }
>(({ className, variant = "default", ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      "border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted",
      variant === "stacked" && "block sm:table-row border-b-2 sm:border-b mb-4 sm:mb-0 p-4 sm:p-0 bg-card sm:bg-transparent rounded-lg sm:rounded-none shadow-sm sm:shadow-none",
      className
    )}
    {...props}
  />
))
ResponsiveTableRow.displayName = "ResponsiveTableRow"

const ResponsiveTableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement> & {
    variant?: "default" | "compact" | "stacked"
    priority?: "high" | "medium" | "low"
  }
>(({ className, variant = "default", priority = "medium", ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      "h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 min-w-0 break-words",
      variant === "compact" && "h-10 px-2",
      variant === "stacked" && "hidden sm:table-cell",
      priority === "low" && "hidden lg:table-cell",
      priority === "medium" && "hidden md:table-cell",
      className
    )}
    {...props}
  />
))
ResponsiveTableHead.displayName = "ResponsiveTableHead"

const ResponsiveTableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement> & {
    variant?: "default" | "compact" | "stacked"
    priority?: "high" | "medium" | "low"
    label?: string
  }
>(({ className, variant = "default", priority = "medium", label, children, ...props }, ref) => (
  <td
    ref={ref}
    className={cn(
      "p-4 align-middle [&:has([role=checkbox])]:pr-0 min-w-0 break-words",
      variant === "compact" && "p-2",
      variant === "stacked" && "block sm:table-cell sm:p-4 py-2 pl-0 border-none",
      priority === "low" && "hidden lg:table-cell",
      priority === "medium" && "hidden md:table-cell",
      className
    )}
    {...props}
  >
    {variant === "stacked" && label && (
      <div className="sm:hidden">
        <span className="font-medium text-sm text-muted-foreground mr-2">{label}:</span>
      </div>
    )}
    <div className={variant === "stacked" ? "sm:block" : undefined}>
      {children}
    </div>
  </td>
))
ResponsiveTableCell.displayName = "ResponsiveTableCell"

export {
  ResponsiveTable,
  ResponsiveTableContent,
  ResponsiveTableHeader,
  ResponsiveTableBody,
  ResponsiveTableRow,
  ResponsiveTableHead,
  ResponsiveTableCell,
}