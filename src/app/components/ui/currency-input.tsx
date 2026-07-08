import { useEffect, useRef, useState, type InputHTMLAttributes } from "react";

function clamp(n: number, min?: number, max?: number): number {
  let v = n;
  if (min !== undefined) v = Math.max(min, v);
  if (max !== undefined) v = Math.min(max, v);
  return v;
}

interface CurrencyInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}

/** Text-based currency field — avoids leading-zero quirks of controlled number inputs. */
export function CurrencyInput({ value, onChange, min = 0, max, className, onFocus, onBlur, ...rest }: CurrencyInputProps) {
  const [text, setText] = useState(() => String(value));
  const focusedRef = useRef(false);

  useEffect(() => {
    if (!focusedRef.current) {
      setText(String(value));
    }
  }, [value]);

  const commit = (raw: string) => {
    const digits = raw.replace(/\D/g, "");
    const parsed = digits === "" ? 0 : Number(digits);
    const next = clamp(parsed, min, max);
    onChange(next);
    setText(String(next));
  };

  return (
    <input
      {...rest}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      value={text}
      onFocus={(e) => {
        focusedRef.current = true;
        onFocus?.(e);
      }}
      onBlur={(e) => {
        focusedRef.current = false;
        commit(text);
        onBlur?.(e);
      }}
      onChange={(e) => {
        const raw = e.target.value.replace(/\D/g, "");
        setText(raw);
        if (raw === "") {
          onChange(0);
          return;
        }
        onChange(clamp(Number(raw), min, max));
      }}
      className={className}
    />
  );
}
