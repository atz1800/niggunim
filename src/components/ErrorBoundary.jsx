import { Component } from 'react'

export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('App crashed:', error, info?.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="empty-state error-screen" role="alert">
        <div className="emoji">😕</div>
        <h2>משהו השתבש</h2>
        <p>הניגונים שלך שמורים. נסה לטעון מחדש את האפליקציה.</p>
        <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>
          🔄 טען מחדש
        </button>
      </div>
    )
  }
}
