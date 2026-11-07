# React + Vite

## Supabase configuration

Run the SQL files in `supabase/migrations` in timestamp order in the Supabase
SQL Editor to enable public post-author names and profile photos. This also
adds the name and avatar columns if a `profiles` table already exists.
Run `20261107113200_claim_questions.sql` to enable required reporter questions
and securely save claim answers. Run `20261107114200_claim_review_status.sql`
to enable owners to accept or reject submitted claims. Run
`20261107115300_claim_permissions.sql` if claim requests return a 403 error.
Run `20261107125400_accepted_claim_chats.sql` to automatically open a private
chat when a claim is accepted. Run `20261107131000_production_hardening.sql`
to enforce the 50 MB media bucket limit, prevent accepting multiple claims for
one post, and enable realtime claim-decision and chat updates. Claimers see an
accepted status and chat link without reloading.

Create `src/.env` using `src/.env.example` and fill in the Supabase project URL
and anon key. Restart the Vite development server after changing environment
variables.

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
