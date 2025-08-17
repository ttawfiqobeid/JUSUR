# Overview

Jusur Calc is an iOS-inspired investment calculator web application that helps users calculate profit splits, commissions, and ROI for real estate or other investment scenarios. The application features a modern, glassmorphic design with multiple calculation models including sliding scale, progressive tiers, flat percentage, and ROI-based calculations. It provides comprehensive analytics through interactive charts and KPI displays, with support for dark mode and PWA capabilities.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
The application uses a modern React-based architecture with TypeScript:

- **React 18** with functional components and hooks for state management
- **Vite** as the build tool and development server for fast hot module replacement
- **shadcn/ui** component library built on Radix UI primitives for consistent, accessible UI components
- **Tailwind CSS** with custom iOS-inspired design tokens and utilities
- **Wouter** for lightweight client-side routing
- **Framer Motion** for smooth animations and transitions
- **Recharts** for data visualization (pie charts, bar charts, line charts, area charts)

The frontend follows a component-based architecture with:
- Reusable UI components in `/client/src/components/ui/`
- Custom business components like `jusur-calc.tsx`, `kpi-card.tsx`, and `chart-selector.tsx`
- Centralized styling with Tailwind CSS and custom CSS variables for theming
- Type-safe development with TypeScript and proper component props interfaces

## Backend Architecture
The backend is built with Express.js and follows a clean separation of concerns:

- **Express.js** server with middleware for JSON parsing, CORS, and request logging
- **Modular routing** system with API routes prefixed under `/api`
- **Storage abstraction** with an interface-based approach allowing for different storage implementations
- **In-memory storage** as the default implementation with extensibility for database integration
- **Development/production environment** handling with Vite integration in development

The server architecture includes:
- Request/response logging middleware with performance tracking
- Error handling middleware for consistent API responses
- Separation of storage logic from route handlers
- Type-safe data models shared between frontend and backend

## Data Storage Solutions
The application uses a flexible storage architecture:

- **Drizzle ORM** configured for PostgreSQL with schema definitions in `/shared/schema.ts`
- **Abstract storage interface** (`IStorage`) allowing multiple implementations
- **In-memory storage** for development and testing
- **Database migrations** support through Drizzle Kit
- **Shared schema types** between frontend and backend for type safety

The storage system supports:
- User management with username/password authentication structure
- Extensible schema design for future feature additions
- Environment-based database configuration
- Type-safe database operations through Drizzle ORM

## Authentication and Authorization
Basic authentication structure is prepared but not fully implemented:

- User schema with username and password fields
- Password storage (would need hashing implementation)
- Session management structure (connect-pg-simple for PostgreSQL sessions)
- Shared type definitions for user objects

## Progressive Web App (PWA) Features
The application includes full PWA support:

- **Service Worker** for offline caching and improved performance
- **Web App Manifest** with proper metadata, icons, and display settings
- **iOS-specific meta tags** for native app-like experience on iOS devices
- **Responsive design** optimized for mobile and desktop usage
- **Touch-friendly interactions** with proper sizing and spacing

PWA features include:
- Offline functionality through service worker caching
- Install prompts for mobile devices
- Native app-like navigation and behavior
- Optimized loading performance

# External Dependencies

## UI and Design Libraries
- **@radix-ui/* components** - Accessible, unstyled UI primitives for building the component library
- **shadcn/ui** - Pre-built component library with consistent design system
- **Tailwind CSS** - Utility-first CSS framework with custom design tokens
- **class-variance-authority** - Type-safe variant API for component styling
- **Framer Motion** - Animation library for smooth transitions and interactions

## Data Visualization
- **Recharts** - React-based charting library for pie charts, bar charts, line charts, and area charts
- **date-fns** - Date manipulation and formatting utilities

## Form Management
- **React Hook Form** - Performant form library with minimal re-renders
- **@hookform/resolvers** - Validation resolvers for React Hook Form
- **Zod** - TypeScript-first schema validation

## State Management and Data Fetching
- **@tanstack/react-query** - Server state management with caching, synchronization, and error handling
- **React built-in hooks** - useState, useEffect, useMemo for local state management

## Database and ORM
- **Drizzle ORM** - TypeScript ORM for database operations
- **@neondatabase/serverless** - Serverless PostgreSQL driver
- **drizzle-zod** - Zod schema generation from Drizzle schemas

## Development and Build Tools
- **Vite** - Fast build tool and development server
- **TypeScript** - Type safety and enhanced developer experience
- **ESBuild** - Fast JavaScript bundler for production builds
- **PostCSS and Autoprefixer** - CSS processing and vendor prefixing

## Routing and Navigation
- **Wouter** - Lightweight routing library for React applications

## Session Management
- **connect-pg-simple** - PostgreSQL session store for Express sessions (configured but not actively used)

## Icons and Assets
- **Lucide React** - Consistent icon library with React components
- **Google Fonts (Inter)** - Typography for iOS-inspired design system