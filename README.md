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

4. Seed the database (optional):

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

# Outmanage API - Postman Collection

This repository contains a Postman collection and environment for testing the Outmanage API.

## Features

- Complete API test coverage for User and Role management endpoints
- Token-based authentication with automatic token handling
- Environment variables for easy configuration
- Test scripts for successful login that automatically save the authentication token

## Setup Instructions

1. Import the `outmanage_api_tests.postman_collection.json` file into Postman
2. Import the `outmanage_api_environment.json` file as an environment
3. Make sure the environment is selected in Postman

## Authentication Flow

The collection is configured to automatically handle authentication:

1. When you execute the "Login - Valid Credentials" request in the Authentication folder
2. The test script automatically extracts the access token from the response
3. The token is saved to the environment variable `accessToken`
4. All subsequent requests will automatically include the token in the `x-outmanage-token` header

## How It Works

This is implemented using:

1. A pre-request script at the collection level that adds the auth token header to all requests
2. A test script in the login request that extracts and saves the token
3. Environment variables to store the token

## Manual Testing

1. Start by running the login request to authenticate
2. After successful login, the token is automatically saved to environment variables
3. Proceed to test other endpoints - the token is automatically included in all requests

## Environment Variables

- `baseUrl` - Base URL for the API (default: http://localhost:3000)
- `accessToken` - Access token for authentication (set automatically after login)

## Notes

- If you need to manually set the token, you can update the `accessToken` variable in the
  environment
- All requests use the `baseUrl` variable, so you can easily switch between environments

## Testing Plate Verification with Gemini AI

The system now uses Google's Gemini AI (free tier) to verify vehicle plate numbers. Here's how to
test it:

### Setup

1. Obtain a Gemini API key from [Google AI Studio](https://aistudio.google.com/)
   - The system uses the free `gemini-2.5-flash` model
   - No credit card or billing is required for API key creation
   - This model offers faster performance for image recognition
2. Add your API key to the environment variables:
   ```
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

### Testing in Postman

1. **Upload Plate Photo**:

   - Create a PATCH request to `/shipment/:id/upload-plate-photo`
   - In the "Body" tab, select "form-data"
   - Add a key named "platePhoto"
   - Change the type dropdown next to "platePhoto" from "Text" to "File"
   - Click "Select Files" and choose the image of a vehicle license plate
   - Add authentication headers if required
   - Send the request

2. **Verify Plate**:
   - Create a PATCH request to `/shipment/:id/verify-plate`
   - Add authentication headers if required
   - Send the request
   - Gemini AI will extract the plate number from the photo and compare it with the registered plate
     number
   - The response will include verification details:
     ```json
     {
       "success": true,
       "data": {
         "shipment": { ... },
         "plateVerification": {
           "expectedPlateNumber": "ABC123",
           "extractedPlateNumber": "ABC123",
           "isMatch": true
         }
       }
     }
     ```

### Troubleshooting

- If verification fails, ensure the plate number is clearly visible in the photo
- Check that the registered plate number matches what's in the image
- Verify your Gemini API key is valid and properly configured
