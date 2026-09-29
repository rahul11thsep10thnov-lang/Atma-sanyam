import { createSectionSubPage } from "@/components/destination/createSectionSubPage";

const sub = createSectionSubPage({
  path: "food",
  crumb: (dict) => dict.destination.sections.food,
  sectionIds: ["local-food"],
  title: (name) => `Local food in ${name}`,
  description: (name, state) => `Dishes and food places to look for in ${name}, ${state}, with verification status for every claim.`
});

export const generateStaticParams = sub.generateStaticParams;
export const generateMetadata = sub.generateMetadata;
export default sub.Page;
