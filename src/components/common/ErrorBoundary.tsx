import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  /** Changing this resets the boundary — pass the active tab so a fresh tab recovers. */
  resetKey?: string;
}
interface State {
  error: Error | null;
}

/**
 * Catches an unexpected render error in a tab and shows a recoverable card
 * instead of a white screen. Keyed by the active tab so switching tabs clears it.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidUpdate(prev: Props) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  componentDidCatch(error: Error) {
    // eslint-disable-next-line no-console
    console.error('[xsight] tab render error:', error);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <div className="stadium-card mx-auto mt-16 max-w-md p-6 text-center">
        <div className="mb-1.5 text-sm font-bold text-stadium-text">
          Something went wrong on this screen
        </div>
        <div className="mb-4 break-words text-xs leading-relaxed text-stadium-text-secondary">
          {error.message || 'Unexpected error'}
        </div>
        <button
          onClick={() => window.location.reload()}
          className="rounded-xl bg-pitch px-4 py-2 text-sm font-bold text-stadium-base hover:bg-pitch-bright"
        >
          Reload
        </button>
      </div>
    );
  }
}
