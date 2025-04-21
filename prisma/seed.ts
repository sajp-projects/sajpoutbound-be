import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  try {
    // Create a role first
    const adminRole = await prisma.role.create({
      data: {
        name: 'Admin',
        description: 'Administrator with full access to the system',
      },
    });

    console.log('Created admin role:', adminRole);

    // Create a user with the admin role
    const hashedPassword = await bcrypt.hash('Admin123!', 10);
    const adminUser = await prisma.user.create({
      data: {
        email: 'admin@example.com',
        name: 'Admin User',
        password: hashedPassword,
        roleId: adminRole.id,
      },
    });

    console.log('Created admin user:', adminUser);
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
