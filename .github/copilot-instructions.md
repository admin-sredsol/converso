# Converso - Copilot Instructions

## Project Overview
Converso is an AI-powered learning platform that delivers real-time, voice-driven, and interactive educational experiences through conversational AI tutors. Built as a SaaS application, it enables users to create personalized AI companions for teaching various subjects.

**Tech Stack:** Next.js 15.4.4, TypeScript 5, React 19.1.0, Tailwind CSS 4, Supabase (PostgreSQL), Clerk (Auth), Vapi (Voice AI), Sentry (Error Tracking)  
**Project Size:** ~3,267 lines of TypeScript/TSX code  
**Node.js:** v20.19.6 required  
**Package Manager:** npm 10.8.2

## Build & Development Commands

### Installation & Setup
**ALWAYS run `npm install` before building or running the project.** Takes ~20 seconds.
```bash
npm install
```

### Development
```bash
npm run dev          # Start dev server with Turbopack (http://localhost:3000)
```

### Linting
```bash
npm run lint         # ESLint check, takes ~5 seconds
```
Linting uses Next.js ESLint config with TypeScript support. Configuration in `eslint.config.mjs`.

### Building
**CRITICAL BUILD NOTE:** The build process requires internet access to Google Fonts API. In sandboxed environments without internet access, the build will fail with:
```
Failed to fetch `Bricolage Grotesque` from Google Fonts.
getaddrinfo ENOTFOUND fonts.googleapis.com
```

**Workaround:** The font is loaded in two places:
1. `app/layout.tsx` - Next.js font loader: `import { Bricolage_Grotesque } from "next/font/google"`
2. `app/globals.css` - CSS import: `@import url("https://fonts.googleapis.com/css2?family=Bricolage+Grotesque...")`

If build fails, you can temporarily comment out the font imports for testing, but **DO NOT commit these changes**. The production build works fine in environments with internet access (like Vercel).

```bash
npm run build        # Production build (takes ~2-3 minutes with network access)
npm start            # Start production server
```

### Sentry Configuration
The build includes Sentry integration. You may see warnings about missing auth tokens - these are non-blocking:
- `No auth token provided. Will not create release.` - This is expected in development
- Source maps won't be uploaded without `SENTRY_AUTH_TOKEN`, but the build continues

## Environment Variables
Required environment variables (create `.env.local` file):
```
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
NEXT_PUBLIC_VAPI_WEB_TOKEN=<your-vapi-token>
```

Optional for Sentry:
```
SENTRY_AUTH_TOKEN=<your-sentry-auth-token>
```

**IMPORTANT:** The app will throw errors at runtime if Supabase or Vapi credentials are missing.

## Project Structure

### App Router (Next.js 15 App Directory)
```
app/
├── layout.tsx              # Root layout with Clerk provider, fonts, navbar/footer
├── page.tsx                # Home page (popular companions, recent sessions)
├── companions/
│   ├── page.tsx           # Companion library (list all companions)
│   ├── [id]/page.tsx      # Individual companion session page
│   └── new/page.tsx       # Create new companion form
├── my-journey/page.tsx    # User's session history
├── subscription/page.tsx  # Subscription/billing page
├── sign-in/[[...sign-in]]/page.tsx  # Clerk authentication
├── api/                   # API routes
├── components/            # React components
│   ├── ui/               # shadcn/ui components (button, form, input, etc.)
│   └── (app-specific components)
├── globals.css           # Tailwind CSS with custom theme
└── global-error.tsx      # Error boundary
```

### Core Libraries & Actions
```
lib/
├── actions/
│   └── companion.actions.ts   # Server actions for CRUD operations
├── supabase.ts                # Supabase client configuration
├── vapi.sdk.ts                # Vapi voice AI SDK initialization
└── utils.ts                   # Utility functions (cn, getSubjectColor, configureAssistant)
```

### Configuration Files
- `next.config.ts` - Next.js config with Sentry integration, image domains (Clerk, dicebear)
- `tsconfig.json` - TypeScript config with path alias `@/*` for root imports
- `eslint.config.mjs` - ESLint with Next.js and TypeScript rules
- `middleware.ts` - Clerk authentication middleware
- `components.json` - shadcn/ui configuration (New York style, CSS variables)
- `postcss.config.mjs` - PostCSS with Tailwind CSS 4
- `instrumentation.ts` - Sentry instrumentation for Node.js and Edge runtime

