import {
  type ComponentProps,
  type SubmitEvent,
  useState,
} from "react";
import { useMutation } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";

import { signup } from "../../../api/auth";
import { ApiError } from "../../../api/client";

import { cn } from "#lib/utils";
import { Button } from "#components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components/ui/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "#components/ui/field";
import { Input } from "#components/ui/input";

export function SignupForm({
  className,
  ...props
}: ComponentProps<"div">) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [passwordMismatch, setPasswordMismatch] = useState(false);

  const signupMutation = useMutation({
    mutationFn: signup,

    onSuccess: () => {
      navigate("/login", { replace: true });
    },
  });

  const usernameExists =
    signupMutation.error instanceof ApiError &&
    signupMutation.error.status === 409;

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);

    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(
      formData.get("confirm-password") ?? "",
    );

    if (password !== confirmPassword) {
      setPasswordMismatch(true);
      return;
    }

    setPasswordMismatch(false);

    const nickname = String(formData.get("nickname") ?? "");

    signupMutation.mutate({
      username: String(formData.get("username") ?? ""),
      nickname: nickname === "" ? null : nickname,
      password,
    });
  }

  function handleConfirmPasswordChange() {
    if (passwordMismatch) {
      setPasswordMismatch(false);
    }
  }

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
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              <Field data-invalid={usernameExists}>
                <FieldLabel htmlFor="username">
                  {t("auth.username")}
                </FieldLabel>

                <Input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  maxLength={50}
                  pattern="[a-z][a-z0-9._-]*"
                  placeholder={t("auth.username")}
                  aria-invalid={usernameExists}
                  required
                />

                {usernameExists && (
                  <FieldError>
                    {t("auth.signup.usernameExists")}
                  </FieldError>
                )}
              </Field>

              <Field>
                <FieldLabel htmlFor="nickname">
                  {t("auth.nickname")}
                </FieldLabel>

                <Input
                  id="nickname"
                  name="nickname"
                  type="text"
                  autoComplete="nickname"
                  maxLength={50}
                />

                <FieldDescription>
                  {t("auth.nicknameOptional")}
                </FieldDescription>
              </Field>

              <Field>
                <FieldLabel htmlFor="password">
                  {t("auth.password")}
                </FieldLabel>

                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                />
              </Field>

              <Field data-invalid={passwordMismatch}>
                <FieldLabel htmlFor="confirm-password">
                  {t("auth.confirmPassword")}
                </FieldLabel>

                <Input
                  id="confirm-password"
                  name="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  aria-invalid={passwordMismatch}
                  onChange={handleConfirmPasswordChange}
                  required
                />

                {passwordMismatch && (
                  <FieldError>
                    {t("auth.signup.passwordMismatch")}
                  </FieldError>
                )}
              </Field>

              <Field>
                <Button
                  type="submit"
                  disabled={signupMutation.isPending}
                >
                  {t("auth.signup.submit")}
                </Button>

                {signupMutation.isError && !usernameExists && (
                  <FieldError>
                    {t("auth.requestFailed")}
                  </FieldError>
                )}

                <FieldDescription className="text-center">
                  {t("auth.signup.hasAccount")}{" "}
                  <Link
                    to="/login"
                    className="underline underline-offset-4"
                  >
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