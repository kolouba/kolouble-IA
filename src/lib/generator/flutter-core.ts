import type { AppSpec } from "@/lib/spec";
import { escapeDartString as d } from "@/lib/naming";
import type { GeneratedFile } from "./types";
import { allEntityMeta, dartColor } from "./entity-meta";

function g(path: string, content: string): GeneratedFile {
  return { path, content, language: "dart", source: "scaffold" };
}

export function buildFlutterCoreFiles(spec: AppSpec): GeneratedFile[] {
  const pkg = spec.packageName;
  const metas = allEntityMeta(spec.entities);
  const entityRouteList = metas.map((meta) => `'${meta.route}'`).join(", ");

  const mainDart = `import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'package:${pkg}/app.dart';
import 'package:${pkg}/core/config/app_config.dart';
import 'package:${pkg}/core/providers/core_providers.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Hive.initFlutter();

  final boxNames = <String>[...AppConfig.collections, 'meta'];
  for (final boxName in boxNames) {
    await Hive.openBox<dynamic>(boxName);
  }

  var cloudReady = false;
  if (AppConfig.supabaseConfigured) {
    try {
      await Supabase.initialize(
        url: AppConfig.supabaseUrl,
        anonKey: AppConfig.supabaseAnonKey,
      );
      cloudReady = true;
    } catch (error) {
      debugPrint('Supabase indisponible, démarrage hors ligne : \$error');
    }
  }

  runApp(
    ProviderScope(
      overrides: <Override>[
        cloudReadyProvider.overrideWithValue(cloudReady),
      ],
      child: const KoloubleApp(),
    ),
  );
}
`;

  const appDart = `import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:${pkg}/core/config/app_config.dart';
import 'package:${pkg}/core/router/app_router.dart';
import 'package:${pkg}/core/theme/app_theme.dart';

class KoloubleApp extends ConsumerWidget {
  const KoloubleApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(routerProvider);
    return MaterialApp.router(
      title: AppConfig.appName,
      debugShowCheckedModeBanner: false,
      theme: AppTheme.dark,
      routerConfig: router,
    );
  }
}
`;

  const configDart = `class AppConfig {
  static const String appName = '${d(spec.appName)}';
  static const String tagline = '${d(spec.tagline)}';
  static const String domain = '${d(spec.domain)}';

  static const String supabaseUrl = String.fromEnvironment('SUPABASE_URL');
  static const String supabaseAnonKey = String.fromEnvironment('SUPABASE_ANON_KEY');

  static bool get supabaseConfigured =>
      supabaseUrl.isNotEmpty && supabaseAnonKey.isNotEmpty;

  static const List<String> collections = <String>[
    ${metas.map((meta) => `'${meta.key}'`).join(",\n    ")},
  ];
}
`;

  const themeDart = `import 'package:flutter/material.dart';

class AppTheme {
  static const Color primary = Color(${dartColor(spec.theme.primary)});
  static const Color secondary = Color(${dartColor(spec.theme.secondary)});
  static const Color accent = Color(${dartColor(spec.theme.accent)});
  static const Color background = Color(${dartColor(spec.theme.background)});
  static const Color surface = Color(${dartColor(spec.theme.surface)});

  static ThemeData get dark {
    final ColorScheme scheme = ColorScheme.fromSeed(
      seedColor: primary,
      brightness: Brightness.dark,
    ).copyWith(
      primary: primary,
      secondary: secondary,
      tertiary: accent,
      surface: surface,
    );

    return ThemeData(
      useMaterial3: true,
      colorScheme: scheme,
      scaffoldBackgroundColor: background,
      appBarTheme: const AppBarTheme(
        backgroundColor: background,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        centerTitle: false,
      ),
      inputDecorationTheme: const InputDecorationTheme(
        border: OutlineInputBorder(),
        isDense: true,
      ),
      snackBarTheme: SnackBarThemeData(
        behavior: SnackBarBehavior.floating,
        backgroundColor: surface,
        contentTextStyle: const TextStyle(color: Colors.white),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
    );
  }
}
`;

  const routerImports = metas
    .flatMap((meta) => [
      `import 'package:${pkg}/${packagePath(meta.listPagePath)}';`,
      `import 'package:${pkg}/${packagePath(meta.formPagePath)}';`,
    ])
    .join("\n");

  const entityRoutes = metas
    .map(
      (meta) => `      GoRoute(
        path: '${meta.route}',
        builder: (context, state) => const ${meta.listPageClass}(),
        routes: [
          GoRoute(
            path: 'new',
            builder: (context, state) => const ${meta.formPageClass}(),
          ),
          GoRoute(
            path: ':id/edit',
            builder: (context, state) => ${meta.formPageClass}(
              itemId: state.pathParameters['id'],
            ),
          ),
        ],
      ),`,
    )
    .join("\n");

  const routerDart = `import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'package:${pkg}/core/providers/core_providers.dart';
import 'package:${pkg}/core/widgets/app_shell.dart';
import 'package:${pkg}/features/auth/presentation/pages/login_page.dart';
import 'package:${pkg}/features/dashboard/presentation/pages/dashboard_page.dart';
import 'package:${pkg}/features/settings/presentation/pages/settings_page.dart';
${routerImports}

final Provider<GoRouter> routerProvider = Provider<GoRouter>((ref) {
  final auth = ref.watch(authServiceProvider);

  return GoRouter(
    initialLocation: '/',
    refreshListenable: auth,
    redirect: (context, state) {
      final signedIn = auth.isSignedIn;
      final isLoginRoute = state.matchedLocation == '/login';
      if (!signedIn && !isLoginRoute) return '/login';
      if (signedIn && isLoginRoute) return '/';
      return null;
    },
    routes: <RouteBase>[
      GoRoute(
        path: '/login',
        builder: (context, state) => const LoginPage(),
      ),
      ShellRoute(
        builder: (context, state, child) => AppShell(child: child),
        routes: <RouteBase>[
          GoRoute(
            path: '/',
            builder: (context, state) => const DashboardPage(),
          ),
${entityRoutes}
          GoRoute(
            path: '/settings',
            builder: (context, state) => const SettingsPage(),
          ),
        ],
      ),
    ],
  );
});
`;

  const dateUtilsDart = `DateTime? parseDateTime(dynamic value) {
  if (value == null) return null;
  if (value is DateTime) return value;
  return DateTime.tryParse(value.toString());
}

String formatDate(DateTime? value) {
  if (value == null) return '—';
  final day = value.day.toString().padLeft(2, '0');
  final month = value.month.toString().padLeft(2, '0');
  return '\$day/\$month/\${value.year}';
}
`;

  const validatorsDart = `class Validators {
  static String? requiredValue(String? value, String label) {
    if (value == null || value.trim().isEmpty) return '$label est requis.';
    return null;
  }

  static String? email(String? value) {
    final required = requiredValue(value, 'L’e-mail');
    if (required != null) return required;
    final pattern = RegExp(r'^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$');
    return pattern.hasMatch(value!.trim()) ? null : 'Adresse e-mail invalide.';
  }

  static String? optionalEmail(String? value) {
    if (value == null || value.trim().isEmpty) return null;
    return email(value);
  }

  static String? number(String? value, String label) {
    if (value == null || value.trim().isEmpty) return '$label est requis.';
    return optionalNumber(value);
  }

  static String? optionalNumber(String? value) {
    if (value == null || value.trim().isEmpty) return null;
    final parsed = double.tryParse(value.trim().replaceAll(',', '.'));
    return parsed == null ? 'Valeur numérique invalide.' : null;
  }

  static String? date(String? value, {bool required = false}) {
    if (value == null || value.trim().isEmpty) {
      return required ? 'La date est requise.' : null;
    }
    return DateTime.tryParse(value.trim()) == null
        ? 'Format attendu : AAAA-MM-JJ.'
        : null;
  }

  static String? requiredDate(String? value) => date(value, required: true);

  static String? password(String? value) {
    if (value == null || value.length < 8) {
      return '8 caractères minimum.';
    }
    return null;
  }
}
`;

  const localStoreDart = `import 'package:hive/hive.dart';

class LocalStore {
  LocalStore(this.collection);

  final String collection;

  Box<dynamic> get _box => Hive.box<dynamic>(collection);

  List<Map<String, dynamic>> rawAll() {
    final items = <Map<String, dynamic>>[];
    for (final value in _box.values) {
      if (value is Map) {
        items.add(Map<String, dynamic>.from(value));
      }
    }
    return items;
  }

  List<Map<String, dynamic>> snapshot() {
    final items = rawAll().where((row) => row['_deleted'] != true).toList();
    items.sort((a, b) {
      final String left = a['_updated_at']?.toString() ?? '';
      final String right = b['_updated_at']?.toString() ?? '';
      return right.compareTo(left);
    });
    return items;
  }

  Stream<List<Map<String, dynamic>>> watchAll() async* {
    yield snapshot();
    await for (final _ in _box.watch()) {
      yield snapshot();
    }
  }

  Future<void> save(Map<String, dynamic> item) async {
    final now = DateTime.now().toUtc().toIso8601String();
    final stored = <String, dynamic>{...item};
    stored.putIfAbsent('created_at', () => now);
    stored['updated_at'] = now;
    stored['_updated_at'] = now;
    stored['_sync_state'] = 'pending';
    await _box.put(stored['id'].toString(), stored);
  }

  Future<void> delete(String id) async {
    final value = _box.get(id);
    if (value is! Map) return;
    final map = Map<String, dynamic>.from(value);
    map['_deleted'] = true;
    map['_sync_state'] = 'pending';
    map['_updated_at'] = DateTime.now().toUtc().toIso8601String();
    await _box.put(id, map);
  }

  Future<void> replaceFromRemote(Map<String, dynamic> remote) async {
    final id = remote['id']?.toString();
    if (id == null || id.isEmpty) return;
    final local = _box.get(id);
    if (local is Map && local['_sync_state'] == 'pending') return;
    final merged = <String, dynamic>{
      ...remote,
      '_sync_state': 'synced',
      '_updated_at': remote['updated_at']?.toString() ??
          DateTime.now().toUtc().toIso8601String(),
    };
    await _box.put(id, merged);
  }

  Future<void> removeLocal(String id) async {
    await _box.delete(id);
  }
}
`;

  const syncDart = `import 'package:hive/hive.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'package:${pkg}/core/storage/local_store.dart';

class SyncReport {
  const SyncReport({
    this.pushed = 0,
    this.pulled = 0,
    this.errors = const <String>[],
    this.skipped = false,
  });

  final int pushed;
  final int pulled;
  final List<String> errors;
  final bool skipped;
}

class SyncService {
  SyncService(this._client, this.collections, this._meta);

  final SupabaseClient _client;
  final List<String> collections;
  final Box<dynamic> _meta;
  bool _running = false;

  Future<SyncReport> syncAll() async {
    final user = _client.auth.currentUser;
    if (user == null) {
      return const SyncReport(skipped: true);
    }
    if (_running) {
      return const SyncReport(skipped: true);
    }

    _running = true;
    var pushed = 0;
    var pulled = 0;
    final errors = <String>[];

    try {
      for (final collection in collections) {
        try {
          final result = await _syncCollection(collection, user.id);
          pushed += result.pushed;
          pulled += result.pulled;
        } catch (error) {
          errors.add('\$collection : \$error');
        }
      }
      await _meta.put('last_sync_at', DateTime.now().toUtc().toIso8601String());
    } finally {
      _running = false;
    }

    return SyncReport(pushed: pushed, pulled: pulled, errors: errors);
  }

  Future<({int pushed, int pulled})> _syncCollection(
    String collection,
    String userId,
  ) async {
    final store = LocalStore(collection);
    var pushed = 0;
    var pulled = 0;

    final pending = store
        .rawAll()
        .where((row) => row['_sync_state'] == 'pending')
        .toList(growable: false);

    for (final row in pending) {
      if (row['id'] == null) continue;
      final payload = <String, dynamic>{};
      row.forEach((key, value) {
        final name = key.toString();
        if (!name.startsWith('_')) {
          payload[name] = value;
        }
      });
      payload['user_id'] = userId;

      if (row['_deleted'] == true) {
        await _client.from(collection).delete().eq('id', row['id']);
        await store.removeLocal(row['id'].toString());
      } else {
        await _client.from(collection).upsert(payload);
        final cleared = <String, dynamic>{...row, '_sync_state': 'synced'};
        await Hive.box<dynamic>(collection).put(row['id'], cleared);
      }
      pushed += 1;
    }

    final String last = _meta.get('last_sync_\$collection')?.toString() ??
        '1970-01-01T00:00:00Z';
    final remote = await _client
        .from(collection)
        .select()
        .gt('updated_at', last)
        .order('updated_at', ascending: true);

    var newest = last;
    for (final item in remote) {
      final map = Map<String, dynamic>.from(item);
      final id = map['id']?.toString();
      if (id == null) continue;
      if (map['deleted'] == true) {
        await store.removeLocal(id);
      } else {
        await store.replaceFromRemote(map);
        pulled += 1;
      }
      final stamp = map['updated_at']?.toString();
      if (stamp != null && stamp.compareTo(newest) > 0) {
        newest = stamp;
      }
    }

    await _meta.put('last_sync_\$collection', newest);
    return (pushed: pushed, pulled: pulled);
  }
}
`;

  const authDart = `import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:hive/hive.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class AuthService extends ChangeNotifier {
  AuthService(this._client, this._meta)
      : _localSession = _readLocalSession(_meta) {
    _subscription =
        _client?.auth.onAuthStateChange.listen((_) => notifyListeners());
  }

  final SupabaseClient? _client;
  final Box<dynamic> _meta;
  StreamSubscription<AuthState>? _subscription;
  Map<String, dynamic>? _localSession;

  bool get isCloud => _client != null;

  bool get isSignedIn =>
      _client == null ? _localSession != null : _client.auth.currentUser != null;

  User? get currentUser => _client?.auth.currentUser;

  String? get email =>
      currentUser?.email ?? _localSession?['email']?.toString();

  String? get displayName {
    final cloudName = currentUser?.userMetadata?['full_name'];
    if (cloudName is String && cloudName.isNotEmpty) return cloudName;
    final localName = _localSession?['name'];
    if (localName is String && localName.isNotEmpty) return localName;
    return null;
  }

  SupabaseClient _requireClient() {
    final client = _client;
    if (client == null) {
      throw StateError("Supabase n'est pas configuré sur cette installation.");
    }
    return client;
  }

  Future<void> signInLocal({required String email, String? name}) async {
    final trimmedName = name?.trim() ?? '';
    _localSession = <String, dynamic>{
      'email': email.trim(),
      'name': trimmedName.isEmpty ? null : trimmedName,
      'started_at': DateTime.now().toUtc().toIso8601String(),
    };
    await _meta.put('local_session', _localSession);
    notifyListeners();
  }

  Future<AuthResponse> signInWithEmail(String email, String password) {
    return _requireClient().auth.signInWithPassword(
      email: email,
      password: password,
    );
  }

  Future<AuthResponse> signUpWithEmail(
    String email,
    String password,
    String name,
  ) {
    return _requireClient().auth.signUp(
      email: email,
      password: password,
      data: <String, dynamic>{'full_name': name},
    );
  }

  Future<void> signInWithGoogle() {
    return _requireClient().auth.signInWithOAuth(
      OAuthProvider.google,
      redirectTo: kIsWeb ? null : '${pkg.replace(/_/g, "-")}://login-callback',
    );
  }

  Future<void> signInWithFacebook() {
    return _requireClient().auth.signInWithOAuth(
      OAuthProvider.facebook,
      redirectTo: kIsWeb ? null : '${pkg.replace(/_/g, "-")}://login-callback',
    );
  }

  Future<void> signOut() async {
    final client = _client;
    if (client != null) {
      try {
        await client.auth.signOut();
      } catch (_) {
        // La session doit rester fermable même si le réseau est indisponible.
      }
    }
    _localSession = null;
    await _meta.delete('local_session');
    notifyListeners();
  }

  static Map<String, dynamic>? _readLocalSession(Box<dynamic> meta) {
    final value = meta.get('local_session');
    return value is Map ? Map<String, dynamic>.from(value) : null;
  }

  @override
  void dispose() {
    _subscription?.cancel();
    super.dispose();
  }
}
`;

  const coreProvidersDart = `import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive/hive.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'package:${pkg}/core/auth/auth_service.dart';
import 'package:${pkg}/core/config/app_config.dart';
import 'package:${pkg}/core/sync/sync_service.dart';

final Provider<bool> cloudReadyProvider = Provider<bool>((ref) => false);

final Provider<AuthService> authServiceProvider = Provider<AuthService>((ref) {
  final cloudReady = ref.watch(cloudReadyProvider);
  final service = AuthService(
    cloudReady ? Supabase.instance.client : null,
    Hive.box<dynamic>('meta'),
  );
  ref.onDispose(service.dispose);
  return service;
});

final Provider<SyncService?> syncServiceProvider =
    Provider<SyncService?>((ref) {
  final cloudReady = ref.watch(cloudReadyProvider);
  if (!cloudReady) return null;
  return SyncService(
    Supabase.instance.client,
    AppConfig.collections,
    Hive.box<dynamic>('meta'),
  );
});
`;

  const appCopyDart = `class AppCopy {
  static const String welcomeTitle = '${d(spec.copy.welcomeTitle)}';
  static const String welcomeMessage = '${d(spec.copy.welcomeMessage)}';
  static const String emptyState = '${d(spec.copy.emptyState)}';
  static const String syncMessage = '${d(spec.copy.syncMessage)}';
}
`;

  const drawerItems = metas
    .map(
      (meta) => `          ListTile(
            leading: Icon(${meta.icon}),
            title: const Text('${d(meta.plural)}'),
            onTap: () {
              Navigator.of(context).pop();
              context.go('${meta.route}');
            },
          ),`,
    )
    .join("\n");

  const railDestinations = metas
    .map(
      (meta) => `        const NavigationRailDestination(
          icon: Icon(${meta.icon}),
          selectedIcon: Icon(${meta.icon}),
          label: Text('${d(meta.plural)}'),
        ),`,
    )
    .join("\n");

  const appShellDart = `import 'dart:async';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'package:${pkg}/core/config/app_config.dart';
import 'package:${pkg}/core/providers/core_providers.dart';
import 'package:${pkg}/core/theme/app_theme.dart';

const List<String> _entityRoutes = <String>[${entityRouteList}];

class AppShell extends ConsumerStatefulWidget {
  const AppShell({super.key, required this.child});

  final Widget child;

  @override
  ConsumerState<AppShell> createState() => _AppShellState();
}

class _AppShellState extends ConsumerState<AppShell> {
  Timer? _timer;
  StreamSubscription<List<ConnectivityResult>>? _connectivity;

  @override
  void initState() {
    super.initState();
    Future<void>.microtask(() => _sync(feedback: false));
    _timer = Timer.periodic(
      const Duration(minutes: 5),
      (_) => _sync(feedback: false),
    );
    _connectivity = Connectivity().onConnectivityChanged.listen((results) {
      if (!results.contains(ConnectivityResult.none)) {
        _sync(feedback: false);
      }
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    _connectivity?.cancel();
    super.dispose();
  }

  Future<void> _sync({bool feedback = true}) async {
    final sync = ref.read(syncServiceProvider);
    if (sync == null) {
      if (mounted && feedback) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
              'Mode hors ligne : les données restent sur cet appareil.',
            ),
          ),
        );
      }
      return;
    }
    final report = await sync.syncAll();
    if (!mounted) return;
    if (!feedback) return;
    final message = report.errors.isEmpty
        ? 'Synchronisation terminée : \${report.pushed} envoi(s), \${report.pulled} réception(s).'
        : 'Synchronisation partielle : \${report.errors.first}';
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message)),
    );
  }

  Future<void> _logout() async {
    await ref.read(authServiceProvider).signOut();
    if (mounted) context.go('/login');
  }

  int _selectedIndex(String location) {
    for (var index = 0; index < _entityRoutes.length; index++) {
      if (location.startsWith(_entityRoutes[index])) return index + 1;
    }
    if (location.startsWith('/settings')) return _entityRoutes.length + 1;
    return 0;
  }

  void _navigate(int index) {
    if (index == 0) {
      context.go('/');
      return;
    }
    if (index <= _entityRoutes.length) {
      context.go(_entityRoutes[index - 1]);
      return;
    }
    context.go('/settings');
  }

  @override
  Widget build(BuildContext context) {
    final width = MediaQuery.sizeOf(context).width;
    final wide = width >= 960;
    final location = GoRouterState.of(context).matchedLocation;
    final selectedIndex = _selectedIndex(location);
    final email = ref.watch(authServiceProvider).email ?? 'Session locale';

    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: <Widget>[
            Container(
              width: 30,
              height: 30,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: <Color>[AppTheme.primary, AppTheme.secondary],
                ),
                borderRadius: BorderRadius.circular(9),
              ),
              child: const Text(
                'K',
                style: TextStyle(
                  color: Colors.black,
                  fontWeight: FontWeight.w900,
                  fontSize: 16,
                ),
              ),
            ),
            const SizedBox(width: 10),
            Flexible(
              child: Text(
                AppConfig.appName,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontWeight: FontWeight.w700),
              ),
            ),
          ],
        ),
        actions: <Widget>[
          IconButton(
            tooltip: 'Synchroniser',
            onPressed: _sync,
            icon: const Icon(Icons.sync),
          ),
          PopupMenuButton<String>(
            tooltip: email,
            onSelected: (value) {
              if (value == 'logout') _logout();
            },
            itemBuilder: (context) => const <PopupMenuEntry<String>>[
              PopupMenuItem<String>(
                value: 'logout',
                child: Text('Se déconnecter'),
              ),
            ],
            icon: const Icon(Icons.account_circle_outlined),
          ),
        ],
      ),
      drawer: wide
          ? null
          : Drawer(
              child: SafeArea(
                child: ListView(
                  padding: const EdgeInsets.all(12),
                  children: <Widget>[
                    Padding(
                      padding: const EdgeInsets.all(12),
                      child: Text(
                        AppConfig.appName,
                        style: Theme.of(context)
                            .textTheme
                            .titleLarge
                            ?.copyWith(fontWeight: FontWeight.w800),
                      ),
                    ),
                    ListTile(
                      leading: const Icon(Icons.space_dashboard_outlined),
                      title: const Text('Tableau de bord'),
                      onTap: () {
                        Navigator.of(context).pop();
                        context.go('/');
                      },
                    ),
${drawerItems}
                    ListTile(
                      leading: const Icon(Icons.settings_outlined),
                      title: const Text('Paramètres'),
                      onTap: () {
                        Navigator.of(context).pop();
                        context.go('/settings');
                      },
                    ),
                  ],
                ),
              ),
            ),
      body: Row(
        children: <Widget>[
          if (wide)
            NavigationRail(
              backgroundColor: AppTheme.surface,
              selectedIndex: selectedIndex,
              onDestinationSelected: _navigate,
              labelType: width >= 1200
                  ? NavigationRailLabelType.none
                  : NavigationRailLabelType.all,
              extended: width >= 1200,
              leading: const Padding(
                padding: EdgeInsets.symmetric(vertical: 20),
                child: Icon(Icons.menu, color: AppTheme.primary),
              ),
              destinations: const <NavigationRailDestination>[
                NavigationRailDestination(
                  icon: Icon(Icons.space_dashboard_outlined),
                  selectedIcon: Icon(Icons.space_dashboard),
                  label: Text('Tableau de bord'),
                ),
${railDestinations}
                NavigationRailDestination(
                  icon: Icon(Icons.settings_outlined),
                  selectedIcon: Icon(Icons.settings),
                  label: Text('Paramètres'),
                ),
              ],
            ),
          Expanded(child: widget.child),
        ],
      ),
    );
  }
}
`;

  const loginDart = `import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'package:${pkg}/core/config/app_config.dart';
import 'package:${pkg}/core/providers/core_providers.dart';
import 'package:${pkg}/core/theme/app_theme.dart';
import 'package:${pkg}/core/utils/validators.dart';

class LoginPage extends ConsumerStatefulWidget {
  const LoginPage({super.key});

  @override
  ConsumerState<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends ConsumerState<LoginPage> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _loading = false;
  bool _signup = false;
  bool _obscure = true;
  String? _error;

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final auth = ref.read(authServiceProvider);
      if (!auth.isCloud) {
        await auth.signInLocal(
          email: _emailController.text.trim(),
          name: _nameController.text.trim(),
        );
      } else if (_signup) {
        final response = await auth.signUpWithEmail(
          _emailController.text.trim(),
          _passwordController.text,
          _nameController.text.trim(),
        );
        if (mounted && response.session == null) {
          setState(() {
            _error = 'Compte créé. Vérifiez votre e-mail pour confirmer votre inscription.';
          });
        }
      } else {
        await auth.signInWithEmail(
          _emailController.text.trim(),
          _passwordController.text,
        );
      }
      if (mounted && auth.isSignedIn) {
        context.go('/');
      }
    } catch (error) {
      if (mounted) {
        setState(() => _error = _friendlyError(error));
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _oauth(Future<void> Function() action) async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      await action();
    } catch (error) {
      if (mounted) setState(() => _error = _friendlyError(error));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  String _friendlyError(Object error) {
    if (error is AuthException) return error.message;
    return 'Connexion impossible. Vérifiez vos identifiants et votre connexion réseau.';
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final auth = ref.watch(authServiceProvider);
    final cloud = auth.isCloud;
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: <Color>[AppTheme.background, Color(0xFF0E1A16)],
          ),
        ),
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 430),
              child: Card(
                child: Padding(
                  padding: const EdgeInsets.all(28),
                  child: Form(
                    key: _formKey,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: <Widget>[
                        Row(
                          children: <Widget>[
                            Container(
                              width: 42,
                              height: 42,
                              alignment: Alignment.center,
                              decoration: BoxDecoration(
                                gradient: const LinearGradient(
                                  colors: <Color>[AppTheme.primary, AppTheme.secondary],
                                ),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: const Text(
                                'K',
                                style: TextStyle(
                                  color: Colors.black,
                                  fontSize: 22,
                                  fontWeight: FontWeight.w900,
                                ),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Text(
                                AppConfig.appName,
                                style: theme.textTheme.titleLarge?.copyWith(
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 10),
                        Text(
                          AppConfig.tagline,
                          style: theme.textTheme.bodyMedium?.copyWith(
                            color: theme.colorScheme.onSurfaceVariant,
                          ),
                        ),
                        if (!cloud) ...<Widget>[
                          const SizedBox(height: 18),
                          const Card(
                            child: ListTile(
                              leading: Icon(Icons.cloud_off_outlined),
                              title: Text('Mode hors ligne'),
                              subtitle: Text(
                                'Supabase n’est pas configuré : la session et les données restent sur cet appareil.',
                              ),
                            ),
                          ),
                        ],
                        const SizedBox(height: 26),
                        if (_signup || !cloud) ...<Widget>[
                          TextFormField(
                            controller: _nameController,
                            textInputAction: TextInputAction.next,
                            decoration: const InputDecoration(labelText: 'Nom complet'),
                            validator: (value) => Validators.requiredValue(value, 'Le nom'),
                          ),
                          const SizedBox(height: 14),
                        ],
                        TextFormField(
                          controller: _emailController,
                          keyboardType: TextInputType.emailAddress,
                          textInputAction: TextInputAction.next,
                          autofillHints: const <String>[AutofillHints.email],
                          decoration: const InputDecoration(labelText: 'E-mail'),
                          validator: Validators.email,
                        ),
                        const SizedBox(height: 14),
                        if (cloud) ...<Widget>[
                          TextFormField(
                            controller: _passwordController,
                            obscureText: _obscure,
                            autofillHints: const <String>[AutofillHints.password],
                            decoration: InputDecoration(
                              labelText: 'Mot de passe',
                              suffixIcon: IconButton(
                                tooltip: _obscure ? 'Afficher' : 'Masquer',
                                onPressed: () => setState(() => _obscure = !_obscure),
                                icon: Icon(
                                  _obscure ? Icons.visibility_outlined : Icons.visibility_off_outlined,
                                ),
                              ),
                            ),
                            validator: Validators.password,
                            onFieldSubmitted: (_) => _submit(),
                          ),
                          const SizedBox(height: 14),
                        ],
                        if (_error != null) ...<Widget>[
                          const SizedBox(height: 14),
                          Text(
                            _error!,
                            style: TextStyle(color: theme.colorScheme.error),
                          ),
                        ],
                        const SizedBox(height: 22),
                        FilledButton(
                          onPressed: _loading ? null : _submit,
                          child: Text(
                            _loading
                                ? 'Patientez…'
                                : !cloud
                                    ? 'Continuer hors ligne'
                                    : _signup
                                        ? 'Créer mon compte'
                                        : 'Se connecter',
                          ),
                        ),
                        if (cloud) ...<Widget>[
                          const SizedBox(height: 12),
                          TextButton(
                            onPressed: _loading
                                ? null
                                : () => setState(() {
                                      _signup = !_signup;
                                      _error = null;
                                    }),
                            child: Text(
                              _signup
                                  ? 'J’ai déjà un compte'
                                  : 'Créer un compte',
                            ),
                          ),
                          const SizedBox(height: 18),
                          Row(
                            children: <Widget>[
                              const Expanded(child: Divider()),
                              Padding(
                                padding: const EdgeInsets.symmetric(horizontal: 12),
                                child: Text(
                                  'ou continuer avec',
                                  style: theme.textTheme.bodySmall,
                                ),
                              ),
                              const Expanded(child: Divider()),
                            ],
                          ),
                          const SizedBox(height: 14),
                          OutlinedButton.icon(
                            onPressed: _loading
                                ? null
                                : () => _oauth(ref.read(authServiceProvider).signInWithGoogle),
                            icon: const Icon(Icons.g_mobiledata_rounded, size: 26),
                            label: const Text('Google'),
                          ),
                          const SizedBox(height: 10),
                          OutlinedButton.icon(
                            onPressed: _loading
                                ? null
                                : () => _oauth(ref.read(authServiceProvider).signInWithFacebook),
                            icon: const Icon(Icons.facebook_outlined),
                            label: const Text('Facebook'),
                          ),
                        ],
                        const SizedBox(height: 20),
                        Text(
                          cloud
                              ? 'Connexion sécurisée par Supabase. Vos données restent accessibles hors ligne.'
                              : 'Aucune donnée n’est envoyée : tout reste stocké localement dans Hive.',
                          textAlign: TextAlign.center,
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: theme.colorScheme.onSurfaceVariant,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
`;

  const dashboardCards = metas
    .map(
      (meta) => `          _MetricCard(
            title: '${d(meta.plural)}',
            subtitle: '${d(meta.plural)} au total',
            icon: ${meta.icon},
            counts: ref
                .watch(${meta.providerName})
                .watchAll()
                .map((items) => items.length),
            route: '${meta.route}',
          ),`,
    )
    .join("\n");

  const dashboardProviders = metas
    .map(
      (meta) =>
        `import 'package:${pkg}/${packagePath(meta.providerPath)}';`,
    )
    .join("\n");

  const dashboardDart = `import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'package:${pkg}/core/constants/app_copy.dart';
import 'package:${pkg}/core/providers/core_providers.dart';
${dashboardProviders}

class DashboardPage extends ConsumerWidget {
  const DashboardPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    return ListView(
      padding: const EdgeInsets.all(24),
      children: <Widget>[
        Text(
          AppCopy.welcomeTitle,
          style: theme.textTheme.headlineMedium?.copyWith(
            fontWeight: FontWeight.w800,
          ),
        ),
        const SizedBox(height: 8),
        ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 760),
          child: Text(
            AppCopy.welcomeMessage,
            style: theme.textTheme.bodyLarge?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
              height: 1.5,
            ),
          ),
        ),
        const SizedBox(height: 28),
        Wrap(
          spacing: 16,
          runSpacing: 16,
          children: <Widget>[
${dashboardCards}
          ],
        ),
        const SizedBox(height: 28),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Icon(Icons.cloud_sync_outlined, color: theme.colorScheme.primary),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: <Widget>[
                      const Text(
                        'Mode hors ligne actif',
                        style: TextStyle(fontWeight: FontWeight.w700),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        AppCopy.syncMessage,
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: theme.colorScheme.onSurfaceVariant,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 12),
                FilledButton.tonal(
                  onPressed: () => _syncNow(context, ref),
                  child: const Text('Synchroniser'),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Future<void> _syncNow(BuildContext context, WidgetRef ref) async {
    final sync = ref.read(syncServiceProvider);
    if (sync == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Mode hors ligne : les données restent sur cet appareil.'),
        ),
      );
      return;
    }
    final report = await sync.syncAll();
    if (!context.mounted) return;
    final message = report.errors.isEmpty
        ? 'Synchronisation terminée : \${report.pushed} envoi(s), \${report.pulled} réception(s).'
        : 'Synchronisation partielle : \${report.errors.first}';
    ScaffoldMessenger.of(context)
        .showSnackBar(SnackBar(content: Text(message)));
  }
}

class _MetricCard extends StatelessWidget {
  const _MetricCard({
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.counts,
    required this.route,
  });

  final String title;
  final String subtitle;
  final IconData icon;
  final Stream<int> counts;
  final String route;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return SizedBox(
      width: 250,
      child: Card(
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: () => context.go(route),
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Row(
                  children: <Widget>[
                    Icon(icon, color: theme.colorScheme.primary),
                    const Spacer(),
                    Icon(
                      Icons.arrow_outward,
                      size: 18,
                      color: theme.colorScheme.onSurfaceVariant,
                    ),
                  ],
                ),
                const SizedBox(height: 18),
                StreamBuilder<int>(
                  stream: counts,
                  builder: (context, snapshot) => Text(
                    snapshot.data?.toString() ?? '—',
                    style: theme.textTheme.headlineMedium?.copyWith(
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ),
                const SizedBox(height: 4),
                Text(title, style: const TextStyle(fontWeight: FontWeight.w700)),
                const SizedBox(height: 2),
                Text(
                  subtitle,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
`;

  const settingsDart = `import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'package:${pkg}/core/config/app_config.dart';
import 'package:${pkg}/core/providers/core_providers.dart';

class SettingsPage extends ConsumerWidget {
  const SettingsPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final auth = ref.watch(authServiceProvider);
    return ListView(
      padding: const EdgeInsets.all(24),
      children: <Widget>[
        Text(
          'Paramètres',
          style: theme.textTheme.headlineMedium?.copyWith(
            fontWeight: FontWeight.w800,
          ),
        ),
        const SizedBox(height: 18),
        Card(
          child: ListTile(
            leading: const CircleAvatar(child: Icon(Icons.person_outline)),
            title: Text(auth.displayName ?? auth.email ?? 'Session locale'),
            subtitle: Text(
              auth.isCloud
                  ? 'Compte authentifié via Supabase'
                  : 'Session locale hors ligne — données stockées sur cet appareil',
            ),
          ),
        ),
        const SizedBox(height: 14),
        Card(
          child: Column(
            children: <Widget>[
              ListTile(
                leading: const Icon(Icons.sync),
                title: const Text('Synchronisation cloud'),
                subtitle: Text(
                  auth.isCloud
                      ? 'Les enregistrements locaux sont envoyés puis fusionnés automatiquement.'
                      : 'Ajoutez SUPABASE_URL et SUPABASE_ANON_KEY pour activer la synchronisation.',
                ),
                trailing: auth.isCloud
                    ? TextButton(
                        onPressed: () => _syncNow(context, ref),
                        child: const Text('Synchroniser'),
                      )
                    : null,
              ),
              const Divider(height: 1),
              ListTile(
                leading: const Icon(Icons.storage_outlined),
                title: const Text('Stockage local'),
                subtitle: const Text('Hive, chiffré par le système et disponible hors connexion.'),
              ),
              const Divider(height: 1),
              ListTile(
                leading: const Icon(Icons.devices_outlined),
                title: const Text('Plateformes'),
                subtitle: const Text('Web · Android · iOS · Windows'),
              ),
            ],
          ),
        ),
        const SizedBox(height: 14),
        Card(
          child: ListTile(
            leading: Icon(Icons.logout, color: theme.colorScheme.error),
            title: const Text('Se déconnecter'),
            onTap: () async {
              await ref.read(authServiceProvider).signOut();
              if (context.mounted) context.go('/login');
            },
          ),
        ),
        const SizedBox(height: 24),
        Text(
          '\${AppConfig.appName} · ${d(spec.domain)} · généré par Kôloublé IA',
          style: theme.textTheme.bodySmall?.copyWith(
            color: theme.colorScheme.onSurfaceVariant,
          ),
        ),
      ],
    );
  }

  Future<void> _syncNow(BuildContext context, WidgetRef ref) async {
    final sync = ref.read(syncServiceProvider);
    if (sync == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Mode hors ligne : les données restent sur cet appareil.'),
        ),
      );
      return;
    }
    final report = await sync.syncAll();
    if (!context.mounted) return;
    final message = report.errors.isEmpty
        ? 'Synchronisation terminée : \${report.pushed} envoi(s), \${report.pulled} réception(s).'
        : 'Synchronisation partielle : \${report.errors.first}';
    ScaffoldMessenger.of(context)
        .showSnackBar(SnackBar(content: Text(message)));
  }
}
`;

  return [
    g("lib/main.dart", mainDart),
    g("lib/app.dart", appDart),
    g("lib/core/config/app_config.dart", configDart),
    g("lib/core/theme/app_theme.dart", themeDart),
    g("lib/core/router/app_router.dart", routerDart),
    g("lib/core/utils/date_time_utils.dart", dateUtilsDart),
    g("lib/core/utils/validators.dart", validatorsDart),
    g("lib/core/storage/local_store.dart", localStoreDart),
    g("lib/core/sync/sync_service.dart", syncDart),
    g("lib/core/auth/auth_service.dart", authDart),
    g("lib/core/providers/core_providers.dart", coreProvidersDart),
    g("lib/core/constants/app_copy.dart", appCopyDart),
    g("lib/core/widgets/app_shell.dart", appShellDart),
    g("lib/features/auth/presentation/pages/login_page.dart", loginDart),
    g("lib/features/dashboard/presentation/pages/dashboard_page.dart", dashboardDart),
    g("lib/features/settings/presentation/pages/settings_page.dart", settingsDart),
    g("test/validators_test.dart", validatorsTest(pkg)),
  ];
}

function validatorsTest(pkg: string): string {
  return `import 'package:flutter_test/flutter_test.dart';
import 'package:${pkg}/core/utils/validators.dart';

void main() {
  group('Validators', () {
    test('refuse un champ requis vide', () {
      expect(Validators.requiredValue('', 'Nom'), isNotNull);
      expect(Validators.requiredValue('Projet', 'Nom'), isNull);
    });

    test('valide les e-mails', () {
      expect(Validators.email('contact@exemple.ci'), isNull);
      expect(Validators.email('invalide'), isNotNull);
      expect(Validators.optionalEmail(''), isNull);
    });

    test('valide les nombres et les dates', () {
      expect(Validators.optionalNumber('12,5'), isNull);
      expect(Validators.optionalNumber('abc'), isNotNull);
      expect(Validators.date('2026-11-04'), isNull);
      expect(Validators.date('04/11/2026'), isNotNull);
    });
  });
}
`;
}

function packagePath(path: string): string {
  return path.replace(/^lib\//, "");
}
