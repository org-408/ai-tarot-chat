# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
## for vite + react install

```
# in root folder
npm create vite@latest mobile
# select react, typescript
```

## for tailwindcss install

```
npm install tailwindcss @tailwindcss/vite
```

edit vite.config.ts
```
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite' # <- add

export default defineConfig({
  plugins: [        # <- add(if necessary)
    tailwindcss(),  # <- add
  ],                # <- add(if necessary)
})
```

edit index.css
```
@import "tailwindcss"; # <- add
```

## for capacitor install (after vite install)

```
npm i @capacitor/core
npm i -D @capacitor/cli

npx cap init

npm i @capacitor/android @capacitor/ios

npx cap add android
npx cap add ios

npm run build

npx cap sync
```

## for run iOS/Android with Xcode/Android studio

```
npx cap open ios        # signing... > team select is necessary!
npx cap open android

# please build and run for one time because of setting
```

## for run iOS/Android (after build and run)

```
npx cap run ios
npx cap run android
```

## for device info module install

```
npm install @capacitor/app @capacitor/device
```

## for OAuth authenticate module install

```
npm i @capacitor-community/generic-oauth2
npx cap sync
```

## for admob install

```
npm install @capacitor-community/admob
```
