import 'package:material_ui/material_ui.dart';

import '../app_scope.dart';
import '../config.dart';
import '../theme/app_theme.dart';
import 'alerts_screen.dart';

/// Alerts, website pages that have no API (organisations, categories,
/// privacy), and the server address.
class MoreScreen extends StatelessWidget {
  const MoreScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final scope = AppScope.of(context);
    void web(String path) => openExternal(context, scope.config.webUri(path).toString());
    return Scaffold(
      appBar: AppBar(title: const Text('More')),
      body: ListenableBuilder(
        listenable: scope.config,
        builder: (context, _) => ListView(
          children: [
            ListTile(
              leading: const Icon(Icons.mark_email_unread_outlined, color: Brand.brown),
              title: const Text('E-mail alerts'),
              onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const AlertsScreen())),
            ),
            const Divider(),
            const _Label('On the website'),
            ListTile(
              leading: const Icon(Icons.account_balance_outlined, color: Brand.brown),
              title: const Text('Organisations'),
              trailing: const Icon(Icons.open_in_new, size: 18),
              onTap: () => web('/organizations'),
            ),
            ListTile(
              leading: const Icon(Icons.category_outlined, color: Brand.brown),
              title: const Text('Categories'),
              trailing: const Icon(Icons.open_in_new, size: 18),
              onTap: () => web('/categories'),
            ),
            ListTile(
              leading: const Icon(Icons.campaign_outlined, color: Brand.brown),
              title: const Text('Recruitments'),
              trailing: const Icon(Icons.open_in_new, size: 18),
              onTap: () => web('/recruitments'),
            ),
            ListTile(
              leading: const Icon(Icons.privacy_tip_outlined, color: Brand.brown),
              title: const Text('Privacy policy'),
              trailing: const Icon(Icons.open_in_new, size: 18),
              onTap: () => web('/privacy'),
            ),
            const Divider(),
            const _Label('Settings'),
            ListTile(
              leading: const Icon(Icons.dns_outlined, color: Brand.brown),
              title: const Text('Server address'),
              subtitle: Text(scope.config.siteUrl),
              onTap: () => _editServer(context, scope.config),
            ),
            const Divider(),
            const Padding(
              padding: EdgeInsets.all(16),
              child: Text(
                'Naukri Chayan is an independent portal for government examination information. '
                'It is not affiliated with any government body; always verify details on the official notification.',
                style: TextStyle(color: Brand.slate500, fontSize: 12.5, height: 1.4),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _editServer(BuildContext context, AppConfig config) async {
    final controller = TextEditingController(text: config.siteUrl);
    final result = await showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Server address'),
        content: TextField(
          controller: controller,
          keyboardType: TextInputType.url,
          autofocus: true,
          decoration: const InputDecoration(hintText: 'https://naukrichayan.example'),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, '__reset__'), child: const Text('Reset')),
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          FilledButton(onPressed: () => Navigator.pop(ctx, controller.text), child: const Text('Save')),
        ],
      ),
    );
    controller.dispose();
    if (result == null) return;
    if (result == '__reset__') {
      await config.reset();
    } else {
      await config.setSiteUrl(result);
    }
  }
}

class _Label extends StatelessWidget {
  const _Label(this.text);
  final String text;
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
    child: Text(
      text.toUpperCase(),
      style: const TextStyle(fontSize: 12, letterSpacing: 1, fontWeight: FontWeight.w800, color: Brand.slate500),
    ),
  );
}
