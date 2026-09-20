import { placeholderImage } from "@/lib/data/placeholder";
import type { ImageAsset } from "@/lib/types";

export interface UpcomingFestival {
  id: string;
  name: string;
  month: string;
  description: string;
  destinationSlug: string;
  destinationName: string;
  image: ImageAsset;
}

/**
 * A small curated cross-destination festival calendar for the homepage
 * "Upcoming Festivals" rail. Per-destination festival details also live
 * inside each Destination record (destination.festivals).
 */
export const upcomingFestivals: UpcomingFestival[] = [
  {
    id: "fest-dev-deepawali",
    name: "Dev Deepawali",
    month: "November",
    description: "Lakhs of lamps light every ghat in Varanasi on Kartik Purnima.",
    destinationSlug: "varanasi",
    destinationName: "Varanasi",
    image: placeholderImage("Dev Deepawali Varanasi", 800, 600)
  },
  {
    id: "fest-kullu-dussehra",
    name: "Kullu Dussehra",
    month: "October",
    description: "An internationally recognised week-long Dussehra celebration near Manali.",
    destinationSlug: "manali",
    destinationName: "Manali",
    image: placeholderImage("Kullu Dussehra procession", 800, 600)
  },
  {
    id: "fest-jaipur-litfest",
    name: "Jaipur Literature Festival",
    month: "January",
    description: "One of the world's largest free literary gatherings.",
    destinationSlug: "jaipur",
    destinationName: "Jaipur",
    image: placeholderImage("Jaipur Literature Festival", 800, 600)
  },
  {
    id: "fest-goa-carnival",
    name: "Goa Carnival",
    month: "February/March",
    description: "A colourful pre-Lenten street parade across Goa's towns.",
    destinationSlug: "goa",
    destinationName: "Goa",
    image: placeholderImage("Goa Carnival parade", 800, 600)
  },
  {
    id: "fest-durga-puja",
    name: "Durga Puja",
    month: "September/October",
    description: "Kolkata's grandest festival, with elaborate neighbourhood pandals.",
    destinationSlug: "kolkata",
    destinationName: "Kolkata",
    image: placeholderImage("Durga Puja pandal Kolkata", 800, 600)
  },
  {
    id: "fest-mysuru-dasara",
    name: "Mysuru Dasara",
    month: "September/October",
    description: "A royal 10-day festival with a grand procession and palace illumination.",
    destinationSlug: "mysuru",
    destinationName: "Mysuru",
    image: placeholderImage("Mysuru Dasara procession", 800, 600)
  }
];
