import React from "react";

export class ViewErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    const msg = error?.message || "";
    const isChunkError =
      msg.includes("Failed to fetch dynamically imported module") ||
      msg.includes("Importing a module script failed") ||
      error?.name === "ChunkLoadError";

    if (isChunkError && typeof window !== "undefined") {
      const reloadKey = "boundary_chunk_reload";
      const lastReload = sessionStorage.getItem(reloadKey);
      const now = Date.now();
      if (!lastReload || now - Number(lastReload) > 8000) {
        sessionStorage.setItem(reloadKey, String(now));
        window.location.reload();
      }
    }
  }

  render() {
    if (this.state.hasError) {
      const msg = this.state.error?.message || "";
      const isChunkError =
        msg.includes("Failed to fetch dynamically imported module") ||
        msg.includes("Importing a module script failed") ||
        this.state.error?.name === "ChunkLoadError";

      return (
        <div 
          role="alert" 
          aria-live="assertive"
          className="p-8 rounded-2xl bg-red-950/20 border border-red-500/20 text-center my-6"
        >
          <span className="text-3xl">{isChunkError ? "🔄" : "⚠️"}</span>
          <h3 className="text-red-400 font-bold text-base mt-2">
            {isChunkError ? "Application Updated" : (this.props.fallbackTitle || "Component Temporarily Unavailable")}
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            {isChunkError
              ? "A fresh build of PortfolioX was deployed. Click below to reload the latest version."
              : "An isolated error occurred in this view. Other trading features and live feeds remain fully operational."}
          </p>
          <button
            onClick={() => {
              if (isChunkError && typeof window !== "undefined") {
                window.location.reload();
              } else {
                this.setState({ hasError: false, error: null });
              }
            }}
            className="mt-4 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs font-semibold rounded-lg transition"
          >
            ↻ {isChunkError ? "Reload Application" : "Retry View"}
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
