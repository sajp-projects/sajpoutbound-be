# Outmanage Backend

A backend API built with Express, Prisma, MySQL, and TypeScript.

## Local Setup

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
npx prisma migrate dev
```

4. Generate Prisma client:

```bash
npx prisma generate
```

5. Seed the database with initial data:

```bash
npm run seed
```

## Docker Setup

### Development

1. Clone the repository:

```bash
git clone https://github.com/yourusername/outmanage-backend.git
cd outmanage-backend
```

2. Create a `.env` file using the example:

```bash
cp .env.example .env
```

3. Start the services:

```bash
docker-compose up -d
```

4. Run database migrations:

```bash
docker-compose exec api npx prisma migrate dev
```

5. Seed the database:

```bash
docker-compose exec api npm run seed
```

6. Access the API at http://localhost:3000

### Production

1. Clone the repository:

```bash
git clone https://github.com/yourusername/outmanage-backend.git
cd outmanage-backend
```

2. Create a `.env.prod` file using the example:

```bash
cp .env.prod.example .env.prod
```

3. Start the production services:

```bash
docker-compose -f docker-compose.prod.yml --env-file .env.prod up -d
```

4. Run database migrations:

```bash
docker-compose -f docker-compose.prod.yml exec api npx prisma migrate deploy
```

5. Seed the database (optional):

```bash
docker-compose -f docker-compose.prod.yml exec api npm run seed
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

Before creating a pull request, run the following command to fix linting issues and format your
code:

```bash
npm run lint:fix
```

## Available Scripts

- `npm run dev` - Start the development server with hot reload
- `npm run build` - Build the TypeScript code
- `npm start` - Run the built code in production
- `npm run lint` - Run ESLint to check code quality
- `npm run lint:fix` - Automatically fix linting issues and format code
- `npm run seed` - Seed the database with initial data

# api-outmanage
