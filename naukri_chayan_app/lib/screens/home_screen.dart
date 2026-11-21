import 'package:google_fonts/google_fonts.dart';
import 'package:material_ui/material_ui.dart';

import '../app_scope.dart';
import '../models/content.dart';
import '../theme/app_theme.dart';
import '../widgets/common.dart';
import 'alerts_screen.dart';
import 'list_screen.dart';
import 'search_screen.dart';

/// The site's home shell: wordmark + tagline, motto band, the big search
/// bar and the filled section tabs (CtaTabs), plus a peek at latest jobs.
class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: WatermarkBackground(
        child: SafeArea(
          child: CustomScrollView(
            slivers: [
              const SliverToBoxAdapter(
                child: Padding(
                  padding: EdgeInsets.fromLTRB(16, 18, 16, 14),
                  child: Center(child: Wordmark()),
                ),
              ),
              const SliverToBoxAdapter(child: MottoBand()),
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
                  child: TextField(
                    textInputAction: TextInputAction.search,
                    onSubmitted: (q) =>
                        Navigator.of(context).push(MaterialPageRoute(builder: (_) => SearchScreen(initialQuery: q, standalone: true))),
                    decoration: const InputDecoration(
                      hintText: 'Search exams, jobs, results…',
                      prefixIcon: Icon(Icons.search, color: Brand.brown),
                      contentPadding: EdgeInsets.symmetric(vertical: 16),
                    ),
                  ),
                ),
              ),
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
                sliver: SliverGrid.count(
                  crossAxisCount: 2,
                  mainAxisSpacing: 12,
                  crossAxisSpacing: 12,
                  childAspectRatio: 2.3,
                  children: [for (final k in ContentKind.browsable) _SectionTab(kind: k)],
                ),
              ),
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
                  child: Card(
                    color: Brand.teal50,
                    child: ListTile(
                      leading: const Icon(Icons.mark_email_unread_outlined, color: Brand.teal700),
                      title: const Text('Get e-mail alerts', style: TextStyle(fontWeight: FontWeight.w800)),
                      subtitle: const Text('New jobs, admit cards and results for the exams you follow.'),
                      trailing: const Icon(Icons.chevron_right),
                      onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const AlertsScreen())),
                    ),
                  ),
                ),
              ),
              const SliverToBoxAdapter(child: _LatestJobs()),
              const SliverToBoxAdapter(child: SizedBox(height: 24)),
            ],
          ),
        ),
      ),
    );
  }
}

/// A filled "rahul-tab": orange fill, darker border, brown marquee type.
class _SectionTab extends StatelessWidget {
  const _SectionTab({required this.kind});
  final ContentKind kind;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Brand.tabFill,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: Brand.tabBorder, width: 2),
      ),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => ListScreen(kind: kind))),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 10),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(kind.icon, color: Brand.brownDark, size: 22),
              const SizedBox(width: 8),
              Flexible(
                child: Text(
                  kind.label,
                  maxLines: 2,
                  textAlign: TextAlign.center,
                  style: GoogleFonts.rozhaOne(fontSize: 18, height: 1.05, color: Brand.brownDark, letterSpacing: 0.4),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _LatestJobs extends StatefulWidget {
  const _LatestJobs();
  @override
  State<_LatestJobs> createState() => _LatestJobsState();
}

class _LatestJobsState extends State<_LatestJobs> {
  Future<List<Map<String, dynamic>>>? _future;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _future ??= AppScope.of(context).api.list(ContentKind.job.apiPath).then((p) => p.items.take(5).toList());
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<List<Map<String, dynamic>>>(
      future: _future,
      builder: (context, snap) {
        // Quietly hidden on error/empty: the tabs above remain usable and
        // each section shows its own error with a retry button.
        if (!snap.hasData || snap.data!.isEmpty) return const SizedBox.shrink();
        return Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const Expanded(child: GradientHeading('Latest jobs', size: 20)),
                  TextButton(
                    onPressed: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const ListScreen(kind: ContentKind.job))),
                    child: const Text('See all'),
                  ),
                ],
              ),
              const SizedBox(height: 6),
              for (final m in snap.data!) ...[ContentCard(kind: ContentKind.job, summary: summarize(ContentKind.job, m)), const SizedBox(height: 10)],
            ],
          ),
        );
      },
    );
  }
}
