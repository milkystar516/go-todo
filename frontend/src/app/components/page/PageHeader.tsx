import type { ComponentProps, ReactNode } from "react"

import { cn } from "#lib/utils"

interface PageHeaderProps extends Omit<ComponentProps<"header">, "title"> {
  title: ReactNode
  description?: ReactNode
  leading?: ReactNode
  actions?: ReactNode
}

export function PageHeader({
  title,
  description,
  leading,
  actions,
  children,
  className,
  ...props
}: PageHeaderProps) {
  return (
    <header className={cn("space-y-3", className)} {...props}>
      {leading}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            {title}
          </h1>
          {description && (
            <div className="text-sm text-muted-foreground">
              {description}
            </div>
          )}
        </div>

        {actions && (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {actions}
          </div>
        )}
      </div>

      {children}
    </header>
  )
}
