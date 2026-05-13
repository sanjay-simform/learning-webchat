# 🎨 WebChat Frontend

A premium, modern chat application built with React 19, TypeScript, and the **Obsidian Aurora** design system. Features elegant authentication, smooth animations, and a meticulously crafted dark-mode interface inspired by Linear, Arc Browser, and Raycast.

## ✨ Features

- 🔐 **Complete Authentication System** - Signup, login, logout with JWT tokens
- 🎨 **Obsidian Aurora Design System** - Premium dark-mode interface
- 🎬 **Smooth Animations** - Motion library for performant transitions
- 📱 **Responsive Design** - Mobile-first, works on all screen sizes
- 🛡️ **Type-Safe** - Full TypeScript with Zod validation
- 🧩 **Reusable Components** - 8 production-ready UI components
- 🚀 **Fast & Performant** - Optimized Vite build, React 19
- 📚 **Comprehensive Docs** - 5 detailed guides included

## 🚀 Quick Start

### Installation

```bash
cd webchat-frontend
npm install
cp .env.example .env
npm run dev
```

Visit http://localhost:5173 to see the app.

### Environment Setup

Edit `.env`:

```env
VITE_API_URL=http://localhost:3000/api
```

## 📖 Documentation

| Guide                                    | Purpose                   |
| ---------------------------------------- | ------------------------- |
| [QUICK_START.md](./QUICK_START.md)       | 5-min quick reference     |
| [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md)   | Complete design reference |
| [ARCHITECTURE.md](./ARCHITECTURE.md)     | System architecture       |
| [FRONTEND_SETUP.md](./FRONTEND_SETUP.md) | Feature documentation     |
| [SETUP_SUMMARY.md](./SETUP_SUMMARY.md)   | What's been set up        |

## 🛠️ Technology Stack

| Tech                | Purpose         |
| ------------------- | --------------- |
| **React 19**        | UI framework    |
| **TypeScript**      | Type safety     |
| **React Router v6** | Navigation      |
| **React Hook Form** | Form management |
| **Zod**             | Validation      |
| **Motion**          | Animations      |
| **Tailwind CSS v4** | Styling         |
| **Axios**           | HTTP client     |

## 🎨 What's Inside

### Pages

- **Signup** (`/signup`) - Create new account with validation
- **Signin** (`/signin`) - Login with email and password
- **Home** (`/`) - Protected dashboard showing user info

### Components

8 production-ready components:

- Button, FormInput, Card, Badge, Avatar
- LoadingSpinner, MessageBubble, ChatInput

### Design System

Premium Obsidian Aurora with:

- 5 background colors
- 3 text colors
- 4 accent colors
- CSS variables
- Tailwind utilities

## 📁 Project Structure

```
src/
├── api-client/      # API & axios setup
├── components/      # Reusable components
├── context/        # React Context
├── lib/            # Utilities
├── pages/          # Route pages
├── types/          # TypeScript types
├── App.tsx         # Router
├── main.tsx        # Entry
└── index.css       # Global styles
```

## 🔐 Authentication

- JWT token stored in localStorage
- Automatic token injection on all requests
- 401 error handling with auto-logout
- Protected routes with auth guard
- Form validation with Zod

## 🎬 Animations

Using Motion library for smooth animations:

```tsx
<motion.div
  initial={{ opacity: 0, y: 8 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.24 }}
>
  Content
</motion.div>
```

## 🚀 Build & Deploy

### Development

```bash
npm run dev
```

### Production Build

```bash
npm run build
```

### Preview

```bash
npm run preview
```

## 📚 Resources

- [React Docs](https://react.dev/)
- [React Router](https://reactrouter.com/)
- [React Hook Form](https://react-hook-form.com/)
- [Zod](https://zod.dev/)
- [Motion](https://www.motion.dev/)
- [Tailwind](https://tailwindcss.com/)

## 🎯 Next Steps

1. ✅ Install: `npm install`
2. ✅ Configure: Create `.env`
3. ✅ Start: `npm run dev`
4. 🔄 Connect backend
5. 🎨 Build chat features

---

**Ready to build?** Start with [QUICK_START.md](./QUICK_START.md)
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

```
