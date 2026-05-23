import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, message: error?.message || "Unexpected app error" };
  }

  componentDidCatch(error, info) {
    console.error("App error", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="info-card">
          <span className="status-pill">Error</span>
          <h2>Something went wrong</h2>
          <p>{this.state.message}</p>
          <div className="action-row">
            <button className="primary-action" type="button" onClick={() => window.location.reload()}>
              Reload app
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
