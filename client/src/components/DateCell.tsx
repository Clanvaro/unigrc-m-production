import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Calendar as CalendarIcon } from "lucide-react";

interface DateCellProps {
  auditId: string;
  field: 'plannedStartDate' | 'plannedEndDate';
  value: Date | null;
  onCommit: (auditId: string, field: 'plannedStartDate' | 'plannedEndDate', isoDateString: string) => void;
  className?: string;
  size?: 'sm' | 'default';
  renderTrigger?: (date: Date | null) => React.ReactNode;
}

export function DateCell({ auditId, field, value, onCommit, className = "", size = "default", renderTrigger }: DateCellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [pendingDate, setPendingDate] = useState<Date | undefined>(value || undefined);

  const handleSelect = (date: Date | undefined) => {
    if (date) {
      const isoString = date.toISOString().split('T')[0]; // YYYY-MM-DD format
      onCommit(auditId, field, isoString);
      setIsOpen(false);
    }
  };

  const handleCancel = () => {
    setPendingDate(value || undefined);
    setIsOpen(false);
  };

  const formatDisplayDate = (date: Date | null) => {
    if (!date) return "No definido - Clic para editar";
    return date.toLocaleDateString('es-ES');
  };

  const buttonSize = size === 'sm' ? 'sm' : 'default';
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        {renderTrigger ? (
          <button
            type="button"
            className="flex w-full text-left border-0 bg-transparent p-0 m-0 outline-none focus:outline-none"
            onClick={() => {
              setPendingDate(value || undefined);
              setIsOpen(true);
            }}
          >
            {renderTrigger(value)}
          </button>
        ) : (
          <Button
            variant="ghost"
            size={buttonSize}
            className={`${textSize} text-muted-foreground hover:text-blue-600 hover:underline justify-start p-0 h-auto font-normal ${className}`}
            onClick={() => {
              setPendingDate(value || undefined);
              setIsOpen(true);
            }}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {formatDisplayDate(value)}
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={pendingDate}
          onSelect={handleSelect}
          initialFocus
        />
        <div className="flex gap-2 justify-end p-3 border-t">
          <Button variant="outline" size="sm" onClick={handleCancel}>
            Cancelar
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}