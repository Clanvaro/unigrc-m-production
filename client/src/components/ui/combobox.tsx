import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export interface ComboboxOption {
  value: string;
  label: string;
  description?: string;
}

interface ComboboxProps {
  options: ComboboxOption[];
  value?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

// Helper to safely convert any value to string (prevents React error #185)
const safeString = (val: any): string => {
  if (val == null) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'number' || typeof val === 'boolean') return String(val);
  // If it's an object, return empty string to avoid rendering objects
  return '';
};

export function Combobox({
  options,
  value,
  placeholder = "Select option...",
  searchPlaceholder = "Search options...",
  emptyText = "No option found.",
  onValueChange,
  disabled = false,
  className,
  ...props
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);
  
  // Normalize options to ensure all values are strings
  const normalizedOptions = React.useMemo(() => 
    options.map(opt => ({
      value: safeString(opt.value),
      label: safeString(opt.label),
      description: opt.description ? safeString(opt.description) : undefined,
    })),
    [options]
  );
  
  const selectedOption = normalizedOptions.find((option) => option.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className)}
          disabled={disabled}
          {...props}
        >
          {selectedOption ? (
            <div className="flex items-center gap-2 truncate">
              <span className="font-medium">{selectedOption.label}</span>
              {selectedOption.description && (
                <span className="text-sm text-muted-foreground truncate">
                  - {selectedOption.description}
                </span>
              )}
            </div>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {normalizedOptions.map((option) => (
                <CommandItem
                  key={option.value}
                  value={`${option.label} ${option.description || ""}`}
                  onSelect={() => {
                    if (option.value === value) {
                      onValueChange?.("");
                    } else {
                      onValueChange?.(option.value);
                    }
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === option.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex items-center gap-2 truncate">
                    <span className="font-medium">{option.label}</span>
                    {option.description && (
                      <span className="text-sm text-muted-foreground truncate">
                        - {option.description}
                      </span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}