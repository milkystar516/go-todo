import { useTranslation } from "react-i18next"
import {
  isRouteErrorResponse,
  Link,
  useRouteError,
} from "react-router"

import { Button } from "#components/ui/button"
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "#components/ui/card"

export function RootRouteErrorBoundary() {
  const { t } = useTranslation()
  const error = useRouteError()
  const isNotFound =
    isRouteErrorResponse(error) && error.status === 404

  return (
    <main className="grid min-h-svh place-items-center p-6">
      <Card className="w-full max-w-lg" role="alert">
        <CardHeader>
          <CardTitle>
            {t(
              isNotFound
                ? "routeError.notFoundTitle"
                : "routeError.title",
            )}
          </CardTitle>
          <CardDescription>
            {t(
              isNotFound
                ? "routeError.notFoundDescription"
                : "routeError.description",
            )}
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex flex-wrap gap-2">
          <Button asChild>
            <Link to="/">{t("routeError.home")}</Link>
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => window.location.reload()}
          >
            {t("routeError.reload")}
          </Button>
        </CardFooter>
      </Card>
    </main>
  )
}
