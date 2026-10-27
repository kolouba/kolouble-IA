import type { AppSpec, EntitySpec, FieldSpec } from "@/lib/spec";
import { subtitleFields } from "@/lib/spec";
import { escapeDartString as d } from "@/lib/naming";
import type { GeneratedFile } from "./types";
import { allEntityMeta, type EntityMeta } from "./entity-meta";

function g(path: string, content: string): GeneratedFile {
  return { path, content, language: "dart", source: "scaffold" };
}

function dartType(field: FieldSpec): string {
  switch (field.type) {
    case "number":
      return "double?";
    case "boolean":
      return "bool";
    case "date":
      return "DateTime?";
    default:
      return "String";
  }
}

function statusDefault(field: FieldSpec): string {
  return field.options?.[0] ?? "Actif";
}

function controllerName(field: FieldSpec): string {
  return `_${field.dartName}Controller`;
}

function modelFile(spec: AppSpec, entity: EntitySpec, meta: EntityMeta): string {
  const pkg = spec.packageName;
  const ctorLines = entity.fields
    .map((field) =>
      field.type === "number" || field.type === "date"
        ? `    this.${field.dartName},`
        : `    required this.${field.dartName},`,
    )
    .join("\n");

  const declarations = entity.fields
    .map((field) => `  final ${dartType(field)} ${field.dartName};`)
    .join("\n");

  const toMapLines = entity.fields
    .map((field) => {
      if (field.type === "date") {
        return `      '${field.key}': ${field.dartName}?.toIso8601String(),`;
      }
      return `      '${field.key}': ${field.dartName},`;
    })
    .join("\n");

  const fromMapLines = entity.fields
    .map((field) => {
      switch (field.type) {
        case "number":
          return `      ${field.dartName}: (map['${field.key}'] as num?)?.toDouble(),`;
        case "date":
          return `      ${field.dartName}: parseDateTime(map['${field.key}']),`;
        case "boolean":
          return `      ${field.dartName}: map['${field.key}'] == true,`;
        case "status":
          return `      ${field.dartName}: map['${field.key}']?.toString() ?? '${d(statusDefault(field))}',`;
        default:
          return `      ${field.dartName}: map['${field.key}']?.toString() ?? '',`;
      }
    })
    .join("\n");

  return `import 'package:${pkg}/core/utils/date_time_utils.dart';

class ${meta.className} {
  const ${meta.className}({
    required this.id,
${ctorLines}
    this.createdAt,
    this.updatedAt,
  });

  final String id;
${declarations}
  final DateTime? createdAt;
  final DateTime? updatedAt;

  String get displayName => ${meta.primary.dartName};

  Map<String, dynamic> toMap() {
    return <String, dynamic>{
      'id': id,
${toMapLines}
      'created_at': createdAt?.toIso8601String(),
      'updated_at': updatedAt?.toIso8601String(),
    };
  }

  factory ${meta.className}.fromMap(Map<String, dynamic> map) {
    return ${meta.className}(
      id: map['id']?.toString() ?? '',
${fromMapLines}
      createdAt: parseDateTime(map['created_at']),
      updatedAt: parseDateTime(map['updated_at']),
    );
  }
}
`;
}

function repositoryFile(spec: AppSpec, meta: EntityMeta): string {
  return `import 'dart:async';

import 'package:${spec.packageName}/core/storage/local_store.dart';
import 'package:${spec.packageName}/core/sync/sync_service.dart';
import 'package:${spec.packageName}/features/${meta.key}/domain/models/${meta.singularKey}.dart';

class ${meta.repositoryClass} {
  ${meta.repositoryClass}(this._store, this._sync);

  final LocalStore _store;
  final SyncService? _sync;

  Stream<List<${meta.className}>> watchAll() {
    return _store
        .watchAll()
        .map((rows) => rows.map((row) => ${meta.className}.fromMap(row)).toList(growable: false));
  }

  Future<List<${meta.className}>> all() async {
    return _store
        .snapshot()
        .map((row) => ${meta.className}.fromMap(row))
        .toList(growable: false);
  }

  Future<${meta.className}?> findById(String id) async {
    for (final item in await all()) {
      if (item.id == id) return item;
    }
    return null;
  }

  Future<void> save(${meta.className} item) async {
    await _store.save(item.toMap());
    _scheduleSync();
  }

  Future<void> remove(String id) async {
    await _store.delete(id);
    _scheduleSync();
  }

  void _scheduleSync() {
    final sync = _sync;
    if (sync != null) unawaited(sync.syncAll());
  }
}
`;
}

