import React from 'react';

export class ModalErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('[Modal Error caught]:', error, info);
  }

  componentDidUpdate(prevProps) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="p-6 bg-white rounded-2xl max-w-md w-full shadow-2xl text-center space-y-3">
            <h3 className="text-base font-bold text-slate-900">Form Render Issue</h3>
            <p className="text-xs text-slate-500">Could not display product form. Please try again or refresh the page.</p>
            <button
              onClick={() => {
                this.setState({ hasError: false });
                if (this.props.onReset) this.props.onReset();
              }}
              className="px-4 py-2 bg-emerald-800 text-white rounded-xl text-xs font-bold shadow hover:bg-emerald-900 font-sans"
            >
              Close & Reset
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
