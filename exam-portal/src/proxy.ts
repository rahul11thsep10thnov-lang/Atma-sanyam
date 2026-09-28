import { withAuth } from "next-auth/middleware";

/**
 * Redirects unauthenticated visitors away from `/admin/*` before the page
 * even renders. This is a UX/defense-in-depth layer, not the real
 * authorization boundary — every admin Server Component/Server Action/API
 * route still calls `requireAdmin`/`requireAdminApi` itself (Section 16:
 * enforce server-side, not just by controlling navigation).
 */
export default withAuth({
  pages: {
    signIn: "/admin/login",
  },
});

export const config = {
  matcher: ["/admin", "/admin/((?!login).*)"],
};
