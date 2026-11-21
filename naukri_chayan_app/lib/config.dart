import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Where the Naukri Chayan website (the Next.js `exam-portal`) is hosted.
///
/// The app reads the site's public JSON API (`/api/jobs`, `/api/results`, …)
/// from this address. Set it at build time with
/// `--dart-define=SITE_URL=https://your-domain` or change it in the app under
/// Settings; the in-app value wins and is remembered on the device.
class AppConfig extends ChangeNotifier {
  AppConfig._(this._prefs, this._siteUrl);

  static const String buildTimeSiteUrl = String.fromEnvironment(
    'SITE_URL',
    defaultValue: 'http://10.0.2.2:3000', // Android emulator → host's localhost
  );

  static const _prefsKey = 'site_url';

  final SharedPreferences? _prefs;
  String _siteUrl;

  String get siteUrl => _siteUrl;

  static Future<AppConfig> load() async {
    SharedPreferences? prefs;
    try {
      prefs = await SharedPreferences.getInstance();
    } catch (_) {
      prefs = null; // storage unavailable: fall back to the build-time value
    }
    final saved = prefs?.getString(_prefsKey);
    return AppConfig._(prefs, normalize(saved ?? buildTimeSiteUrl));
  }

  /// For tests: an in-memory config.
  factory AppConfig.fixed(String url) => AppConfig._(null, normalize(url));

  static String normalize(String url) {
    var u = url.trim();
    if (u.isEmpty) return buildTimeSiteUrl;
    if (!u.startsWith('http://') && !u.startsWith('https://')) u = 'https://$u';
    while (u.endsWith('/')) {
      u = u.substring(0, u.length - 1);
    }
    return u;
  }

  Future<void> setSiteUrl(String url) async {
    _siteUrl = normalize(url);
    await _prefs?.setString(_prefsKey, _siteUrl);
    notifyListeners();
  }

  Future<void> reset() async {
    _siteUrl = normalize(buildTimeSiteUrl);
    await _prefs?.remove(_prefsKey);
    notifyListeners();
  }

  /// Absolute URL of a page on the website, for "Open on website" / sharing.
  Uri webUri(String path) => Uri.parse('$_siteUrl$path');
}
