import 'package:intl/date_symbol_data_local.dart';
import 'package:material_ui/material_ui.dart';

import 'api/api_client.dart';
import 'app_scope.dart';
import 'config.dart';
import 'screens/home_screen.dart';
import 'screens/more_screen.dart';
import 'screens/search_screen.dart';
import 'screens/updates_screen.dart';
import 'theme/app_theme.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await initializeDateFormatting('en_IN');
  final config = await AppConfig.load();
  runApp(NaukriChayanApp(config: config, api: ApiClient(config)));
}

class NaukriChayanApp extends StatelessWidget {
  const NaukriChayanApp({super.key, required this.config, required this.api});
  final AppConfig config;
  final ApiClient api;

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: config,
      // Re-key the shell when the server address changes so every screen reloads.
      builder: (context, _) => AppScope(
        config: config,
        api: api,
        child: MaterialApp(
          key: ValueKey(config.siteUrl),
          title: 'Naukri Chayan',
          debugShowCheckedModeBanner: false,
          theme: buildTheme(),
          home: const RootShell(),
        ),
      ),
    );
  }
}

class RootShell extends StatefulWidget {
  const RootShell({super.key});
  @override
  State<RootShell> createState() => _RootShellState();
}

class _RootShellState extends State<RootShell> {
  int _index = 0;

  static const _pages = [HomeScreen(), SearchScreen(), UpdatesScreen(), MoreScreen()];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(index: _index, children: _pages),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        backgroundColor: Colors.white,
        indicatorColor: Brand.tabFill,
        onDestinationSelected: (i) => setState(() => _index = i),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.home_outlined), selectedIcon: Icon(Icons.home), label: 'Home'),
          NavigationDestination(icon: Icon(Icons.search), label: 'Search'),
          NavigationDestination(icon: Icon(Icons.notifications_none), selectedIcon: Icon(Icons.notifications), label: "What's new"),
          NavigationDestination(icon: Icon(Icons.menu), label: 'More'),
        ],
      ),
    );
  }
}