function providersFile(spec: AppSpec, entity: EntitySpec, meta: EntityMeta): string {
  return `import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:${spec.packageName}/core/providers/core_providers.dart';
import 'package:${spec.packageName}/core/storage/local_store.dart';
import 'package:${spec.packageName}/features/${meta.key}/data/${meta.singularKey}_repository.dart';

final Provider<${meta.repositoryClass}> ${meta.providerName} =
    Provider<${meta.repositoryClass}>((ref) {
  return ${meta.repositoryClass}(
    LocalStore('${entity.key}'),
    ref.watch(syncServiceProvider),
  );
});
`;
}

function subtitleCode(
  entity: EntitySpec,
  className: string,
): { importsIntl: boolean; method: string } {
  const fields = subtitleFields(entity);
  const importsIntl = fields.some((field) => field.type === "date");
  const lines = fields
    .map((field) => {
      switch (field.type) {
        case "status":
          return `    if (item.${field.dartName}.isNotEmpty) {
      parts.add(item.${field.dartName});
    }`;
        case "text":
          return `    if (item.${field.dartName}.isNotEmpty) {
      parts.add(item.${field.dartName});
    }`;
        case "number":
          return `    if (item.${field.dartName} != null) {
      parts.add(item.${field.dartName}!.toStringAsFixed(0));
    }`;
        case "date":
          return `    if (item.${field.dartName} != null) {
      parts.add(DateFormat('dd/MM/yyyy').format(item.${field.dartName}!));
    }`;
        case "boolean":
          return `    parts.add(item.${field.dartName} ? 'Oui' : 'Non');`;
        default:
          return "";
      }
    })
    .filter(Boolean)
    .join("\n");

  const method = `String _subtitle(${className} item) {
  final parts = <String>[];
${lines}
  return parts.isEmpty ? 'Aucune information complémentaire' : parts.join(' · ');
}`;

  return { importsIntl, method };
}

function emptyStateWidget(): string {
  return `class _EmptyState extends StatelessWidget {
  const _EmptyState({required this.query, required this.onCreate});

  final String query;
  final VoidCallback onCreate;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: <Widget>[
          Icon(
            Icons.inbox_outlined,
            size: 42,
            color: theme.colorScheme.onSurfaceVariant,
          ),
          const SizedBox(height: 12),
          Text(
            query.isEmpty ? AppCopy.emptyState : 'Aucun résultat pour « \$query ».',
            textAlign: TextAlign.center,
            style: theme.textTheme.bodyMedium?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 14),
          FilledButton.tonal(
            onPressed: onCreate,
            child: const Text('Créer le premier élément'),
          ),
        ],
      ),
    );
  }
}`;
}

