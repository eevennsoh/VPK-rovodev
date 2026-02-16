"use client"

import { Radio as RadioPrimitive } from "@base-ui/react/radio"
import { RadioGroup as RadioGroupPrimitive } from "@base-ui/react/radio-group"

import { cn } from "@/lib/utils"
import { CircleIcon } from "lucide-react"

export type RadioGroupProps = RadioGroupPrimitive.Props

function RadioGroup({ className, ...props }: Readonly<RadioGroupProps>) {
  return (
    <RadioGroupPrimitive
      data-slot="radio-group"
      className={cn("grid gap-2 w-full", className)}
      {...props}
    />
  )
}

export type RadioGroupItemProps = RadioPrimitive.Root.Props

function RadioGroupItem({ className, ...props }: Readonly<RadioGroupItemProps>) {
  return (
    <RadioPrimitive.Root
      data-slot="radio-group-item"
      className={cn(
        "border-input bg-bg-input hover:bg-bg-input-hovered active:bg-bg-input-pressed text-primary data-checked:border-primary data-checked:bg-primary data-checked:text-primary-foreground data-checked:hover:bg-primary-hovered data-checked:active:bg-primary-pressed focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 aria-invalid:border-destructive flex size-4 rounded-full focus-visible:ring-3 aria-invalid:ring-3 group/radio-group-item peer relative aspect-square shrink-0 border outline-none after:absolute after:-inset-x-3 after:-inset-y-2 group-has-disabled/field:pointer-events-none group-has-disabled/field:opacity-(--opacity-disabled) disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-(--opacity-disabled)",
        className
      )}
      {...props}
    >
      <RadioPrimitive.Indicator
        data-slot="radio-group-indicator"
        className="flex size-4 items-center justify-center"
      >
        <CircleIcon className="absolute top-1/2 left-1/2 size-2 -translate-x-1/2 -translate-y-1/2 fill-current" />
      </RadioPrimitive.Indicator>
    </RadioPrimitive.Root>
  )
}

export {
	RadioGroup,
	RadioGroupItem,
}
