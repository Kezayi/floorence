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
  const refs = React.useRef<Array<HTMLInputElement | null>>([]);

  const chars = React.useMemo(() => {
    const digits = onlyDigits(value).slice(0, length);
    return Array.from({ length }, (_, i) => digits[i] ?? "");
  }, [value, length]);

  const setAt = React.useCallback(
    (index: number, digit: string) => {
      const next = chars.slice();
      next[index] = digit;
      onChange(next.join(""));
    },
    [chars, onChange]
  );

  const focusIndex = (i: number) => {
    const el = refs.current[i];
    if (!el) return;
    el.focus();
    el.select?.();
  };

  const handleChange = (index: number, raw: string) => {
    if (disabled) return;

    const digits = onlyDigits(raw);
    if (!digits) {
      setAt(index, "");
      return;
    }

    // Some browsers may give multiple chars in one change (paste / autofill). Spread them.
    const next = chars.slice();
    let cursor = index;
    for (const d of digits) {
      if (cursor >= length) break;
      next[cursor] = d;
      cursor += 1;
    }
    onChange(next.join(""));
    if (cursor < length) focusIndex(cursor);
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    if (e.key === "Backspace") {
      e.preventDefault();
      if (chars[index]) {
        setAt(index, "");
      } else if (index > 0) {
        setAt(index - 1, "");
        focusIndex(index - 1);
      }
      return;
    }

    if (e.key === "ArrowLeft" && index > 0) {
      e.preventDefault();
      focusIndex(index - 1);
      return;
    }

    if (e.key === "ArrowRight" && index < length - 1) {
      e.preventDefault();
      focusIndex(index + 1);
      return;
    }

    // Block non-digits (defensive; onChange also sanitizes)
    if (e.key.length === 1 && !/\d/.test(e.key)) {
      e.preventDefault();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    const text = e.clipboardData?.getData("text") ?? "";
    const digits = onlyDigits(text).slice(0, length);
    if (!digits) return;
    e.preventDefault();
    onChange(digits);
    focusIndex(Math.min(digits.length, length - 1));
  };

  return (
    <div
      className={cn("flex items-center justify-center", className)}
      onPaste={handlePaste}
      aria-label="Code de vérification"
    >
      <div className="flex items-center">
        {chars.map((ch, i) => (
          <input
            key={i}
            ref={(el) => {
              refs.current[i] = el;
            }}
            value={ch}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onFocus={(e) => e.currentTarget.select()}
            disabled={disabled}
            inputMode="numeric"
            pattern="[0-9]*"
            type="tel"
            // Important: avoid password manager/email autofill
            autoComplete="off"
            name={`otp-${i}`}
            aria-label={`Chiffre ${i + 1} du code`}
            className={cn(
              "h-10 w-10 text-center text-sm transition-all",
              "border-y border-r border-input first:rounded-l-md first:border-l last:rounded-r-md",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              "disabled:cursor-not-allowed disabled:opacity-50"
            )}
            maxLength={1}
          />
        ))}
      </div>
    </div>
  );
}
