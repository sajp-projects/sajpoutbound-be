import { config } from 'dotenv';
config();

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Reset Transactional Data Script
 *
 * This script deletes all transactional/operational data while preserving master data.
 *
 * PRESERVED (Master Data):
 * - User (keeps accounts, clears refresh tokens)
 * - Role
 * - Permission
 * - RolePermission
 * - Warehouse
 * - Product
 * - Customer
 * - Armada
 * - Driver
 *
 * DELETED (Transactional Data):
 * - All Log tables (UserLog, WarehouseLog, ProductLog, CustomerLog, ArmadaLog, DeliveryOrderLog, ShipmentLog)
 * - NotaTimbangan
 * - ShipmentChosenProductWeighing
 * - ShipmentChosenProduct
 * - ShipmentItem
 * - SPMB
 * - Shipment
 * - DeliveryOrderItem
 * - DeliveryOrder
 */
async function main() {
  console.log('='.repeat(60));
  console.log('RESET TRANSACTIONAL DATA');
  console.log('='.repeat(60));
  console.log('');
  console.log('This will DELETE all transactional data:');
  console.log('  - Delivery Orders & Items');
  console.log('  - Shipments & related (Items, Chosen Products, Weighings)');
  console.log('  - SPMBs & Nota Timbangan');
  console.log('  - All audit logs');
  console.log('');
  console.log('Master data will be PRESERVED:');
  console.log('  - Users, Roles, Permissions');
  console.log('  - Warehouses, Products, Customers');
  console.log('  - Armadas, Drivers');
  console.log('');
  console.log('='.repeat(60));

  try {
    // Step 1: Delete all LOG tables (no dependencies on them)
    console.log('\n[1/5] Deleting audit logs...');

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

    // Step 2: Delete NotaTimbangan and weighing chain
    console.log('\n[2/5] Deleting weighing records...');

    const notaTimbanganCount = await prisma.notaTimbangan.deleteMany();
    console.log(`  - NotaTimbangan: ${notaTimbanganCount.count} records deleted`);

    // Clear ShipmentItem references to weighings before deleting weighings
    await prisma.shipmentItem.updateMany({
      where: { shipmentChosenProductWeighingId: { not: null } },
      data: { shipmentChosenProductWeighingId: null },
    });

    const weighingCount = await prisma.shipmentChosenProductWeighing.deleteMany();
    console.log(`  - ShipmentChosenProductWeighing: ${weighingCount.count} records deleted`);

    // Step 3: Delete Shipment-related data (order matters due to FK constraints)
    console.log('\n[3/5] Deleting shipment data...');

    const shipmentItemCount = await prisma.shipmentItem.deleteMany();
    console.log(`  - ShipmentItem: ${shipmentItemCount.count} records deleted`);

    const chosenProductCount = await prisma.shipmentChosenProduct.deleteMany();
    console.log(`  - ShipmentChosenProduct: ${chosenProductCount.count} records deleted`);

    const spmbCount = await prisma.sPMB.deleteMany();
    console.log(`  - SPMB: ${spmbCount.count} records deleted`);

    const shipmentCount = await prisma.shipment.deleteMany();
    console.log(`  - Shipment: ${shipmentCount.count} records deleted`);

    // Step 4: Delete DeliveryOrder-related data
    console.log('\n[4/5] Deleting delivery order data...');

    const deliveryOrderItemCount = await prisma.deliveryOrderItem.deleteMany();
    console.log(`  - DeliveryOrderItem: ${deliveryOrderItemCount.count} records deleted`);

    const deliveryOrderCount = await prisma.deliveryOrder.deleteMany();
    console.log(`  - DeliveryOrder: ${deliveryOrderCount.count} records deleted`);

    // Step 5: Clear user session data (refresh tokens, expiry)
    console.log('\n[5/5] Clearing user session data...');

    const userSessionClearCount = await prisma.user.updateMany({
      where: {
        OR: [{ refreshToken: { not: null } }, { expiresAt: { not: null } }],
      },
      data: {
        refreshToken: null,
        expiresAt: null,
      },
    });
    console.log(`  - User sessions cleared: ${userSessionClearCount.count} users`);

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('RESET COMPLETE');
    console.log('='.repeat(60));

    const totalDeleted =
      userLogCount.count +
      warehouseLogCount.count +
      productLogCount.count +
      customerLogCount.count +
      armadaLogCount.count +
      deliveryOrderLogCount.count +
      shipmentLogCount.count +
      notaTimbanganCount.count +
      weighingCount.count +
      shipmentItemCount.count +
      chosenProductCount.count +
      spmbCount.count +
      shipmentCount.count +
      deliveryOrderItemCount.count +
      deliveryOrderCount.count;

    console.log(`\nTotal records deleted: ${totalDeleted}`);
    console.log('\nMaster data preserved:');

    const userCount = await prisma.user.count();
    const roleCount = await prisma.role.count();
    const permissionCount = await prisma.permission.count();
    const warehouseCount = await prisma.warehouse.count();
    const productCount = await prisma.product.count();
    const customerCount = await prisma.customer.count();
    const armadaCount = await prisma.armada.count();
    const driverCount = await prisma.driver.count();

    console.log(`  - Users: ${userCount}`);
    console.log(`  - Roles: ${roleCount}`);
    console.log(`  - Permissions: ${permissionCount}`);
    console.log(`  - Warehouses: ${warehouseCount}`);
    console.log(`  - Products: ${productCount}`);
    console.log(`  - Customers: ${customerCount}`);
    console.log(`  - Armadas: ${armadaCount}`);
    console.log(`  - Drivers: ${driverCount}`);
    console.log('');
  } catch (error) {
    console.error('\nError resetting transactional data:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
