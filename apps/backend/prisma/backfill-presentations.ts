// Backfill único: crea la presentación base "Unidad" (unitsPerSale: 1,
// precio = precio del producto) para todo producto que aún no tenga ninguna.
// Ejecutar: npx dotenv-cli -e ../../.env -- npx ts-node prisma/backfill-presentations.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const products = await prisma.product.findMany({
    where: { presentations: { none: {} } },
  });

  for (const p of products) {
    await prisma.presentation.create({
      data: {
        productId: p.id,
        name: 'Unidad',
        unitsPerSale: 1,
        price: p.price,
      },
    });
    console.log(`✔ ${p.name} → presentación "Unidad" (Bs ${p.price})`);
  }

  console.log(`\nListo: ${products.length} producto(s) actualizados.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
