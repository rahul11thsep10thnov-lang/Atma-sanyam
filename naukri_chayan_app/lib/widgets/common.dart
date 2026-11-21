import 'package:google_fonts/google_fonts.dart';
import 'package:material_ui/material_ui.dart';

import '../app_scope.dart';
import '../models/content.dart';
import '../theme/app_theme.dart';

class LoadingView extends StatelessWidget {
  const LoadingView({super.key});
  @override
  Widget build(BuildContext context) => const Center(
    child: Padding(
      padding: EdgeInsets.all(32),
      child: CircularProgressIndicator(color: Brand.tabBorder),
    ),
  );
}

class MessageView extends StatelessWidget {
  const MessageView({super.key, required this.icon, required this.title, this.message, this.onRetry});
  final IconData icon;
  final String title;
  final String? message;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 48, color: Brand.tabBorder),
            const SizedBox(height: 12),
            Text(
              title,
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w700),
            ),
            if (message != null) ...[
              const SizedBox(height: 6),
              Text(
                message!,
                textAlign: TextAlign.center,
                style: const TextStyle(color: Brand.slate500),
              ),
            ],
            if (onRetry != null) ...[
              const SizedBox(height: 16),
              FilledButton.icon(onPressed: onRetry, icon: const Icon(Icons.refresh), label: const Text('Try again')),
            ],
          ],
        ),
      ),
    );
  }
}

class ErrorView extends StatelessWidget {
  const ErrorView({super.key, required this.error, this.onRetry});
  final Object error;
  final VoidCallback? onRetry;
  @override
  Widget build(BuildContext context) =>
      MessageView(icon: Icons.cloud_off_outlined, title: 'Something went wrong', message: '$error', onRetry: onRetry);
}

/// "12 days left to apply · Apply by 16 Jan 2027" — mirrors DeadlineBadge.tsx.
class DeadlineBadge extends StatelessWidget {
  const DeadlineBadge({super.key, required this.endDate, this.withDate = true});
  final DateTime? endDate;
  final bool withDate;

  static const _tones = {
    DeadlineTone.green: (Color(0xFFECFDF5), Color(0xFF065F46), Color(0xFFA7F3D0)),
    DeadlineTone.amber: (Color(0xFFFFFBEB), Color(0xFF92400E), Color(0xFFFDE68A)),
    DeadlineTone.red: (Color(0xFFFEF2F2), Color(0xFFB91C1C), Color(0xFFFECACA)),
    DeadlineTone.slate: (Color(0xFFF8FAFC), Color(0xFF475569), Color(0xFFE2E8F0)),
  };

  @override
  Widget build(BuildContext context) {
    final info = deadlineInfo(endDate);
    final (bg, fg, border) = _tones[info.tone]!;
    final d = formatDate(endDate);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: bg,
        border: Border.all(color: border),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        withDate && d != null ? '${info.label} · Apply by $d' : info.label,
        style: TextStyle(color: fg, fontSize: 12, fontWeight: FontWeight.w600),
      ),
    );
  }
}

/// A list card, like the site's JobCard / ResultCard / … components.
class ContentCard extends StatelessWidget {
  const ContentCard({super.key, required this.kind, required this.summary});
  final ContentKind kind;
  final ListSummary summary;

  @override
  Widget build(BuildContext context) {
    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: summary.slug.isEmpty ? null : () => openDetail(context, kind, summary.slug),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(color: Brand.cream, borderRadius: BorderRadius.circular(10)),
                child: Icon(kind.icon, color: Brand.brown, size: 22),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(summary.title, style: const TextStyle(fontSize: 15.5, fontWeight: FontWeight.w700, height: 1.3)),
                    if (summary.subtitle != null) ...[
                      const SizedBox(height: 3),
                      Text(summary.subtitle!, style: const TextStyle(color: Brand.slate500, fontSize: 13)),
                    ],
                    if (summary.extra != null) ...[
                      const SizedBox(height: 3),
                      Text(
                        summary.extra!,
                        style: const TextStyle(color: Brand.teal700, fontSize: 13, fontWeight: FontWeight.w600),
                      ),
                    ],
                    if (summary.dateLabel != null && summary.dateLabel!.isNotEmpty) ...[
                      const SizedBox(height: 6),
                      Text(summary.dateLabel!, style: const TextStyle(color: Brand.slate700, fontSize: 12.5)),
                    ],
                    if (kind == ContentKind.job || kind == ContentKind.admission || kind == ContentKind.scholarship) ...[
                      const SizedBox(height: 8),
                      DeadlineBadge(endDate: summary.deadline),
                    ],
                  ],
                ),
              ),
              const Icon(Icons.chevron_right, color: Brand.slate500),
            ],
          ),
        ),
      ),
    );
  }
}

/// A titled white panel used to group detail-page sections.
class SectionCard extends StatelessWidget {
  const SectionCard({super.key, required this.title, required this.child});
  final String title;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 14, 16, 16),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [GradientHeading(title, size: 18), const SizedBox(height: 10), child]),
      ),
    );
  }
}

/// Two-column label/value table; rows with no value are dropped, and a
/// fully empty table says so instead of inventing values (site §9).
class InfoTable extends StatelessWidget {
  const InfoTable({super.key, required this.rows});
  final List<(String, String?)> rows;

