import { createSectionSubPage } from "@/components/destination/createSectionSubPage";

const sub = createSectionSubPage({
  path: "where-to-stay",
  crumb: (dict) => dict.destination.sectionTitles["where-to-stay"],
  sectionIds: ["where-to-stay"],
  title: (name) => `Where to stay in ${name}`,
  description: (name, state) => `Areas to stay in ${name}, ${state}, what each suits, and what we have not verified yet.`
});

export const generateStaticParams = sub.generateStaticParams;
export const generateMetadata = sub.generateMetadata;
export default sub.Page;
