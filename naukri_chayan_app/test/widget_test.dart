import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:material_ui/material_ui.dart';
import 'package:naukri_chayan/api/api_client.dart';
import 'package:naukri_chayan/config.dart';
import 'package:naukri_chayan/main.dart';
import 'package:naukri_chayan/models/content.dart';
import 'package:naukri_chayan/screens/detail_screen.dart';

/// A stand-in for the website's public API with the same JSON shapes.
http.Client fakeSite() => MockClient((req) async {
  final p = req.url.path;
  Map<String, dynamic> body;
  if (p == '/api/jobs') {
    body = {
      'data': [
        {
          'title': 'SSC CGL 2026',
          'slug': 'ssc-cgl-2026',
          'organizationName': 'Staff Selection Commission',
          'applicationEndDate': '2099-01-16T00:00:00.000Z',
          'vacancies': 17727,
        },
      ],
      'page': 1,
      'pageSize': 40,
      'total': 1,
      'totalPages': 1,
    };
  } else if (p == '/api/jobs/ssc-cgl-2026') {
    body = {
      'data': {
        'job': {
          'title': 'SSC CGL 2026',
          'slug': 'ssc-cgl-2026',
          'qualification': 'Graduate',
          'ageLimitMin': 18,
          'ageLimitMax': 32,
          'applicationFee': '100',
          'applicationEndDate': '2099-01-16T00:00:00.000Z',
          'applyUrl': 'https://ssc.gov.in',
          'organization': {'name': 'Staff Selection Commission', 'slug': 'ssc'},
          'exam': {'title': 'SSC CGL', 'slug': 'ssc-cgl', 'syllabi': [], 'admitCards': [], 'results': [], 'answerKeys': []},
          'posts': [
            {'name': 'Assistant Section Officer', 'eligibility': 'Graduate', 'vacancies': 4000},
          ],
          'importantDates': [
            {'label': 'Exam (Tier 1)', 'date': 'June 2026'},
          ],
          'importantLinks': [],
        },
        'relatedJobs': [],
      },
    };
  } else if (p == '/api/search') {
    body = {
      'data': [
        {'type': 'job', 'title': 'SSC CGL 2026', 'href': '/jobs/ssc-cgl-2026', 'subtitle': 'Staff Selection Commission'},
      ],
      'page': 1,
      'pageSize': 15,
      'total': 1,
      'totalPages': 1,
    };
  } else if (p == '/api/notifications') {
    body = {'data': []};
  } else {
    return http.Response(jsonEncode({'error': 'Not found'}), 404);
  }
  return http.Response(jsonEncode(body), 200, headers: {'content-type': 'application/json'});
});

void main() {
  setUpAll(() => initializeDateFormatting('en_IN'));

  test('deadline engine matches the website', () {
    final now = DateTime.utc(2026, 11, 20, 15);
    expect(deadlineInfo(null, now: now).label, 'Last date not announced');
    expect(deadlineInfo(DateTime.utc(2026, 11, 19), now: now).label, 'Applications closed');
    expect(deadlineInfo(DateTime.utc(2026, 11, 20), now: now).label, 'Last day to apply — today');
    expect(deadlineInfo(DateTime.utc(2026, 11, 21), now: now).label, '1 day left to apply');
    expect(deadlineInfo(DateTime.utc(2026, 12, 20), now: now).tone, DeadlineTone.green);
  });

  test('website paths map to in-app screens', () {
    final t = ContentKind.fromHref('/admit-card/ssc-cgl-tier-1');
    expect(t?.kind, ContentKind.admitCard);
    expect(t?.slug, 'ssc-cgl-tier-1');
    expect(ContentKind.fromHref('/organization/ssc'), isNull);
  });

  test('server address is normalised', () {
    expect(AppConfig.normalize('naukrichayan.in/'), 'https://naukrichayan.in');
  });

  testWidgets('browse jobs and open a job page', (tester) async {
    final config = AppConfig.fixed('https://site.test');
    await tester.pumpWidget(
      NaukriChayanApp(
        config: config,
        api: ApiClient(config, httpClient: fakeSite()),
      ),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.text('Jobs').first);
    await tester.pumpAndSettle();
    expect(find.text('SSC CGL 2026'), findsOneWidget);
    expect(find.text('17727 vacancies'), findsOneWidget);

    await tester.tap(find.text('SSC CGL 2026'));
    await tester.pumpAndSettle();
    expect(find.text('Apply online'), findsOneWidget);
    expect(find.text('18 – 32 years'), findsOneWidget);
    await tester.scrollUntilVisible(find.text('Assistant Section Officer'), 300, scrollable: find.descendant(of: find.byType(DetailScreen), matching: find.byType(Scrollable)).first);
    expect(find.text('Assistant Section Officer'), findsOneWidget);
  });

  testWidgets('search finds and opens results', (tester) async {
    final config = AppConfig.fixed('https://site.test');
    await tester.pumpWidget(
      NaukriChayanApp(
        config: config,
        api: ApiClient(config, httpClient: fakeSite()),
      ),
    );
    await tester.pumpAndSettle();
    await tester.tap(find.text('Search').last);
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField).last, 'ssc');
    await tester.testTextInput.receiveAction(TextInputAction.search);
    await tester.pumpAndSettle();
    expect(find.text('Job · Staff Selection Commission'), findsOneWidget);
  });
}
