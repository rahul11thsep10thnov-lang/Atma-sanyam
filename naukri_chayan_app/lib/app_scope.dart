import 'package:material_ui/material_ui.dart';
import 'package:url_launcher/url_launcher.dart';

import 'api/api_client.dart';
import 'config.dart';
import 'models/content.dart';
import 'screens/detail_screen.dart';

/// Makes the config and API client available to every screen.
class AppScope extends InheritedWidget {
  const AppScope({super.key, required this.config, required this.api, required super.child});

  final AppConfig config;
  final ApiClient api;

  static AppScope of(BuildContext context) {
    final scope = context.dependOnInheritedWidgetOfExactType<AppScope>();
    assert(scope != null, 'AppScope missing above this widget');
    return scope!;
  }

  @override
  bool updateShouldNotify(AppScope oldWidget) => config != oldWidget.config || api != oldWidget.api;
}

/// Opens an external link (official websites, PDFs, apply pages) in the
/// browser, as the website does with target=_blank.
Future<void> openExternal(BuildContext context, String? url) async {
  if (url == null || url.isEmpty) return;
  final uri = Uri.tryParse(url);
  final messenger = ScaffoldMessenger.maybeOf(context);
  if (uri == null || !(uri.isScheme('http') || uri.isScheme('https'))) {
    messenger?.showSnackBar(const SnackBar(content: Text('This link is not a web address.')));
    return;
  }
  final ok = await launchUrl(uri, mode: LaunchMode.externalApplication);
  if (!ok) messenger?.showSnackBar(const SnackBar(content: Text('Could not open the link.')));
}

/// Follows an internal website path (`/jobs/<slug>`, `/exam/<slug>`, …):
/// in-app when the API covers it, otherwise the page opens on the website.
void openHref(BuildContext context, String href) {
  final target = ContentKind.fromHref(href);
  if (target != null) {
    openDetail(context, target.kind, target.slug);
    return;
  }
  final scope = AppScope.of(context);
  openExternal(context, scope.config.webUri(href).toString());
}

void openDetail(BuildContext context, ContentKind kind, String slug) {
  Navigator.of(context).push(
    MaterialPageRoute(
      builder: (_) => DetailScreen(kind: kind, slug: slug),
    ),
  );
}
