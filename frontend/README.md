# React + Vite

## User permissions

Create User now saves an explicit `permissions` array instead of choosing a fixed account type. Select the dashboard sections and record actions the user needs. An optional advisor profile link retains record ownership and scopes Find Data to that advisor or sub-advisor. Advisor Data explicitly grants access to all advisor profiles and their clients.

Use **User Data → Edit Permissions → Save Permissions** to change an existing login. Clearing all permissions removes dashboard access. Changes are read from the user document while the account is signed in; cached permissions are refreshed before opening the dashboard. User managers cannot change their own access, manage accounts with permissions beyond their own, or grant permissions they do not hold.

Existing logins without a `permissions` field retain their legacy role access. An explicit empty array grants no access; it never falls back to the role. `role`, `consultantId` and `parentAdvisorId` continue to describe advisor ownership rather than override selected permissions. Record editing and deletion have separate permissions from viewing and exporting.

These checks govern the dashboard only. The existing application uses a custom login and public Firestore/Storage rules (`firebase.rules`); it does not provide server-enforced authorization. Firebase Authentication and restrictive database/storage rules are needed to enforce these permissions against direct requests. This frontend change does not deploy or modify those rules.

Run `npm run test:permissions` for permission-resolution and delegation checks.

## Welcome emails

Advisor and employee creation sends a welcome email through `google-apps-script.js` using the existing Resend configuration. New advisor IDs use `SMR` (for example, `SMR001`); employee IDs use `SMRE` (for example, `SMRE001`). Numbering continues from the existing counters and saved records. Existing IDs are preserved, and the email displays the same ID saved on the profile.

The HTML email includes the welcome message, ID, channel partners, registration details, and founder contacts, with a complete plain-text alternative. Portal login email is included only when supplied; passwords are not included.

To publish an email change, copy the updated `google-apps-script.js` into the existing Google Apps Script project, then update its existing web app deployment to a new version. Keep the same deployment URL saved in the dashboard's Settings and retain the `RESEND_API_KEY` and optional `RESEND_FROM` Script Properties. Deploy the Apps Script update before the frontend prefix change so the email service accepts the new IDs immediately; the updated script also accepts existing `ADV` / `EMP` IDs for their respective roles.

The Vite build does not deploy Google Apps Script. Deploy the frontend separately using the normal site deployment process.

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
