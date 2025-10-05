# Project Structure & Organization

## Root Level Organization

```
budgetAPP/
├── backend/           # Node.js Express API server
├── frontend/          # React application  
├── scripts/           # Development setup scripts
├── screenshots/       # Project documentation images
├── .kiro/            # Kiro IDE configuration and steering
├── docker-compose.yml # Development environment
├── Makefile          # Build automation commands
├── render.yaml       # Production deployment config
└── package.json      # Workspace root configuration
```

## Backend Structure (`backend/`)

```
backend/
├── src/
│   ├── config/       # Database and app configuration
│   ├── controllers/  # Route handlers and business logic
│   ├── db/          # Database utilities, migrations, seeds
│   ├── middleware/   # Express middleware (auth, validation)
│   ├── routes/      # API route definitions
│   ├── types/       # TypeScript type definitions
│   └── server.ts    # Application entry point
├── migrations/       # Database schema migrations
├── .env.example     # Environment variables template
├── Dockerfile       # Container configuration
└── package.json     # Backend dependencies and scripts
```

## Frontend Structure (`frontend/`)

```
frontend/
├── src/
│   ├── components/   # Reusable React components
│   ├── context/     # React context providers (auth, state)
│   ├── pages/       # Route-level page components
│   ├── services/    # API client and external services
│   ├── types/       # TypeScript interfaces
│   ├── App.tsx      # Main application component
│   └── main.tsx     # React application entry point
├── public/          # Static assets
├── Dockerfile       # Container configuration
└── package.json     # Frontend dependencies and scripts
```

## Key Configuration Files

- **Environment**: `backend/.env` (development), Render dashboard (production)
- **Database**: Migrations in `backend/migrations/`, seeds in `backend/src/db/`
- **Docker**: `docker-compose.yml` (dev), `docker-compose.prod.yml` (prod)
- **TypeScript**: `tsconfig.json` in both backend and frontend
- **Build**: Vite config in `frontend/vite.config.ts`

## Development Workflow

1. **Setup**: Use Docker Compose or manual Node.js setup
2. **Database**: Run migrations and seeds for initial data
3. **Development**: Backend on :4567, Frontend on :3456
4. **API**: RESTful endpoints under `/api/` prefix
5. **Authentication**: JWT-based with role-based access control

## Naming Conventions

- **Files**: kebab-case for components, camelCase for utilities
- **API Routes**: RESTful with plural nouns (`/api/budgets`, `/api/reimbursements`)
- **Database**: snake_case for tables and columns
- **Components**: PascalCase React components
- **Types**: PascalCase interfaces and types