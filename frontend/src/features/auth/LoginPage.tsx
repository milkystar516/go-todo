import { LoginForm } from "./components/LoginForm";

export function LoginPage() {
  return (
    <main className="flex flex-col items-center justify-center bg-muted p-6 md:p-10">
      <div className="w-full max-w-sm">
        <LoginForm />
      </div>
    </main>
  );
}