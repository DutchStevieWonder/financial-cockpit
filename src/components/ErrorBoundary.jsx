import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, info: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    // Structured log — captured by Netlify / browser DevTools
    const logEntry = {
      level: 'error',
      source: 'ErrorBoundary',
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      error: {
        name: error?.name,
        message: error?.message,
        stack: error?.stack,
      },
      componentStack: info?.componentStack,
    }
    // eslint-disable-next-line no-console
    console.error('[FC]', JSON.stringify(logEntry))
    this.setState({ info })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
          background: '#f8fafc',
          padding: '2rem',
        }}>
          <div style={{
            background: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '2rem',
            maxWidth: '600px',
            width: '100%',
          }}>
            <h2 style={{ color: '#1a5676', marginBottom: '0.5rem' }}>
              Er is iets misgegaan
            </h2>
            <p style={{ color: '#64748b', marginBottom: '1rem' }}>
              De applicatie kon niet laden. Probeer de pagina te verversen.
            </p>
            <pre style={{
              background: '#f1f5f9',
              borderRadius: '8px',
              padding: '1rem',
              fontSize: '12px',
              color: '#475569',
              overflowX: 'auto',
              whiteSpace: 'pre-wrap',
            }}>
              {this.state.error?.toString()}
              {'\n'}
              {this.state.info?.componentStack}
            </pre>
            <button
              onClick={() => window.location.reload()}
              style={{
                marginTop: '1rem',
                background: '#1a5676',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                padding: '0.5rem 1.5rem',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              Pagina verversen
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
