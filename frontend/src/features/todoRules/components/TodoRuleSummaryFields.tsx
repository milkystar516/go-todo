import { useTranslation } from "react-i18next"

import type { TodoRuleDetail } from "../../../api/types"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components/ui/card"
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from "#components/ui/item"
import { summarizeTodoRuleFields } from "../lib/fieldDefinitions"

interface TodoRuleSummaryFieldsProps {
  rule: TodoRuleDetail
}

export function TodoRuleSummaryFields({
  rule,
}: TodoRuleSummaryFieldsProps) {
  const { t } = useTranslation()
  const fields = summarizeTodoRuleFields(rule)

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("admin.todoRules.detail.fieldsTitle")}</CardTitle>
        <CardDescription>
          {t("admin.todoRules.detail.fieldsCount", {
            count: fields.length,
          })}
        </CardDescription>
      </CardHeader>

      <CardContent>
        {fields.length > 0 ? (
          <ItemGroup>
            {fields.map((field) => (
              <Item key={field.name} variant="outline" size="sm">
                <ItemContent>
                  <ItemTitle>{field.label}</ItemTitle>
                  <ItemDescription>
                    {[
                      t(`admin.todoRules.form.types.${field.type}`),
                      field.required
                        ? t("admin.todoRules.detail.required")
                        : null,
                      field.choiceCount > 0
                        ? t("admin.todoRules.detail.choiceCount", {
                            count: field.choiceCount,
                          })
                        : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </ItemDescription>
                </ItemContent>
              </Item>
            ))}
          </ItemGroup>
        ) : (
          <p className="text-sm text-muted-foreground">
            {t("admin.todoRules.detail.noFields")}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
