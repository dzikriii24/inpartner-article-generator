import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
  label?: string;
  onReset?: () => void;
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export class ComponentErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error?.message || 'Komponen mengalami kesalahan render.' };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-5 text-xs text-rose-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            <div>
              <p className="font-bold">Gagal merender komponen {this.props.label || ''}</p>
              <p className="text-[11px] text-rose-600 mt-0.5">{this.state.message}</p>
            </div>
          </div>
          {this.props.onReset && (
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false, message: '' });
                this.props.onReset?.();
              }}
              className="px-3 py-1.5 rounded-xl bg-white border border-rose-200 text-rose-700 font-semibold hover:bg-rose-100 flex items-center gap-1.5 shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset Blok
            </button>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

