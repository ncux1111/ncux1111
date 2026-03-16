import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-red-100 p-4">
            <div className="max-w-lg w-full bg-white rounded-xl shadow-xl p-8 text-center">
              <div className="text-6xl mb-4">😵</div>
              <h1 className="text-2xl font-bold text-slate-900 mb-2">Что-то пошло не так</h1>
              <p className="text-slate-600 mb-6">Произошла ошибка при загрузке приложения.</p>
              
              {this.state.error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-left">
                  <p className="text-sm font-mono text-red-900 break-words">
                    {this.state.error.message}
                  </p>
                </div>
              )}
              
              <button
                onClick={() => window.location.reload()}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
              >
                🔄 Перезагрузить страницу
              </button>
              
              <button
                onClick={() => {
                  if (window.confirm('Очистить все данные и начать заново?')) {
                    localStorage.clear();
                    window.location.reload();
                  }
                }}
                className="w-full mt-3 bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium py-2 px-6 rounded-lg transition-colors"
              >
                🗑️ Очистить данные
              </button>
            </div>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
