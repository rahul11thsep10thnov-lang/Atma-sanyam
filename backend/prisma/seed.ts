import { Prisma, PrismaClient } from "@prisma/client";
import { SUPPORTED_LANGUAGES } from "../src/data/languages";
import { INDIA_STATES } from "../src/data/indiaLocations";
import { BASE_VOICES } from "../src/studio/media/voiceCatalog";
import { DEFAULT_PROVIDER_CONFIGS } from "../src/studio/providers/defaults";
import { DEFAULT_MODELS } from "../src/studio/models/defaultModels";
import { DEFAULT_RENDER_PROFILES } from "../src/studio/engine25d/profiles";

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

  // Video Studio: the reusable base voices. Provider voice IDs start empty
  // and are filled in from the admin console (Voices page); existing IDs
  // are never overwritten by a re-seed.
  for (const voice of BASE_VOICES) {
    await prisma.voice.upsert({
      where: { code: voice.code },
      update: { label: voice.label, gender: voice.gender, ageGroup: voice.ageGroup, tone: voice.tone, description: voice.description, isNarratorEligible: voice.isNarratorEligible },
      create: { ...voice, providerVoiceIds: {} },
    });
  }
  console.log(`Seeded ${BASE_VOICES.length} studio base voices.`);

  for (const config of DEFAULT_PROVIDER_CONFIGS) {
    await prisma.providerConfig.upsert({
      where: { kind_key: { kind: config.kind, key: config.key } },
      update: {},
      create: config,
    });
  }
  console.log(`Seeded ${DEFAULT_PROVIDER_CONFIGS.length} studio provider configs.`);

  // Cinematic 2.5D: render profiles and the model registry. Existing rows are
  // never overwritten — admins own them after the first seed.
  for (const profile of DEFAULT_RENDER_PROFILES) {
    await prisma.renderProfile.upsert({ where: { key: profile.key }, update: {}, create: profile });
  }
  console.log(`Seeded ${DEFAULT_RENDER_PROFILES.length} render profiles.`);
  for (const { licenseVerifiedAt, config, ...model } of DEFAULT_MODELS) {
    await prisma.aiModel.upsert({
      where: { modelId: model.modelId },
      update: {},
      create: { ...model, licenseVerifiedAt: licenseVerifiedAt ? new Date(licenseVerifiedAt) : null, config: (config ?? undefined) as Prisma.InputJsonValue | undefined },
    });
  }
  console.log(`Seeded ${DEFAULT_MODELS.length} AI models in the model registry.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
