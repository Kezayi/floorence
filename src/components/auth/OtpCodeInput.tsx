import * as React from "react";

import { cn } from "@/lib/utils";

type Props = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange" | "disabled" | "maxLength" | "className"
> & {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  disabled?: boolean;
  className?: string;
};

const onlyDigits = (s: string) => s.replace(/\D/g, "");

function mergeRefs<T>(...refs: Array<React.Ref<T> | undefined>) {
  return (value: T | null) => {
    for (const ref of refs) {
      if (!ref) continue;
      if (typeof ref === "function") ref(value);
      else (ref as React.MutableRefObject<T | null>).current = value;
    }
  };
}

const OtpCodeInput = React.forwardRef<HTMLInputElement, Props>(function OtpCodeInput(
  { value, onChange, length = 6, disabled, className, name, id, ...inputProps },
  forwardedRef
) {
  // IMPORTANT: keep this as a normal visible input.
  // Hidden/overlay inputs are often non-focusable on iOS/Android and break paste.
  const digitsValue = React.useMemo(() => onlyDigits(value).slice(0, length), [value, length]);

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
  };

  return (
    <input
      ref={mergeRefs(forwardedRef)}
      value={digitsValue}
      onChange={(e) => handleChange(e.target.value)}
      onPaste={handlePaste}
      disabled={disabled}
      inputMode="numeric"
      pattern="[0-9]*"
      type="tel"
      autoComplete="one-time-code"
      name={name ?? "otp"}
      id={id}
      spellCheck={false}
      autoCorrect="off"
      autoCapitalize="off"
      data-lpignore="true"
      data-1p-ignore="true"
      data-form-type="other"
      aria-label="Code de vérification (6 chiffres)"
      maxLength={length}
      {...inputProps}
      className={cn(
        "h-12 w-full rounded-md border border-input bg-background px-3 text-center text-lg",
        // Make entering 6 digits comfortable + visually segmented
        "font-mono tracking-[0.6em]",
        "placeholder:text-muted-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      placeholder={"\u2022\u2022\u2022\u2022\u2022\u2022"}
    />
  );
});

export default OtpCodeInput;