function listPageFile(spec: AppSpec, entity: EntitySpec, meta: EntityMeta): string {
  const subtitle = subtitleCode(entity, meta.className);
  return `import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
${subtitle.importsIntl ? "import 'package:intl/intl.dart';\n" : ""}
import 'package:${spec.packageName}/core/constants/app_copy.dart';
import 'package:${spec.packageName}/features/${meta.key}/domain/models/${meta.singularKey}.dart';
import 'package:${spec.packageName}/features/${meta.key}/presentation/providers/${meta.singularKey}_providers.dart';

class ${meta.listPageClass} extends ConsumerStatefulWidget {
  const ${meta.listPageClass}({super.key});

  @override
  ConsumerState<${meta.listPageClass}> createState() => _${meta.listPageClass}State();
}

class _${meta.listPageClass}State extends ConsumerState<${meta.listPageClass}> {
  String _query = '';

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final repository = ref.watch(${meta.providerName});

    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Row(
            children: <Widget>[
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    Text(
                      '${d(meta.plural)}',
                      style: theme.textTheme.headlineMedium?.copyWith(
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Retrouvez et mettez à jour vos ${d(meta.plural.toLowerCase())}.',
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: theme.colorScheme.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              FilledButton.icon(
                onPressed: () => context.push('${meta.route}/new'),
                icon: const Icon(Icons.add),
                label: const Text('Nouveau'),
              ),
            ],
          ),
          const SizedBox(height: 18),
          TextField(
            onChanged: (value) => setState(() => _query = value.trim().toLowerCase()),
            decoration: const InputDecoration(
              hintText: 'Rechercher…',
              prefixIcon: Icon(Icons.search),
            ),
          ),
          const SizedBox(height: 16),
          Expanded(
            child: StreamBuilder<List<${meta.className}>>(
              stream: repository.watchAll(),
              builder: (context, snapshot) {
                if (snapshot.connectionState == ConnectionState.waiting) {
                  return const Center(child: CircularProgressIndicator());
                }
                final items = (snapshot.data ?? const <${meta.className}>[])
                    .where(
                      (item) => item.displayName.toLowerCase().contains(_query),
                    )
                    .toList(growable: false);
                if (items.isEmpty) {
                  return _EmptyState(
                    query: _query,
                    onCreate: () => context.push('${meta.route}/new'),
                  );
                }
                return ListView.separated(
                  itemCount: items.length,
                  separatorBuilder: (context, index) => const SizedBox(height: 8),
                  itemBuilder: (context, index) {
                    final item = items[index];
                    return Card(
                      child: ListTile(
                        contentPadding: const EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 6,
                        ),
                        leading: CircleAvatar(child: Text(_initial(item))),
                        title: Text(
                          item.displayName,
                          style: const TextStyle(fontWeight: FontWeight.w600),
                        ),
                        subtitle: Text(_subtitle(item)),
                        trailing: const Icon(Icons.chevron_right),
                        onTap: () => context.push('${meta.route}/\${item.id}/edit'),
                      ),
                    );
                  },
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  String _initial(${meta.className} item) {
    if (item.displayName.trim().isEmpty) return '?';
    return item.displayName.trim().substring(0, 1).toUpperCase();
  }

  ${subtitle.method}
}

${emptyStateWidget()}
`;
}

function validatorFor(field: FieldSpec): string {
  const label = d(field.label);
  const isEmail = /e-?mail/i.test(field.key) || /e-?mail/i.test(field.label);
  switch (field.type) {
    case "text":
    case "longtext":
      if (isEmail) {
        return field.required ? "Validators.email" : "Validators.optionalEmail";
      }
      return field.required
        ? `(value) => Validators.requiredValue(value, '${label}')`
        : "";
    case "number":
      return field.required
        ? `(value) => Validators.number(value, '${label}')`
        : "Validators.optionalNumber";
    case "date":
      return field.required
        ? "Validators.requiredDate"
        : "(value) => Validators.date(value)";
    default:
      return "";
  }
}

