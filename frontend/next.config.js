/** @type {import('next').NextConfig} */
const nextConfig = {
  // BACKEND_API_URL / BACKEND_API_TOKEN are read server-side only (in
  // app/api/proxy and server components) and are never exposed to the
  // client bundle: no NEXT_PUBLIC_* prefix, never passed as props.
  reactStrictMode: true,
};

module.exports = nextConfig;
