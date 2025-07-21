# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm run dev` - Start development server with hot reload and Jakarta timezone
- `npm run build` - Build TypeScript to JavaScript in dist/
- `npm start` - Run production server from built files
- `npm run lint` - Check code quality with ESLint
- `npm run lint:fix` - Fix linting issues and format code with Prettier
- `npm run seed` - Seed database with initial data

## Database Commands

- `npx prisma migrate dev` - Run database migrations in development
- `npx prisma generate` - Generate Prisma client after schema changes
- `npx prisma studio` - Open Prisma Studio for database GUI

## Architecture Overview

This is a TypeScript Express.js API for an outbound logistics management system (Outmanage) with the following key components:

### Core Technology Stack
- **Runtime**: Node.js with Express.js
- **Database**: MySQL with Prisma ORM
- **Language**: TypeScript
- **Authentication**: JWT tokens with custom middleware
- **Documentation**: Swagger/OpenAPI
- **File Upload**: Formidable for multipart forms
- **AI Integration**: Google Gemini AI for plate number verification
- **PDF Generation**: PDFKit for reports
- **Logging**: Winston with custom middleware

### Domain Models
The system manages logistics operations with these core entities:
- **Users & RBAC**: Users, roles, permissions with warehouse assignments
- **Inventory**: Warehouses, products with quantities and units
- **Orders**: Delivery orders linking customers to products
- **Logistics**: Shipments containing delivery order items
- **Fleet**: Armadas (vehicles) with plate verification
- **Audit**: Comprehensive logging for all entity changes

### Key Business Logic
- **Shipment Weighing**: Bulk weighing system that distributes weights proportionally across delivery order items
- **Status Tracking**: Items progress through PENDING → CHOSEN → COMPLETED states
- **Plate Verification**: AI-powered verification of vehicle plates against photos
- **Multi-format Reports**: Operational and financial reports for daily/monthly/yearly periods

### Authentication Flow
- JWT-based authentication with refresh tokens
- Custom `x-outmanage-token` header (not standard Authorization header)
- Middleware enforces permissions based on user roles
- Some weighing endpoints are public (non-authenticated)

### File Structure
- `/src/controllers/` - Request handlers and business logic entry points
- `/src/services/` - Core business logic and data processing
- `/src/middlewares/` - Authentication, error handling, logging
- `/src/schemas/` - Joi validation schemas for request validation
- `/src/routes/` - API route definitions with Swagger documentation
- `/src/types/` - TypeScript type definitions
- `/src/public/` - Static file storage (PDFs, images)
- `/prisma/` - Database schema and migrations

### File Uploads
- Plate photos: `/src/public/plate-photos/`
- SPMB PDFs: `/src/public/spmb/`
- Nota timbangan PDFs: `/src/public/nota-timbangan/`
- Files served via `/public` static route

### Error Handling
- Centralized error middleware with Winston logging
- Structured API responses with success/error format
- Proper HTTP status codes and error messages

### Important Configuration
- Timezone: Asia/Jakarta (GMT+7) for all operations
- CORS configured for specific frontend domains
- Health check endpoint at `/health`
- API documentation at `/api-docs`