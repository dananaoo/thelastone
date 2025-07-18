
<img width="2940" height="1912" alt="image" src="https://github.com/user-attachments/assets/3928af1b-0258-4019-83a7-48e65998190f" />
<img width="1470" height="956" alt="Screenshot 2025-07-18 at 11 39 54" src="https://github.com/user-attachments/assets/6566291b-efb0-4a79-aff5-b97c8511ed2f" />
<img width="2940<img width="1470" height="956" alt="Screenshot 2025-07-18 at 11 40 23" src="https://github.com/user-attachments/assets/12df2e22-15e7-4215-8947-ebe8519d1510" />
" height="1912" alt="image" src="https://github.com/user-attachments/assets/67cffa36-96c8-4569-b906-82c08de69df1" />
<img width="1470" heig<img width="1470" height="956" alt="Screenshot 2025-07-18 at 11 42 40" src="https://github.com/user-attachments/assets/0d8c329a-5847-41a4-9a44-ad08cb8dca2c" />
ht="956" alt="Screenshot 2025-07-18 at 11 40 39" src="https://github.com/user-attachments/assets/8e1f0e07-ba54-4290-82a0-78ec0937b9ac" />
<img width="1470" height="956" alt="Screenshot 2025-07-18 at 11 43 07" src="https://github.com/user-attachments/assets/6dc9b34e-0c8b-4557-a8e7-e598dc9ef4e1" />


# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      ...tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      ...tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      ...tseslint.configs.stylisticTypeChecked,

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

export default tseslint.config([
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
