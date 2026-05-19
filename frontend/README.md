# ЦифроГрад Frontend

A modern React + TypeScript frontend for the ЦифроГрад platform.

## Features

- **User Authentication**: Login and registration
- **Product Catalog**: Browse digital products by category
- **Product Details**: View detailed product information and reviews
- **Shopping Cart**: Add products to cart and place orders
- **Seller Dashboard**: Manage your products (for sellers)
- **Responsive Design**: Works on desktop and mobile devices

## Tech Stack

- **React 19** - UI framework
- **TypeScript** - Type safety
- **React Router** - Client-side routing
- **Tailwind CSS** - Styling
- **Axios** - HTTP client
- **React Hook Form** - Form handling
- **Zod** - Schema validation
- **Lucide React** - Icons

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Create environment file:
```bash
cp .env.example .env
```

3. Update the API URL in `.env`:
```
VITE_API_URL=http://localhost:8000
```

### Development

Start the development server:
```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### Build

Build for production:
```bash
npm run build
```

### Preview

Preview the production build:
```bash
npm run preview
```

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/             # Base UI components (Button, Input, Card, etc.)
│   └── Navigation.tsx  # Main navigation component
├── hooks/              # Custom React hooks
│   └── useAuth.tsx     # Authentication hook
├── lib/                # Utility functions and configurations
│   ├── api.ts          # API client setup
│   └── utils.ts        # Utility functions
├── pages/              # Page components
│   ├── HomePage.tsx    # Home page with product catalog
│   ├── LoginPage.tsx   # Login page
│   ├── RegisterPage.tsx# Registration page
│   └── ProductPage.tsx # Product details page
├── types/              # TypeScript type definitions
│   └── index.ts        # API and component types
├── App.tsx             # Main app component
└── main.tsx            # App entry point
```

## API Integration

The frontend communicates with the FastAPI backend. Make sure the backend is running on the URL specified in `.env`.

## Contributing

1. Follow the existing code style
2. Use TypeScript for type safety
3. Test your changes
4. Update documentation as needed
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
