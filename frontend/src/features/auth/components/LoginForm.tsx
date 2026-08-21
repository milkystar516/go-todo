import { Link } from "react-router"
import { useTranslation } from "react-i18next"

import { cn } from "#lib/utils"
import { Button } from "#components/ui/button"
import {
  Card,
  CardContent,
} from "#components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "#components/ui/field"
import { Input } from "#components/ui/input"

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const { t } = useTranslation()

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardContent>
          <form>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="username">{t("auth.username")}</FieldLabel>
                <Input
                  id="username"
                  type="text"
                  placeholder={t("auth.username")}
                  required
                />
              </Field>
              <Field>
                <div className="flex items-center">
                  <FieldLabel htmlFor="password">{t("auth.password")}</FieldLabel>
                  <a
                    href="#"
                    className="ml-auto text-sm underline-offset-4 hover:underline"
                  >
                    {t("auth.login.forgotPassword")}
                  </a>
                </div>
                <Input id="password" type="password" required />
              </Field>
              <Field>
                <Button type="submit">{t("auth.login.submit")}</Button>
                <FieldDescription className="text-center">
                  {t("auth.login.noAccount")}{" "}
                  <Link to="/signup" className="underline underline-offset-4">
                    {t("auth.login.signupLink")}
                  </Link>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
