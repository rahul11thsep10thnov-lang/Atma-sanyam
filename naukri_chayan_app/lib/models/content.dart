import 'package:intl/intl.dart';
import 'package:material_ui/material_ui.dart';

/// The content sections of the website that have a public JSON API.
enum ContentKind {
  job('Jobs', 'Job', '/api/jobs', '/jobs', Icons.work_outline),
  result('Results', 'Result', '/api/results', '/results', Icons.emoji_events_outlined),
  admitCard('Admit Cards', 'Admit Card', '/api/admit-cards', '/admit-card', Icons.badge_outlined),
  answerKey('Answer Keys', 'Answer Key', '/api/answer-keys', '/answer-key', Icons.key_outlined),
  syllabus('Syllabus', 'Syllabus', '/api/syllabus', '/syllabus', Icons.menu_book_outlined),
  admission('Admissions', 'Admission', '/api/admissions', '/admission', Icons.school_outlined),
  scholarship('Scholarships', 'Scholarship', '/api/scholarships', '/scholarship', Icons.savings_outlined),
  article('Articles', 'Article', '/api/articles', '/articles', Icons.article_outlined),
  exam('Exams', 'Exam', '/api/exams', '/exam', Icons.event_note_outlined);

  const ContentKind(this.label, this.singular, this.apiPath, this.webPath, this.icon);

  final String label;
  final String singular;
  final String apiPath;
  final String webPath;
  final IconData icon;

  /// Kinds shown as tabs on the home screen (exams have no list endpoint).
  static const browsable = [job, result, admitCard, answerKey, syllabus, admission, scholarship, article];

  /// Maps a website path such as `/jobs/ssc-cgl-2026` to a kind + slug.
  static ({ContentKind kind, String slug})? fromHref(String href) {
    final segments = Uri.parse(href).pathSegments.where((s) => s.isNotEmpty).toList();
    if (segments.length != 2) return null;
    for (final k in ContentKind.values) {
      if (k.webPath == '/${segments[0]}') return (kind: k, slug: segments[1]);
    }
    return null;
  }
}

// --- JSON helpers ----------------------------------------------------------

String? str(Map<String, dynamic>? m, String key) {
  final v = m?[key];
  if (v == null) return null;
  final s = v.toString().trim();
  return s.isEmpty ? null : s;
}

Map<String, dynamic>? obj(Map<String, dynamic>? m, String key) {
  final v = m?[key];
  return v is Map ? Map<String, dynamic>.from(v) : null;
}

List<Map<String, dynamic>> objList(Map<String, dynamic>? m, String key) {
  final v = m?[key];
  return v is List ? v.whereType<Map>().map((e) => Map<String, dynamic>.from(e)).toList() : const [];
}

List<String> strList(Map<String, dynamic>? m, String key) {
  final v = m?[key];
  return v is List ? v.where((e) => e != null).map((e) => e.toString()).where((s) => s.trim().isNotEmpty).toList() : const [];
}

DateTime? date(Map<String, dynamic>? m, String key) {
  final s = str(m, key);
  return s == null ? null : DateTime.tryParse(s);
}

final _dateFmt = DateFormat('dd MMM yyyy', 'en_IN');

/// Same rendering as the site's `formatDate` (en-IN, "05 Jan 2027"),
/// shown in UTC because the site stores dates as UTC midnight.
String? formatDate(DateTime? d) => d == null ? null : _dateFmt.format(d.toUtc());

// --- Deadline engine (port of src/lib/deadline.ts) -------------------------

enum DeadlineTone { green, amber, red, slate }

class DeadlineInfo {
  const DeadlineInfo(this.label, this.labelHi, this.tone, this.daysLeft);
  final String label;
  final String labelHi;
  final DeadlineTone tone;
  final int? daysLeft;
}

const closingSoonDays = 7;

int _utcDay(DateTime d) {
  final u = d.toUtc();
  return DateTime.utc(u.year, u.month, u.day).millisecondsSinceEpoch ~/ 86400000;
}

