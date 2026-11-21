import 'dart:async';
import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config.dart';

class ApiException implements Exception {
  ApiException(this.message, {this.statusCode});
  final String message;
  final int? statusCode;

  bool get isNotFound => statusCode == 404;

  @override
  String toString() => message;
}

/// One page of a paginated list, mirroring the site's envelope
/// `{ data, page, pageSize, total, totalPages }`.
class Paged {
  Paged({required this.items, required this.page, required this.totalPages, required this.total});
  final List<Map<String, dynamic>> items;
  final int page;
  final int totalPages;
  final int total;
  bool get hasMore => page < totalPages;
}

/// Thin client for the website's public JSON API (`src/app/api/*`).
class ApiClient {
  ApiClient(this.config, {http.Client? httpClient}) : _http = httpClient ?? http.Client();

  final AppConfig config;
  final http.Client _http;

  static const _timeout = Duration(seconds: 20);

  Uri _uri(String path, [Map<String, String>? query]) {
    final base = Uri.parse(config.siteUrl);
    return base.replace(path: '${base.path}$path', queryParameters: (query == null || query.isEmpty) ? null : query);
  }

  Future<dynamic> _get(String path, [Map<String, String>? query]) async {
    final http.Response res;
    try {
      res = await _http.get(_uri(path, query), headers: {'Accept': 'application/json'}).timeout(_timeout);
    } on TimeoutException {
      throw ApiException('The server took too long to answer. Please try again.');
    } catch (_) {
      throw ApiException('Could not reach ${config.siteUrl}. Check your internet connection, or the server address in Settings.');
    }
    return _decode(res);
  }

  dynamic _decode(http.Response res) {
    dynamic body;
    try {
      body = jsonDecode(utf8.decode(res.bodyBytes));
    } catch (_) {
      throw ApiException('Unexpected response from the server (HTTP ${res.statusCode}).', statusCode: res.statusCode);
    }
    if (res.statusCode >= 400) {
      final msg = body is Map && body['error'] is String ? body['error'] as String : 'Request failed (HTTP ${res.statusCode}).';
      throw ApiException(msg, statusCode: res.statusCode);
    }
    return body;
  }

  static List<Map<String, dynamic>> _list(dynamic v) =>
      v is List ? v.whereType<Map>().map((e) => Map<String, dynamic>.from(e)).toList() : <Map<String, dynamic>>[];

  /// GET a paginated list endpoint, e.g. `/api/jobs?page=2`.
  Future<Paged> list(String path, {int page = 1, Map<String, String>? query}) async {
    final body = await _get(path, {...?query, 'page': '$page'});
    final items = _list(body is Map ? body['data'] : null);
    if (body is Map && body['totalPages'] is num) {
      return Paged(
        items: items,
        page: (body['page'] as num?)?.toInt() ?? page,
        totalPages: (body['totalPages'] as num).toInt(),
        total: (body['total'] as num?)?.toInt() ?? items.length,
      );
    }
    // Unpaginated endpoints (articles) return just `{ data: [...] }`.
    return Paged(items: items, page: 1, totalPages: 1, total: items.length);
  }

  /// GET a detail endpoint, e.g. `/api/jobs/<slug>`; returns `data`.
  Future<Map<String, dynamic>> detail(String path) async {
    final body = await _get(path);
    final data = body is Map ? body['data'] : null;
    if (data is! Map) throw ApiException('Not found', statusCode: 404);
    return Map<String, dynamic>.from(data);
  }

  Future<Paged> search(String q, {String? type, int page = 1}) => list('/api/search', page: page, query: {'q': q, 'type': ?type});

  Future<List<Map<String, dynamic>>> notifications({int limit = 30}) async {
    final body = await _get('/api/notifications', {'limit': '$limit'});
    return _list(body is Map ? body['data'] : null);
  }

  /// POST /api/alerts/subscribe — e-mail alerts (double opt-in on the server).
  Future<Map<String, dynamic>> subscribeAlerts({required String email, String? keyword, String locale = 'en'}) async {
    final http.Response res;
    try {
      res = await _http
          .post(
            _uri('/api/alerts/subscribe'),
            headers: {'Content-Type': 'application/json', 'Accept': 'application/json'},
            body: jsonEncode({'email': email, if (keyword != null && keyword.trim().isNotEmpty) 'keyword': keyword.trim(), 'locale': locale}),
          )
          .timeout(_timeout);
    } catch (_) {
      throw ApiException('Could not reach the server. Please try again.');
    }
    final body = _decode(res);
    return body is Map && body['data'] is Map ? Map<String, dynamic>.from(body['data'] as Map) : <String, dynamic>{};
  }
}