function formFieldCode(field: FieldSpec): string {
  const label = d(field.label);
  if (field.type === "status") {
    const options = field.options ?? ["Actif"];
    const items = options
      .map(
        (option) =>
          `              DropdownMenuItem<String>(
                value: '${d(option)}',
                child: Text('${d(option)}'),
              ),`,
      )
      .join("\n");
    return `          DropdownButtonFormField<String>(
            value: _${field.dartName},
            decoration: const InputDecoration(labelText: '${label}'),
            items: const <DropdownMenuItem<String>>[
${items}
            ],
            onChanged: (value) => setState(
              () => _${field.dartName} = value ?? '${d(options[0]!)}',
            ),
          ),`;
  }

  if (field.type === "boolean") {
    return `          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            value: _${field.dartName},
            title: const Text('${label}'),
            onChanged: (value) => setState(() => _${field.dartName} = value),
          ),`;
  }

  const controller = controllerName(field);
  const isNumber = field.type === "number";
  const isDate = field.type === "date";
  const isLong = field.type === "longtext";
  const hint = isDate ? "AAAA-MM-JJ" : isNumber ? "0" : "";
  const decoration = hint
    ? `const InputDecoration(
              labelText: '${label}',
              hintText: '${hint}',
            )`
    : `const InputDecoration(labelText: '${label}')`;
  const keyboard = isNumber
    ? `\n            keyboardType: const TextInputType.numberWithOptions(decimal: true),`
    : "";
  const maxLines = isLong ? `\n            maxLines: 3,` : "";
  const validator = validatorFor(field);
  const validatorLine = validator
    ? `\n            validator: ${validator},`
    : "";

  return `          TextFormField(
            controller: ${controller},
            decoration: ${decoration},${keyboard}${maxLines}${validatorLine}
          ),`;
}

