import { PrismaClient } from "@prisma/client";
import { createDemoDataset } from "../tests/fixtures/scenarios";

const prisma = new PrismaClient();

async function main() {
  console.log("Creating demo dataset...");

  // Create or get demo organization
  const org = await prisma.organization.upsert({
    where: { slug: "ordolix-demo" },
    update: {},
    create: {
      name: "Ordolix Demo",
      slug: "ordolix-demo",
      plan: "free",
    },
  });

  console.log(`Organization: ${org.name} (${org.id})`);

  const result = await createDemoDataset(prisma, org.id);

  console.log(`Created ${result.projects.length} projects and ${result.users.length} users.`);
  console.log("Demo seed complete.");
}

main()
  .catch((e) => {
    console.error("Demo seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
