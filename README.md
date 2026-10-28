# Lumina School

Lumina School is a full-stack, responsive school administration dashboard built with Next.js 16, React, TypeScript, Tailwind CSS, and shadcn/ui. The project features real-time authentication powered by NextAuth v5 (Auth.js), a PostgreSQL database hosted on Neon, and Prisma ORM for seamless data management.

## Features

- **Real-Time Authentication:** Secure login and registration using NextAuth v5, credential validation, and bcrypt password hashing.
- **Protected Routes:** Server-side session validation for the Admin dashboard.
- **School Workspace Creation:** Unified registration flow to create a school instance and an initial admin account simultaneously.
- **Role-Based Access:** Infrastructure ready for Admin, Teacher, Student, and Parent roles.
- **Dashboard Overview:** Comprehensive views for attendance, fees, performance, calendar, and activities.
- **Responsive Design:** Mobile-first layouts using Tailwind CSS for all viewports.

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Database:** PostgreSQL (Neon)
- **ORM:** Prisma 6
- **Authentication:** NextAuth v5 (beta) & bcryptjs
- **UI:** React 19, Tailwind CSS 4, shadcn/ui-style components
- **Icons:** Lucide React
- **Package Manager:** pnpm

## Project Structure

```text
lumina-school/
├── app/
│   ├── api/auth/[...nextauth]/route.ts # NextAuth API endpoint
│   ├── admin/
│   │   ├── layout.tsx                  # Protected admin layout (Session validation)
│   │   └── page.tsx                    # Admin dashboard view
│   ├── register/
│   │   └── page.tsx                    # School & Admin registration route
│   ├── globals.css                     # Global styles
│   └── page.tsx                        # Main login route
│
├── components/
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
RoutesRoutePurposeAccess/Login page with credential authenticationPublic/registerCreate a new school instance and admin accountPublic/adminMain administration dashboardProtected (Requires Session)Getting StartedPrerequisitesNode.js 20 or newerpnpm 12 or newerA PostgreSQL database string (e.g., from Neon.tech)1. Install dependenciesBashpnpm install
2. Environment VariablesCreate a .env file in the root directory and add your database and authentication secrets:Code snippetDATABASE_URL="postgresql://[user]:[password]@[host].neon.tech/lumina_school?sslmode=require"
AUTH_SECRET="generate_a_random_32_character_string_here"
(You can generate a secure AUTH_SECRET by running pnpm dlx auth secret in your terminal).3. Setup the DatabaseSync your Prisma schema with your PostgreSQL database and generate the Prisma Client types:Bashpnpm exec prisma generate
pnpm exec prisma db push
4. Run the development serverBashpnpm dev
Open http://localhost:3000 in your browser. You can now register a new school, log in with those credentials, and access the protected Admin dashboard.Development NotesUse the existing component patterns in components/ui when adding new interface primitives.Database schema changes should be made in prisma/schema.prisma followed by pnpm exec prisma db push.Use semantic HTML, accessible labels, keyboard-friendly controls, and meaningful ARIA attributes for interactive elements.