function formPageFile(spec: AppSpec, entity: EntitySpec, meta: EntityMeta): string {
  const hasDate = entity.fields.some((field) => field.type === "date");
  const controllers = entity.fields
    .filter((field) => !["boolean", "status"].includes(field.type))
    .map(
      (field) =>
        `  final ${controllerName(field)} = TextEditingController();`,
    )
    .join("\n");

  const stateFields = entity.fields
    .filter((field) => ["boolean", "status"].includes(field.type))
    .map((field) =>
      field.type === "status"
        ? `  String _${field.dartName} = '${d(statusDefault(field))}';`
        : `  bool _${field.dartName} = false;`,
    )
    .join("\n");

  const disposeLines = entity.fields
    .filter((field) => !["boolean", "status"].includes(field.type))
    .map((field) => `    ${controllerName(field)}.dispose();`)
    .join("\n");

  const loadLines = entity.fields
    .map((field) => {
      switch (field.type) {
        case "status":
          return `        _${field.dartName} = item.${field.dartName};`;
        case "boolean":
          return `        _${field.dartName} = item.${field.dartName};`;
        case "date":
          return `        ${controllerName(field)}.text = item.${field.dartName} == null
            ? ''
            : DateFormat('yyyy-MM-dd').format(item.${field.dartName}!);`;
        case "number":
          return `        ${controllerName(field)}.text = item.${field.dartName}?.toString() ?? '';`;
        default:
          return `        ${controllerName(field)}.text = item.${field.dartName};`;
      }
    })
    .join("\n");

  const valueLines = entity.fields
    .map((field) => {
      switch (field.type) {
        case "status":
        case "boolean":
          return `      ${field.dartName}: _${field.dartName},`;
        case "number":
          return `      ${field.dartName}: double.tryParse(
        ${controllerName(field)}.text.trim().replaceAll(',', '.'),
      ),`;
        case "date":
          return `      ${field.dartName}: parseDateTime(${controllerName(field)}.text.trim()),`;
        default:
          return `      ${field.dartName}: ${controllerName(field)}.text.trim(),`;
      }
    })
    .join("\n");

  const fieldWidgets = entity.fields
    .map((field) => `${formFieldCode(field)}\n          const SizedBox(height: 14),`)
    .join("\n");

  return `import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
${hasDate ? "import 'package:intl/intl.dart';\n" : ""}import 'package:uuid/uuid.dart';

${hasDate ? `import 'package:${spec.packageName}/core/utils/date_time_utils.dart';\n` : ""}import 'package:${spec.packageName}/core/utils/validators.dart';
import 'package:${spec.packageName}/features/${meta.key}/domain/models/${meta.singularKey}.dart';
import 'package:${spec.packageName}/features/${meta.key}/presentation/providers/${meta.singularKey}_providers.dart';

class ${meta.formPageClass} extends ConsumerStatefulWidget {
  const ${meta.formPageClass}({super.key, this.itemId});

  final String? itemId;

  @override
  ConsumerState<${meta.formPageClass}> createState() => _${meta.formPageClass}State();
}

class _${meta.formPageClass}State extends ConsumerState<${meta.formPageClass}> {
  final _formKey = GlobalKey<FormState>();
${controllers}
${stateFields}
  ${meta.className}? _existing;
  bool _loading = false;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    if (widget.itemId != null) {
      _loading = true;
      WidgetsBinding.instance.addPostFrameCallback((_) => _load());
    }
  }

  @override
  void dispose() {
${disposeLines}
    super.dispose();
  }

  Future<void> _load() async {
    final item = await ref.read(${meta.providerName}).findById(widget.itemId!);
    if (!mounted) return;
    setState(() {
      if (item != null) {
        _existing = item;
${loadLines}
      }
      _loading = false;
    });
  }

  Future<void> _submit() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    setState(() => _saving = true);
    final now = DateTime.now().toUtc();
    final item = ${meta.className}(
      id: widget.itemId ?? const Uuid().v4(),
${valueLines}
      createdAt: _existing?.createdAt ?? now,
      updatedAt: now,
    );

    try {
      await ref.read(${meta.providerName}).save(item);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Enregistré localement. Synchronisation cloud automatique si elle est activée.'),
        ),
      );
      context.pop();
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    if (_loading) {
      return const Center(child: CircularProgressIndicator());
    }

    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 720),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: <Widget>[
                Text(
                  widget.itemId == null ? 'Nouveau · ${d(meta.label)}' : 'Modifier · ${d(meta.label)}',
                  style: theme.textTheme.headlineSmall?.copyWith(
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  'Les données sont stockées dans Hive et synchronisées avec Supabase lorsque le cloud est configuré.',
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                ),
                const SizedBox(height: 22),
${fieldWidgets}
                const SizedBox(height: 10),
                FilledButton.icon(
                  onPressed: _saving ? null : _submit,
                  icon: _saving
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(Icons.check),
                  label: Text(_saving ? 'Enregistrement…' : 'Enregistrer'),
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
}

function modelTestFile(spec: AppSpec, entity: EntitySpec, meta: EntityMeta): string {
  const ctorValues = entity.fields
    .map((field) => {
      switch (field.type) {
        case "number":
          return `      ${field.dartName}: 1500.0,`;
        case "date":
          return `      ${field.dartName}: DateTime.utc(2026, 11, 4),`;
        case "boolean":
          return `      ${field.dartName}: true,`;
        case "status":
          return `      ${field.dartName}: '${d(statusDefault(field))}',`;
        default:
          return `      ${field.dartName}: 'Valeur test',`;
      }
    })
    .join("\n");

  return `import 'package:flutter_test/flutter_test.dart';
import 'package:${spec.packageName}/features/${meta.key}/domain/models/${meta.singularKey}.dart';

void main() {
  test('${meta.className} : sérialisation aller-retour', () {
    final item = ${meta.className}(
      id: 'test-1',
${ctorValues}
      createdAt: DateTime.utc(2026, 1, 1),
      updatedAt: DateTime.utc(2026, 1, 2),
    );

    final restored = ${meta.className}.fromMap(item.toMap());

    expect(restored.id, 'test-1');
    expect(restored.${meta.primary.dartName}, item.${meta.primary.dartName});
    expect(restored.createdAt, isNotNull);
    expect(restored.updatedAt, isNotNull);
  });
}
`;
}

export function buildFlutterEntityFiles(spec: AppSpec): GeneratedFile[] {
  const files: GeneratedFile[] = [];
  for (const entity of spec.entities) {
    const meta = allEntityMeta([entity])[0]!;
    files.push(
      g(meta.modelPath, modelFile(spec, entity, meta)),
      g(meta.repositoryPath, repositoryFile(spec, meta)),
      g(meta.providerPath, providersFile(spec, entity, meta)),
      g(meta.listPagePath, listPageFile(spec, entity, meta)),
      g(meta.formPagePath, formPageFile(spec, entity, meta)),
      {
        path: `test/models/${meta.singularKey}_model_test.dart`,
        content: modelTestFile(spec, entity, meta),
        language: "dart",
        source: "scaffold",
      },
    );
  }
  return files;
}
