import { createSectionSubPage } from "@/components/destination/createSectionSubPage";

const sub = createSectionSubPage({
  path: "weather",
  crumb: (dict) => dict.destination.sections.weather,
  sectionIds: ["best-time","weather"],
  heading: (dict, name) => dict.destination.sectionTitles.weather,
  title: (name) => `Weather and best time to visit ${name}`,
  description: (name, state) => `Monthly climate, the best time to visit ${name}, ${state}, and a live forecast.`,
  withLiveWeather: true
});

export const generateStaticParams = sub.generateStaticParams;
export const generateMetadata = sub.generateMetadata;
export default sub.Page;
