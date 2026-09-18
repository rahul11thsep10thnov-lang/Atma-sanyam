import type { Metadata } from "next";
import Link from "next/link";
import { Mail } from "lucide-react";

export const metadata: Metadata = {
  title: "Contact Us",
  description: "PoliceExams team se contact karein — sawal, suggestion ya feedback ke liye.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <div className="container-page py-10 max-w-xl">
      <h1 className="text-2xl font-extrabold text-gray-900 mb-4">Contact Us</h1>
      <p className="text-sm text-gray-700 leading-relaxed mb-6">
        Koi sawal, suggestion ya feedback hai? Humein batayein — hum aapki
        madad ke liye yahan hain.
      </p>
      <div className="card p-5 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-brand-navy">
          <Mail size={18} />
        </span>
        <div>
          <p className="text-sm font-semibold text-gray-900">Email</p>
          <p className="text-sm text-gray-600">support@policeexams.example.com</p>
        </div>
      </div>
      <p className="text-xs text-gray-400 mt-6">
        Kisi galat question ya content ke liye, please{" "}
        <Link href="/report-error" className="underline text-brand-navy">
          Report an Error
        </Link>{" "}
        page use karein.
      </p>
    </div>
  );
}
