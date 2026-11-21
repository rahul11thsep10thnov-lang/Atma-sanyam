import 'package:material_ui/material_ui.dart';

import '../api/api_client.dart';
import 'common.dart';

/// Infinite-scrolling list over one of the site's paginated endpoints,
/// with pull-to-refresh, error and empty states.
class PagedList extends StatefulWidget {
  const PagedList({
    super.key,
    required this.loadPage,
    required this.itemBuilder,
    this.emptyTitle = 'Nothing here yet',
    this.emptyMessage,
    this.header,
  });

  final Future<Paged> Function(int page) loadPage;
  final Widget Function(BuildContext context, Map<String, dynamic> item) itemBuilder;
  final String emptyTitle;
  final String? emptyMessage;
  final Widget? header;

  @override
  State<PagedList> createState() => _PagedListState();
}

class _PagedListState extends State<PagedList> {
  final _items = <Map<String, dynamic>>[];
  int _page = 0;
  bool _hasMore = true;
  bool _loading = false;
  Object? _error;
  int _generation = 0;

  @override
  void initState() {
    super.initState();
    _loadMore();
  }

  Future<void> _refresh() async {
    _generation++;
    setState(() {
      _items.clear();
      _page = 0;
      _hasMore = true;
      _error = null;
      _loading = false;
    });
    await _loadMore();
  }

  Future<void> _loadMore() async {
    if (_loading || !_hasMore) return;
    final gen = _generation;
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final res = await widget.loadPage(_page + 1);
      if (!mounted || gen != _generation) return;
      setState(() {
        _items.addAll(res.items);
        _page = res.page;
        _hasMore = res.hasMore && res.items.isNotEmpty;
        _loading = false;
      });
    } catch (e) {
      if (!mounted || gen != _generation) return;
      setState(() {
        _error = e;
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_items.isEmpty) {
      Widget body;
      if (_loading) {
        body = const LoadingView();
      } else if (_error != null) {
        body = ErrorView(error: _error!, onRetry: _loadMore);
      } else {
        body = MessageView(icon: Icons.inbox_outlined, title: widget.emptyTitle, message: widget.emptyMessage);
      }
      return RefreshIndicator(
        onRefresh: _refresh,
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          children: [
            ?widget.header,
            Padding(padding: const EdgeInsets.only(top: 40), child: body),
          ],
        ),
      );
    }

    final headerCount = widget.header == null ? 0 : 1;
    return RefreshIndicator(
      onRefresh: _refresh,
      child: NotificationListener<ScrollNotification>(
        onNotification: (n) {
          if (n.metrics.pixels > n.metrics.maxScrollExtent - 400) _loadMore();
          return false;
        },
        child: ListView.separated(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
          itemCount: headerCount + _items.length + 1,
          separatorBuilder: (_, _) => const SizedBox(height: 10),
          itemBuilder: (context, i) {
            if (headerCount == 1 && i == 0) return widget.header!;
            final idx = i - headerCount;
            if (idx < _items.length) return widget.itemBuilder(context, _items[idx]);
            if (_error != null) return ErrorView(error: _error!, onRetry: _loadMore);
            if (_hasMore) return const LoadingView();
            return const SizedBox(height: 8);
          },
        ),
      ),
    );
  }
}
