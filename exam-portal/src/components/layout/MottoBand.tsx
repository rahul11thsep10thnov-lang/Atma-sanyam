/**
 * Replaces the old top navigation bar: the Sanskrit shloka (Tillana) on
 * the left and its Hindi explanation (Kalam) on the right. Plain
 * paragraphs rather than headings so the Devanagari faces stay in solid
 * ink instead of picking up the heading gradient.
 */
export function MottoBand() {
  return (
    <section aria-label="Motto" className="w-full border-b border-orange-200/70 bg-white/45">
      <div className="grid w-full grid-cols-1 gap-4 px-4 py-5 sm:px-8 lg:px-12 md:grid-cols-2 md:items-center md:gap-8">
        <p
          lang="sa"
          className="font-tillana text-xl leading-relaxed text-slate-900 md:text-2xl"
        >
          उद्यमेन हि सिध्यन्ति कार्याणि न मनोरथैः।
          <br />
          न हि सुप्तस्य सिंहस्य प्रविशन्ति मुखे मृगाः॥
        </p>
        <p
          lang="hi"
          className="font-kalam text-base leading-relaxed text-slate-700 md:text-right md:text-lg"
        >
          जिस प्रकार सोते हुए सिंह के मुँह में मृग स्वयं नहीं प्रवेश करता,
          <br />
          उसी प्रकार केवल इच्छा करने से सफलता प्राप्त नहीं होती है|
          <br />
          अपने कार्य को सिद्ध करने के लिए मेहनत करनी पड़ती है |
        </p>
      </div>
    </section>
  );
}
