/**
 * Image hosts whose files next/image may optimise (mirrors images.remotePatterns in next.config.mjs).
 * Unsplash and Pixabay are deliberately absent: Unsplash photos must be served from Unsplash's own URLs
 * (not re-hosted by our optimiser), and Pixabay images are only ever shown from our own storage.
 */
export const OPTIMISED_IMAGE_HOSTS = ["upload.wikimedia.org", "commons.wikimedia.org", "images.pexels.com", "cloudfront.net", "amazonaws.com"];
