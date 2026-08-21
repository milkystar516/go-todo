import { Link } from "react-router"

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
  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Create your account</CardTitle>
          <CardDescription>
            Enter your information below to create your account
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="username">Username</FieldLabel>
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
                <FieldLabel htmlFor="nickname">Nickname</FieldLabel>
                <Input
                  id="nickname"
                  name="nickname"
                  type="text"
                  autoComplete="nickname"
                  maxLength={50}
                />
                <FieldDescription>Optional</FieldDescription>
              </Field>

              <Field>
                <FieldLabel htmlFor="password">Password</FieldLabel>
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
                  Confirm Password
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
                <Button type="submit">Create Account</Button>

                <FieldDescription className="text-center">
                  Already have an account?{" "}
                  <Link to="/login" className="underline underline-offset-4">
                    Sign in
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