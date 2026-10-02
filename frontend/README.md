# React + Vite

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
