import 'package:material_ui/material_ui.dart';

import '../app_scope.dart';
import '../theme/app_theme.dart';

/// E-mail alert sign-up (`POST /api/alerts/subscribe`). The server sends a
/// confirmation e-mail first (double opt-in), exactly as on the website.
class AlertsScreen extends StatefulWidget {
  const AlertsScreen({super.key});
  @override
  State<AlertsScreen> createState() => _AlertsScreenState();
}

class _AlertsScreenState extends State<AlertsScreen> {
  final _form = GlobalKey<FormState>();
  final _email = TextEditingController();
  final _keyword = TextEditingController();
  String _locale = 'en';
  bool _busy = false;
  String? _done;
  String? _error;

  @override
  void dispose() {
    _email.dispose();
    _keyword.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_form.currentState!.validate()) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final r = await AppScope.of(context).api.subscribeAlerts(email: _email.text.trim(), keyword: _keyword.text, locale: _locale);
      setState(() {
        _done = r['verified'] == true
            ? 'You are subscribed. Alerts will arrive at ${_email.text.trim()}.'
            : 'Almost done — we have sent a confirmation link to ${_email.text.trim()}. Open it to start receiving alerts.';
      });
    } catch (e) {
      setState(() => _error = '$e');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('E-mail alerts')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const GradientHeading('Never miss a notification', size: 22),
          const SizedBox(height: 8),
          const Text(
            'Get an e-mail when a new job, admit card, answer key or result is published. Leave the keyword empty to hear about everything.',
          ),
          const SizedBox(height: 20),
          if (_done != null)
            Card(
              color: const Color(0xFFECFDF5),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  children: [
                    const Icon(Icons.check_circle, color: Color(0xFF065F46)),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        _done!,
                        style: const TextStyle(color: Color(0xFF065F46), fontWeight: FontWeight.w600),
                      ),
                    ),
                  ],
                ),
              ),
            )
          else
            Form(
              key: _form,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  TextFormField(
                    controller: _email,
                    keyboardType: TextInputType.emailAddress,
                    autofillHints: const [AutofillHints.email],
                    decoration: const InputDecoration(labelText: 'E-mail address', prefixIcon: Icon(Icons.email_outlined)),
                    validator: (v) => RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$').hasMatch(v?.trim() ?? '') ? null : 'Enter a valid e-mail address',
                  ),
                  const SizedBox(height: 14),
                  TextFormField(
                    controller: _keyword,
                    decoration: const InputDecoration(
                      labelText: 'Keyword (optional)',
                      hintText: 'e.g. SSC, Railway, Bihar',
                      prefixIcon: Icon(Icons.label_outline),
                    ),
                    validator: (v) {
                      final t = v?.trim() ?? '';
                      if (t.isEmpty) return null;
                      if (t.length < 2) return 'At least 2 characters';
                      if (t.length > 80) return 'At most 80 characters';
                      return null;
                    },
                  ),
                  const SizedBox(height: 14),
                  SegmentedButton<String>(
                    segments: const [
                      ButtonSegment(value: 'en', label: Text('English')),
                      ButtonSegment(value: 'hi', label: Text('हिन्दी')),
                    ],
                    selected: {_locale},
                    onSelectionChanged: (s) => setState(() => _locale = s.first),
                  ),
                  if (_error != null) ...[const SizedBox(height: 12), Text(_error!, style: TextStyle(color: Colors.red.shade700))],
                  const SizedBox(height: 18),
                  FilledButton.icon(
                    onPressed: _busy ? null : _submit,
                    icon: _busy
                        ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                        : const Icon(Icons.notifications_active_outlined),
                    label: const Text('Subscribe'),
                  ),
                  const SizedBox(height: 10),
                  const Text('You can unsubscribe from any alert e-mail with one tap.', style: TextStyle(fontSize: 12, color: Brand.slate500)),
                ],
              ),
            ),
        ],
      ),
    );
  }
}
