import * as React from 'react'
import { Button, type ButtonProps } from './button'

/** ปุ่มยืนยันสองขั้น (กดครั้งแรกเปลี่ยนข้อความ กดซ้ำภายใน 5 วินาทีจึงทำงาน) – ไม่ใช้ window.confirm */
export function ConfirmButton({ confirmText, onConfirm, children, ...props }: ButtonProps & { confirmText: string; onConfirm: () => void | Promise<void> }) {
  const [armed, setArmed] = React.useState(false)
  React.useEffect(() => {
    if (!armed) return
    const t = setTimeout(() => setArmed(false), 5000)
    return () => clearTimeout(t)
  }, [armed])
  return (
    <Button
      {...props}
      variant={armed ? 'destructive' : props.variant}
      onClick={async () => {
        if (!armed) return setArmed(true)
        setArmed(false)
        await onConfirm()
      }}
    >
      {armed ? confirmText : children}
    </Button>
  )
}
