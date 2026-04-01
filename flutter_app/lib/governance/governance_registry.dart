// G0 - Canonical scope and authority set. Aligned with docs; for tests and tooling.

import 'governance_authority.dart';
import 'governance_scope.dart';

/// Canonical scopes from GOVERNANCE_SCOPE.md.
List<GovernanceScope> get canonicalScopes => [
      GovernanceScope(
        scopeId: ScopeId.irisCore,
        mutability: ScopeMutability.immutable,
        boundaries: const ScopeBoundaries(
          includes: ['Data model', 'hashing', 'structural integrity', 'manifest', 'freeze seal', 'Core boundary contract'],
          excludes: ['Flow runtime', 'UI', 'tooling', 'plugins', 'business logic above Core'],
        ),
        description: 'IRIS Core',
      ),
      GovernanceScope(
        scopeId: ScopeId.irisFlow,
        mutability: ScopeMutability.controlled,
        boundaries: const ScopeBoundaries(
          includes: ['Flow runtime', 'step graph', 'orchestration', 'context binding', 'policy', 'telemetry', 'replay', 'freeze'],
          excludes: ['Core data mutation', 'UI rendering', 'plugin implementation', 'normative logic'],
        ),
        description: 'IRIS Flow',
      ),
      GovernanceScope(
        scopeId: ScopeId.flowExtensions,
        mutability: ScopeMutability.evolvable,
        boundaries: const ScopeBoundaries(
          includes: ['Optional steps', 'optional bindings', 'plugin behavior within Flow contract'],
          excludes: ['Core', 'Flow core runtime', 'breaking changes to Flow API'],
        ),
        description: 'Flow Extensions',
      ),
      GovernanceScope(
        scopeId: ScopeId.uxInterface,
        mutability: ScopeMutability.evolvable,
        boundaries: const ScopeBoundaries(
          includes: ['Screens', 'navigation', 'presentation of Flow and Core-backed data'],
          excludes: ['Core/Flow behavioral logic', 'certification', 'hashing', 'policy enforcement'],
        ),
        description: 'UX & Interface',
      ),
      GovernanceScope(
        scopeId: ScopeId.toolingCi,
        mutability: ScopeMutability.evolvable,
        boundaries: const ScopeBoundaries(
          includes: ['Build', 'tests', 'freeze validator', 'seal checks', 'baseline storage'],
          excludes: ['Runtime behavior', 'Core/Flow data', 'production decisions'],
        ),
        description: 'Tooling & CI',
      ),
    ];

/// Canonical authorities from GOVERNANCE_AUTHORITY.md. One primary per scope.
List<GovernanceAuthority> get canonicalAuthorities => [
      GovernanceAuthority(
        authorityId: AuthorityId.coreCouncil,
        primaryScopeId: ScopeId.irisCore,
        role: AuthorityRole.primary,
        permittedActions: [ActionKind.proposeCoreEvolution, ActionKind.approveCoreEvolution],
        forbiddenActions: [
          ActionKind.changeFlowWithinCompatibility,
          ActionKind.updateManifestSeal,
          ActionKind.publishPlugin,
          ActionKind.changeUxWithinContract,
          ActionKind.storeBaseline,
        ],
        escalationTarget: null,
      ),
      GovernanceAuthority(
        authorityId: AuthorityId.flowMaintainers,
        primaryScopeId: ScopeId.irisFlow,
        role: AuthorityRole.primary,
        permittedActions: [
          ActionKind.changeFlowWithinCompatibility,
          ActionKind.updateManifestSeal,
          ActionKind.runValidator,
          ActionKind.escalateToCoreCouncil,
        ],
        forbiddenActions: [ActionKind.approveCoreEvolution],
        escalationTarget: AuthorityId.coreCouncil,
      ),
      GovernanceAuthority(
        authorityId: AuthorityId.pluginAuthors,
        primaryScopeId: ScopeId.flowExtensions,
        role: AuthorityRole.primary,
        permittedActions: [ActionKind.publishPlugin, ActionKind.escalateToFlowMaintainers],
        forbiddenActions: [ActionKind.updateManifestSeal, ActionKind.approveCoreEvolution],
        escalationTarget: AuthorityId.flowMaintainers,
      ),
      GovernanceAuthority(
        authorityId: AuthorityId.uxOwners,
        primaryScopeId: ScopeId.uxInterface,
        role: AuthorityRole.primary,
        permittedActions: [ActionKind.changeUxWithinContract, ActionKind.escalateToFlowMaintainers],
        forbiddenActions: [ActionKind.updateManifestSeal, ActionKind.approveCoreEvolution],
        escalationTarget: AuthorityId.flowMaintainers,
      ),
      GovernanceAuthority(
        authorityId: AuthorityId.platformDevops,
        primaryScopeId: ScopeId.toolingCi,
        role: AuthorityRole.primary,
        permittedActions: [ActionKind.runValidator, ActionKind.storeBaseline],
        forbiddenActions: [
          ActionKind.changeFlowWithinCompatibility,
          ActionKind.updateManifestSeal,
          ActionKind.approveCoreEvolution,
        ],
        escalationTarget: AuthorityId.flowMaintainers,
      ),
    ];
