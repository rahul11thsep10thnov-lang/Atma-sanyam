import 'package:material_ui/material_ui.dart';

import '../app_scope.dart';
import '../models/content.dart';
import '../theme/app_theme.dart';
import '../widgets/common.dart';
import 'search_screen.dart';

/// "What's new": the site's public notification feed (`/api/notifications`).
class UpdatesScreen extends StatefulWidget {
  const UpdatesScreen({super.key});
  @override
  State<UpdatesScreen> createState() => _UpdatesScreenState();
}

class _UpdatesScreenState extends State<UpdatesScreen> {
  Future<List<Map<String, dynamic>>>? _future;

  static const _labels = {
    'NEW_JOB': ('New job', Icons.work_outline),
    'NEW_RESULT': ('New result', Icons.emoji_events_outlined),
    'NEW_ADMIT_CARD': ('Admit card', Icons.badge_outlined),
    'NEW_ANSWER_KEY': ('Answer key', Icons.key_outlined),
    'ANSWER_KEY_RELEASED': ('Answer key', Icons.key_outlined),
    'NEW_EXAM_NOTIFICATION': ('New exam', Icons.event_note_outlined),
    'EXAM_DATE_CHANGED': ('Exam date changed', Icons.edit_calendar_outlined),
    'DEADLINE_UPDATE': ('Deadline update', Icons.update),
    'APPLICATION_DEADLINE': ('Deadline', Icons.alarm),
  };

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _future ??= AppScope.of(context).api.notifications();
  }

  Future<void> _refresh() async {
    final f = AppScope.of(context).api.notifications();
    setState(() => _future = f);
    try {
      await f;
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("What's new")),
      body: FutureBuilder<List<Map<String, dynamic>>>(
        future: _future,
        builder: (context, snap) {
          Widget child;
          if (snap.connectionState != ConnectionState.done) {
            child = const LoadingView();
          } else if (snap.hasError) {
            child = ErrorView(error: snap.error!, onRetry: _refresh);
          } else if (snap.data!.isEmpty) {
            child = const MessageView(
              icon: Icons.notifications_none,
              title: 'No updates yet',
              message: 'New jobs, results and admit cards will appear here.',
            );
          } else {
            final items = snap.data!;
            return RefreshIndicator(
              onRefresh: _refresh,
              child: ListView.separated(
                padding: const EdgeInsets.all(16),
                itemCount: items.length,
                separatorBuilder: (_, _) => const SizedBox(height: 10),
                itemBuilder: (context, i) {
                  final n = items[i];
                  final (label, icon) = _labels[str(n, 'type')] ?? ('Update', Icons.notifications_outlined);
                  final urgent = str(n, 'priority') == 'URGENT' || str(n, 'priority') == 'HIGH';
                  final when = formatDate(date(n, 'sentAt') ?? date(n, 'createdAt'));
                  return Card(
                    child: ListTile(
                      leading: CircleAvatar(
                        backgroundColor: urgent ? const Color(0xFFFEE2E2) : Brand.cream,
                        child: Icon(icon, color: urgent ? Colors.red.shade700 : Brand.brown),
                      ),
                      title: Text(str(n, 'title') ?? '', style: const TextStyle(fontWeight: FontWeight.w700)),
                      subtitle: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          if (str(n, 'body') != null) Padding(padding: const EdgeInsets.only(top: 2), child: Text(str(n, 'body')!)),
                          const SizedBox(height: 4),
                          Text([label, ?when].join(' · '), style: const TextStyle(fontSize: 12, color: Brand.slate500)),
                        ],
                      ),
                      // The feed carries record ids, not slugs: find it by title.
                      onTap: () =>
                          Navigator.of(context)
                              .push(MaterialPageRoute(builder: (_) => SearchScreen(initialQuery: str(n, 'title') ?? '', standalone: true))),
                    ),
                  );
                },
              ),
            );
          }
          return RefreshIndicator(
            onRefresh: _refresh,
            child: ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              children: [Padding(padding: const EdgeInsets.only(top: 60), child: child)],
            ),
          );
        },
      ),
    );
  }
}