DeadlineInfo deadlineInfo(DateTime? endDate, {DateTime? now}) {
  if (endDate == null) return const DeadlineInfo('Last date not announced', 'अंतिम तिथि घोषित नहीं', DeadlineTone.slate, null);
  final daysLeft = _utcDay(endDate) - _utcDay(now ?? DateTime.now());
  if (daysLeft < 0) return DeadlineInfo('Applications closed', 'आवेदन बंद', DeadlineTone.slate, daysLeft);
  if (daysLeft == 0) return DeadlineInfo('Last day to apply — today', 'आवेदन का आज अंतिम दिन', DeadlineTone.red, daysLeft);
  if (daysLeft <= closingSoonDays) {
    return DeadlineInfo('$daysLeft day${daysLeft == 1 ? '' : 's'} left to apply', 'आवेदन के लिए $daysLeft दिन शेष', DeadlineTone.amber, daysLeft);
  }
  return DeadlineInfo('$daysLeft days left to apply', 'आवेदन के लिए $daysLeft दिन शेष', DeadlineTone.green, daysLeft);
}

// --- Card summaries for each list endpoint ---------------------------------

class ListSummary {
  const ListSummary({required this.title, required this.slug, this.subtitle, this.dateLabel, this.deadline, this.extra});
  final String title;
  final String slug;
  final String? subtitle;
  final String? dateLabel;
  final DateTime? deadline;
  final String? extra;
}

ListSummary summarize(ContentKind kind, Map<String, dynamic> m) {
  final title = str(m, 'title') ?? 'Untitled';
  final slug = str(m, 'slug') ?? '';
  String? labelled(String label, String key) {
    final d = formatDate(date(m, key));
    return d == null ? null : '$label: $d';
  }

  switch (kind) {
    case ContentKind.job:
      final vac = m['vacancies'];
      return ListSummary(
        title: title,
        slug: slug,
        subtitle: str(m, 'organizationName'),
        deadline: date(m, 'applicationEndDate'),
        extra: vac is num ? '$vac vacancies' : null,
      );
    case ContentKind.result:
      return ListSummary(title: title, slug: slug, subtitle: str(m, 'examTitle'), dateLabel: labelled('Result date', 'resultDate'));
    case ContentKind.admitCard:
      return ListSummary(
        title: title,
        slug: slug,
        subtitle: str(m, 'examTitle'),
        dateLabel: [labelled('Released', 'releaseDate'), labelled('Exam', 'examDate')].whereType<String>().join(' · '),
      );
    case ContentKind.answerKey:
      return ListSummary(title: title, slug: slug, subtitle: str(m, 'examTitle'), dateLabel: labelled('Released', 'answerKeyDate'));
    case ContentKind.syllabus:
      return ListSummary(title: title, slug: slug, subtitle: str(m, 'examTitle'));
    case ContentKind.admission:
      return ListSummary(title: title, slug: slug, subtitle: str(obj(m, 'organization'), 'name'), deadline: date(m, 'applicationEndDate'));
    case ContentKind.scholarship:
      return ListSummary(
        title: title,
        slug: slug,
        subtitle: str(obj(m, 'organization'), 'name'),
        deadline: date(m, 'applicationEndDate'),
        extra: str(m, 'amount'),
      );
    case ContentKind.article:
      return ListSummary(title: title, slug: slug, dateLabel: labelled('Published', 'publishedAt'));
    case ContentKind.exam:
      return ListSummary(title: title, slug: slug, deadline: date(m, 'applicationEndDate'));
  }
}

// --- Structured job fields (port of readPosts/readFees/readDates) ----------

class PostRow {
  const PostRow(this.name, this.eligibility, this.vacancies);
  final String name;
  final String eligibility;
  final int? vacancies;
}

List<PostRow> readPosts(dynamic v) => v is List
    ? v
          .whereType<Map>()
          .map((r) => PostRow('${r['name'] ?? ''}', '${r['eligibility'] ?? ''}', r['vacancies'] is num ? (r['vacancies'] as num).toInt() : null))
          .where((r) => r.name.isNotEmpty)
          .toList()
    : const [];

List<(String, String)> readFees(dynamic v) {
  if (v is Map) return v.entries.map((e) => ('${e.key}', '${e.value}')).toList();
  if (v is List) {
    return v.whereType<Map>().map((r) => ('${r['category'] ?? ''}', '${r['fee'] ?? ''}')).where((r) => r.$1.isNotEmpty).toList();
  }
  return const [];
}

List<(String, String)> readDates(dynamic v) =>
    v is List ? v.whereType<Map>().map((r) => ('${r['label'] ?? ''}', '${r['date'] ?? ''}')).where((r) => r.$1.isNotEmpty).toList() : const [];
