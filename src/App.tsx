import { lazy, Suspense } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppProvider, useApp } from '@/lib/app-context'
import { Layout } from '@/components/Layout'
import LoginPage from '@/pages/Login'
const DashboardPage = lazy(() => import('@/pages/Dashboard'))
const SurveyPage = lazy(() => import('@/pages/Survey'))
const DailyPage = lazy(() => import('@/pages/Daily'))
const MeetingPage = lazy(() => import('@/pages/Meeting'))
const ReportsPage = lazy(() => import('@/pages/Reports'))
const AdminPage = lazy(() => import('@/pages/Admin'))
import { Loader2 } from 'lucide-react'

function Gate() {
  const { user, loading } = useApp()
  if (loading)
    return (
      <div className="grid min-h-dvh place-items-center text-muted-foreground">
        <Loader2 className="size-6 animate-spin" />
      </div>
    )
  if (!user) return <LoginPage />
  return (
    <Suspense fallback={<div className="grid min-h-dvh place-items-center text-muted-foreground"><Loader2 className="size-6 animate-spin" /></div>}>
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<DashboardPage />} />
        <Route path="survey" element={user.role === 'executive' ? <Navigate to="/" /> : <SurveyPage />} />
        <Route path="daily" element={<DailyPage />} />
        <Route path="meeting" element={<MeetingPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="admin" element={user.role === 'admin' ? <AdminPage /> : <Navigate to="/" />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Route>
    </Routes>
    </Suspense>
  )
}

export default function App() {
  return (
    // HashRouter: ใช้กับ GitHub Pages ได้โดยไม่ต้องตั้งค่า rewrite (refresh หน้าย่อยไม่ 404)
    <HashRouter>
      <AppProvider>
        <Gate />
      </AppProvider>
    </HashRouter>
  )
}
