import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  try {
    // Clear existing data to avoid duplicates
    await prisma.user.deleteMany();
    await prisma.role.deleteMany();

    console.log('Cleared existing data');

    // Create 5 roles
    const roles = await Promise.all([
      prisma.role.create({
        data: {
          name: 'Admin',
          description: 'Administrator with full access to the system',
        },
      }),
      prisma.role.create({
        data: {
          name: 'Manager',
          description: 'Manager with access to manage teams and projects',
        },
      }),
      prisma.role.create({
        data: {
          name: 'Employee',
          description: 'Regular employee with limited access',
        },
      }),
      prisma.role.create({
        data: {
          name: 'Accountant',
          description: 'Finance team member with access to financial data',
        },
      }),
      prisma.role.create({
        data: {
          name: 'Customer',
          description: 'External user with minimal access to the system',
        },
      }),
    ]);

    console.log('Created 5 roles');

    // Create 10 users with different roles
    const defaultPassword = await bcrypt.hash('Password123!', 10);

    const users = await Promise.all([
      // Admin user
      prisma.user.create({
        data: {
          email: 'admin@example.com',
          name: 'Admin User',
          password: defaultPassword,
          roleId: roles[0].id,
        },
      }),
      // Managers
      prisma.user.create({
        data: {
          email: 'john.manager@example.com',
          name: 'John Smith',
          password: defaultPassword,
          roleId: roles[1].id,
        },
      }),
      prisma.user.create({
        data: {
          email: 'sarah.manager@example.com',
          name: 'Sarah Johnson',
          password: defaultPassword,
          roleId: roles[1].id,
        },
      }),
      // Employees
      prisma.user.create({
        data: {
          email: 'mike.employee@example.com',
          name: 'Mike Wilson',
          password: defaultPassword,
          roleId: roles[2].id,
        },
      }),
      prisma.user.create({
        data: {
          email: 'emma.employee@example.com',
          name: 'Emma Davis',
          password: defaultPassword,
          roleId: roles[2].id,
        },
      }),
      prisma.user.create({
        data: {
          email: 'alex.employee@example.com',
          name: 'Alex Johnson',
          password: defaultPassword,
          roleId: roles[2].id,
        },
      }),
      // Accountants
      prisma.user.create({
        data: {
          email: 'lisa.accountant@example.com',
          name: 'Lisa Chen',
          password: defaultPassword,
          roleId: roles[3].id,
        },
      }),
      prisma.user.create({
        data: {
          email: 'robert.accountant@example.com',
          name: 'Robert Taylor',
          password: defaultPassword,
          roleId: roles[3].id,
          deletedAt: new Date(),
        },
      }),
      // Customers
      prisma.user.create({
        data: {
          email: 'customer1@example.com',
          name: 'James Wilson',
          password: defaultPassword,
          roleId: roles[4].id,
          deletedAt: new Date(),
        },
      }),
      prisma.user.create({
        data: {
          email: 'customer2@example.com',
          name: 'Maria Garcia',
          password: defaultPassword,
          roleId: roles[4].id,
          deletedAt: new Date(),
        },
      }),
    ]);

    console.log('Created 10 users with roles');

    // Log summary of created data
    console.log('Seed data created successfully:');
    console.log(`- Roles: ${roles.length}`);
    console.log(`- Users: ${users.length}`);
  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
