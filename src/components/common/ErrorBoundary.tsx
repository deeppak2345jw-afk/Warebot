import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertOctagon, RotateCcw, Bug } from 'lucide-react';

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
    console.error('CRITICAL REACT RENDER ERROR:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleReload = () => {
    try {
      localStorage.clear();
    } catch {}
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="w-screen h-screen bg-[#050914] text-[#E7F4FF] flex flex-col items-center justify-center p-6 font-mono select-none">
          <div className="max-w-2xl w-full bg-[#081221] border border-[#FF3D71] rounded-2xl p-6 shadow-2xl shadow-[#FF3D71]/20 space-y-4">
            <div className="flex items-center space-x-3 text-[#FF3D71] pb-3 border-b border-[#183653]">
              <AlertOctagon className="w-8 h-8 animate-bounce" />
              <div>
                <h1 className="text-lg font-bold">ROBOFLEET // SYSTEM ANOMALY CAUGHT</h1>
                <p className="text-xs text-[#7F9BB8]">An unhandled runtime error was intercepted by the Error Boundary.</p>
              </div>
            </div>

            <div className="bg-[#101E32] p-4 rounded-xl border border-[#183653] space-y-2">
              <div className="text-xs font-bold text-red-400">
                {this.state.error?.name}: {this.state.error?.message}
              </div>
              {this.state.error?.stack && (
                <pre className="text-[10px] text-gray-400 overflow-x-auto max-h-48 p-2 bg-[#050914] rounded border border-gray-800 whitespace-pre-wrap">
                  {this.state.error.stack}
                </pre>
              )}
              {this.state.errorInfo?.componentStack && (
                <div className="pt-2">
                  <div className="text-[10px] text-[#7F9BB8] uppercase font-bold">Component Stack:</div>
                  <pre className="text-[10px] text-gray-400 overflow-x-auto max-h-32 p-2 bg-[#050914] rounded border border-gray-800 whitespace-pre-wrap">
                    {this.state.errorInfo.componentStack}
                  </pre>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="text-[11px] text-[#7F9BB8] flex items-center gap-1.5">
                <Bug className="w-3.5 h-3.5 text-[#00E5FF]" />
                <span>Error details logged to browser developer console</span>
              </div>
              <button
                onClick={this.handleReload}
                className="px-4 py-2 bg-[#00E5FF] hover:bg-[#00E5FF]/80 text-black font-bold rounded-xl flex items-center space-x-2 transition shadow-lg shadow-[#00E5FF]/20 text-xs"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reset & Reload App</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
