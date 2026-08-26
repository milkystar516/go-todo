import type { ComponentProps } from "react"

import { cn } from "#lib/utils"

const pageWidths = {
  content: "max-w-4xl",
  wide: "max-w-7xl",
  full: "max-w-none",
} as const

interface AppPageProps extends ComponentProps<"main"> {
  size?: keyof typeof pageWidths
}

export function AppPage({
  size = "content",
  className,
  ...props
}: AppPageProps) {
  return (
    <main
      className={cn(
        "mx-auto w-full space-y-6 py-2",
        pageWidths[size],
        className,
      )}
      {...props}
    />
  )
}
