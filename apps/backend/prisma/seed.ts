import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed...');

  // Dueño
  const dueno = await prisma.user.upsert({
    where: { email: 'dueno@billarmania.bo' },
    update: {},
    create: {
      email: 'dueno@billarmania.bo',
      name: 'Carlos Mamani',
      passwordHash: await bcrypt.hash('admin123', 10),
      role: 'DUENO',
    },
  });

  // Cadena
  const chain = await prisma.chain.upsert({
    where: { id: 'chain-demo-001' },
    update: {},
    create: {
      id: 'chain-demo-001',
      name: 'Springfield Billiards',
      ownerId: dueno.id,
    },
  });

  // Sucursal Centro
  const branch = await prisma.branch.upsert({
    where: { id: 'branch-demo-001' },
    update: {},
    create: {
      id: 'branch-demo-001',
      chainId: chain.id,
      name: 'Sucursal Centro',
      address: 'Av. Montes 123, La Paz',
      openTime: '10:00',
      closeTime: '02:00',
      latitude: -16.5,
      longitude: -68.15,
      depositAmount: 20,
    },
  });

  // Cajero
  const cajero = await prisma.user.upsert({
    where: { email: 'cajero@billarmania.bo' },
    update: {},
    create: {
      email: 'cajero@billarmania.bo',
      name: 'Ana López',
      passwordHash: await bcrypt.hash('cajero123', 10),
      role: 'CAJERO',
      staffBranchId: branch.id,
    },
  });

  // Mesas (8 mesas)
  const mesas = [
    { label: 'Mesa 1', status: 'LIBRE' },
    { label: 'Mesa 2', status: 'OCUPADA' },
    { label: 'Mesa 3', status: 'LIBRE' },
    { label: 'Mesa 4', status: 'RESERVADA' },
    { label: 'Mesa 5', status: 'LIBRE' },
    { label: 'Mesa 6', status: 'LIBRE' },
    { label: 'Mesa 7', status: 'OCUPADA' },
    { label: 'Mesa 8', status: 'FUERA_DE_SERVICIO' },
  ] as const;

  for (const [i, mesa] of mesas.entries()) {
    await prisma.table.upsert({
      where: { id: `table-demo-${i + 1}` },
      update: { status: mesa.status },
      create: {
        id: `table-demo-${i + 1}`,
        branchId: branch.id,
        label: mesa.label,
        status: mesa.status,
        hourlyRate: 15,
      },
    });
  }

  // Método de pago QR
  await prisma.paymentMethod.upsert({
    where: { id: 'pm-demo-001' },
    update: {},
    create: {
      id: 'pm-demo-001',
      branchId: branch.id,
      type: 'QR_BANCARIO',
      displayName: 'QR Banco BNB',
      accountInfo: 'Springfield Billiards S.R.L.',
    },
  });

  console.log('✅ Seed completado');
  console.log('');
  console.log('  Usuarios creados:');
  console.log(`  - Cajero: cajero@billarmania.bo / cajero123`);
  console.log(`  - Dueño:  dueno@billarmania.bo  / admin123`);
  console.log('');
  console.log(`  Sucursal: ${branch.name} (id: ${branch.id})`);
  console.log(`  Mesas: 8 mesas con distintos estados`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
