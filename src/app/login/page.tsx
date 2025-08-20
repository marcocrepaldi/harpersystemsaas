// [FRONTEND] app/login/page.tsx
import { Suspense } from "react";
import Script from "next/script";
import { LoginForm } from "@/components/login/login-form";

export default function LoginPage() {
  return (
    <>
      <Suspense
        fallback={
          <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
            <div className="w-full max-w-sm">
              <div className="animate-pulse space-y-4">
                <div className="h-6 w-2/3 rounded bg-muted" />
                <div className="h-10 w-full rounded bg-muted" />
                <div className="h-10 w-full rounded bg-muted" />
                <div className="h-10 w-full rounded bg-muted" />
              </div>
            </div>
          </div>
        }
      >
        <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
          <div className="w-full max-w-sm">
            <LoginForm />
          </div>
        </div>
      </Suspense>
    </>
  );
}
