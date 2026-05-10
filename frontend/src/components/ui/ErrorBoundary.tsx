import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        this.props.fallback ?? (
          <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4 text-center px-4">
            <p className="text-lg font-semibold text-red-500">
              Something went wrong.
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {this.state.error.message}
            </p>
            <button
              className="px-4 py-2 rounded-lg bg-slate-200 dark:bg-slate-700 text-sm hover:opacity-80"
              onClick={() => this.setState({ error: null })}
            >
              Try again
            </button>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
