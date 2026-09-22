import Link from "next/link";

/** In-app privacy notice (build spec privacy section 31). */
export function PrivacyNotice() {
  return (
    <div className="rounded-md border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">
      Your teaching materials, generated lessons, audio and videos are stored
      according to your retention settings. Some content may be sent to
      configured AI or voice providers to perform requested generation.{" "}
      <Link href="/settings/privacy" className="underline font-medium">
        Review privacy &amp; retention settings
      </Link>
      .
    </div>
  );
}
