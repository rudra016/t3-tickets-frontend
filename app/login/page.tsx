"use client";

import { Suspense, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LuSparkles } from "react-icons/lu";

import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  // useSearchParams must be under a Suspense boundary in Next 16's
  // static-rendering path.
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get("next") || "/";
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await api.login(username, password);
        router.replace(next);
        router.refresh();
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          setError("Invalid username or password.");
        } else {
          setError(err instanceof Error ? err.message : "Login failed");
        }
      }
    });
  }

  return (
    <div className="grid min-h-svh place-items-center bg-muted/30 p-6">
      <div className="w-full max-w-sm rounded-xl border bg-popover p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-2">
          <div className="grid size-9 place-items-center rounded-md bg-primary text-primary-foreground">
            <LuSparkles className="size-4" />
          </div>
          <div>
            <h1 className="font-heading text-base font-semibold leading-tight">
              AI Classifier
            </h1>
            <p className="text-xs text-muted-foreground">
              Sign in to continue
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="username"
              className="text-xs font-medium text-muted-foreground"
            >
              Username
            </label>
            <Input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              required
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={pending}
            />
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor="password"
              className="text-xs font-medium text-muted-foreground"
            >
              Password
            </label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={pending}
            />
          </div>

          {error ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
              {error}
            </div>
          ) : null}

          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      </div>
    </div>
  );
}
