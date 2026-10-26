# Lumina School

Lumina School is a responsive school administration dashboard built with Next.js, React, TypeScript, Tailwind CSS, shadcn/ui primitives, Lucide icons, and Recharts. The project includes a split-screen authentication experience, role-based demo login selection, and an EduFlow management dashboard for school operations.

## Features

- Split-screen login and school registration pages
- Demo role selection with autofilled credentials for Admin, Teacher, Student, and Parent
- Dashboard overview with attendance, fee, performance, calendar, and activity views
- Students, teachers, fees, homework, timetable, notice board, and communication modules
- Roles and permissions management interface
- Subject and class assignment workflow
- Tests, exams, and results tabs
- Reports with overview and attendance visualizations
- AI Assistant interface with school insights and report-card tools
- Study materials resource library with filters and download actions
- School settings and preferences page
- Responsive layouts for desktop and mobile viewports

## Tech Stack

- **Framework:** Next.js 16 App Router
- **Language:** TypeScript
- **UI:** React 19, Tailwind CSS 4, shadcn/ui-style components
- **Icons:** Lucide React
- **Charts:** Recharts
- **Utilities:** clsx, tailwind-merge, class-variance-authority
- **Package manager:** pnpm
- **Deployment workflow:** Vercel and v0

## Project Structure

```text
lumina-school/
├── app/
│   ├── globals.css              # Global styles and Tailwind CSS entrypoint
│   ├── layout.tsx               # Root layout, metadata, and shared document shell
│   ├── page.tsx                 # Main route; renders the authentication screen
│   └── register/
│       └── page.tsx             # School registration route
│
├── components/
│   ├── auth-screen.tsx          # Login UI, role selection, demo credential autofill,
│   │                             # password visibility, sign-in state, and registration link
│   ├── eduflow-dashboard.tsx    # Main dashboard shell and application modules
│   └── ui/
│       ├── badge.tsx            # Badge component
│       ├── button.tsx            # Button component
│       ├── card.tsx              # Card, header, title, content, and footer components
│       └── chart.tsx             # Chart container, tooltip, and legend helpers
│
├── lib/
│   └── utils.ts                 # Shared class-name utility helpers
│
├── public/
│   ├── apple-icon.png           # Apple touch icon
│   ├── icon-dark-32x32.png      # Dark favicon
│   ├── icon-light-32x32.png     # Light favicon
│   ├── icon.svg                 # Primary application icon
│   └── placeholder*             # Starter placeholder assets
│
├── components.json              # shadcn/ui component configuration
├── next.config.mjs              # Next.js configuration
├── package.json                 # Scripts and dependency manifest
├── pnpm-lock.yaml               # Locked dependency versions
├── pnpm-workspace.yaml          # pnpm workspace configuration
├── postcss.config.mjs           # PostCSS and Tailwind integration
├── tsconfig.json                # TypeScript compiler configuration
├── .gitignore                   # Git-ignored files and folders
└── README.md                    # Project documentation
```

## Routes

| Route | Purpose |
| --- | --- |
| `/` | Login page with role selection and demo credentials |
| `/register` | School registration form |

The dashboard modules are rendered within the main application shell after authentication UI navigation. They include Dashboard, Students, Teachers, Fees, Homework, Timetable, Notice Board, Communication, Reports, Roles & Permissions, Subject & Class, Tests & Exams, Study Materials, Settings, and AI Assistant.

## Demo Login Credentials

Clicking a role card on the login page fills the email and password fields automatically.

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@school.com` | `adminpassword123` |
| Teacher | `teacher@school.com` | `teacherpassword123` |
| Student | `student@school.com` | `studentpassword123` |
| Parent | `parent@school.com` | `parentpassword123` |

These credentials are for client-side demo testing only. They are not connected to a production authentication service.

## Getting Started

### Prerequisites

- Node.js 20 or newer
- pnpm 12 or newer

### Install dependencies

```bash
pnpm install
```

### Run the development server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Create a production build

```bash
pnpm build
```

### Start the production server

```bash
pnpm start
```

### Type-check the project

```bash
pnpm exec tsc --noEmit
```

## Development Notes

- Use the existing component patterns in `components/ui` when adding new interface primitives.
- Keep page-level feature work in focused components rather than expanding route files unnecessarily.
- Use semantic HTML, accessible labels, keyboard-friendly controls, and meaningful ARIA attributes for interactive elements.
- Keep responsive behavior mobile-first and preserve the existing orange, slate, white, and light-gray visual system.
- Update this README when adding routes, major modules, dependencies, or project-level configuration.

## Vercel and v0

This repository is linked to a v0 project and is intended to deploy through Vercel. Continue development through the linked v0 project or by working directly in the repository. Merges to the configured deployment branch can trigger automatic deployments according to the project settings.

- [Continue working on the project in v0](https://v0.app/chat/projects/prj_DBgyWbJAtP8oHig88frYQduRm0SR)
- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [v0 Documentation](https://v0.app/docs)
