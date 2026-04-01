import { useMemo, useRef } from "react";

type OtpCodeFieldProps = {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  disabled?: boolean;
};

export function OtpCodeField({ value, onChange, length = 6, disabled = false }: OtpCodeFieldProps) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const slots = useMemo(() => Array.from({ length }), [length]);

  function focusIndex(index: number) {
    refs.current[index]?.focus();
    refs.current[index]?.select();
  }

  function handleInput(index: number, nextValue: string) {
    const digit = nextValue.replace(/\D/g, "").slice(-1);
    const chars = value.split("");

    if (!digit) {
      chars[index] = "";
      onChange(chars.join("").slice(0, length));
      return;
    }

    chars[index] = digit;
    onChange(chars.join("").slice(0, length));

    if (index < length - 1) {
      focusIndex(index + 1);
    }
  }

  function handleKeyDown(index: number, event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace" && !value[index] && index > 0) {
      focusIndex(index - 1);
    }

    if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();
      focusIndex(index - 1);
    }

    if (event.key === "ArrowRight" && index < length - 1) {
      event.preventDefault();
      focusIndex(index + 1);
    }
  }

  function handlePaste(event: React.ClipboardEvent<HTMLDivElement>) {
    event.preventDefault();
    const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);

    if (!pasted) {
      return;
    }

    onChange(pasted);

    const nextIndex = Math.min(pasted.length, length - 1);
    focusIndex(nextIndex);
  }

  return (
    <div className="grid grid-cols-6 gap-2" onPaste={handlePaste}>
      {slots.map((_, index) => (
        <input
          key={index}
          ref={(node) => {
            refs.current[index] = node;
          }}
          aria-label={`OTP digit ${index + 1}`}
          className="h-12 w-full rounded-xl border border-slate-700 bg-slate-900 text-center text-lg font-semibold text-slate-100 outline-none transition focus:border-amber-300 focus:ring-2 focus:ring-amber-300/30 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={disabled}
          inputMode="numeric"
          maxLength={1}
          pattern="[0-9]*"
          type="text"
          value={value[index] ?? ""}
          onChange={(event) => handleInput(index, event.target.value)}
          onKeyDown={(event) => handleKeyDown(index, event)}
        />
      ))}
    </div>
  );
}
