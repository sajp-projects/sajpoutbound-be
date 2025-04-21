# Outmanage Backend

A backend API built with Express, Prisma, MySQL, and TypeScript.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create a MySQL database and update the `.env` file with your database credentials:

```
DATABASE_URL="mysql://user:password@localhost:3306/db_name"
```

3. Run Prisma migrations to create the database schema:

```bash
npm run prisma:migrate
```

4. Generate Prisma client:

```bash
npm run prisma:generate
```

## Development

Start the development server:

```bash
npm run dev
```

## Build and Production

Build the project:

```bash
npm run build
```

Start the production server:

```bash
npm start
```

## Code Quality

This project includes tools for code quality:

- **ESLint**: Catches code issues and enforces style
- **Prettier**: Formats code automatically

Before creating a pull request, run the following command to fix linting issues and format your code:

```bash
npm run lint:fix
```

## Available Scripts

- `npm run dev` - Start the development server with hot reload
- `npm run build` - Build the TypeScript code
- `npm start` - Run the built code in production
- `npm run lint` - Run ESLint to check code quality
- `npm run lint:fix` - Automatically fix linting issues and format code (run this before creating a PR)
- `npm run format` - Format code with Prettier
- `npm run prisma:generate` - Generate Prisma client
- `npm run prisma:migrate` - Run database migrations
# api-outmanage
