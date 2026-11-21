import 'package:material_ui/material_ui.dart';

import '../app_scope.dart';
import '../models/content.dart';
import '../widgets/common.dart';
import '../widgets/paged_list.dart';

/// Paginated listing for one section, like the site's `/jobs`, `/results`, …
class ListScreen extends StatelessWidget {
  const ListScreen({super.key, required this.kind});
  final ContentKind kind;

  @override
  Widget build(BuildContext context) {
    final api = AppScope.of(context).api;
    return Scaffold(
      appBar: AppBar(title: Text(kind.label)),
      body: PagedList(
        key: ValueKey(kind),
        loadPage: (page) => api.list(kind.apiPath, page: page),
        emptyTitle: 'No ${kind.label.toLowerCase()} published yet',
        itemBuilder: (context, m) => ContentCard(kind: kind, summary: summarize(kind, m)),
      ),
    );
  }
}
