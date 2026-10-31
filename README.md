# Lumina School

Lumina School is a full-stack, responsive school administration dashboard built with Next.js, React, TypeScript, Tailwind CSS, and shadcn/ui. The project features real-time authentication powered by NextAuth v5 (Auth.js), a PostgreSQL database hosted on Neon, and Prisma ORM for seamless data management.

## Features

- **Real-Time Authentication:** Secure login and registration using NextAuth v5, credential validation, and bcrypt password hashing.
- **Protected Routes:** Server-side session validation for the Admin dashboard.
- **School Workspace Creation:** Unified registration flow to create a school instance and an initial admin account simultaneously.
- **Comprehensive CRUD Operations:** Full management of Student and Teacher records, including adding, updating, and deleting profiles directly synced with the database.
- **Dynamic Profiles:** Individual, detailed dynamic pages for teachers and students (`/admin/teachers/[id]` and `/admin/students/[id]`) showcasing assigned classes, subjects, and professional details.
- **Role-Based Access:** Infrastructure ready for Admin, Teacher, Student, and Parent roles.
- **Responsive Design:** Mobile-first layouts using Tailwind CSS for all viewports.

## Tech Stack

- **Framework:** Next.js (App Router)
- **Language:** TypeScript
- **Database:** PostgreSQL (Neon)
- **ORM:** Prisma
- **Authentication:** NextAuth v5 (beta) & bcryptjs
- **UI:** React, Tailwind CSS, shadcn/ui-style components
- **Icons:** Lucide React
- **Package Manager:** pnpm

## Project Structure

```text
lumina-school/
├── app/
│   ├── actions/
│   │   └── admin.ts                    # Server Actions for CRUD operations
│   ├── api/auth/[...nextauth]/route.ts # NextAuth API endpoint
│   ├── admin/
│   │   ├── layout.tsx                  # Protected admin layout
│   │   ├── page.tsx                    # Admin dashboard view
│   │   ├── students/
│   │   │   ├── page.tsx                # Students directory
│   │   │   └── [id]/page.tsx           # Dynamic student profile page
│   │   └── teachers/
│   │       ├── page.tsx                # Teachers directory
│   │       └── [id]/page.tsx           # Dynamic teacher profile page
│   ├── register/
│   │   └── page.tsx                    # School & Admin registration route
│   ├── globals.css                     # Global styles
│   └── page.tsx                        # Main login route
│
├── components/
│   ├── dashboard/                      # Modular dashboard UI components
│   ├── auth-screen.tsx                 # Unified Auth UI connected to Server Actions
│   └── eduflow-dashboard.tsx           # Main dashboard shell
│
├── lib/
│   ├── actions/auth.ts                 # Server actions for database registration
│   └── utils.ts                        # Shared class-name utility helpers
│
├── prisma/
│   └── schema.prisma                   # Database schema, models, and relations
│
├── auth.ts                             # NextAuth configuration and Prisma Adapter
└── package.json                        # Scripts and dependency manifest