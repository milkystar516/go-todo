import {
  getUiOptions,
  type TitleFieldProps,
} from "@rjsf/utils"

import { FieldTitle } from "#components/ui/field"
import { Separator } from "#components/ui/separator"

export function TodoTitleFieldTemplate({
  id,
  title,
  required,
  uiSchema,
  optionalDataControl,
}: TitleFieldProps) {
  const uiOptions = getUiOptions(uiSchema)

  return (
    <div id={id} className="my-1 flex flex-col gap-0.5">
      <div className="flex items-center justify-between gap-2">
        <FieldTitle>
          {uiOptions.title || title}
          {required && (
            <span className="text-destructive" aria-hidden="true">
              *
            </span>
          )}
        </FieldTitle>
        {optionalDataControl}
      </div>
      <Separator className="my-1" />
    </div>
  )
}
