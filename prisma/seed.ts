import { PrismaClient, Role } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // 1. Create a default School
  const school = await prisma.school.upsert({
    where: { email: 'admin@alfiah.edu.in' },
    update: {},
    create: {
      name: 'Alfiah International School',
      email: 'admin@alfiah.edu.in',
      phone: '+91 98765 43210',
      address: '12 Knowledge Park, New Delhi',
    },
  })

  // 2. Create an Admin User
  await prisma.user.upsert({
    where: { email: 'admin@alfiah.edu.in' },
    update: {},
    create: {
      name: 'School Admin',
      email: 'admin@alfiah.edu.in',
      role: Role.ADMIN,
      schoolId: school.id,
    },
  })

  // 3. Create initial Classes
  const classesData = [
    { name: '1', section: 'A' },
    { name: '1', section: 'B' },
    { name: '10', section: 'A' },
    { name: '10', section: 'B' },
  ]

  for (const cls of classesData) {
    await prisma.class.upsert({
      where: { name_section_schoolId: { name: cls.name, section: cls.section, schoolId: school.id } },
      update: {},
      create: { name: cls.name, section: cls.section, schoolId: school.id },
    })
  }

  // 4. Create initial Subjects
  const subjectsData = [
    { name: 'English', code: 'ENG' },
    { name: 'Mathematics', code: 'MATH' },
    { name: 'Science', code: 'SCI' },
  ]

  for (const sub of subjectsData) {
    await prisma.subject.upsert({
      where: { code_schoolId: { code: sub.code, schoolId: school.id } },
      update: {},
      create: { name: sub.name, code: sub.code, description: `${sub.name} curriculum`, schoolId: school.id },
    })
  }

  console.log('Seeding completed successfully!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })