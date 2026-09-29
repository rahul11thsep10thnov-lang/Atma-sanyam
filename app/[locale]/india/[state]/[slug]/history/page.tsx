import { createSectionSubPage } from "@/components/destination/createSectionSubPage";

const sub = createSectionSubPage({
  path: "history",
  crumb: (dict) => dict.destination.sections.history,
  sectionIds: ["story","periods","today"],
  title: (name) => `History of ${name}`,
  description: (name, state) => `The ancient and historical story of ${name}, ${state} — traditions are kept separate from documented history.`
});

export const generateStaticParams = sub.generateStaticParams;
export const generateMetadata = sub.generateMetadata;
export default sub.Page;
