import { PrismaClient } from "@prisma/client";
import { seedDefaults } from "../tests/fixtures/scenarios";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Create default organization
  const org = await prisma.organization.upsert({
    where: { slug: "default" },
    update: {},
    create: {
      name: "Default Organization",
      slug: "default",
      plan: "free",
    },
  });

  console.log(`Organization: ${org.name} (${org.id})`);

  // Seed all defaults for this organization
  await seedDefaults(prisma, org.id);

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
