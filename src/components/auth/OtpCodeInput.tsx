import * as React from "react";

import { cn } from "@/lib/utils";

type Props = {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  disabled?: boolean;
  className?: string;
};

const onlyDigits = (s: string) => s.replace(/\D/g, "");

export default function OtpCodeInput({
  value,
  onChange,
  length = 6,
  disabled,
  className,
}: Props) {
  // IMPORTANT: multi-input OTP UIs are frequently broken by browser/password-manager autofill.
  // Using a *single* real input (capturing digits + paste) and rendering 6 boxes is far more reliable.
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const [isFocused, setIsFocused] = React.useState(false);

  const digitsValue = React.useMemo(() => onlyDigits(value).slice(0, length), [value, length]);
  const chars = React.useMemo(
    () => Array.from({ length }, (_, i) => digitsValue[i] ?? ""),
    [digitsValue, length]
  );

  const focusInput = React.useCallback(() => {
    if (disabled) return;
    inputRef.current?.focus();
    // Keep caret at end (simplest UX and avoids weird mid-string edits on mobile)
    const el = inputRef.current;
    if (el) {
      const end = el.value.length;
      try {
        el.setSelectionRange(end, end);
      } catch {
        // no-op (some input types / browsers)
      }
    }
  }, [disabled]);

  const handleChange = (raw: string) => {
    if (disabled) return;
    onChange(onlyDigits(raw).slice(0, length));
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    if (disabled) return;
    const text = e.clipboardData?.getData("text") ?? "";
    const next = onlyDigits(text).slice(0, length);
    if (!next) return;
    e.preventDefault();
    onChange(next);
    // ensure caret ends
    requestAnimationFrame(() => focusInput());
  };

  const handleBeforeInput = (e: React.FormEvent<HTMLInputElement>) => {
    // Defensive: some mobile keyboards can emit non-digit before change.
    const inputEvent = e.nativeEvent as InputEvent;
    const data = inputEvent.data;
    if (disabled) return;
    if (typeof data === "string" && data.length === 1 && !/\d/.test(data)) {
      e.preventDefault();
    }
  };

  return (
    <div
      className={cn("flex items-center justify-center", className)}
      onClick={focusInput}
      aria-label="Code de vérification"
    >
      <div className="relative">
        {/* Real input (captures typing, paste, and OTP suggestions) */}
        <input
          ref={inputRef}
          value={digitsValue}
          onChange={(e) => handleChange(e.target.value)}
          onPaste={handlePaste}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onBeforeInput={handleBeforeInput}
          disabled={disabled}
          inputMode="numeric"
          pattern="[0-9]*"
          type="text"
          autoComplete="one-time-code"
          name="one-time-code"
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="off"
          data-lpignore="true"
          data-1p-ignore="true"
          data-form-type="other"
          aria-label="Code de vérification (6 chiffres)"
          maxLength={length}
          className={cn(
            "absolute inset-0 h-full w-full",
            "opacity-0",
            "caret-transparent",
            "cursor-text",
            "disabled:cursor-not-allowed"
          )}
        />

        {/* Visual boxes */}
        <div className="flex items-center">
          {chars.map((ch, i) => {
            const isActive = isFocused && i === Math.min(digitsValue.length, length - 1);
            return (
              <div
                key={i}
                aria-hidden="true"
                className={cn(
                  "h-10 w-10 select-none text-center text-sm leading-10",
                  "border-y border-r border-input first:rounded-l-md first:border-l last:rounded-r-md",
                  "transition-all",
                  isActive && "ring-2 ring-ring ring-offset-2 ring-offset-background",
                  disabled && "opacity-50"
                )}
              >
                {ch}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
