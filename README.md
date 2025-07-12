# Project Alpha Admin

A modern admin dashboard built with React, TypeScript, Vite, and Supabase authentication.

## Features

- 🔐 **Supabase Authentication** - Secure login system
- 🎨 **shadcn/ui** - Beautiful and accessible UI components
- 📱 **Responsive Design** - Works on desktop and mobile
- 🛡️ **Protected Routes** - Authentication-gated admin dashboard
- 🎯 **TypeScript** - Type-safe development
- ⚡ **Vite** - Fast development and build

## Setup

1. **Install dependencies**:
   ```bash
   bun install
   ```

2. **Set up environment variables**:
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and add your Supabase credentials:
   ```
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

3. **Run the development server**:
   ```bash
   bun dev
   ```

## Usage

1. Navigate to the application in your browser
2. Use your Supabase admin credentials to log in
3. Access the protected admin dashboard with:
   - Dashboard overview with stats
   - User management section
   - Meal Curation system
   - Settings panel
   - Logout functionality

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS, shadcn/ui
- **Authentication**: Supabase Auth
- **Forms**: React Hook Form, Zod validation
- **Icons**: Lucide React
- **Package Manager**: Bun

## Project Structure

```
src/
├── components/
│   ├── ui/           # shadcn/ui components
│   ├── LoginForm.tsx # Authentication form
│   ├── Dashboard.tsx # Main dashboard
│   └── ProtectedRoute.tsx # Route protection
├── contexts/
│   └── AuthContext.tsx # Authentication context
├── lib/
│   ├── supabase.ts   # Supabase client
│   └── utils.ts      # Utility functions
├── App.tsx           # Main application
└── main.tsx          # Application entry point
```

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
