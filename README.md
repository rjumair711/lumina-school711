# Lumina School

**Lumina School** is a full-stack, responsive, multi-tenant School Management System built with Next.js, React, TypeScript, Tailwind CSS, and shadcn/ui.

The platform enables multiple schools to create independent workspaces and manage their students, teachers, classes, subjects, homework, attendance, and academic operations through a centralized administration dashboard.

Lumina School uses NextAuth v5 (Auth.js) for authentication, **PostgreSQL hosted on Supabase** for persistent data storage, and Prisma ORM for database management.

> **Internship Task 1 — School Fee Management System (MVP):** every core requirement and both bonus features are implemented. See [School Fee Management System](#school-fee-management-system-internship-task-1) for the feature map, the [Database Schema](#database-schema-fee-management) and [Setup](#database-setup-supabase).

## School Fee Management System (Internship Task 1)

| Requirement | Where | How |
|---|---|---|
| **1. Student Management**: Full Name, Roll Number, Class/Section, Monthly Fee Amount, Guardian Contact | `/admin/students` | Add / edit modals and the student list show all five fields. `Student.monthlyFee` stores the monthly fee; guardian name, phone and email are stored on the student. |
| **2. Monthly Fee Voucher Generation** with `Pending` / `Paid` / `Overdue` status | `/admin/fees` → **Generate Vouchers** | Pick a month, a due day and a class (or all classes). One voucher is created per student from their monthly fee. A unique `(studentId, month)` index makes re-running safe: existing vouchers are skipped, never duplicated. Vouchers become `OVERDUE` automatically once the due date passes (`syncOverdueFees`). |
| **3. Fee Collection & Payment Entry** | `/admin/fees` → **Collect Fee** (or **Collect** from Fee Records) | Records the amount, **Payment Date**, **Payment Method** (Cash / Bank Transfer / EasyPaisa / JazzCash / Cheque) and an optional transaction ID. An **auto-generated Receipt Number** (`RCP-<timestamp>-<random>`) is created per payment. The voucher becomes `PAID` when fully cleared. Balance checks run inside a DB transaction with an optimistic lock, so concurrent payments cannot overpay. |
| **4. Dashboard Summary** | `/admin/fees` → **Dashboard** | **Total Expected (current month)**, **Total Collected (current month)**, **Pending Amount (current month)** and **Defaulters Count** (students with any overdue voucher). It also shows all-time collected/outstanding, a real 12-month collection chart and a class-wise collected vs pending chart. |
| **5. Search & Filter** | `/admin/fees` → **Fee Records** | Filter vouchers by **Class/Section**, **Payment Status** (Paid / Unpaid, or Pending / Partial / Overdue) and **Month**, plus free-text search on name, student ID, roll no or voucher title. Live totals for the filtered set are shown. |
| ⭐ **Bonus: Printable Challan / Receipt** | `/print/fee/[id]` | One click from Fee Records, the student ledger or the payment dialog opens a clean A4 print view and starts the print dialog (or *Save as PDF*). Unpaid vouchers print as a **3-part challan** (Bank / School / Student copy); paid vouchers print as a **receipt** with the full payment history. `?receipt=RCP-…` prints a single payment receipt. |
| ⭐ **Bonus: Partial Payment Support** | Collect Fee | Any amount up to the balance can be paid. The voucher moves to `PARTIAL`, the **remaining balance** is shown live while typing, on the receipt and in every list, and each instalment gets its own receipt number. |

### Fee Workflow

1. Set each student's **Monthly Fee** under **Students**.
2. **Fees → Generate Vouchers**: choose the month (e.g. November 2026), the due day and the class, then generate.
3. **Fees → Fee Records**: filter, for example *Class 10-A + Unpaid*, then click **Collect** or **Challan**.
4. Enter the amount (full or partial), method and date, then save. The receipt opens with a **Print Receipt** button.
5. **Fees → Dashboard** shows the month's expected, collected and pending totals and the defaulters count.

One-off charges such as admission or exam fees can still be applied to a whole class from **Generate Vouchers → One-off Fee**.

## Features

### 1. Authentication & School Workspaces
- Secure login and registration using NextAuth v5.
- Credential authentication with bcrypt password hashing.
- JWT-based session management.
- Protected administrator routes.
- School workspace creation with an initial administrator account.
- Multi-school architecture using school-specific database relationships.
- Role infrastructure for Admin, Teacher, Student, and Parent.

### 2. Admin Dashboard
- Responsive administration interface.
- Dashboard navigation and modular components.
- School management tools.
- Integration with PostgreSQL through Prisma.
- Toast notifications using Sonner.
- Responsive layouts for desktop, tablet, and mobile.

### 3. Student Management
- Add, view, edit, and delete student records.
- Assign students to existing classes and sections.
- Manage roll numbers and student information.
- Store parent contact information.
- Dynamic student profile pages.
- Database-backed CRUD operations.

**Route:** `/admin/students`

### 4. Teacher Management
- Add, view, edit, and delete teachers.
- Manage contact information, qualifications, and experience.
- Associate teachers with subjects and classes.
- Dynamic teacher profile pages.
- Manage teacher-related academic records.

**Route:** `/admin/teachers`

### 5. Class & Section Management
- Create and manage classes.
- Support multiple sections within the same grade.
- Configure class capacity.
- Assign class teachers.
- View student rosters.
- Dynamic class detail pages.
- Prevent deleting classes containing enrolled students.

**Route:** `/admin/classes`

### 6. Attendance Management
- Student attendance recording.
- Staff attendance recording.
- Date-based attendance entry.
- Date-range filtering.
- Present, Absent, Late, and Excused statuses.
- Attendance filtering by class, section, and subject.
- Database-backed attendance records.

**Route:** `/admin/attendance`

### 7. Homework Management — New

A database-backed homework management module supporting assignment creation and administration.

**Features:**
- Create homework assignments.
- Assign homework to classes and subjects.
- Associate assignments with teachers.
- Set assignment titles, descriptions, and due dates.
- Manage assignment statuses.
- Search and filter assignments.
- Delete assignments with confirmation.
- Display homework records from PostgreSQL.
- Periodically refresh homework data to reflect changes.
- Scope homework operations to the authenticated school.

**Assignment statuses:**
- Draft
- Active
- Overdue
- Completed

The module uses the existing Prisma `Homework` model.

Individual student homework submissions and submission-progress statistics require additional database models and are not included in the current implementation.

**Route:** `/admin/homework`

### 8. Subject & Class Assignment Management — New

A dedicated academic assignment module allowing administrators to manage subjects and specify which teacher teaches each subject in each class section.

**Features:**

**Subject Management**
- Create new school subjects.
- Edit subject names, codes, and descriptions.
- Search the subject catalog.
- Delete unused subjects with dependency checks.
- View subject assignment counts.

**Class–Subject Assignment**
- Select an existing class and section.
- Assign multiple subjects to a class section.
- Assign a primary teacher to each subject.
- Allow subjects to be assigned before a teacher is selected.
- Prevent duplicate subject assignments within a class.
- Remove subject assignments.

**Teacher Reassignment**
- Change the teacher responsible for a subject.
- Assign different teachers to the same subject in different sections.
- Allow a teacher to teach multiple subjects or class sections.

**Assignment Summary**
- View all class-section subject assignments.
- Display the teacher responsible for each subject.
- Review assigned and unassigned teachers.
- View subject counts per class.
- Display teacher-assignment coverage.

**Example:**

| Class | Section | Subject | Teacher |
|---|---|---|---|
| 10 | A | Mathematics | Ali Raza |
| 10 | A | Physics | Ahmed Hassan |
| 10 | A | English | Sarah Ahmed |
| 10 | B | Mathematics | Ahmed Hassan |
| 9 | A | Science | Fatima Khan |

These are illustrative records.

**Route:** `/admin/subject-class`

### Database Schema (Fee Management)

```
School 1───* Class 1───* Student 1───* Fee 1───* FeePayment
```

**`Student`** (fee-relevant columns)

| Column | Type | Notes |
|---|---|---|
| `id` | `text` PK | cuid |
| `studentId` | `text` unique | Auto code, e.g. `STU-2026-0007` |
| `rollNo` | `text?` | Roll number |
| `classId` | `text` FK → `Class` | Class + section (`Class.name`, `Class.section`) |
| `monthlyFee` | `double precision` default `0` | Used by monthly voucher generation |
| `parentName` / `parentPhone` / `parentEmail` | `text?` | Guardian contact |
| `userId` | `text?` FK → `User` | Holds the student's full name (`User.name`) |
| `schoolId` | `text` FK → `School` | Tenant isolation |

**`Fee`** (a voucher)

| Column | Type | Notes |
|---|---|---|
| `id` | `text` PK | |
| `title` | `text` | e.g. `Monthly Fee - November 2026` |
| `month` | `text?` | Billing month `YYYY-MM`; `NULL` for one-off fees |
| `totalAmount` | `double precision` | Voucher amount |
| `paidAmount` | `double precision` default `0` | Sum of payments |
| `dueDate` | `timestamp` | |
| `status` | `FeeStatus` | `PENDING` · `PARTIAL` · `PAID` · `OVERDUE` |
| `studentId` | `text` FK → `Student` | cascade delete |
| `schoolId` | `text` FK → `School` | |

Constraints: **unique** `(studentId, month)` allows one monthly voucher per student per month; **index** `(schoolId, month)`.

**`FeePayment`** (one row per instalment)

| Column | Type | Notes |
|---|---|---|
| `id` | `text` PK | |
| `receiptNo` | `text` unique | Auto-generated `RCP-<timestamp>-<hex>` |
| `amount` | `double precision` | Amount of this instalment |
| `paymentMode` | `text` | Cash / Bank Transfer / EasyPaisa / JazzCash / Cheque |
| `referenceNo` | `text?` | Transaction / slip ID |
| `paidAt` | `timestamp` | Payment date |
| `feeId` | `text` FK → `Fee` | cascade delete |

**Status rules** (`lib/fees.ts → feeStatusFor`): `paidAmount ≥ totalAmount` → `PAID`; otherwise past due → `OVERDUE`; otherwise `paidAmount > 0` → `PARTIAL`; else `PENDING`. "Unpaid" in filters means any status other than `PAID`.

The full schema is in [`prisma/schema.prisma`](prisma/schema.prisma) and the SQL history is in [`prisma/migrations/`](prisma/migrations/). The fee voucher changes are in `20261114120000_monthly_fee_vouchers`.

### 9. Database Relationships

The system uses Prisma ORM with PostgreSQL.

Important entities include:

- School
- User
- Student
- Teacher
- Class
- Subject
- Homework
- Attendance
- TeacherAttendance
- Fee
- FeePayment
- TimetableSlot
- Test
- Exam
- StudyMaterial
- Notice

**New Model: `ClassSubjectAssignment`**

This model represents the relationship between:

- School
- Class and Section
- Subject
- Primary Teacher

Each class-section and subject combination has one assignment record with an optional primary teacher.

The model includes:
- Unique class-subject constraints.
- School and teacher indexes.
- Created and updated timestamps.
- Foreign-key relationships.

Existing implicit many-to-many relationships are retained for compatibility with older modules. Full synchronization of those relationships with the new assignment model is an ongoing integration consideration.

### 10. Multi-Tenant Architecture

Lumina School is designed to support multiple independent schools through a shared application and database.

Each school has its own associated:
- Administrator accounts
- Students
- Teachers
- Classes
- Subjects
- Homework
- Academic assignments
- Attendance records

The newer Homework and Subject–Class server actions are designed to enforce school-based authorization.

**Security note:** Existing administrative actions must also be audited and updated to consistently use the authenticated user's `schoolId`. Multi-tenant isolation should not be considered fully verified until all read and write operations have been reviewed.

## Tech Stack

| Technology | Purpose |
|---|---|
| Next.js 16 | Full-stack application framework |
| React 19 | Interactive user interfaces |
| TypeScript | Type-safe development |
| Tailwind CSS 4 | Responsive styling |
| shadcn/ui-style components | UI component system |
| NextAuth v5 | Authentication and sessions |
| PostgreSQL | Relational database |
| Supabase | Hosted PostgreSQL |
| Prisma 6.19.3 | ORM and migrations |
| bcryptjs | Password hashing |
| Sonner | Toast notifications |
| Lucide React | Interface icons |
| pnpm | Package management |

## Updated Project Structure

```text
lumina-school/
├── app/
│   ├── actions/
│   │   ├── admin.ts
│   │   ├── attendance.ts
│   │   ├── homework.ts                   # NEW
│   │   └── subject-class.ts              # NEW
│   │
│   ├── api/
│   │   └── auth/
│   │       └── [...nextauth]/
│   │           └── route.ts
│   │
│   ├── admin/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   │
│   │   ├── attendance/
│   │   │   └── page.tsx
│   │   │
│   │   ├── classes/
│   │   │   ├── page.tsx
│   │   │   └── [id]/
│   │   │       └── page.tsx
│   │   │
│   │   ├── students/
│   │   │   ├── page.tsx
│   │   │   └── [id]/
│   │   │       └── page.tsx
│   │   │
│   │   ├── teachers/
│   │   │   ├── page.tsx
│   │   │   └── [id]/
│   │   │       └── page.tsx
│   │   │
│   │   ├── homework/                     # NEW
│   │   │   └── page.tsx
│   │   │
│   │   └── subject-class/                # NEW
│   │       └── page.tsx
│   │
│   ├── register/
│   │   └── page.tsx
│   │
│   ├── globals.css
│   └── page.tsx
│
├── components/
│   ├── dashboard/
│   │   ├── attendance-page.tsx
│   │   ├── homework-page.tsx             # NEW
│   │   └── subject-class-page.tsx        # NEW
│   │
│   ├── auth-screen.tsx
│   └── eduflow-dashboard.tsx
│
├── lib/
│   ├── actions/
│   │   └── auth.ts
│   ├── prisma.ts
│   └── utils.ts
│
├── prisma/
│   ├── migrations/
│   │   ├── 0_init/
│   │   │   └── migration.sql
│   │   └── 20261104102802_class_subject_assignments/
│   │       └── migration.sql
│   └── schema.prisma
│
├── auth.ts
├── prisma.config.ts
├── package.json
├── pnpm-lock.yaml
└── README.md
```

The tree reflects the planned and supplied implementation structure, including the migration files reported in the development terminal.

## Database Setup (Supabase)

The application uses **PostgreSQL on Supabase**, accessed through Prisma.

1. Create a project at [supabase.com](https://supabase.com/dashboard) and note the database password.
2. In the project, open **Connect → ORMs → Prisma** and copy the two connection strings.
3. Copy `.env.example` to `.env` and fill in the values:

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | Supabase **transaction pooler** URL (port `6543`, with `?pgbouncer=true&connection_limit=5&pool_timeout=20`), used at runtime |
| `DIRECT_URL` | ✅ | Supabase **session pooler / direct** URL (port `5432`), used by `prisma migrate` |
| `AUTH_SECRET` | ✅ | Auth.js secret (`npx auth secret`) |
| `AI_PROVIDER`, `AI_MODEL`, `AI_API_KEY`, `AI_BASE_URL` | optional | Default AI Assistant provider (can also be set in Settings) |
| `AI_ENCRYPTION_KEY` | optional | Encrypts stored AI keys; falls back to `AUTH_SECRET` |

4. Create the tables:

```bash
pnpm install
pnpm prisma migrate deploy   # applies every migration in prisma/migrations
pnpm prisma db seed          # optional demo school, admin and classes
```

Never commit `.env`, database credentials or authentication secrets to version control. Only `.env.example` is tracked.

### Prisma Commands

Validate the schema:

```bash
pnpm prisma validate
```

Generate Prisma Client:

```bash
pnpm prisma generate
```

Check migration status:

```bash
pnpm prisma migrate status
```

Apply reviewed pending migrations in a development environment:

```bash
pnpm prisma migrate dev
```

Apply reviewed migrations in a deployed environment:

```bash
pnpm prisma migrate deploy
```

**Important:** Do not run `prisma migrate reset` against a database containing school records.

## Installation & Development

Install dependencies:

```bash
pnpm install
```

Generate Prisma Client:

```bash
pnpm prisma generate
```

Start the development server:

```bash
pnpm dev
```

Open:

`http://localhost:3000`

### Code Verification

Run the TypeScript check:

```bash
pnpm exec tsc --noEmit
```

Run the production build:

```bash
pnpm build
```

## Application Routes

| Route | Description |
|---|---|
| `/` | Login |
| `/register` | School registration |
| `/admin` | Admin dashboard |
| `/admin/students` | Student management |
| `/admin/teachers` | Teacher management |
| `/admin/classes` | Class management |
| `/admin/attendance` | Attendance management |
| `/admin/homework` | Homework management |
| `/admin/subject-class` | Subject and class assignments |
| `/admin/students/[id]` | Student profile |
| `/admin/teachers/[id]` | Teacher profile |
| `/admin/classes/[id]` | Class details |
| `/admin/fees` | Fee dashboard, fee records, collection, voucher generation |
| `/print/fee/[id]` | Printable fee challan / receipt (`?receipt=RCP-…` for one payment) |

## Current Development Status

**Previously implemented modules:**
- Authentication and registration
- Admin dashboard
- Student management
- Teacher management
- Class management
- Student and staff attendance

**Newly developed modules:**
- Homework Management
- Subject Management
- Class–Subject Assignment
- Teacher Reassignment
- Academic Assignment Summary

**Verification status:**

The shared development logs confirm:
- Prisma schema validation passed.
- Prisma Client generation passed.
- TypeScript compilation check passed.
- Prisma baselining was performed and two migrations were recognized.
- The class-subject assignment migration was still pending in the most recent migration status.

Runtime and end-to-end verification of the new features remain necessary.

## Future Enhancements

### Academic Management
- Academic-year and term management.
- Teacher assignment history.
- Subject-specific student attendance.
- Timetable scheduling and conflict detection.
- Teacher workload management.

### Homework & Learning
- Student homework submission.
- File attachments.
- Submission review and grading.
- Homework completion reports.
- Teacher and student homework dashboards.

### Examination Management
- Examination scheduling.
- Results and grading.
- Student report cards.
- Academic performance analytics.

### Fees & Finance
- Fee concessions / scholarships and late-fee fines.
- SMS / WhatsApp reminders to guardians of defaulters.
- Online payment gateway integration (EasyPaisa / JazzCash APIs).

### SaaS Administration
- Super Admin dashboard.
- School subscription plans.
- School onboarding.
- Tenant-level settings and permissions.
- School analytics and monitoring.

## Development Principles

1. Maintain school-specific data isolation.
2. Use authenticated and authorized server-side actions.
3. Preserve database integrity and existing records.
4. Reuse existing Prisma models where possible.
5. Maintain consistent and responsive UI components.
6. Avoid hardcoded school data in production features.
7. Protect historical academic records when assignments change.
8. Validate database migrations before deployment.
9. Ensure new modules integrate with existing school workflows.

---

**Lumina School — Multi-Tenant School Management Platform**

Built with Next.js, TypeScript, PostgreSQL (Supabase), Prisma, and Auth.js.