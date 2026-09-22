import { UploadForm } from "./UploadForm";

export default function NewLessonPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">New Lesson</h1>
        <p className="text-sm text-slate-500 mt-1">
          Upload a document or paste text. Supported formats: .txt, .pdf, .docx.
        </p>
      </div>
      <UploadForm />
    </div>
  );
}
