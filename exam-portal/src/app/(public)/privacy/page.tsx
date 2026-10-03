import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export const metadata: Metadata = { title: "Privacy Policy", alternates: { canonical: "/privacy" } };

export default function PrivacyPage() {
  return (
    <main className="flex w-full flex-col gap-4 px-4 py-8 sm:px-8 lg:px-12">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Privacy" }]} />
      <h1 className="text-2xl font-semibold">Privacy Policy</h1>
      <div className="flex max-w-4xl flex-col gap-3 text-sm leading-relaxed text-slate-700">
        <p><b>Accounts.</b> When you sign up we store your mobile number (verified by OTP), a hashed password, and the profile you give us (name, age, qualification, exams you are preparing for). We use it to run your account and, if you are a member, to send job-notification SMS. You can ask us to delete your account at any time.</p>
        <p><b>Payments.</b> Membership and Felicitation Board payments are processed by Razorpay. We never see or store your card, UPI or bank details — only the order and payment reference, amount and status.</p>
        <p><b>Felicitation Board.</b> Only your name, mohalla/locality, city and the exam you qualified are shown publicly, for the listing period. Your mobile number is used only for verification. For identity verification we take only the last four digits of your Aadhaar, store them encrypted, restrict them to the site administrator, never display them, and delete them 30 days after the listing ends.</p>
        <p><b>Advertising and cookies.</b> Non-members may see ads served by Google AdSense. Google and its partners use cookies to serve ads based on your visits to this and other websites. You can opt out of personalised advertising at <a className="text-brand-700 underline" href="https://adssettings.google.com" rel="noopener noreferrer" target="_blank">Google Ad Settings</a>. We use first-party cookies for sign-in and your language choice.</p>
        <p><b>Contact.</b> For any privacy request, use the contact details on this website.</p>
      </div>
    </main>
  );
}
