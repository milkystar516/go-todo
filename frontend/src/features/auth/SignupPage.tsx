import { SignupForm } from "./components/SignupForm";

export function SignupPage() {
  return (
    <main className="flex flex-col items-center justify-center bg-muted p-6 md:p-10">
      <div className="w-full max-w-sm">
        <SignupForm />
      </div>
    </main>
  );
}