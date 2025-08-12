import { config } from 'dotenv';
config();

import { Permission, PERMISSION_ACTION, PrismaClient } from '@prisma/client';
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
      // prisma.role.create({
      //   data: {
      //     name: 'Employee',
      //     description: 'Regular employee with limited access',
      //   },
      // }),
      // prisma.role.create({
      //   data: {
      //     name: 'Accountant',
      //     description: 'Finance team member with access to financial data',
      //   },
      // }),
      // prisma.role.create({
      //   data: {
      //     name: 'Customer',
      //     description: 'External user with minimal access to the system',
      //   },
      // }),
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
      [PERMISSION_ACTION.UNARCHIVE, 'Mengizinkan untuk mengembalikan data yang telah diarsipkan'],
      [PERMISSION_ACTION.READ_ARCHIVED, 'Mengizinkan untuk melihat data yang telah diarsipkan'],
    ]);

    for (const resource of resources) {
      for (const action of actions) {
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
      prisma.customer.create({
        data: {
          name: 'PT Bangunan Nusantara',
          id_sl: 'CUS-006',
          address: 'Jl. Thamrin No. 89, Jakarta Pusat',
        },
      }),
      prisma.customer.create({
        data: {
          name: 'CV Mitra Konstruksi',
          id_sl: 'CUS-007',
          address: 'Jl. Asia Afrika No. 156, Bandung',
        },
      }),
      prisma.customer.create({
        data: {
          name: 'PT Proyek Bersama',
          id_sl: 'CUS-008',
          address: 'Jl. Basuki Rahmat No. 234, Surabaya',
        },
      }),
      prisma.customer.create({
        data: {
          name: 'Toko Material Jaya',
          id_sl: 'CUS-009',
          address: 'Jl. Pandanaran No. 67, Semarang',
        },
      }),
      prisma.customer.create({
        data: {
          name: 'PT Konstruksi Makassar',
          id_sl: 'CUS-010',
          address: 'Jl. Pengayoman No. 123, Makassar',
        },
      }),
      prisma.customer.create({
        data: {
          name: 'CV Bangunan Sukses',
          id_sl: 'CUS-011',
          address: 'Jl. Sudirman No. 456, Medan',
        },
      }),
      prisma.customer.create({
        data: {
          name: 'PT Material Utama',
          id_sl: 'CUS-012',
          address: 'Jl. Gajah Mada No. 789, Palembang',
        },
      }),
      prisma.customer.create({
        data: {
          name: 'Toko Bangunan Makmur',
          id_sl: 'CUS-013',
          address: 'Jl. Veteran No. 321, Yogyakarta',
        },
      }),
      prisma.customer.create({
        data: {
          name: 'PT Konstruksi Bali',
          id_sl: 'CUS-014',
          address: 'Jl. Sunset Road No. 654, Denpasar',
        },
      }),
      prisma.customer.create({
        data: {
          name: 'CV Bangunan Mandiri',
          id_sl: 'CUS-015',
          address: 'Jl. Ahmad Dahlan No. 987, Malang',
        },
      }),
      prisma.customer.create({
        data: {
          name: 'PT Material Sejahtera',
          id_sl: 'CUS-016',
          address: 'Jl. Pangeran Antasari No. 543, Banjarmasin',
        },
      }),
      prisma.customer.create({
        data: {
          name: 'Toko Bangunan Prima',
          id_sl: 'CUS-017',
          address: 'Jl. Urip Sumoharjo No. 876, Samarinda',
        },
      }),
      prisma.customer.create({
        data: {
          name: 'PT Konstruksi Kalimantan',
          id_sl: 'CUS-018',
          address: 'Jl. Gajah Mada No. 234, Pontianak',
        },
      }),
      prisma.customer.create({
        data: {
          name: 'CV Bangunan Maju',
          id_sl: 'CUS-019',
          address: 'Jl. Sudirman No. 567, Manado',
        },
      }),
      prisma.customer.create({
        data: {
          name: 'PT Material Nusantara',
          id_sl: 'CUS-020',
          address: 'Jl. Ahmad Yani No. 890, Balikpapan',
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
      // Delivery Order 7 - PT Bangunan Nusantara
      prisma.deliveryOrder.create({
        data: {
          doNumber: 'DO-2024-007',
          customerId: customers[5].id,
          address: 'Jl. Thamrin No. 89, Jakarta Pusat',
          internalNote: 'Pengiriman untuk proyek perkantoran',
          status: 'PENDING',
          items: {
            create: [
              {
                productId: products[0].id, // Semen Portland 50kg
                quantity: 150,
                pendingQuantity: 150,
              },
              {
                productId: products[3].id, // Pasir Beton
                quantity: 120,
                pendingQuantity: 120,
              },
            ],
          },
        },
      }),
      // Delivery Order 8 - CV Mitra Konstruksi
      prisma.deliveryOrder.create({
        data: {
          doNumber: 'DO-2024-008',
          customerId: customers[6].id,
          address: 'Jl. Asia Afrika No. 156, Bandung',
          internalNote: 'Pengiriman untuk proyek sekolah',
          status: 'PENDING',
          items: {
            create: [
              {
                productId: products[2].id, // Bata Merah Press
                quantity: 3000,
                pendingQuantity: 3000,
              },
              {
                productId: products[5].id, // Besi Beton 8mm
                quantity: 80,
                pendingQuantity: 80,
              },
            ],
          },
        },
      }),
      // Delivery Order 9 - PT Proyek Bersama
      prisma.deliveryOrder.create({
        data: {
          doNumber: 'DO-2024-009',
          customerId: customers[7].id,
          address: 'Jl. Basuki Rahmat No. 234, Surabaya',
          internalNote: 'Pengiriman untuk proyek jembatan',
          status: 'PENDING',
          items: {
            create: [
              {
                productId: products[4].id, // Kerikil 2-3 cm
                quantity: 200,
                pendingQuantity: 200,
              },
              {
                productId: products[6].id, // Besi Beton 10mm
                quantity: 150,
                pendingQuantity: 150,
              },
            ],
          },
        },
      }),
      // Delivery Order 10 - Toko Material Jaya
      prisma.deliveryOrder.create({
        data: {
          doNumber: 'DO-2024-010',
          customerId: customers[8].id,
          address: 'Jl. Pandanaran No. 67, Semarang',
          internalNote: 'Pengiriman untuk toko material',
          status: 'PENDING',
          items: {
            create: [
              {
                productId: products[1].id, // Semen Putih 40kg
                quantity: 60,
                pendingQuantity: 60,
              },
              {
                productId: products[7].id, // Cat Tembok Premium
                quantity: 30,
                pendingQuantity: 30,
              },
            ],
          },
        },
      }),
      // Delivery Order 11 - PT Konstruksi Makassar
      prisma.deliveryOrder.create({
        data: {
          doNumber: 'DO-2024-011',
          customerId: customers[9].id,
          address: 'Jl. Pengayoman No. 123, Makassar',
          internalNote: 'Pengiriman untuk proyek rumah sakit',
          status: 'PENDING',
          items: {
            create: [
              {
                productId: products[0].id, // Semen Portland 50kg
                quantity: 200,
                pendingQuantity: 200,
              },
              {
                productId: products[12].id, // Genteng Beton
                quantity: 800,
                pendingQuantity: 800,
              },
            ],
          },
        },
      }),
      // Delivery Order 12 - CV Bangunan Sukses
      prisma.deliveryOrder.create({
        data: {
          doNumber: 'DO-2024-012',
          customerId: customers[10].id,
          address: 'Jl. Sudirman No. 456, Medan',
          internalNote: 'Pengiriman untuk proyek pusat perbelanjaan',
          status: 'PENDING',
          items: {
            create: [
              {
                productId: products[2].id, // Bata Merah Press
                quantity: 4000,
                pendingQuantity: 4000,
              },
              {
                productId: products[9].id, // Pipa PVC 4 inch
                quantity: 50,
                pendingQuantity: 50,
              },
            ],
          },
        },
      }),
      // Delivery Order 13 - PT Material Utama
      prisma.deliveryOrder.create({
        data: {
          doNumber: 'DO-2024-013',
          customerId: customers[11].id,
          address: 'Jl. Gajah Mada No. 789, Palembang',
          internalNote: 'Pengiriman untuk proyek stadion',
          status: 'PENDING',
          items: {
            create: [
              {
                productId: products[3].id, // Pasir Beton
                quantity: 150,
                pendingQuantity: 150,
              },
              {
                productId: products[4].id, // Kerikil 2-3 cm
                quantity: 120,
                pendingQuantity: 120,
              },
            ],
          },
        },
      }),
      // Delivery Order 14 - Toko Bangunan Makmur
      prisma.deliveryOrder.create({
        data: {
          doNumber: 'DO-2024-014',
          customerId: customers[12].id,
          address: 'Jl. Veteran No. 321, Yogyakarta',
          internalNote: 'Pengiriman untuk proyek universitas',
          status: 'PENDING',
          items: {
            create: [
              {
                productId: products[1].id, // Semen Putih 40kg
                quantity: 100,
                pendingQuantity: 100,
              },
              {
                productId: products[8].id, // Paku Beton 3 inch
                quantity: 80,
                pendingQuantity: 80,
              },
            ],
          },
        },
      }),
      // Delivery Order 15 - PT Konstruksi Bali
      prisma.deliveryOrder.create({
        data: {
          doNumber: 'DO-2024-015',
          customerId: customers[13].id,
          address: 'Jl. Sunset Road No. 654, Denpasar',
          internalNote: 'Pengiriman untuk proyek resort',
          status: 'PENDING',
          items: {
            create: [
              {
                productId: products[11].id, // Seng Gelombang
                quantity: 300,
                pendingQuantity: 300,
              },
              {
                productId: products[12].id, // Genteng Beton
                quantity: 600,
                pendingQuantity: 600,
              },
            ],
          },
        },
      }),
      // Delivery Order 16 - CV Bangunan Mandiri
      prisma.deliveryOrder.create({
        data: {
          doNumber: 'DO-2024-016',
          customerId: customers[14].id,
          address: 'Jl. Ahmad Dahlan No. 987, Malang',
          internalNote: 'Pengiriman untuk proyek apartemen',
          status: 'PENDING',
          items: {
            create: [
              {
                productId: products[0].id, // Semen Portland 50kg
                quantity: 120,
                pendingQuantity: 120,
              },
              {
                productId: products[5].id, // Besi Beton 8mm
                quantity: 70,
                pendingQuantity: 70,
              },
            ],
          },
        },
      }),
      // Delivery Order 17 - PT Material Sejahtera
      prisma.deliveryOrder.create({
        data: {
          doNumber: 'DO-2024-017',
          customerId: customers[15].id,
          address: 'Jl. Pangeran Antasari No. 543, Banjarmasin',
          internalNote: 'Pengiriman untuk proyek masjid',
          status: 'PENDING',
          items: {
            create: [
              {
                productId: products[2].id, // Bata Merah Press
                quantity: 2500,
                pendingQuantity: 2500,
              },
              {
                productId: products[10].id, // Pipa PVC 2 inch
                quantity: 60,
                pendingQuantity: 60,
              },
            ],
          },
        },
      }),
      // Delivery Order 18 - Toko Bangunan Prima
      prisma.deliveryOrder.create({
        data: {
          doNumber: 'DO-2024-018',
          customerId: customers[16].id,
          address: 'Jl. Urip Sumoharjo No. 876, Samarinda',
          internalNote: 'Pengiriman untuk proyek perkantoran',
          status: 'PENDING',
          items: {
            create: [
              {
                productId: products[7].id, // Cat Tembok Premium
                quantity: 40,
                pendingQuantity: 40,
              },
              {
                productId: products[9].id, // Pipa PVC 4 inch
                quantity: 25,
                pendingQuantity: 25,
              },
            ],
          },
        },
      }),
      // Delivery Order 19 - PT Konstruksi Kalimantan
      prisma.deliveryOrder.create({
        data: {
          doNumber: 'DO-2024-019',
          customerId: customers[17].id,
          address: 'Jl. Gajah Mada No. 234, Pontianak',
          internalNote: 'Pengiriman untuk proyek jalan raya',
          status: 'PENDING',
          items: {
            create: [
              {
                productId: products[3].id, // Pasir Beton
                quantity: 180,
                pendingQuantity: 180,
              },
              {
                productId: products[4].id, // Kerikil 2-3 cm
                quantity: 150,
                pendingQuantity: 150,
              },
            ],
          },
        },
      }),
      // Delivery Order 20 - CV Bangunan Maju
      prisma.deliveryOrder.create({
        data: {
          doNumber: 'DO-2024-020',
          customerId: customers[18].id,
          address: 'Jl. Sudirman No. 567, Manado',
          internalNote: 'Pengiriman untuk proyek pelabuhan',
          status: 'PENDING',
          items: {
            create: [
              {
                productId: products[6].id, // Besi Beton 10mm
                quantity: 120,
                pendingQuantity: 120,
              },
              {
                productId: products[8].id, // Paku Beton 3 inch
                quantity: 100,
                pendingQuantity: 100,
              },
            ],
          },
        },
      }),
      // Delivery Order 21 - PT Material Nusantara
      prisma.deliveryOrder.create({
        data: {
          doNumber: 'DO-2024-021',
          customerId: customers[19].id,
          address: 'Jl. Ahmad Yani No. 890, Balikpapan',
          internalNote: 'Pengiriman untuk proyek terminal',
          status: 'PENDING',
          items: {
            create: [
              {
                productId: products[0].id, // Semen Portland 50kg
                quantity: 180,
                pendingQuantity: 180,
              },
              {
                productId: products[11].id, // Seng Gelombang
                quantity: 250,
                pendingQuantity: 250,
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
      prisma.armada.create({
        data: {
          model: 'Truk Mitsubishi Colt',
          id_sl: 'TRK-003',
          plateNumber: 'B 3456 IJ',
          description: 'Truk ringan untuk pengiriman material',
        },
      }),
      prisma.armada.create({
        data: {
          model: 'Pickup Suzuki Carry',
          id_sl: 'PU-002',
          plateNumber: 'B 7890 KL',
          description: 'Pickup kecil untuk pengiriman ringan',
        },
      }),
      prisma.armada.create({
        data: {
          model: 'Truk Isuzu Elf',
          id_sl: 'TRK-004',
          plateNumber: 'B 2345 MN',
          description: 'Truk medium untuk distribusi',
        },
      }),
      prisma.armada.create({
        data: {
          model: 'Pickup Toyota Dyna',
          id_sl: 'PU-003',
          plateNumber: 'B 6789 OP',
          description: 'Pickup besar untuk pengiriman menengah',
        },
      }),
      prisma.armada.create({
        data: {
          model: 'Truk Hino Dutro',
          id_sl: 'TRK-005',
          plateNumber: 'B 0123 QR',
          description: 'Truk modern untuk pengiriman material',
        },
      }),
      prisma.armada.create({
        data: {
          model: 'Pickup Daihatsu Gran Max',
          id_sl: 'PU-004',
          plateNumber: 'B 4567 ST',
          description: 'Pickup serbaguna untuk berbagai jenis pengiriman',
        },
      }),
      prisma.armada.create({
        data: {
          model: 'Truk Mercedes-Benz',
          id_sl: 'TRK-006',
          plateNumber: 'B 8901 UV',
          description: 'Truk premium untuk pengiriman khusus',
        },
      }),
      prisma.armada.create({
        data: {
          model: 'Pickup Mitsubishi L300',
          id_sl: 'PU-005',
          plateNumber: 'B 2345 WX',
          description: 'Pickup klasik untuk pengiriman lokal',
        },
      }),
      prisma.armada.create({
        data: {
          model: 'Truk Nissan Diesel',
          id_sl: 'TRK-007',
          plateNumber: 'B 6789 YZ',
          description: 'Truk handal untuk pengiriman jarak jauh',
        },
      }),
      prisma.armada.create({
        data: {
          model: 'Pickup Suzuki APV',
          id_sl: 'PU-006',
          plateNumber: 'B 0123 AB',
          description: 'Pickup modern untuk pengiriman cepat',
        },
      }),
      prisma.armada.create({
        data: {
          model: 'Truk Toyota Dyna',
          id_sl: 'TRK-008',
          plateNumber: 'B 4567 CD',
          description: 'Truk terpercaya untuk berbagai jenis material',
        },
      }),
      prisma.armada.create({
        data: {
          model: 'Pickup Honda Mobilio',
          id_sl: 'PU-007',
          plateNumber: 'B 8901 EF',
          description: 'Pickup nyaman untuk pengiriman penumpang dan barang',
        },
      }),
      prisma.armada.create({
        data: {
          model: 'Truk Isuzu Forward',
          id_sl: 'TRK-009',
          plateNumber: 'B 2345 GH',
          description: 'Truk besar untuk pengiriman material konstruksi',
        },
      }),
      prisma.armada.create({
        data: {
          model: 'Pickup Toyota Avanza',
          id_sl: 'PU-008',
          plateNumber: 'B 6789 IJ',
          description: 'Pickup keluarga untuk pengiriman ringan',
        },
      }),
      prisma.armada.create({
        data: {
          model: 'Truk Mitsubishi Fighter',
          id_sl: 'TRK-010',
          plateNumber: 'B 0123 KL',
          description: 'Truk tangguh untuk medan berat',
        },
      }),
      prisma.armada.create({
        data: {
          model: 'Pickup Daihatsu Xenia',
          id_sl: 'PU-009',
          plateNumber: 'B 4567 MN',
          description: 'Pickup ekonomis untuk pengiriman harian',
        },
      }),
      prisma.armada.create({
        data: {
          model: 'Truk Hino Ranger',
          id_sl: 'TRK-011',
          plateNumber: 'B 8901 OP',
          description: 'Truk profesional untuk distribusi',
        },
      }),
      prisma.armada.create({
        data: {
          model: 'Pickup Suzuki Ertiga',
          id_sl: 'PU-010',
          plateNumber: 'B 2345 QR',
          description: 'Pickup modern untuk pengiriman fleksibel',
        },
      }),
      prisma.armada.create({
        data: {
          model: 'Truk Mercedes-Benz Actros',
          id_sl: 'TRK-012',
          plateNumber: 'B 6789 ST',
          description: 'Truk premium untuk pengiriman khusus',
        },
      }),
      prisma.armada.create({
        data: {
          model: 'Pickup Toyota Innova',
          id_sl: 'PU-011',
          plateNumber: 'B 0123 UV',
          description: 'Pickup nyaman untuk pengiriman VIP',
        },
      }),
      prisma.armada.create({
        data: {
          model: 'Truk Nissan Atlas',
          id_sl: 'TRK-013',
          plateNumber: 'B 4567 WX',
          description: 'Truk handal untuk berbagai jenis pengiriman',
        },
      }),
      prisma.armada.create({
        data: {
          model: 'Pickup Honda Brio',
          id_sl: 'PU-012',
          plateNumber: 'B 8901 YZ',
          description: 'Pickup kecil untuk pengiriman ringan',
        },
      }),
      prisma.armada.create({
        data: {
          model: 'Truk Isuzu Giga',
          id_sl: 'TRK-014',
          plateNumber: 'B 2345 AB',
          description: 'Truk besar untuk pengiriman material berat',
        },
      }),
      prisma.armada.create({
        data: {
          model: 'Pickup Suzuki Ignis',
          id_sl: 'PU-013',
          plateNumber: 'B 6789 CD',
          description: 'Pickup kompak untuk pengiriman cepat',
        },
      }),
      prisma.armada.create({
        data: {
          model: 'Truk Toyota Hino',
          id_sl: 'TRK-015',
          plateNumber: 'B 0123 EF',
          description: 'Truk terpercaya untuk distribusi jarak jauh',
        },
      }),
      prisma.armada.create({
        data: {
          model: 'Pickup Daihatsu Ayla',
          id_sl: 'PU-014',
          plateNumber: 'B 4567 GH',
          description: 'Pickup ekonomis untuk pengiriman lokal',
        },
      }),
      prisma.armada.create({
        data: {
          model: 'Truk Mitsubishi Colt Diesel',
          id_sl: 'TRK-016',
          plateNumber: 'B 8901 IJ',
          description: 'Truk klasik untuk pengiriman material',
        },
      }),
      prisma.armada.create({
        data: {
          model: 'Pickup Suzuki Carry Pickup',
          id_sl: 'PU-015',
          plateNumber: 'B 2345 KL',
          description: 'Pickup serbaguna untuk berbagai jenis pengiriman',
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
      PERMISSION_ACTION.VERIFY_PLATE_MANUAL,
      PERMISSION_ACTION.CHANGE_CUSTOMER,
      PERMISSION_ACTION.REVISE_DO,
      PERMISSION_ACTION.UNARCHIVE,
      PERMISSION_ACTION.READ_ARCHIVED,
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
        // warehouseId: warehouses[0].id, // Assign only the first warehouse to admin
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
      // prisma.user.create({
      //   data: {
      //     email: 'sarah.manager@example.com',
      //     name: 'Sarah Johnson',
      //     password: defaultPassword,
      //     roleId: roles[1].id,
      //   },
      // }),
      // // Employees
      // prisma.user.create({
      //   data: {
      //     email: 'mike.employee@example.com',
      //     name: 'Mike Wilson',
      //     password: defaultPassword,
      //     roleId: roles[2].id,
      //   },
      // }),
      // prisma.user.create({
      //   data: {
      //     email: 'emma.employee@example.com',
      //     name: 'Emma Davis',
      //     password: defaultPassword,
      //     roleId: roles[2].id,
      //   },
      // }),
      // prisma.user.create({
      //   data: {
      //     email: 'alex.employee@example.com',
      //     name: 'Alex Johnson',
      //     password: defaultPassword,
      //     roleId: roles[2].id,
      //   },
      // }),
      // // Accountants
      // prisma.user.create({
      //   data: {
      //     email: 'lisa.accountant@example.com',
      //     name: 'Lisa Chen',
      //     password: defaultPassword,
      //     roleId: roles[3].id,
      //   },
      // }),
      // prisma.user.create({
      //   data: {
      //     email: 'robert.accountant@example.com',
      //     name: 'Robert Taylor',
      //     password: defaultPassword,
      //     roleId: roles[3].id,
      //     deletedAt: new Date(),
      //   },
      // }),
      // // Customers
      // prisma.user.create({
      //   data: {
      //     email: 'customer1@example.com',
      //     name: 'James Wilson',
      //     password: defaultPassword,
      //     roleId: roles[4].id,
      //     deletedAt: new Date(),
      //   },
      // }),
      // prisma.user.create({
      //   data: {
      //     email: 'customer2@example.com',
      //     name: 'Maria Garcia',
      //     password: defaultPassword,
      //     roleId: roles[4].id,
      //     deletedAt: new Date(),
      //   },
      // }),
    ]);

    // Log summary of created data
    console.log('Seed data created successfully:');
    console.log(`- Roles: ${roles.length}`);
    console.log(`- Users: ${users.length}`);
    console.log(`- Permissions: ${permissions.length}`);
    console.log(`- Admin permissions: ${adminPermissionAssignments.length}`);
    console.log(`- Manager permissions: ${managerPermissionAssignments.length}`);
    // console.log(`- Warehouses: ${warehouses.length}`);
    // console.log(`- Products: ${products.length}`);
    // console.log(`- Customers: ${customers.length}`);
    // console.log(`- Armadas: ${armadas.length}`);
    // console.log(`- Delivery Orders: ${deliveryOrders.length}`);
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
