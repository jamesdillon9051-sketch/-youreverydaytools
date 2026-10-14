"use client";

import { Component, Fragment, type ReactNode } from "react";
import { RefreshCw, TriangleAlert } from "lucide-react";

type State = { error: Error | null; attempt: number };

export function isChunkLoadFailure(error: Error) {
  return /loading chunk|chunkloaderror|failed to fetch dynamically imported|importing a module script failed/i.test(
    `${error.name} ${error.message}`,
  );
}

export function CrashPanel({
  error,
  onRetry,
}: {
  error: Error;
  onRetry: () => void;
}) {
  const loadFailure = isChunkLoadFailure(error);
  return (
    <div
      role="alert"
      className="rounded-2xl border border-rose-200 bg-rose-50 p-6 dark:border-rose-900 dark:bg-rose-950/30"
    >
      <div className="flex items-start gap-3">
        <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-rose-600 dark:text-rose-400" />
        <div className="min-w-0">
          <h2 className="font-semibold text-rose-800 dark:text-rose-200">
            {loadFailure
              ? "This tool could not be loaded"
              : "This tool ran into a problem"}
          </h2>
          <p className="mt-2 text-sm text-rose-700 dark:text-rose-300">
            {loadFailure
              ? "Part of the page failed to download. Check your connection, then try again. If the site was just updated, reloading the page fetches the latest version."
              : "Something unexpected stopped this tool. Nothing was uploaded anywhere. Try again, or reload the page to start fresh."}
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button type="button" className="btn" onClick={onRetry}>
              <RefreshCw className="h-4 w-4" /> Try again
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => window.location.reload()}
            >
              Reload page
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Keeps a crashing tool from blanking the whole page and its navigation. */
export class ToolErrorBoundary extends Component<
  { children: ReactNode },
  State
> {
  state: State = { error: null, attempt: 0 };
  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }
  componentDidCatch(error: Error) {
    console.error("Tool failed:", error);
  }
  retry = () => this.setState((s) => ({ error: null, attempt: s.attempt + 1 }));
  render() {
    if (this.state.error)
      return <CrashPanel error={this.state.error} onRetry={this.retry} />;
    return <Fragment key={this.state.attempt}>{this.props.children}</Fragment>;
  }
}
