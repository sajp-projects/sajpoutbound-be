import { config } from 'dotenv';
config();

import { Permission, PERMISSION_ACTION, PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

/**
 * Reset Users & Permissions Script
 *
 * This script resets users, roles, and permissions while preserving all other data.
 *
 * RESET (Deleted & Re-seeded):
 * - User
 * - Role
 * - Permission
 * - RolePermission
 * - UserLog (cleared due to FK constraints)
 *
 * PRESERVED:
 * - All transactional data (DeliveryOrder, Shipment, etc.)
 * - Master data (Warehouse, Product, Customer, Armada, Driver)
 * - All other logs
 */
async function main() {
  console.log('='.repeat(60));
  console.log('RESET USERS & PERMISSIONS');
  console.log('='.repeat(60));
  console.log('');
  console.log('This will RESET:');
  console.log('  - Users (deleted & re-created with default Pemilik)');
  console.log('  - Roles (deleted & re-created)');
  console.log('  - Permissions (deleted & re-created with latest actions)');
  console.log('  - RolePermissions (deleted & re-created)');
  console.log('  - UserLog (cleared due to FK constraints)');
  console.log('');
  console.log('All other data will be PRESERVED.');
  console.log('');
  console.log('='.repeat(60));

  try {
    // Step 1: Clear references that point to users
    console.log('\n[1/6] Clearing user references...');

    const userLogCount = await prisma.userLog.deleteMany();
    console.log(`  - UserLog: ${userLogCount.count} records deleted`);

    const warehouseLogCount = await prisma.warehouseLog.deleteMany();
    console.log(`  - WarehouseLog: ${warehouseLogCount.count} records deleted`);

    const productLogCount = await prisma.productLog.deleteMany();
    console.log(`  - ProductLog: ${productLogCount.count} records deleted`);

    const customerLogCount = await prisma.customerLog.deleteMany();
    console.log(`  - CustomerLog: ${customerLogCount.count} records deleted`);

    const armadaLogCount = await prisma.armadaLog.deleteMany();
    console.log(`  - ArmadaLog: ${armadaLogCount.count} records deleted`);

    const deliveryOrderLogCount = await prisma.deliveryOrderLog.deleteMany();
    console.log(`  - DeliveryOrderLog: ${deliveryOrderLogCount.count} records deleted`);

    const shipmentLogCount = await prisma.shipmentLog.deleteMany();
    console.log(`  - ShipmentLog: ${shipmentLogCount.count} records deleted`);

    // Clear SPMB generatedById (nullable field)
    const spmbClearCount = await prisma.sPMB.updateMany({
      where: { generatedById: { not: null } },
      data: { generatedById: null },
    });
    console.log(`  - SPMB generatedById cleared: ${spmbClearCount.count} records`);

    // Step 2: Delete users
    console.log('\n[2/6] Deleting users...');
    const deletedUserCount = await prisma.user.deleteMany();
    console.log(`  - Users deleted: ${deletedUserCount.count}`);

    // Step 3: Delete role permissions
    console.log('\n[3/6] Deleting role permissions...');
    const deletedRolePermCount = await prisma.rolePermission.deleteMany();
    console.log(`  - RolePermissions deleted: ${deletedRolePermCount.count}`);

    // Step 4: Delete permissions
    console.log('\n[4/6] Deleting permissions...');
    const deletedPermCount = await prisma.permission.deleteMany();
    console.log(`  - Permissions deleted: ${deletedPermCount.count}`);

    // Step 5: Delete roles
    console.log('\n[5/6] Deleting roles...');
    const deletedRoleCount = await prisma.role.deleteMany();
    console.log(`  - Roles deleted: ${deletedRoleCount.count}`);

    // Step 6: Re-seed users, roles, and permissions
    console.log('\n[6/6] Re-seeding users, roles, and permissions...');

    // Create Pemilik role
    const pemilikRole = await prisma.role.create({
      data: {
        name: 'Pemilik',
        description: 'Pemilik sistem dengan akses penuh ke semua fitur',
      },
    });
    console.log('  - Created Pemilik role');

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
      'driver',
      'shipment',
      'report',
      'user_log',
      'product_log',
      'customer_log',
      'warehouse_log',
      'armada_log',
      'delivery_order_log',
      'shipment_log',
    ];
    const actions = Object.values(PERMISSION_ACTION);

    const permissions: Permission[] = [];
    const specialActions: Set<PERMISSION_ACTION> = new Set([
      PERMISSION_ACTION.WEIGH,
      PERMISSION_ACTION.VERIFY_PLATE,
      PERMISSION_ACTION.VERIFY_PLATE_MANUAL,
      PERMISSION_ACTION.CHANGE_CUSTOMER,
      PERMISSION_ACTION.REVISE_DO,
      PERMISSION_ACTION.CHOSE_PRODUCT,
      PERMISSION_ACTION.UPDATE_TALLY,
      PERMISSION_ACTION.UPDATE_KENEK,
      PERMISSION_ACTION.TRANSFER_ITEMS,
      PERMISSION_ACTION.REDUCE_ITEMS,
      PERMISSION_ACTION.CANCEL_ITEMS,
      PERMISSION_ACTION.UPDATE_WEIGHING_METHOD,
      PERMISSION_ACTION.MANUAL_WEIGHING_OVERRIDE,
    ]);

    // Resources that support soft deletion (unarchiving)
    const softDeletableResources: Set<string> = new Set(['user', 'delivery_order', 'shipment']);

    const specialActionDescriptions = new Map<PERMISSION_ACTION, string>([
      [PERMISSION_ACTION.WEIGH, 'Mengizinkan untuk melakukan penimbangan'],
      [PERMISSION_ACTION.VERIFY_PLATE, 'Mengizinkan untuk verifikasi plat nomor kendaraan'],
      [
        PERMISSION_ACTION.VERIFY_PLATE_MANUAL,
        'Mengizinkan untuk verifikasi plat nomor kendaraan secara manual',
      ],
      [
        PERMISSION_ACTION.CHANGE_CUSTOMER,
        'Mengizinkan untuk mengubah pelanggan setelah pengiriman di proses',
      ],
      [PERMISSION_ACTION.REVISE_DO, 'Mengizinkan untuk merevisi DO setelah pengiriman di proses'],
      [
        PERMISSION_ACTION.CHOSE_PRODUCT,
        'Mengizinkan untuk muat barang pengiriman dari gudang manapun',
      ],
      [PERMISSION_ACTION.UNARCHIVE, 'Mengizinkan untuk mengembalikan data yang telah diarsipkan'],
      [PERMISSION_ACTION.READ_ARCHIVED, 'Mengizinkan untuk melihat data yang telah diarsipkan'],
      [PERMISSION_ACTION.UPDATE_TALLY, 'Mengizinkan untuk mengubah tally pengiriman'],
      [PERMISSION_ACTION.UPDATE_KENEK, 'Mengizinkan untuk mengubah kenek pengiriman'],
      [
        PERMISSION_ACTION.TRANSFER_ITEMS,
        'Mengizinkan untuk transfer item antar customer pada pengiriman',
      ],
      [PERMISSION_ACTION.REDUCE_ITEMS, 'Mengizinkan untuk mengurangi jumlah item pada pengiriman'],
      [PERMISSION_ACTION.CANCEL_ITEMS, 'Mengizinkan untuk membatalkan item pada pengiriman'],
      [
        PERMISSION_ACTION.UPDATE_WEIGHING_METHOD,
        'Mengizinkan untuk mengubah metode penimbangan (manual/vendor)',
      ],
    ]);

    // Indonesian translations for actions
    const actionTranslations = new Map<PERMISSION_ACTION, string>([
      [PERMISSION_ACTION.CREATE, 'membuat'],
      [PERMISSION_ACTION.READ, 'melihat'],
      [PERMISSION_ACTION.UPDATE, 'mengubah'],
      [PERMISSION_ACTION.DELETE, 'menghapus'],
      [PERMISSION_ACTION.WEIGH, 'menimbang'],
      [PERMISSION_ACTION.VERIFY_PLATE, 'memverifikasi plat'],
      [PERMISSION_ACTION.VERIFY_PLATE_MANUAL, 'memverifikasi plat manual'],
      [PERMISSION_ACTION.CHANGE_CUSTOMER, 'mengubah pelanggan'],
      [PERMISSION_ACTION.REVISE_DO, 'merevisi DO'],
      [PERMISSION_ACTION.CHOSE_PRODUCT, 'memilih produk'],
      [PERMISSION_ACTION.UNARCHIVE, 'mengembalikan arsip'],
      [PERMISSION_ACTION.READ_ARCHIVED, 'melihat arsip'],
      [PERMISSION_ACTION.TRANSFER_ITEMS, 'transfer item'],
      [PERMISSION_ACTION.REDUCE_ITEMS, 'mengurangi item'],
      [PERMISSION_ACTION.CANCEL_ITEMS, 'membatalkan item'],
      [PERMISSION_ACTION.UPDATE_WEIGHING_METHOD, 'mengubah metode timbang'],
    ]);

    // Indonesian translations for resources
    const resourceTranslations = new Map<string, string>([
      ['user', 'pengguna'],
      ['role', 'peran'],
      ['permission', 'izin'],
      ['warehouse', 'gudang'],
      ['product', 'produk'],
      ['customer', 'pelanggan'],
      ['armada', 'armada'],
      ['delivery_order', 'pesanan pengiriman'],
      ['shipment', 'pengiriman'],
      ['driver', 'supir'],
      ['report', 'laporan'],
      ['user_log', 'log pengguna'],
      ['product_log', 'log produk'],
      ['customer_log', 'log pelanggan'],
      ['warehouse_log', 'log gudang'],
      ['armada_log', 'log armada'],
      ['delivery_order_log', 'log pesanan pengiriman'],
      ['shipment_log', 'log pengiriman'],
    ]);

    for (const resource of resources) {
      for (const action of actions) {
        // For log resources, only allow READ actions
        if (resource.endsWith('_log') && action !== PERMISSION_ACTION.READ) {
          continue;
        }

        // Skip special actions for non-shipment resources
        if (specialActions.has(action) && resource !== 'shipment') {
          continue;
        }

        // Skip UNARCHIVE and READ_ARCHIVED actions for resources that don't support soft deletion
        if (
          (action === PERMISSION_ACTION.UNARCHIVE || action === PERMISSION_ACTION.READ_ARCHIVED) &&
          !softDeletableResources.has(resource)
        ) {
          continue;
        }

        const actionInIndonesian = actionTranslations.get(action) || action.toLowerCase();
        const resourceInIndonesian = resourceTranslations.get(resource) || resource;

        const description =
          specialActionDescriptions.get(action) ??
          `Bisa ${actionInIndonesian} ${resourceInIndonesian}`;

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

    console.log(`  - Created ${permissions.length} permissions`);

    // Assign all permissions to Pemilik role
    const pemilikPermissionAssignments = await Promise.all(
      permissions.map((permission) =>
        prisma.rolePermission.create({
          data: {
            roleId: pemilikRole.id,
            permissionId: permission.id,
          },
        }),
      ),
    );

    console.log(`  - Assigned ${pemilikPermissionAssignments.length} permissions to Pemilik role`);

    // Create default user: Jeffrey as Pemilik
    const defaultPassword = await bcrypt.hash('Password123!', 10);

    await prisma.user.create({
      data: {
        email: 'jeffrey@gmail.com',
        name: 'Jeffrey',
        password: defaultPassword,
        roleId: pemilikRole.id,
      },
    });

    console.log('  - Created Jeffrey user as Pemilik');

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('RESET COMPLETE');
    console.log('='.repeat(60));
    console.log('');
    console.log('Created:');
    console.log(`  - Roles: 1 (Pemilik)`);
    console.log(`  - Users: 1 (Jeffrey)`);
    console.log(`  - Permissions: ${permissions.length}`);
    console.log(`  - RolePermissions: ${pemilikPermissionAssignments.length}`);
    console.log('');
    console.log('Login credentials:');
    console.log(`  - Email: jeffrey@gmail.com`);
    console.log(`  - Password: Password123!`);
    console.log(`  - Role: Pemilik (Full access to all features)`);
    console.log('');
  } catch (error) {
    console.error('\nError resetting users & permissions:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
