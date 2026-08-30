import type { SubmitEvent } from "react";
import { Link, useNavigate } from "react-router"
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
  FieldError,
} from "#components/ui/field"
import { Input } from "#components/ui/input"
import { useMutation, useQueryClient } from "@tanstack/react-query"

import { login } from "../../../api/auth";
import { isApiErrorOfType } from "../../../api/client";
import { PROBLEM_TYPE } from "../../../api/types";
import { refreshSessionCache } from "../sessionCache";

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const { t } = useTranslation()
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const loginMutation = useMutation({
    mutationFn: login,

    onSuccess: async () => {
      await refreshSessionCache(queryClient);

      navigate("/", { replace: true });
    },
  });

  const loginError =
    isApiErrorOfType(
      loginMutation.error,
      PROBLEM_TYPE.INVALID_CREDENTIALS,
    )
      ? t("auth.login.invalidCredentials")
      : loginMutation.isError
      ? t("auth.requestFailed")
      : null;

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);

    loginMutation.mutate({
      username: String(formData.get("username") ?? ""),
      password: String(formData.get("password") ?? ""),
    });
  }

  function handleInputChange() {
    if (loginMutation.isError) {
      loginMutation.reset();
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="username">{t("auth.username")}</FieldLabel>
                <Input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  maxLength={50}
                  placeholder={t("auth.username")}
                  onChange={handleInputChange}
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="password">
                  {t("auth.password")}
                </FieldLabel>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  onChange={handleInputChange}
                  required
                />
              </Field>
              <Field>
                {loginError && (
                  <FieldError>
                    {loginError}
                  </FieldError>
                )}

                <Button
                  type="submit"
                  disabled={loginMutation.isPending}
                >
                  {t("auth.login.submit")}
                </Button>
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
