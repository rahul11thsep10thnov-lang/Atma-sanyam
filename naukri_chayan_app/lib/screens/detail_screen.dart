import 'package:material_ui/material_ui.dart';
import 'package:url_launcher/url_launcher.dart';

import '../api/api_client.dart';
import '../app_scope.dart';
import '../models/content.dart';
import '../theme/app_theme.dart';
import '../widgets/common.dart';

/// One detail page for every content type, mirroring the site's
/// `/jobs/[slug]`, `/results/[slug]`, … pages via `/api/<type>/<slug>`.
class DetailScreen extends StatefulWidget {
  const DetailScreen({super.key, required this.kind, required this.slug});
  final ContentKind kind;
  final String slug;

  @override
  State<DetailScreen> createState() => _DetailScreenState();
}

class _DetailScreenState extends State<DetailScreen> {
  Future<Map<String, dynamic>>? _future;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _future ??= _load();
  }

  Future<Map<String, dynamic>> _load() => AppScope.of(context).api.detail('${widget.kind.apiPath}/${Uri.encodeComponent(widget.slug)}');

  void _retry() => setState(() => _future = _load());

  Uri get _webUri => AppScope.of(context).config.webUri('${widget.kind.webPath}/${widget.slug}');

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.kind.singular),
        actions: [
          IconButton(
            tooltip: 'Open on website',
            icon: const Icon(Icons.public),
            onPressed: () => launchUrl(_webUri, mode: LaunchMode.externalApplication),
          ),
        ],
      ),
      body: FutureBuilder<Map<String, dynamic>>(
        future: _future,
        builder: (context, snap) {
          if (snap.connectionState != ConnectionState.done) return const LoadingView();
          if (snap.hasError) {
            final e = snap.error;
            if (e is ApiException && e.isNotFound) {
              return const MessageView(icon: Icons.search_off, title: 'Not found', message: 'This page may have been removed or not yet published.');
            }
            return ErrorView(error: e!, onRetry: _retry);
          }
          return RefreshIndicator(
            onRefresh: () async {
              _retry();
              await _future;
            },
            child: ListView(padding: const EdgeInsets.fromLTRB(16, 16, 16, 32), children: _buildBody(context, snap.data!)),
          );
        },
      ),
    );
  }

  List<Widget> _buildBody(BuildContext context, Map<String, dynamic> data) {
    final sections = switch (widget.kind) {
      ContentKind.job => _job(data),
      ContentKind.result => _result(data),
      ContentKind.admitCard => _admitCard(data),
      ContentKind.answerKey => _answerKey(data),
      ContentKind.syllabus => _syllabus(data),
      ContentKind.admission => _admission(data),
      ContentKind.scholarship => _scholarship(data),
      ContentKind.article => _article(data),
      ContentKind.exam => _exam(data),
    };
    return [
      for (final w in sections) ...[w, const SizedBox(height: 14)],
      const _Disclaimer(),
    ];
  }

  // ---- shared pieces -----------------------------------------------------

  Widget _header(String title, {String? subtitle, DateTime? deadline, bool showDeadline = false}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        GradientHeading(title, size: 24),
        if (subtitle != null) ...[
          const SizedBox(height: 6),
          Text(
            subtitle,
            style: const TextStyle(color: Brand.slate700, fontSize: 15, fontWeight: FontWeight.w600),
          ),
        ],
        if (showDeadline) ...[const SizedBox(height: 10), DeadlineBadge(endDate: deadline)],
      ],
    );
  }

  Widget? _description(Map<String, dynamic> m) {
    final d = str(m, 'description');
    return d == null
        ? null
        : SectionCard(
            title: 'Overview',
            child: SelectableText(d, style: const TextStyle(height: 1.5)),
          );
  }

  Widget? _examLink(Map<String, dynamic>? exam) {
    final slug = str(exam, 'slug');
    if (slug == null) return null;
    return Card(
      child: ListTile(
        leading: const Icon(Icons.event_note_outlined, color: Brand.brown),
        title: Text(str(exam, 'title') ?? 'Exam', style: const TextStyle(fontWeight: FontWeight.w700)),
        subtitle: Text(str(obj(exam, 'organization'), 'name') ?? 'View exam details'),
        trailing: const Icon(Icons.chevron_right),
        onTap: () => openDetail(context, ContentKind.exam, slug),
      ),
    );
  }

  Widget? _related(String title, ContentKind kind, List<Map<String, dynamic>> items) => items.isEmpty
      ? null
      : SectionCard(
          title: title,
          child: RelatedList(kind: kind, items: items),
        );

  Widget? _links(String title, List<Widget> tiles) {
    final shown = tiles.where((t) => t is! LinkTile || (t.url?.isNotEmpty ?? false)).toList();
    return shown.isEmpty
        ? null
        : SectionCard(
            title: title,
            child: Column(children: shown),
          );
  }

  String? _d(Map<String, dynamic>? m, String key) => formatDate(date(m, key));

  // ---- per-type layouts --------------------------------------------------

  List<Widget> _job(Map<String, dynamic> data) {
    final job = obj(data, 'job') ?? data;
    final org = obj(job, 'organization');
    final exam = obj(job, 'exam');
    final posts = readPosts(job['posts']);
    final fees = readFees(job['applicationFeeByCategory']);
    final dates = readDates(job['importantDates']);
    final selection = strList(job, 'selectionProcess');
    final ageMin = job['ageLimitMin'], ageMax = job['ageLimitMax'];
    final age = (ageMin is num || ageMax is num) ? "${[if (ageMin is num) '$ageMin', if (ageMax is num) '$ageMax'].join(' – ')} years" : null;
    final fee = str(job, 'applicationFee');
    final totalVac = posts.where((p) => p.vacancies != null).fold<int?>(null, (a, p) => (a ?? 0) + p.vacancies!);
    final vacancies = job['vacancies'] is num ? '${job['vacancies']}' : totalVac?.toString();
    final links = objList(job, 'importantLinks');
    final doc = obj(job, 'notificationDocument');

    return [
      _header(str(job, 'title') ?? '', subtitle: str(org, 'name'), deadline: date(job, 'applicationEndDate'), showDeadline: true),
      if (str(job, 'applyUrl') != null) LinkTile(label: 'Apply online', url: str(job, 'applyUrl'), icon: Icons.how_to_reg, primary: true),
      SectionCard(
        title: 'At a glance',
        child: InfoTable(
          rows: [
            ('Organisation', str(org, 'name')),
            ('Advertisement no.', str(job, 'advertisementNumber')),
            ('Total vacancies', vacancies),
            ('Qualification', str(job, 'qualification')),
            ('Age limit', age),
            ('Application fee', fee == null ? null : '₹$fee'),
            ('Salary', str(job, 'salary')),
            ('Last date to apply', _d(job, 'applicationEndDate')),
            ('Exam date', _d(exam, 'examDate')),
            ('Category', str(obj(exam, 'category'), 'name')),
            ('State', str(obj(exam, 'state'), 'name')),
          ],
        ),
      ),
      ?_description(job),
      if (dates.isNotEmpty)
        SectionCard(
          title: 'Important dates',
          child: InfoTable(rows: [for (final d in dates) (d.$1, d.$2)]),
        ),
      if (fees.isNotEmpty)
        SectionCard(
          title: 'Application fee',
          child: InfoTable(rows: [for (final f in fees) (f.$1, f.$2)]),
        ),
      if (posts.isNotEmpty)
        SectionCard(
          title: 'Vacancy details',
          child: Column(
            children: [
              for (final p in posts)
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  title: Text(p.name, style: const TextStyle(fontWeight: FontWeight.w700)),
                  subtitle: p.eligibility.isEmpty ? null : Text(p.eligibility),
                  trailing: p.vacancies == null
                      ? null
                      : Text(
                          '${p.vacancies}',
                          style: const TextStyle(fontWeight: FontWeight.w800, color: Brand.teal700, fontSize: 16),
                        ),
                ),
            ],
          ),
        ),
      if (str(job, 'eligibility') != null)
        SectionCard(
          title: 'Eligibility',
          child: SelectableText(str(job, 'eligibility')!, style: const TextStyle(height: 1.5)),
        ),
      if (selection.isNotEmpty)
        SectionCard(
          title: 'Selection process',
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              for (var i = 0; i < selection.length; i++)
                Padding(padding: const EdgeInsets.symmetric(vertical: 3), child: Text('${i + 1}. ${selection[i]}')),
            ],
          ),
        ),
      ?_links('Important links', [
        LinkTile(label: 'Download official notification', url: str(doc, 'storageUrl'), icon: Icons.picture_as_pdf_outlined),
        LinkTile(label: 'Official website', url: str(job, 'officialWebsite') ?? str(org, 'website')),
        LinkTile(label: 'Syllabus (official)', url: str(job, 'syllabusUrl')),
        LinkTile(label: 'Exam pattern (official)', url: str(job, 'examPatternUrl')),
        for (final l in links) LinkTile(label: str(l, 'label') ?? 'Link', url: str(l, 'url')),
      ]),
      ?_examLink(exam),
      ?_related('Syllabus', ContentKind.syllabus, objList(exam, 'syllabi')),
      ?_related('Admit card', ContentKind.admitCard, objList(exam, 'admitCards').map((e) => {...e, 'title': e['title'] ?? 'Admit card'}).toList()),
      ?_related('Answer key', ContentKind.answerKey, objList(exam, 'answerKeys').map((e) => {...e, 'title': e['title'] ?? 'Answer key'}).toList()),
      ?_related('Result', ContentKind.result, objList(exam, 'results').map((e) => {...e, 'title': e['title'] ?? 'Result'}).toList()),
      ?_related('Related jobs', ContentKind.job, objList(data, 'relatedJobs')),
    ];
  }

  List<Widget> _result(Map<String, dynamic> data) {
    final r = obj(data, 'result') ?? data;
    final exam = obj(r, 'exam');
    final ac = obj(r, 'relatedAdmitCard');
    final ak = obj(r, 'relatedAnswerKey');
    return [
      _header(str(r, 'title') ?? '', subtitle: str(obj(exam, 'organization'), 'name')),
      LinkTile(label: 'Check result', url: str(r, 'resultUrl'), icon: Icons.emoji_events_outlined, primary: true),
      SectionCard(
        title: 'Details',
        child: InfoTable(rows: [('Exam', str(exam, 'title')), ('Result date', _d(r, 'resultDate'))]),
      ),
      ?_description(r),
      ?_links('Important links', [LinkTile(label: 'Official website', url: str(r, 'officialWebsite'))]),
      ?_examLink(exam),
      if (ac != null && str(ac, 'status') == 'PUBLISHED') ?_related('Admit card', ContentKind.admitCard, [ac]),
      if (ak != null && str(ak, 'status') == 'PUBLISHED') ?_related('Answer key', ContentKind.answerKey, [ak]),
      ?_related('Other results', ContentKind.result, objList(data, 'relatedResults')),
    ];
  }

  List<Widget> _admitCard(Map<String, dynamic> data) {
    final a = obj(data, 'admitCard') ?? data;
    final exam = obj(a, 'exam');
    return [
      _header(str(a, 'title') ?? '', subtitle: str(obj(exam, 'organization'), 'name')),
      LinkTile(label: 'Download admit card', url: str(a, 'downloadUrl'), icon: Icons.download, primary: true),
      SectionCard(
        title: 'Details',
        child: InfoTable(rows: [('Exam', str(exam, 'title')), ('Release date', _d(a, 'releaseDate')), ('Exam date', _d(a, 'examDate'))]),
      ),
      ?_description(a),
      if (str(a, 'instructions') != null)
        SectionCard(
          title: 'Instructions',
          child: SelectableText(str(a, 'instructions')!, style: const TextStyle(height: 1.5)),
        ),
      ?_links('Important links', [LinkTile(label: 'Official website', url: str(a, 'officialWebsite'))]),
      ?_examLink(exam),
      ?_related('Answer keys', ContentKind.answerKey, objList(data, 'relatedAnswerKeys')),
      ?_related('Results', ContentKind.result, objList(a, 'results')),
    ];
  }

  List<Widget> _answerKey(Map<String, dynamic> data) {
    final a = obj(data, 'answerKey') ?? data;
    final exam = obj(a, 'exam');
    return [
      _header(str(a, 'title') ?? '', subtitle: str(obj(exam, 'organization'), 'name')),
      LinkTile(label: 'View answer key', url: str(a, 'answerKeyUrl'), icon: Icons.key, primary: true),
      SectionCard(
        title: 'Details',
        child: InfoTable(
          rows: [('Exam', str(exam, 'title')), ('Answer key date', _d(a, 'answerKeyDate')), ('Objection deadline', _d(a, 'objectionDeadline'))],
        ),
      ),
      ?_description(a),
      if (str(a, 'objectionInfo') != null)
        SectionCard(
          title: 'Raising objections',
          child: SelectableText(str(a, 'objectionInfo')!, style: const TextStyle(height: 1.5)),
        ),
      ?_examLink(exam),
      ?_related('Admit cards', ContentKind.admitCard, objList(data, 'relatedAdmitCards')),
      ?_related('Results', ContentKind.result, objList(a, 'results')),
    ];
  }

  List<Widget> _syllabus(Map<String, dynamic> s) {
    final exam = obj(s, 'exam');
    final papers = objList(s, 'papers');
    return [
      _header(str(s, 'title') ?? '', subtitle: str(exam, 'title')),
      ?_description(s),
      if (papers.isEmpty) const SectionCard(title: 'Syllabus', child: Text('The detailed syllabus has not been added yet.')),
      for (final p in papers)
        SectionCard(
          title: str(p, 'name') ?? 'Paper',
          child: Column(
            children: [
              for (final sub in objList(p, 'subjects'))
                Theme(
                  data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
                  child: ExpansionTile(
                    tilePadding: EdgeInsets.zero,
                    title: Text(
                      str(sub, 'name') ?? 'Subject',
                      style: const TextStyle(fontWeight: FontWeight.w700, color: Brand.brownDark),
                    ),
                    childrenPadding: const EdgeInsets.only(left: 8, bottom: 8),
                    expandedCrossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      for (final t in objList(sub, 'topics'))
                        Padding(
                          padding: const EdgeInsets.symmetric(vertical: 4),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('• ${str(t, 'name') ?? ''}', style: const TextStyle(fontWeight: FontWeight.w600)),
                              for (final st in strList(t, 'subtopics'))
                                Padding(
                                  padding: const EdgeInsets.only(left: 16, top: 2),
                                  child: Text('– $st', style: const TextStyle(color: Brand.slate700)),
                                ),
                            ],
                          ),
                        ),
                    ],
                  ),
                ),
            ],
          ),
        ),
      ?_examLink(exam),
    ];
  }

  List<Widget> _admission(Map<String, dynamic> a) {
    return [
      _header(str(a, 'title') ?? '', subtitle: str(obj(a, 'organization'), 'name'), deadline: date(a, 'applicationEndDate'), showDeadline: true),
      SectionCard(
        title: 'Details',
        child: InfoTable(
          rows: [
            ('Organisation', str(obj(a, 'organization'), 'name')),
            ('Category', str(obj(a, 'category'), 'name')),
            ('State', str(obj(a, 'state'), 'name')),
            ('Application starts', _d(a, 'applicationStartDate')),
            ('Last date', _d(a, 'applicationEndDate')),
          ],
        ),
      ),
      ?_description(a),
      if (str(a, 'eligibility') != null)
        SectionCard(
          title: 'Eligibility',
          child: SelectableText(str(a, 'eligibility')!, style: const TextStyle(height: 1.5)),
        ),
      ?_links('Important links', [LinkTile(label: 'Official website', url: str(a, 'officialWebsite'), primary: true)]),
    ];
  }

  List<Widget> _scholarship(Map<String, dynamic> s) {
    return [
      _header(str(s, 'title') ?? '', subtitle: str(obj(s, 'organization'), 'name'), deadline: date(s, 'applicationEndDate'), showDeadline: true),
      SectionCard(
        title: 'Details',
        child: InfoTable(
          rows: [
            ('Organisation', str(obj(s, 'organization'), 'name')),
            ('Amount', str(s, 'amount')),
            ('State', str(obj(s, 'state'), 'name')),
            ('Last date', _d(s, 'applicationEndDate')),
          ],
        ),
      ),
      ?_description(s),
      if (str(s, 'eligibility') != null)
        SectionCard(
          title: 'Eligibility',
          child: SelectableText(str(s, 'eligibility')!, style: const TextStyle(height: 1.5)),
        ),
      ?_links('Important links', [LinkTile(label: 'Official website', url: str(s, 'officialWebsite'), primary: true)]),
    ];
  }

  List<Widget> _article(Map<String, dynamic> a) {
    final paragraphs = (str(a, 'body') ?? '').split(RegExp(r'\n{2,}')).where((p) => p.trim().isNotEmpty);
    final cover = str(a, 'coverImageUrl');
    return [
      _header(str(a, 'title') ?? '', subtitle: _d(a, 'publishedAt')),
      if (cover != null)
        ClipRRect(
          borderRadius: BorderRadius.circular(12),
          child: Image.network(cover, fit: BoxFit.cover, errorBuilder: (_, _, _) => const SizedBox.shrink()),
        ),
      if (str(a, 'description') != null)
        Text(
          str(a, 'description')!,
          style: const TextStyle(fontSize: 16, fontStyle: FontStyle.italic, color: Brand.slate700),
        ),
      Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              for (final p in paragraphs)
                Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: SelectableText(p.trim(), style: const TextStyle(fontSize: 15.5, height: 1.6)),
                ),
            ],
          ),
        ),
      ),
    ];
  }

  List<Widget> _exam(Map<String, dynamic> e) {
    final org = obj(e, 'organization');
    final links = objList(e, 'importantLinks');
    return [
      _header(
        str(e, 'title') ?? '',
        subtitle: str(org, 'name'),
        deadline: date(e, 'applicationEndDate'),
        showDeadline: date(e, 'applicationEndDate') != null,
      ),
      SectionCard(
        title: 'Key dates',
        child: InfoTable(
          rows: [
            ('Category', str(obj(e, 'category'), 'name')),
            ('State', str(obj(e, 'state'), 'name')),
            ('Application starts', _d(e, 'applicationStartDate')),
            ('Last date', _d(e, 'applicationEndDate')),
            ('Exam date', _d(e, 'examDate')),
          ],
        ),
      ),
      ?_description(e),
      ?_related('Jobs', ContentKind.job, objList(e, 'jobs')),
      ?_related('Admit cards', ContentKind.admitCard, objList(e, 'admitCards')),
      ?_related('Answer keys', ContentKind.answerKey, objList(e, 'answerKeys')),
      ?_related('Results', ContentKind.result, objList(e, 'results')),
      ?_related('Syllabus', ContentKind.syllabus, objList(e, 'syllabi')),
      ?_links('Important links', [
        LinkTile(label: 'Official website', url: str(org, 'website')),
        for (final l in links) LinkTile(label: str(l, 'label') ?? 'Link', url: str(l, 'url')),
      ]),
    ];
  }
}

class _Disclaimer extends StatelessWidget {
  const _Disclaimer();
  @override
  Widget build(BuildContext context) => const Text(
    'Naukri Chayan is an independent information portal, not a government website. '
    'Always confirm dates, fees and eligibility on the official notification.',
    style: TextStyle(fontSize: 12, color: Brand.slate500, height: 1.4),
  );
}