### Supabase Database Schema
Main table: `companions`
- Fields: `id`, `name`, `subject`, `topic`, `voice`, `style`, `duration`, `author` (user ID)
- Queries in `lib/actions/companion.actions.ts`:
  - `createCompanion()` - Create new companion
  - `getAllCompanions()` - Fetch with filters (subject, topic, pagination)
  - `getRecentSessions()` - Get user's recent sessions
  - `getCompanionById()` - Fetch single companion

### Constants & Types
- `constants/index.ts` - Subjects, colors, voices configuration
- `types/index.d.ts` - TypeScript interfaces (Companion, CreateCompanion, etc.)
- `types/vapi.d.ts` - Vapi-specific type definitions

## Key Patterns & Conventions

### Server Components & Actions
- Most pages are React Server Components (async functions)
- Use `"use server"` directive for server actions
- Clerk auth: `const { userId } = await auth()` in server components/actions
- Always await searchParams: `const filters = await searchParams`

### Styling
- Tailwind CSS 4 with custom CSS variables in `globals.css`
- Use `cn()` utility from `lib/utils.ts` for conditional classes
- shadcn/ui components in `app/components/ui/`
- Custom theme with color system for subjects (science, maths, language, etc.)

### Component Patterns
- Form validation: React Hook Form + Zod
- Voice AI: Vapi SDK for real-time voice sessions
- Authentication: Clerk middleware protects all routes except public pages
- Icons: Lucide React + custom SVG icons in `public/icons/`

## Validation & Testing

### Pre-Commit Checklist
1. Run `npm run lint` - Must pass with no errors
2. Verify TypeScript compilation: Check for type errors in editor
3. Test key flows manually if making functional changes
4. Ensure `.env.local` variables are NOT committed (already in `.gitignore`)

### No Test Suite
**IMPORTANT:** This repository does NOT have automated tests (no `.test.` or `.spec.` files). Validate changes manually by:
1. Running the dev server and testing UI flows
2. Checking console for errors
3. Verifying database operations if modifying actions

## Common Pitfalls & Gotchas

### Build Issues
1. **Google Fonts failure:** Expected in offline environments - see Build section above
2. **Sentry warnings:** Auth token warnings are non-blocking, build continues
3. **Webpack cache warnings:** Serialization warnings about big strings are informational only

### Runtime Issues
1. **Missing env variables:** App will crash if Supabase or Vapi tokens are missing
2. **Clerk auth:** Middleware redirects unauthenticated users - test with signed-in user
3. **Supabase client:** Uses service role key OR anon key (fallback) - service role preferred for admin operations

### Path Aliases
- Use `@/` prefix for imports from root: `import { cn } from "@/lib/utils"`
- Configured in `tsconfig.json` and `components.json`

## Dependencies Update Notes
- Tailwind CSS 4 is in alpha/beta - some features may change
- Next.js 15 has experimental features (`clientTraceMetadata`)
- React 19 is the latest version (as of this writing)
- Zod recently updated to v4 (check docs if schema validation fails)

## Key External Services
1. **Supabase:** PostgreSQL database + auth (backup to Clerk)
2. **Clerk:** Primary authentication, user management, Stripe integration
3. **Vapi:** Voice AI platform - handles transcription (Deepgram), TTS (11labs), LLM (OpenAI GPT-4)
4. **Sentry:** Error tracking on Node.js, Edge, and client-side

## Making Changes - Best Practices

### When Adding Features
1. Check `constants/index.ts` for subjects, colors, voices - extend these for new options
2. Use existing shadcn/ui components before adding new UI libraries
3. Follow Server Component pattern - minimize client components (`'use client'`)
4. Add type definitions to `types/index.d.ts` for new data structures

### When Fixing Bugs
1. Check Sentry dashboard for production errors (if configured)
2. Verify environment variables are set correctly
3. Check Supabase logs for database query issues
4. Test with `npm run dev` before building

### When Refactoring
1. Maintain the Server Component architecture
2. Keep server actions in `lib/actions/`
3. Preserve the `@/` import pattern
4. Don't break Clerk middleware configuration

## Trust These Instructions
These instructions have been validated by running commands and inspecting the codebase. Only perform additional searches if:
- You need to understand specific implementation details
- These instructions are incomplete for your task
- You encounter behavior that contradicts what's documented here

The build process has a known limitation with Google Fonts in offline environments - this is documented and expected. Don't spend time debugging it unless you're specifically tasked with fixing the build system.
