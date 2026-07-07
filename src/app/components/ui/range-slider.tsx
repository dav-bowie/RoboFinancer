import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { cn } from "./utils";

interface RangeSliderProps {
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
  accentColor?: string;
  className?: string;
  "aria-label"?: string;
}

export function RangeSlider({
  min,
  max,
  step,
  value,
  onChange,
  accentColor = "#10b981",
  className,
  "aria-label": ariaLabel,
}: RangeSliderProps) {
  return (
    <SliderPrimitive.Root
      data-slot="range-slider"
      min={min}
      max={max}
      step={step}
      value={[value]}
      onValueChange={([next]) => onChange(next)}
      aria-label={ariaLabel}
      className={cn(
        "group relative flex w-full touch-none items-center select-none py-2",
        className,
      )}
      style={
        {
          "--slider-accent": accentColor,
        } as React.CSSProperties
      }
    >
      <SliderPrimitive.Track
        data-slot="range-slider-track"
        className="relative h-2 w-full grow overflow-hidden rounded-full border border-border bg-secondary shadow-[inset_0_1px_2px_rgba(0,0,0,0.35)]"
      >
        <SliderPrimitive.Range
          data-slot="range-slider-range"
          className="absolute h-full rounded-full bg-[var(--slider-accent)]"
        />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb
        data-slot="range-slider-thumb"
        className="block size-[18px] shrink-0 rounded-full border-2 border-[var(--slider-accent)] bg-background shadow-[0_0_0_3px_color-mix(in_srgb,var(--slider-accent)_20%,transparent),0_2px_6px_rgba(0,0,0,0.45)] transition-[box-shadow,transform] hover:scale-110 hover:shadow-[0_0_0_5px_color-mix(in_srgb,var(--slider-accent)_28%,transparent),0_2px_8px_rgba(0,0,0,0.5)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--slider-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50"
      />
    </SliderPrimitive.Root>
  );
}
