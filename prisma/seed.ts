import { config } from 'dotenv';
config();

import { Permission, PERMISSION_ACTION, PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  try {
    // Clear all existing data
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

    // Create only one role: Pemilik (Owner)
    const pemilikRole = await prisma.role.create({
      data: {
        name: 'Pemilik',
        description: 'Pemilik sistem dengan akses penuh ke semua fitur',
      },
    });

    console.log('Created Pemilik role');

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

    // Create all possible permissions
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
      [
        PERMISSION_ACTION.MANUAL_WEIGHING_OVERRIDE,
        'Mengizinkan untuk input penimbangan truk secara manual',
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
      [PERMISSION_ACTION.MANUAL_WEIGHING_OVERRIDE, 'timbang truk manual'],
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

    console.log(`Created ${permissions.length} permissions`);

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

    console.log(`Assigned ${pemilikPermissionAssignments.length} permissions to Pemilik role`);

    // Create only one user: Jeffrey as Pemilik
    const defaultPassword = await bcrypt.hash('Password123!', 10);

    await prisma.user.create({
      data: {
        email: 'jeffrey@gmail.com',
        name: 'Jeffrey',
        password: defaultPassword,
        roleId: pemilikRole.id,
        // No warehouse assigned - can access all warehouses
      },
    });

    console.log('Created Jeffrey user as Pemilik');

    // Log summary of created data
    console.log('Seed data created successfully:');
    console.log(`- Roles: 1 (Pemilik)`);
    console.log(`- Users: 1 (Jeffrey)`);
    console.log(`- Permissions: ${permissions.length}`);
    console.log(`- Pemilik permissions: ${pemilikPermissionAssignments.length}`);
    console.log('');
    console.log('Login credentials:');
    console.log(`- Email: jeffrey@gmail.com`);
    console.log(`- Password: Password123!`);
    console.log(`- Role: Pemilik (Full access to all features)`);
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
