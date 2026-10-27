# website

Built with [Next.js](https://nextjs.org) (App Router), React and TypeScript.

## Requirements

- Node.js
- pnpm 12 (the exact version is pinned in `package.json` under `packageManager`)

## Getting started

```bash
pnpm install
pnpm dev
```

Then open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command      | What it does                         |
| ------------ | ------------------------------------ |
| `pnpm dev`   | Start the development server         |
| `pnpm build` | Create a production build            |
| `pnpm start` | Serve the production build           |
| `pnpm lint`  | Run ESLint                           |

## Project structure

```
app/
  layout.tsx   Root layout shared by every page
  page.tsx     Home page (/)
```

New routes go in `app/` as folders containing a `page.tsx`, for example `app/about/page.tsx` for `/about`.
