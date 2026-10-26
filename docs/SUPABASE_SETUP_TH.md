# คู่มือเชื่อม Supabase และเผยแพร่ระบบ

ใช้เวลาประมาณ 20–30 นาที ทำครั้งเดียว ผู้ทำควรเป็นผู้ดูแลระบบของศูนย์ฯ

## 1. สร้างโปรเจกต์ Supabase

1. เข้า https://supabase.com → Sign in (ใช้บัญชี GitHub ได้) → **New project**
2. ตั้งชื่อ เช่น `southern-inspection-readiness` เลือก Region **Southeast Asia (Singapore)**
3. ตั้งรหัสผ่านฐานข้อมูล แล้ว **เก็บไว้กับผู้ดูแลเท่านั้น** (ไม่ต้องใส่ในแอป)

## 2. สร้างตารางและข้อมูลแผน

1. เมนู **SQL Editor** → New query
2. คัดลอกทั้งไฟล์ `supabase/migrations/0001_schema.sql` วาง แล้วกด **Run**
3. ทำซ้ำกับไฟล์ `supabase/migrations/0002_seed_plan.sql`
4. ตรวจที่ **Table Editor** ต้องเห็นตาราง `rounds` 4 แถว, `plan_days` 20 แถว, `plan_allocations` 16 แถว, `plan_issues` 3 แถว

> ทั้งสองไฟล์ผ่านการทดสอบบน PostgreSQL 16 แล้ว รวมถึงทดสอบ RLS ว่าเจ้าหน้าที่หน่วยงานหนึ่งเขียนข้อมูลของอีกหน่วยงานไม่ได้, ผู้บริหารเขียนไม่ได้, และผู้ใช้เปลี่ยนบทบาทตนเองไม่ได้

## 3. ตั้งค่าการเข้าสู่ระบบ

1. **Authentication → Sign In / Providers → Email**: เปิดใช้ Email
2. ปิด **Allow new users to sign up** (ให้ผู้ดูแลเป็นคนสร้างบัญชีเท่านั้น)
3. **Authentication → URL Configuration** → Site URL ใส่ `https://<ชื่อบัญชี GitHub>.github.io/southern-inspection-readiness/`

## 4. สร้างบัญชีผู้ใช้

**Authentication → Users → Add user → Create new user** (ใส่อีเมล + รหัสผ่านชั่วคราว ติ๊ก Auto Confirm)

สร้างอย่างน้อย:

| บัญชี | บทบาท | หน่วยงาน |
|---|---|---|
| ผู้ดูแลระบบ (ศูนย์ฯ สุราษฎร์ธานี) | admin | SURAT |
| เจ้าหน้าที่ ชว.สุราษฎร์ธานี | unit_officer | SURAT |
| เจ้าหน้าที่ ชว.สงขลา | unit_officer | SONGKHLA |
| เจ้าหน้าที่ ชว.กระบี่ | unit_officer | KRABI |
| เจ้าหน้าที่ ชว.ยะลา | unit_officer | YALA |
| ผู้บริหาร | executive | – |

บัญชีใหม่จะได้บทบาท "ผู้บริหาร (ดูอย่างเดียว)" อัตโนมัติ ตั้งบทบาท **ผู้ดูแลระบบคนแรก** ด้วย SQL Editor:

```sql
update public.profiles
set role = 'admin', unit_code = 'SURAT', display_name = 'ชื่อ-สกุล ผู้ดูแลระบบ'
where email = 'อีเมลผู้ดูแล@example.com';
```

หลังจากนั้นผู้ดูแลระบบกำหนดบทบาทคนอื่นได้จากเมนู **จัดการแผน → ผู้ใช้งาน** ในแอป หรือใช้ SQL:

```sql
update public.profiles set role = 'unit_officer', unit_code = 'SONGKHLA', display_name = 'ชื่อ-สกุล'
where email = 'songkhla@example.com';
```

## 5. ใส่ค่าเชื่อมต่อในแอป

ที่ **Project Settings → API** คัดลอก

- Project URL → `VITE_SUPABASE_URL`
- **anon public** key → `VITE_SUPABASE_ANON_KEY`

> ❗ ห้ามใช้ **service_role** key เด็ดขาด key นี้ข้าม RLS ได้ทั้งหมด
> anon key ออกแบบให้อยู่ในหน้าเว็บได้ ความปลอดภัยมาจาก RLS

**ทดสอบบนเครื่อง**: คัดลอก `.env.example` เป็น `.env.local` ใส่สองค่า แล้ว `npm run dev`

**บน GitHub**: Settings → Secrets and variables → Actions → New repository secret เพิ่มทั้งสองค่า แล้วรัน workflow ใหม่ (Actions → Deploy to GitHub Pages → Run workflow)

เมื่อเชื่อมสำเร็จ แถบสีเหลือง "โหมดสาธิต" จะหายไป และหน้าเข้าสู่ระบบจะถามอีเมล/รหัสผ่าน

## 6. เผยแพร่บน GitHub Pages

1. สร้าง repository ใหม่ชื่อ `southern-inspection-readiness` (Public หรือ Private ก็ได้ — Private ต้องใช้ GitHub แบบเสียเงินจึงจะเปิด Pages ได้)
2. อัปโหลดโค้ดทั้งหมด (ยกเว้น `node_modules`, `dist`, `.env.local`)
   ```bash
   git init && git add . && git commit -m "Initial release"
   git branch -M main
   git remote add origin https://github.com/<ชื่อบัญชี>/southern-inspection-readiness.git
   git push -u origin main
   ```
3. Settings → **Pages** → Build and deployment → Source: **GitHub Actions**
4. ดูความคืบหน้าที่แท็บ **Actions** เมื่อขึ้นเครื่องหมายถูก เปิด `https://<ชื่อบัญชี>.github.io/southern-inspection-readiness/`

ถ้าเปลี่ยนชื่อ repository ไม่ต้องแก้โค้ด — workflow ตั้ง base path ตามชื่อ repository ให้อัตโนมัติ

## 7. ตรวจสอบหลังเชื่อมต่อ

- [ ] เข้าระบบด้วยบัญชีหน่วยงาน เห็นตัวเลขตามแผนของหน่วยงานตนเอง
- [ ] ส่งยืนยัน → แดชบอร์ดอีกเครื่องเปลี่ยนสีภายในไม่กี่วินาที (Realtime)
- [ ] Refresh แล้วข้อมูลยังอยู่
- [ ] บัญชีผู้บริหารเข้าเมนู "กรอกความพร้อม" ไม่ได้
- [ ] รอบ 4 แสดงคำเตือนเรื่องรถกระบะ

## สำรองข้อมูล

Supabase แผนฟรีไม่มีการสำรองอัตโนมัติแบบย้อนเวลา แนะนำให้ส่งออก Excel จากเมนู **รายงาน** หลังทุกรอบการประชุม และตามด้วย Table Editor → Export CSV ตาราง `responses` และ `meeting_decisions`

แผนฟรีอาจหยุดโปรเจกต์ชั่วคราวเมื่อไม่มีการใช้งานต่อเนื่องระยะหนึ่ง (กด Restore ในหน้า Supabase ได้) — ตรวจเงื่อนไขล่าสุดที่หน้า Pricing ของ Supabase
