import React from "react";

export class ViewErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 rounded-2xl bg-red-950/20 border border-red-500/20 text-center my-6">
          <span className="text-3xl">⚠️</span>
          <h3 className="text-red-400 font-bold text-base mt-2">{this.props.fallbackTitle || "Component Temporarily Unavailable"}</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            An isolated error occurred in this view. Other trading features and live feeds remain fully operational.
          </p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="mt-4 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs font-semibold rounded-lg transition"
          >
            ↻ Retry View
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
