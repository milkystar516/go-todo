import { GalleryVerticalEnd } from "lucide-react";

import { LanguageSwitcher } from "#components/LanguageSwitcher";

import { SignupForm } from "./components/SignupForm";

export function SignupPage() {
  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10">
      <div className="absolute right-6 top-6 md:right-10 md:top-10">
        <LanguageSwitcher />
      </div>

      <div className="flex w-full max-w-sm flex-col gap-6">
        <div className="flex items-center gap-2 self-center font-medium">
          <div className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <GalleryVerticalEnd className="size-4" />
          </div>
          Go Todo
        </div>

        <SignupForm />
      </div>
    </div>
  );
}
