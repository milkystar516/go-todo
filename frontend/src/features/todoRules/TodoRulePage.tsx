import { ArrowLeft } from "lucide-react"
import {
  useCallback,
  useRef,
  useState,
} from "react"
import { useTranslation } from "react-i18next"
import { Link, useParams } from "react-router"

import { AppPage } from "../../app/components/AppPage"
import { PageHeader } from "../../app/components/PageHeader"
import { AdminHeader } from "../admin/components/AdminHeader"
import { Button } from "#components/ui/button"
import { useClickOutside } from "#hooks/use-click-outside"
import { cn } from "#lib/utils"

import { TodoRuleDetail } from "./components/TodoRuleDetail"
import { TodoRuleTable} from "./components/TodoRuleTable"

export function TodoRulePage() {
  const { ruleId: ruleIdParam } = useParams()

  const [selectedRuleId, setSelectedRuleId] =
    useState<number | null>(null)

  const detailRef = useRef<HTMLDivElement>(null)

  const fullDetailOpen = ruleIdParam !== undefined

  const fullRuleId = parseRuleId(ruleIdParam)

  const splitDetailOpen =
    !fullDetailOpen &&
    selectedRuleId !== null

  const activeRuleId =
    fullDetailOpen
      ? fullRuleId
      : selectedRuleId

  const handleClickOutside = useCallback(
    (event: PointerEvent) => {
      if (fullDetailOpen) {
        return
      }

      const target = event.target

      if (
        target instanceof Element &&
        target.closest(
          "[data-keep-rule-detail-open]",
        )
      ) {
        return
      }

      setSelectedRuleId(null)
    },
    [fullDetailOpen],
  )

  useClickOutside(
    detailRef,
    handleClickOutside,
  )

  return (
    <AppPage size="wide">
      {!fullDetailOpen && <AdminHeader />}

      <div className="flex min-w-0 flex-col items-start md:flex-row">
        <div
          className={cn(
            "w-full min-w-0 overflow-hidden",
            "md:basis-0",
            "md:transition-[flex-grow]",
            "md:duration-200",
            "md:ease-out",
            "motion-reduce:transition-none",
            fullDetailOpen
              ? "hidden md:block md:grow-0"
              : "md:grow",
          )}
          inert={
            fullDetailOpen
              ? true
              : undefined
          }
          aria-hidden={
            fullDetailOpen
              ? true
              : undefined
          }
        >
          <TodoRuleTable
            selectedRuleId={selectedRuleId}
            onSelectRule={setSelectedRuleId}
          />
        </div>

        <div
          ref={detailRef}
          className={cn(
            "w-full min-w-0 overflow-hidden",
            "md:transition-[flex-grow,flex-basis,padding-left]",
            "md:duration-200",
            "md:ease-out",
            "motion-reduce:transition-none",
            fullDetailOpen
              ? "md:basis-0 md:grow md:pl-0"
              : splitDetailOpen
                ? "md:basis-[29rem] md:grow-0 md:shrink-0 md:pl-4"
                : "md:basis-0 md:grow-0 md:pl-0",
          )}
        >
          {fullDetailOpen &&
          fullRuleId === null ? (
            <InvalidTodoRuleDetail />
          ) : activeRuleId !== null ? (
            <TodoRuleDetail
              ruleId={activeRuleId}
              mode={
                fullDetailOpen
                  ? "full"
                  : "split"
              }
              onClose={() =>
                setSelectedRuleId(null)
              }
              onDeleted={() =>
                setSelectedRuleId(null)
              }
            />
          ) : null}
        </div>
      </div>
    </AppPage>
  )
}

function InvalidTodoRuleDetail() {
  const { t } = useTranslation()

  return (
    <PageHeader
      leading={
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="-ml-3"
        >
          <Link to="/admin/todo-rules">
            <ArrowLeft />

            {t(
              "admin.todoRules.detail.back",
            )}
          </Link>
        </Button>
      }
      title={t(
        "admin.todoRules.detail.invalidTitle",
      )}
      description={t(
        "admin.todoRules.detail.invalidDescription",
      )}
    />
  )
}

function parseRuleId(
  value: string | undefined,
): number | null {
  if (value === undefined) {
    return null
  }

  const ruleId = Number(value)

  return Number.isSafeInteger(ruleId) &&
    ruleId > 0
    ? ruleId
    : null
}