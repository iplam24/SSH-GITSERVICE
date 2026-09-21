import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in React ErrorBoundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  public handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#0B0F17] text-slate-100 p-6 font-sans">
          <div className="max-w-md w-full p-6 bg-[#0F172A] border border-red-500/40 rounded-2xl shadow-2xl flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 text-2xl mb-4">
              ⚠️
            </div>
            <h2 className="text-xl font-bold text-slate-100 mb-2">Đã xảy ra sự cố hiển thị</h2>
            <p className="text-xs text-slate-400 mb-4">
              {this.state.error?.message || 'Lỗi không xác định trong quá trình kết xuất giao diện.'}
            </p>
            <div className="w-full bg-[#070A0F] border border-[#1E293B] rounded-lg p-3 text-left mb-6 overflow-auto max-h-32">
              <pre className="text-[10px] font-mono text-red-400 whitespace-pre-wrap">
                {this.state.error?.stack || String(this.state.error)}
              </pre>
            </div>
            <div className="flex gap-3 w-full">
              <button
                type="button"
                onClick={this.handleReload}
                className="flex-1 py-2.5 px-4 rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 font-bold text-xs hover:opacity-90 transition-opacity cursor-pointer"
              >
                Tải lại ứng dụng
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
