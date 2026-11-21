import 'package:material_ui/material_ui.dart';

import '../app_scope.dart';
import '../models/content.dart';
import '../theme/app_theme.dart';
import '../widgets/common.dart';
import '../widgets/paged_list.dart';

/// Site-wide search over `/api/search` (jobs, results, admit cards,
/// answer keys, syllabus, exams, articles, organisations).
class SearchScreen extends StatefulWidget {
  const SearchScreen({super.key, this.initialQuery = '', this.standalone = false});
  final String initialQuery;

  /// True when pushed as its own route (shows a back button).
  final bool standalone;

  @override
  State<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends State<SearchScreen> {
  late final _controller = TextEditingController(text: widget.initialQuery);
  late String _query = widget.initialQuery.trim();
  String? _type;

  static const _types = <(String?, String)>[
    (null, 'All'),
    ('job', 'Jobs'),
    ('result', 'Results'),
    ('admit-card', 'Admit Cards'),
    ('answer-key', 'Answer Keys'),
    ('syllabus', 'Syllabus'),
    ('exam', 'Exams'),
    ('article', 'Articles'),
    ('organization', 'Organisations'),
  ];

  static const _typeIcons = {
    'recruitment': Icons.campaign_outlined,
    'exam': Icons.event_note_outlined,
    'job': Icons.work_outline,
    'result': Icons.emoji_events_outlined,
    'admit-card': Icons.badge_outlined,
    'answer-key': Icons.key_outlined,
    'syllabus': Icons.menu_book_outlined,
    'article': Icons.article_outlined,
    'organization': Icons.account_balance_outlined,
  };

  static const _typeLabels = {
    'recruitment': 'Recruitment',
    'exam': 'Exam',
    'job': 'Job',
    'result': 'Result',
    'admit-card': 'Admit Card',
    'answer-key': 'Answer Key',
    'syllabus': 'Syllabus',
    'article': 'Article',
    'organization': 'Organisation',
  };

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _submit() => setState(() => _query = _controller.text.trim());

  @override
  Widget build(BuildContext context) {
    final api = AppScope.of(context).api;
    return Scaffold(
      appBar: AppBar(title: const Text('Search'), automaticallyImplyLeading: widget.standalone),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
            child: TextField(
              controller: _controller,
              autofocus: widget.initialQuery.isEmpty,
              textInputAction: TextInputAction.search,
              onSubmitted: (_) => _submit(),
              decoration: InputDecoration(
                hintText: 'Search exams, jobs, results…',
                prefixIcon: const Icon(Icons.search, color: Brand.brown),
                suffixIcon: IconButton(icon: const Icon(Icons.arrow_forward), onPressed: _submit, tooltip: 'Search'),
              ),
            ),
          ),
          SizedBox(
            height: 48,
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 12),
              children: [
                for (final (value, label) in _types)
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 4),
                    child: ChoiceChip(label: Text(label), selected: _type == value, onSelected: (_) => setState(() => _type = value)),
                  ),
              ],
            ),
          ),
          Expanded(
            child: _query.length < 2
                ? const MessageView(
                    icon: Icons.search,
                    title: 'Find any exam',
                    message: 'Type at least 2 characters — for example “SSC CGL”, “Railway” or “UPSC”.',
                  )
                : PagedList(
                    key: ValueKey('$_query|$_type'),
                    loadPage: (page) => api.search(_query, type: _type, page: page),
                    emptyTitle: 'No matches for “$_query”',
                    emptyMessage: 'Try a shorter or different word.',
                    itemBuilder: (context, m) {
                      final type = str(m, 'type') ?? '';
                      final href = str(m, 'href');
                      final d = formatDate(date(m, 'date'));
                      return Card(
                        child: ListTile(
                          leading: Icon(_typeIcons[type] ?? Icons.link, color: Brand.brown),
                          title: Text(str(m, 'title') ?? '', style: const TextStyle(fontWeight: FontWeight.w700)),
                          subtitle: Text([_typeLabels[type] ?? type, ?str(m, 'subtitle'), ?d].join(' · ')),
                          trailing: const Icon(Icons.chevron_right),
                          onTap: href == null ? null : () => openHref(context, href),
                        ),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }
}
