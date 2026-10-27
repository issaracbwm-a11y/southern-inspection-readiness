import * as React from 'react'

/** กันหน้าขาวทั้งหน้าเมื่อเกิดข้อผิดพลาด – แสดงข้อความและปุ่มโหลดใหม่ */
export class ErrorBoundary extends React.Component<{ children: React.ReactNode; resetKey?: string }, { error: Error | null }> {
  state = { error: null as Error | null }
  static getDerivedStateFromError(error: Error) { return { error } }
  componentDidUpdate(prev: { resetKey?: string }) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null })
  }
  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="mx-auto my-10 max-w-lg rounded-xl border border-notready/30 bg-notready-soft p-5 text-sm">
        <div className="mb-1 text-base font-semibold text-notready">หน้านี้แสดงผลไม่ได้</div>
        <p className="mb-3 text-muted-foreground">{this.state.error.message}</p>
        <button className="rounded-lg bg-primary px-4 py-2 font-medium text-white" onClick={() => location.reload()}>โหลดหน้าใหม่</button>
      </div>
    )
  }
}
