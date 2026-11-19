// Demo data for reviewers: one school, an admin login, classes, students with
// monthly fees, and three months of vouchers in every status (Paid, Partial,
// Pending, Overdue). Safe to re-run: existing rows are reused, never duplicated.
//
//   pnpm prisma db seed
//
// Login: DEMO_ADMIN_EMAIL / DEMO_ADMIN_PASSWORD (defaults below).

import { PrismaClient, Role } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { randomBytes } from 'node:crypto'

const prisma = new PrismaClient()

const ADMIN_EMAIL = process.env.DEMO_ADMIN_EMAIL || 'demo@luminaschool.app'
const ADMIN_PASSWORD = process.env.DEMO_ADMIN_PASSWORD || 'Demo@12345'
const SCHOOL_EMAIL = 'office@luminaschool.app'

const CLASSES = [
  { name: '5', section: 'A', fee: 3500 },
  { name: '8', section: 'A', fee: 4500 },
  { name: '10', section: 'B', fee: 6000 },
]

const STUDENTS = [
  ['Ayesha Khan', '5', 'A', '501', 'Imran Khan', '0300-1234567'],
  ['Muhammad Ali', '5', 'A', '502', 'Tariq Ali', '0301-2345678'],
  ['Fatima Noor', '5', 'A', '503', 'Noor Ahmed', '0302-3456789'],
  ['Hamza Sheikh', '8', 'A', '801', 'Kashif Sheikh', '0321-4567890'],
  ['Zainab Raza', '8', 'A', '802', 'Ali Raza', '0333-5678901'],
  ['Usman Tariq', '8', 'A', '803', 'Tariq Mehmood', '0345-6789012'],
  ['Hira Aslam', '10', 'B', '1001', 'Aslam Pervaiz', '0312-7890123'],
  ['Bilal Ahmed', '10', 'B', '1002', 'Naveed Ahmed', '0322-8901234'],
  ['Sana Javed', '10', 'B', '1003', 'Javed Iqbal', '0334-9012345'],
]

const METHODS = ['Cash', 'Bank Transfer', 'EasyPaisa', 'JazzCash']

const monthKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
const monthLabel = (d) => d.toLocaleString('en-US', { month: 'long', year: 'numeric' })

function statusFor(total, paid, dueDate) {
  if (paid >= total) return 'PAID'
  if (dueDate < new Date()) return 'OVERDUE'
  return paid > 0 ? 'PARTIAL' : 'PENDING'
}

async function main() {
  console.log('Seeding demo school...')

  const school = await prisma.school.upsert({
    where: { email: SCHOOL_EMAIL },
    update: {},
    create: {
      name: 'Lumina Demo School',
      email: SCHOOL_EMAIL,
      phone: '+92 42 111 222 333',
      address: '12 Canal View Road, Lahore',
    },
  })

  const existingAdmin = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } })
  if (existingAdmin && existingAdmin.schoolId !== school.id) {
    throw new Error(`${ADMIN_EMAIL} already belongs to another school; set DEMO_ADMIN_EMAIL.`)
  }
  await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: { password: await bcrypt.hash(ADMIN_PASSWORD, 10), role: Role.ADMIN },
    create: {
      name: 'Demo Administrator',
      email: ADMIN_EMAIL,
      password: await bcrypt.hash(ADMIN_PASSWORD, 10),
      role: Role.ADMIN,
      schoolId: school.id,
    },
  })

  const classIds = {}
  for (const c of CLASSES) {
    const row = await prisma.class.upsert({
      where: { name_section_schoolId: { name: c.name, section: c.section, schoolId: school.id } },
      update: {},
      create: { name: c.name, section: c.section, schoolId: school.id },
    })
    classIds[`${c.name}-${c.section}`] = row.id
  }

  for (const [code, name] of [['ENG', 'English'], ['MATH', 'Mathematics'], ['SCI', 'Science']]) {
    await prisma.subject.upsert({
      where: { code_schoolId: { code, schoolId: school.id } },
      update: {},
      create: { name, code, description: `${name} curriculum`, schoolId: school.id },
    })
  }

  // Students (matched by roll number inside the demo school)
  const year = new Date().getFullYear()
  const students = []
  for (const [fullName, cls, section, rollNo, parentName, parentPhone] of STUDENTS) {
    const classId = classIds[`${cls}-${section}`]
    const fee = CLASSES.find((c) => c.name === cls && c.section === section).fee
    let student = await prisma.student.findFirst({ where: { schoolId: school.id, rollNo } })
    if (!student) {
      const studentId = `DEMO-${year}-${rollNo}`
      const user = await prisma.user.create({
        data: {
          name: fullName,
          email: `${studentId.toLowerCase()}@students.lumina.local`,
          role: Role.STUDENT,
          schoolId: school.id,
        },
      })
      student = await prisma.student.create({
        data: {
          studentId,
          rollNo,
          parentName,
          parentPhone,
          monthlyFee: fee,
          classId,
          schoolId: school.id,
          userId: user.id,
        },
      })
    }
    students.push(student)
  }

  // Vouchers for the previous two months and the current month.
  // Payment pattern per student index gives a mix of every status.
  const now = new Date()
  for (let back = 2; back >= 0; back--) {
    const first = new Date(now.getFullYear(), now.getMonth() - back, 1)
    const month = monthKey(first)
    const dueDate = new Date(first.getFullYear(), first.getMonth(), back === 0 ? 28 : 10, 23, 59, 59, 999)

    for (const [i, s] of students.entries()) {
      const exists = await prisma.fee.findUnique({ where: { studentId_month: { studentId: s.id, month } } })
      if (exists) continue

      const total = s.monthlyFee
      // older months: mostly paid; current month: mixed
      const pattern = back > 0 ? [1, 1, 1, 0.5, 1, 1, 0, 1, 1] : [1, 0.5, 0, 1, 0, 0.5, 0, 1, 0]
      const paid = Math.round(total * pattern[i % pattern.length])

      const fee = await prisma.fee.create({
        data: {
          title: `Monthly Fee - ${monthLabel(first)}`,
          month,
          totalAmount: total,
          paidAmount: paid,
          dueDate,
          status: statusFor(total, paid, dueDate),
          studentId: s.id,
          schoolId: school.id,
        },
      })

      if (paid > 0) {
        const paidAt = new Date(first.getFullYear(), first.getMonth(), Math.min(5 + i, 27), 11)
        await prisma.feePayment.create({
          data: {
            feeId: fee.id,
            amount: paid,
            paymentMode: METHODS[i % METHODS.length],
            referenceNo: i % METHODS.length === 0 ? null : `TXN${randomBytes(4).toString('hex').toUpperCase()}`,
            receiptNo: `RCP-${paidAt.getTime()}-${randomBytes(3).toString('hex').toUpperCase()}`,
            paidAt: paidAt > now ? now : paidAt,
          },
        })
      }
    }
  }

  console.log(`Done. Sign in with ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
