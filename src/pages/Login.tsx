import * as React from 'react'
import { FlaskConical, LogIn, ShieldCheck, Building2, Eye } from 'lucide-react'
import { useApp } from '@/lib/app-context'
import { DEMO_USERS, demoSignInAs, resetDemo } from '@/lib/repo-demo'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input, Label } from '@/components/ui/input'

export default function LoginPage() {
  const { repo, setUser } = useApp()
  const [email, setEmail] = React.useState('')
  const [pw, setPw] = React.useState('')
  const [busy, setBusy] = React.useState(false)
  const [err, setErr] = React.useState<string | null>(null)
  const [loaded, setLoaded] = React.useState(false)

  return (
    <div className="min-h-dvh bg-gradient-to-b from-primary to-[#0b2c44] px-4 py-8 sm:py-14">
      <div className="mx-auto max-w-lg">
        <div className="mb-6 text-center text-white">
          <img src="./favicon.svg" alt="" className="mx-auto mb-3 size-14" />
          <h1 className="text-xl font-bold leading-snug sm:text-2xl">
            ระบบสำรวจความพร้อมการบูรณาการตรวจสอบ<br />เครื่องชั่งตวงวัดสินค้าเกษตร ภาคใต้ ปีงบประมาณ 2570
          </h1>
          <p className="mt-2 text-sm text-white/70">ศูนย์ชั่งตวงวัดภาคใต้ (สุราษฎร์ธานี) กองชั่งตวงวัด กรมการค้าภายใน</p>
        </div>

        {repo.mode === 'supabase' ? (
          <Card>
            <CardHeader>
              <CardTitle>เข้าสู่ระบบ</CardTitle>
              <CardDescription>ใช้อีเมลและรหัสผ่านที่ผู้ดูแลระบบสร้างให้</CardDescription>
            </CardHeader>
            <CardContent>
              <form
                className="space-y-4"
                onSubmit={async (e) => {
                  e.preventDefault()
                  setBusy(true)
                  setErr(null)
                  try {
                    setUser(await repo.signIn(email.trim(), pw))
                  } catch (x) {
                    setErr((x as Error).message)
                  }
                  setBusy(false)
                }}
              >
                <div className="space-y-1.5">
                  <Label htmlFor="email">อีเมล</Label>
                  <Input id="email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pw">รหัสผ่าน</Label>
                  <Input id="pw" type="password" autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} required />
                </div>
                {err && <p className="text-sm text-notready">{err}</p>}
                <Button type="submit" size="lg" className="w-full" disabled={busy}>
                  <LogIn /> {busy ? 'กำลังเข้าสู่ระบบ…' : 'เข้าสู่ระบบ'}
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <div className="mb-1 inline-flex w-fit items-center gap-1.5 rounded-full bg-accent px-2.5 py-0.5 text-xs font-semibold text-[#3b2a00]">
                <FlaskConical className="size-3.5" /> โหมดสาธิต
              </div>
              <CardTitle>เลือกผู้ใช้ทดลอง</CardTitle>
              <CardDescription>
                ยังไม่ได้เชื่อม Supabase — ข้อมูลที่กรอกเก็บเฉพาะในเบราว์เซอร์เครื่องนี้ ไม่ถือว่าบันทึกเข้าฐานข้อมูลกลาง
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {DEMO_USERS.map((u) => {
                const Icon = u.role === 'admin' ? ShieldCheck : u.role === 'executive' ? Eye : Building2
                return (
                  <button
                    key={u.id}
                    className="flex w-full items-center gap-3 rounded-lg border border-border px-3 py-3 text-left hover:border-primary hover:bg-muted"
                    onClick={() => {
                      demoSignInAs(u)
                      setUser(u)
                    }}
                  >
                    <Icon className="size-5 shrink-0 text-primary" />
                    <span className="font-medium">{u.displayName}</span>
                  </button>
                )
              })}
              <div className="pt-3 text-xs text-muted-foreground">
                ต้องการข้อมูลตัวอย่างตามกรณีทดสอบ?{' '}
                <button className="font-semibold text-primary underline" onClick={() => { resetDemo(true); setLoaded(true) }}>
                  โหลดข้อมูลทดสอบ
                </button>
                {loaded && <span className="ml-1 font-semibold text-ready">โหลดแล้ว — เลือกผู้ใช้ด้านบนเพื่อเข้าระบบ</span>}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
