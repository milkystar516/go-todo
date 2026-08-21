import { Link } from "react-router"
import { useTranslation } from "react-i18next"

import { cn } from "#lib/utils"
import { Button } from "#components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "#components/ui/field"
import { Input } from "#components/ui/input"

export function SignupForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const { t } = useTranslation();

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">
            {t("auth.signup.title")}
          </CardTitle>
          <CardDescription>
            {t("auth.signup.description")}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="username">{t("auth.username")}</FieldLabel>
                <Input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  maxLength={50}
                  required
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="nickname">{t("auth.nickname")}</FieldLabel>
                <Input
                  id="nickname"
                  name="nickname"
                  type="text"
                  autoComplete="nickname"
                  maxLength={50}
                />
                <FieldDescription>{t("auth.nicknameOptional")}</FieldDescription>
              </Field>

              <Field>
                <FieldLabel htmlFor="password">{t("auth.password")}</FieldLabel>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="confirm-password">
                  {t("auth.confirmPassword")}
                </FieldLabel>
                <Input
                  id="confirm-password"
                  name="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  required
                />
              </Field>

              <Field>
                <Button type="submit">{t("auth.signup.submit")}</Button>

                <FieldDescription className="text-center">
                  {t("auth.signup.hasAccount")}{" "}
                  <Link to="/login" className="underline underline-offset-4">
                    {t("auth.signup.loginLink")}
                  </Link>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
