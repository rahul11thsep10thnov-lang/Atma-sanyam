import { createSectionSubPage } from "@/components/destination/createSectionSubPage";

const sub = createSectionSubPage({
  path: "shopping",
  crumb: (dict) => dict.destination.sections.shopping,
  sectionIds: ["shopping"],
  title: (name) => `Shopping in ${name}`,
  description: (name, state) => `What to buy in ${name}, ${state}, and where — with authenticity notes and verification status.`
});

export const generateStaticParams = sub.generateStaticParams;
export const generateMetadata = sub.generateMetadata;
export default sub.Page;
