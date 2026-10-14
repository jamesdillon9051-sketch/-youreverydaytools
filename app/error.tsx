"use client";

import Link from "next/link";
import { CrashPanel } from "@/components/ToolErrorBoundary";

export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto my-16 max-w-xl space-y-4">
      <CrashPanel error={error} onRetry={reset} />
      <p className="text-center text-xs text-slate-500">
        <Link href="/" className="font-semibold text-violet-600">
          Back to all tools
        </Link>
      </p>
    </div>
  );
}
