import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@prisma/client";
import { seedDefaults } from "../tests/fixtures/scenarios";

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");

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

  await seedDefaults(prisma, org.id);

  // Create dev user for local development auth bypass
  const devUser = await prisma.user.upsert({
    where: { email: "dev@ordolix.local" },
    update: {},
    create: {
      name: "Dev User",
      email: "dev@ordolix.local",
    },
  });

  await prisma.organizationMember.upsert({
    where: {
      organizationId_userId: {
        organizationId: org.id,
        userId: devUser.id,
      },
    },
    update: {},
    create: {
      organizationId: org.id,
      userId: devUser.id,
      role: "administrator",
    },
  });

  console.log(`Dev user: ${devUser.email} (${devUser.id})`);
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
