import { PrismaClient } from "@prisma/client";
import { SUPPORTED_LANGUAGES } from "../src/data/languages";
import { INDIA_STATES } from "../src/data/indiaLocations";

const prisma = new PrismaClient();

async function main() {
  for (const lang of SUPPORTED_LANGUAGES) {
    await prisma.language.upsert({
      where: { code: lang.code },
      update: { englishName: lang.englishName, nativeName: lang.nativeName, isDefault: !!lang.isDefault },
      create: {
        code: lang.code,
        englishName: lang.englishName,
        nativeName: lang.nativeName,
        isDefault: !!lang.isDefault,
      },
    });
  }
  console.log(`Seeded ${SUPPORTED_LANGUAGES.length} languages.`);

  for (const state of INDIA_STATES) {
    for (const district of state.districts) {
      const existing = await prisma.location.findFirst({ where: { state: state.name, district, city: null } });
      if (!existing) {
        await prisma.location.create({ data: { state: state.name, district, city: null } });
      }
    }
  }
  console.log(`Seeded ${INDIA_STATES.length} states/UTs with districts.`);

  await prisma.pipelineConfig.upsert({
    where: { key: "MIN_FAMILY_RELEVANCE_SCORE" },
    update: {},
    create: { key: "MIN_FAMILY_RELEVANCE_SCORE", value: "60" },
  });
  await prisma.pipelineConfig.upsert({
    where: { key: "MIN_VIDEO_SUITABILITY_SCORE" },
    update: {},
    create: { key: "MIN_VIDEO_SUITABILITY_SCORE", value: "70" },
  });
  await prisma.pipelineConfig.upsert({
    where: { key: "MIN_QUALITY_SCORE" },
    update: {},
    create: { key: "MIN_QUALITY_SCORE", value: "70" },
  });
  await prisma.pipelineConfig.upsert({
    where: { key: "AUTO_PUBLISH_ENABLED" },
    update: {},
    create: { key: "AUTO_PUBLISH_ENABLED", value: "false" },
  });
  console.log("Seeded default pipeline thresholds.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