  @override
  Widget build(BuildContext context) {
    final shown = rows.where((r) => r.$2 != null && r.$2!.trim().isNotEmpty).toList();
    if (shown.isEmpty) {
      return const Text('Not specified in the available notification.', style: TextStyle(color: Brand.slate500));
    }
    return Column(
      children: [
        for (var i = 0; i < shown.length; i++)
          Container(
            padding: const EdgeInsets.symmetric(vertical: 9, horizontal: 10),
            decoration: BoxDecoration(
              color: i.isEven ? Brand.slate50 : Colors.white,
              border: const Border(bottom: BorderSide(color: Brand.slate200)),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  flex: 2,
                  child: Text(
                    shown[i].$1,
                    style: const TextStyle(fontWeight: FontWeight.w700, color: Brand.slate700),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(flex: 3, child: SelectableText(shown[i].$2!)),
              ],
            ),
          ),
      ],
    );
  }
}

/// A prominent link to an official page or document.
class LinkTile extends StatelessWidget {
  const LinkTile({super.key, required this.label, required this.url, this.icon = Icons.open_in_new, this.primary = false});
  final String label;
  final String? url;
  final IconData icon;
  final bool primary;

  @override
  Widget build(BuildContext context) {
    if (url == null || url!.isEmpty) return const SizedBox.shrink();
    void onTap() => openExternal(context, url);
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: SizedBox(
        width: double.infinity,
        child: primary
            ? FilledButton.icon(onPressed: onTap, icon: Icon(icon), label: Text(label))
            : OutlinedButton.icon(
                onPressed: onTap,
                icon: Icon(icon, color: Brand.brown),
                label: Text(
                  label,
                  style: const TextStyle(color: Brand.brownDark, fontWeight: FontWeight.w700),
                ),
                style: OutlinedButton.styleFrom(
                  alignment: Alignment.centerLeft,
                  side: const BorderSide(color: Brand.tabBorder),
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
              ),
      ),
    );
  }
}

/// A list of internal links (related jobs, results, …).
class RelatedList extends StatelessWidget {
  const RelatedList({super.key, required this.kind, required this.items});
  final ContentKind kind;
  final List<Map<String, dynamic>> items;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        for (final it in items)
          ListTile(
            dense: true,
            contentPadding: EdgeInsets.zero,
            leading: Icon(kind.icon, color: Brand.brown),
            title: Text(str(it, 'title') ?? 'Untitled', style: const TextStyle(fontWeight: FontWeight.w600)),
            trailing: const Icon(Icons.chevron_right),
            onTap: str(it, 'slug') == null ? null : () => openDetail(context, kind, str(it, 'slug')!),
          ),
      ],
    );
  }
}

/// The stacked "Naukri / Chayan" wordmark in the Rahul Heading browns,
/// with the site's Hindi tagline underneath.
class Wordmark extends StatelessWidget {
  const Wordmark({super.key, this.size = 36, this.showTagline = true});
  final double size;
  final bool showTagline;

  @override
  Widget build(BuildContext context) {
    final style = GoogleFonts.rozhaOne(
      fontSize: size,
      height: 1.0,
      color: Brand.brown,
      letterSpacing: 1.5,
      shadows: const [Shadow(color: Brand.cream, offset: Offset(2, 2))],
    );
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        _rule(),
        const SizedBox(height: 6),
        Text('Naukri', style: style),
        Text('Chayan', style: style),
        const SizedBox(height: 6),
        _rule(),
        if (showTagline) ...[
          const SizedBox(height: 8),
          Text(
            '|| अंततः आपकी तपस्या ही आपका वरदान होगी ||',
            textAlign: TextAlign.center,
            style: GoogleFonts.kalam(fontSize: 15, color: Brand.brownDark, fontWeight: FontWeight.w700),
          ),
        ],
      ],
    );
  }

  Widget _rule() => Row(
    mainAxisSize: MainAxisSize.min,
    children: [
      Container(width: 70, height: 2, color: Brand.brown),
      const Padding(
        padding: EdgeInsets.symmetric(horizontal: 6),
        child: Icon(Icons.spa, size: 16, color: Brand.brown),
      ),
      Container(width: 70, height: 2, color: Brand.brown),
    ],
  );
}

/// The Sanskrit shloka and its Hindi meaning (MottoBand.tsx).
class MottoBand extends StatelessWidget {
  const MottoBand({super.key});
  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.6),
        border: const Border.symmetric(horizontal: BorderSide(color: Brand.orange200)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'उद्यमेन हि सिध्यन्ति कार्याणि न मनोरथैः।\nन हि सुप्तस्य सिंहस्य प्रविशन्ति मुखे मृगाः॥',
            style: GoogleFonts.tillana(fontSize: 16, height: 1.5, color: Brand.slate900, fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 6),
          Text(
            'जिस प्रकार सोते हुए सिंह के मुँह में मृग स्वयं नहीं प्रवेश करता, उसी प्रकार केवल इच्छा करने से सफलता प्राप्त नहीं होती है। '
            'अपने कार्य को सिद्ध करने के लिए मेहनत करनी पड़ती है।',
            style: GoogleFonts.kalam(fontSize: 13.5, height: 1.45, color: Brand.slate700),
          ),
        ],
      ),
    );
  }
}

/// The site's watercolour background art, washed with white for legibility.
class WatermarkBackground extends StatelessWidget {
  const WatermarkBackground({super.key, required this.child});
  final Widget child;
  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: const BoxDecoration(
        image: DecorationImage(image: AssetImage('assets/images/background.webp'), fit: BoxFit.cover, opacity: 0.55),
      ),
      child: DecoratedBox(
        decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.25)),
        child: child,
      ),
    );
  }
}
