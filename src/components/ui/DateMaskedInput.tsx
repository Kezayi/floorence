import * as React from "react";
import { cn } from "@/lib/utils";

interface DateMaskedInputProps {
  value: string; // ISO format YYYY-MM-DD
  onChange: (isoValue: string) => void;
  className?: string;
  placeholder?: string;
  hasError?: boolean;
}

/**
 * Masked date input: JJ/MM/AAAA → stores YYYY-MM-DD internally.
 * Handles auto-slash insertion and validation.
 */
const DateMaskedInput = ({ value, onChange, className, placeholder = "JJ/MM/AAAA", hasError }: DateMaskedInputProps) => {
  // Convert ISO (YYYY-MM-DD) to display (JJ/MM/AAAA)
  const isoToDisplay = (iso: string): string => {
    if (!iso) return "";
    const parts = iso.split("-");
    if (parts.length !== 3) return iso;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  // Convert display (JJ/MM/AAAA) to ISO (YYYY-MM-DD)
  const displayToIso = (display: string): string => {
    const clean = display.replace(/[^\d]/g, "");
    if (clean.length === 8) {
      const day = clean.substring(0, 2);
      const month = clean.substring(2, 4);
      const year = clean.substring(4, 8);
      return `${year}-${month}-${day}`;
    }
    return "";
  };

  const [displayValue, setDisplayValue] = React.useState(() => isoToDisplay(value));

  // Sync from parent when value changes externally
  React.useEffect(() => {
    const expected = isoToDisplay(value);
    if (expected !== displayValue && value) {
      setDisplayValue(expected);
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value;
    
    // Only allow digits and slashes
    raw = raw.replace(/[^\d/]/g, "");
    
    // Remove extra slashes and re-format
    const digits = raw.replace(/\//g, "");
    
    // Limit to 8 digits
    const limited = digits.substring(0, 8);
    
    // Auto-insert slashes
    let formatted = "";
    for (let i = 0; i < limited.length; i++) {
      if (i === 2 || i === 4) formatted += "/";
      formatted += limited[i];
    }
    
    setDisplayValue(formatted);
    
    // Only propagate valid complete dates
    if (limited.length === 8) {
      const iso = displayToIso(formatted);
      const testDate = new Date(iso);
      if (!isNaN(testDate.getTime()) && iso.length === 10) {
        onChange(iso);
      } else {
        onChange(""); // Invalid date
      }
    } else {
      onChange(""); // Incomplete
    }
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      value={displayValue}
      onChange={handleChange}
      placeholder={placeholder}
      maxLength={10}
      className={cn(
        "w-full p-4 bg-secondary border-0 font-sans focus:outline-none focus:ring-1 focus:ring-ring",
        hasError && "ring-1 ring-destructive",
        className
      )}
    />
  );
};

export { DateMaskedInput };
