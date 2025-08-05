import { config } from 'dotenv';
config();

import {
  Permission, PERMISSION_ACTION, PrismaClient, 
} from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  try {
    await prisma.armadaLog.deleteMany();
    await prisma.customerLog.deleteMany();
    await prisma.productLog.deleteMany();
    await prisma.userLog.deleteMany();
    await prisma.warehouseLog.deleteMany();
    await prisma.deliveryOrderLog.deleteMany();
    await prisma.deliveryOrderItem.deleteMany();
    await prisma.deliveryOrder.deleteMany();
    await prisma.permission.deleteMany();
    await prisma.rolePermission.deleteMany();
    await prisma.role.deleteMany();
    await prisma.armada.deleteMany();
    await prisma.customer.deleteMany();
    await prisma.product.deleteMany();
    await prisma.warehouse.deleteMany();
    await prisma.user.deleteMany();

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

    // Create permissions for different resources and actions
    const resources = [
      'user',
      'role',
      'permission',
      'warehouse',
      'product',
      'customer',
      'armada',
      'delivery_order',
      'shipment',
      'report',
    ];
    const actions = Object.values(PERMISSION_ACTION);

    // Create all possible permissions
    const permissions: Permission[] = [];
    const specialActions: Set<PERMISSION_ACTION> = new Set([
      PERMISSION_ACTION.WEIGH,
      PERMISSION_ACTION.VERIFY_PLATE,
      PERMISSION_ACTION.CHANGE_CUSTOMER,
      PERMISSION_ACTION.REVISE_DO,
    ]);

    const specialActionDescriptions = new Map<PERMISSION_ACTION, string>([
      [PERMISSION_ACTION.WEIGH, 'Mengizinkan untuk melakukan penimbangan'],
      [PERMISSION_ACTION.VERIFY_PLATE, 'Mengizinkan untuk verifikasi plat nomor kendaraan'],
      [
        PERMISSION_ACTION.CHANGE_CUSTOMER,
        'Mengizinkan untuk mengubah pelanggan setelah pengiriman di proses',
      ],
      [PERMISSION_ACTION.REVISE_DO, 'Mengizinkan untuk merevisi DO setelah pengiriman di proses'],
    ]);

    for (const resource of resources) {
      for (const action of actions) {
        if (specialActions.has(action) && resource !== 'shipment') {
          continue;
        }

        const description =
          specialActionDescriptions.get(action) ?? `Bisa ${action.toLowerCase()} ${resource}`;

        const permission = await prisma.permission.create({
          data: {
            name: `${resource}:${action}`,
            description,
            resource,
            action,
          },
        });
        permissions.push(permission);
      }
    }

    console.log(`Created ${permissions.length} permissions`);

    // Create warehouses
    const warehouses = await Promise.all([
      // Admin's warehouse
      prisma.warehouse.create({
        data: {
          name: 'Gudang Pusat',
          description: 'Gudang utama untuk administrasi',
        },
      }),
      // Additional warehouses (unassigned)
      prisma.warehouse.create({
        data: {
          name: 'Gudang Wilayah Timur',
          description: 'Fasilitas penyimpanan untuk distribusi wilayah timur',
        },
      }),
      prisma.warehouse.create({
        data: {
          name: 'Gudang Wilayah Barat',
          description: 'Fasilitas penyimpanan untuk distribusi wilayah barat',
        },
      }),
      prisma.warehouse.create({
        data: {
          name: 'Gudang Sentral',
          description: 'Fasilitas penyimpanan dan distribusi pusat',
        },
      }),
    ]);

    console.log(`Created ${warehouses.length} warehouses`);

    // Create products across warehouses
    const products = await Promise.all([
      // Products for Gudang Pusat
      prisma.product.create({
        data: {
          name: 'Semen Portland 50kg',
          id_sl: 'SMN-001',
          description: 'Semen Portland kualitas konstruksi berat',
          satuan: 'Sak',
          warehouseId: warehouses[0].id,
        },
      }),
      prisma.product.create({
        data: {
          name: 'Semen Putih 40kg',
          id_sl: 'SMN-002',
          description: 'Semen putih untuk finishing dan dekorasi',
          satuan: 'Sak',
          warehouseId: warehouses[0].id,
        },
      }),
      prisma.product.create({
        data: {
          name: 'Bata Merah Press',
          id_sl: 'BTA-001',
          description: 'Bata merah press kualitas premium',
          satuan: 'Buah',
          warehouseId: warehouses[0].id,
        },
      }),
      prisma.product.create({
        data: {
          name: 'Pasir Beton',
          id_sl: 'PSR-001',
          description: 'Pasir beton untuk konstruksi',
          satuan: 'M3',
          warehouseId: warehouses[0].id,
        },
      }),
      prisma.product.create({
        data: {
          name: 'Kerikil 2-3 cm',
          id_sl: 'KRK-001',
          description: 'Kerikil untuk beton dan aspal',
          satuan: 'M3',
          warehouseId: warehouses[0].id,
        },
      }),
      // Products for Gudang Wilayah Timur
      prisma.product.create({
        data: {
          name: 'Besi Beton 8mm',
          id_sl: 'BSI-001',
          description: 'Besi beton polos diameter 8mm',
          satuan: 'Batang',
          warehouseId: warehouses[1].id,
        },
      }),
      prisma.product.create({
        data: {
          name: 'Besi Beton 10mm',
          id_sl: 'BSI-002',
          description: 'Besi beton polos diameter 10mm',
          satuan: 'Batang',
          warehouseId: warehouses[1].id,
        },
      }),
      prisma.product.create({
        data: {
          name: 'Kawat Bendrat',
          id_sl: 'KWT-001',
          description: 'Kawat bendrat untuk pengikat besi',
          satuan: 'Kg',
          warehouseId: warehouses[1].id,
        },
      }),
      // Products for Gudang Wilayah Barat
      prisma.product.create({
        data: {
          name: 'Cat Tembok Premium',
          id_sl: 'CAT-001',
          description: 'Cat tembok premium anti jamur',
          satuan: 'Kaleng',
          warehouseId: warehouses[2].id,
        },
      }),
      prisma.product.create({
        data: {
          name: 'Cat Plafon',
          id_sl: 'CAT-002',
          description: 'Cat plafon anti noda',
          satuan: 'Kaleng',
          warehouseId: warehouses[2].id,
        },
      }),
      prisma.product.create({
        data: {
          name: 'Paku Beton 3 inch',
          id_sl: 'PKU-001',
          description: 'Paku beton untuk konstruksi',
          satuan: 'Kg',
          warehouseId: warehouses[2].id,
        },
      }),
      // Products for Gudang Sentral
      prisma.product.create({
        data: {
          name: 'Pipa PVC 4 inch',
          id_sl: 'PIP-001',
          description: 'Pipa PVC untuk saluran air',
          satuan: 'Batang',
          warehouseId: warehouses[3].id,
        },
      }),
      prisma.product.create({
        data: {
          name: 'Pipa PVC 2 inch',
          id_sl: 'PIP-002',
          description: 'Pipa PVC untuk saluran air',
          satuan: 'Batang',
          warehouseId: warehouses[3].id,
        },
      }),
      prisma.product.create({
        data: {
          name: 'Seng Gelombang',
          id_sl: 'SNG-001',
          description: 'Seng gelombang untuk atap',
          satuan: 'Lembar',
          warehouseId: warehouses[3].id,
        },
      }),
      prisma.product.create({
        data: {
          name: 'Genteng Beton',
          id_sl: 'GTL-001',
          description: 'Genteng beton anti bocor',
          satuan: 'Buah',
          warehouseId: warehouses[3].id,
        },
      }),
    ]);

    console.log(`Created ${products.length} products`);

    // Create customers
    const customers = await Promise.all([
      prisma.customer.create({
        data: {
          name: 'PT Pembangunan Jaya',
          id_sl: 'CUS-001',
          address: 'Jl. Gatot Subroto No. 123, Jakarta Selatan',
        },
      }),
      prisma.customer.create({
        data: {
          name: 'CV Maju Bersama',
          id_sl: 'CUS-002',
          address: 'Jl. Pahlawan No. 45, Bandung',
        },
      }),
      prisma.customer.create({
        data: {
          name: 'PT Konstruksi Andalan',
          id_sl: 'CUS-003',
          address: 'Jl. Ahmad Yani No. 78, Surabaya',
        },
      }),
      prisma.customer.create({
        data: {
          name: 'Toko Bangunan Sejahtera',
          id_sl: 'CUS-004',
          address: 'Jl. Diponegoro No. 210, Semarang',
        },
      }),
      prisma.customer.create({
        data: {
          name: 'PT Arsitektur Modern',
          id_sl: 'CUS-005',
          address: 'Jl. Sudirman No. 56, Makassar',
        },
      }),
    ]);

    console.log(`Created ${customers.length} customers`);

    // Create delivery orders with different customers and products
    const deliveryOrders = await Promise.all([
      // Delivery Order 1 - PT Pembangunan Jaya
      prisma.deliveryOrder.create({
        data: {
          doNumber: 'DO-2024-001',
          customerId: customers[0].id,
          address: 'Jl. Gatot Subroto No. 123, Jakarta Selatan',
          internalNote: 'Pengiriman untuk proyek apartemen',
          status: 'PENDING',
          items: {
            create: [
              {
                productId: products[0].id, // Semen Portland 50kg
                quantity: 100,
                pendingQuantity: 100,
              },
              {
                productId: products[2].id, // Bata Merah Press
                quantity: 5000,
                pendingQuantity: 5000,
              },
            ],
          },
        },
      }),
      // Delivery Order 2 - CV Maju Bersama
      prisma.deliveryOrder.create({
        data: {
          doNumber: 'DO-2024-002',
          customerId: customers[1].id,
          address: 'Jl. Pahlawan No. 45, Bandung',
          internalNote: 'Pengiriman untuk renovasi rumah',
          status: 'PENDING',
          items: {
            create: [
              {
                productId: products[5].id, // Besi Beton 8mm
                quantity: 50,
                pendingQuantity: 50,
              },
              {
                productId: products[7].id, // Cat Tembok Premium
                quantity: 20,
                pendingQuantity: 20,
              },
            ],
          },
        },
      }),
      // Delivery Order 3 - PT Konstruksi Andalan
      prisma.deliveryOrder.create({
        data: {
          doNumber: 'DO-2024-003',
          customerId: customers[2].id,
          address: 'Jl. Ahmad Yani No. 78, Surabaya',
          internalNote: 'Pengiriman untuk proyek jalan tol',
          status: 'PENDING',
          items: {
            create: [
              {
                productId: products[3].id, // Pasir Beton
                quantity: 100,
                pendingQuantity: 100,
              },
              {
                productId: products[4].id, // Kerikil 2-3 cm
                quantity: 80,
                pendingQuantity: 80,
              },
              {
                productId: products[6].id, // Besi Beton 10mm
                quantity: 100,
                pendingQuantity: 100,
              },
            ],
          },
        },
      }),
      // Delivery Order 4 - Toko Bangunan Sejahtera
      prisma.deliveryOrder.create({
        data: {
          doNumber: 'DO-2024-004',
          customerId: customers[3].id,
          address: 'Jl. Diponegoro No. 210, Semarang',
          internalNote: 'Pengiriman untuk toko bangunan',
          status: 'PENDING',
          items: {
            create: [
              {
                productId: products[8].id, // Paku Beton 3 inch
                quantity: 50,
                pendingQuantity: 50,
              },
              {
                productId: products[9].id, // Pipa PVC 4 inch
                quantity: 30,
                pendingQuantity: 30,
              },
            ],
          },
        },
      }),
      // Delivery Order 5 - PT Arsitektur Modern
      prisma.deliveryOrder.create({
        data: {
          doNumber: 'DO-2024-005',
          customerId: customers[4].id,
          address: 'Jl. Sudirman No. 56, Makassar',
          internalNote: 'Pengiriman untuk proyek hotel',
          status: 'PENDING',
          items: {
            create: [
              {
                productId: products[1].id, // Semen Putih 40kg
                quantity: 80,
                pendingQuantity: 0,
              },
              {
                productId: products[10].id, // Pipa PVC 2 inch
                quantity: 40,
                pendingQuantity: 0,
              },
              {
                productId: products[11].id, // Seng Gelombang
                quantity: 200,
                pendingQuantity: 0,
              },
            ],
          },
        },
      }),
      // Delivery Order 6 - PT Pembangunan Jaya (second order)
      prisma.deliveryOrder.create({
        data: {
          doNumber: 'DO-2024-006',
          customerId: customers[0].id,
          address: 'Jl. Gatot Subroto No. 123, Jakarta Selatan',
          internalNote: 'Pengiriman untuk proyek mall',
          status: 'PENDING',
          items: {
            create: [
              {
                productId: products[12].id, // Genteng Beton
                quantity: 1000,
                pendingQuantity: 1000,
              },
              {
                productId: products[6].id, // Besi Beton 10mm
                quantity: 200,
                pendingQuantity: 200,
              },
            ],
          },
        },
      }),
    ]);

    console.log(`Created ${deliveryOrders.length} delivery orders`);

    // Create armadas (vehicles)
    const armadas = await Promise.all([
      prisma.armada.create({
        data: {
          model: 'Truk Fuso',
          id_sl: 'TRK-001',
          plateNumber: 'B 1234 CD',
          description: 'Truk besar untuk pengiriman material berat',
        },
      }),
      prisma.armada.create({
        data: {
          model: 'Pickup L300',
          id_sl: 'PU-001',
          plateNumber: 'B 5678 EF',
          description: 'Pickup untuk pengiriman cepat dan ringan',
        },
      }),
      prisma.armada.create({
        data: {
          model: 'Truk Colt Diesel',
          id_sl: 'TRK-002',
          plateNumber: 'B 9012 GH',
          description: 'Truk sedang untuk distribusi dalam kota',
        },
      }),
    ]);

    console.log(`Created ${armadas.length} armadas`);

    // Assign all permissions to Admin role
    const adminPermissionAssignments = await Promise.all(
      permissions.map((permission) =>
        prisma.rolePermission.create({
          data: {
            roleId: roles[0].id, // Admin role
            permissionId: permission.id,
          },
        }),
      ),
    );

    console.log(`Assigned ${adminPermissionAssignments.length} permissions to Admin role`);

    const restrictedActions: Set<PERMISSION_ACTION> = new Set([
      PERMISSION_ACTION.DELETE,
      PERMISSION_ACTION.WEIGH,
      PERMISSION_ACTION.VERIFY_PLATE,
      PERMISSION_ACTION.CHANGE_CUSTOMER,
      PERMISSION_ACTION.REVISE_DO,
    ]);

    //
    const managerPermissions = permissions.filter(
      (permission) => !restrictedActions.has(permission.action),
    );
    const managerPermissionAssignments = await Promise.all(
      managerPermissions.map((permission) =>
        prisma.rolePermission.create({
          data: {
            roleId: roles[1].id, // Manager role
            permissionId: permission.id,
          },
        }),
      ),
    );

    console.log(`Assigned ${managerPermissionAssignments.length} permissions to Manager role`);

    // Create 10 users with different roles
    const defaultPassword = await bcrypt.hash('Password123!', 10);

    // Create an admin user first with warehouse
    const adminUser = await prisma.user.create({
      data: {
        email: 'admin@example.com',
        name: 'Admin User',
        password: defaultPassword,
        roleId: roles[0].id,
        warehouseId: warehouses[0].id, // Assign only the first warehouse to admin
      },
    });

    // Create other users (without warehouses)
    const users = await Promise.all([
      // Admin user already created
      adminUser,
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

    // Log summary of created data
    console.log('Seed data created successfully:');
    console.log(`- Roles: ${roles.length}`);
    console.log(`- Users: ${users.length}`);
    console.log(`- Permissions: ${permissions.length}`);
    console.log(`- Admin permissions: ${adminPermissionAssignments.length}`);
    console.log(`- Manager permissions: ${managerPermissionAssignments.length}`);
    console.log(`- Warehouses: ${warehouses.length}`);
    console.log(`- Products: ${products.length}`);
    console.log(`- Customers: ${customers.length}`);
    console.log(`- Armadas: ${armadas.length}`);
    console.log(`- Delivery Orders: ${deliveryOrders.length}`);
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
