# Portal to Core readiness contract
Status: design proposal only; no API implementation or live HCP connection.

Customer UI consumes authenticated tenant-scoped view models from BAGDigital Core, never raw Housecall Pro responses or browser-held provider credentials.

Connection summary: connectionId, providerDisplayName, organizationDisplayName, status (not_connected, pending_approval, connecting, connected, needs_attention, disconnected), verifiedAt nullable, allowedCapabilities, nextAction. Server computes status from real evidence; key existence is not connection health.

Dashboard: organizationId, snapshotAt, connections, pendingApprovalsCount, recentActivity, availableCapabilities, attentionItems. Use honest zero/empty states; no invented production metrics.

Approval: id, proposedAction, humanSummary, affectedBusiness, recipientOrTarget, createdAt, expiresAt, status, requiredPermission. Server-side authentication, authorization, audit and idempotency required. UI approval is not execution proof.

Activity: id, timestamp, actorLabel, actionLabel, result, relatedConnectionId. Redact secrets and provider response bodies.

HCP: before cutover display Not connected. After independently approved cutover and read-only verification, expose only capabilities confirmed by Core #84 and tenant permissions. No writes, dispatch, invoicing, ordering, customer messages or other mutations without separately verified authorization.

Multiple Google Workspaces/mailboxes must retain distinct consent, scope, sender identity, health, revocation and audit. Resolve business first, then mailbox. Ambiguous sender requires explicit selection or approved default.

Prototype tests: synthetic zero, connected, and needs-attention fixtures; mobile/keyboard/accessibility; no external network; no real customer data. Production tests must validate tenant isolation and roles at Core, not in frontend-only mocks.

Dependencies: Core #84, Company #33, Infrastructure #15 and Core M9 identity. Existing Site PRs #8/#10/#16 are non-public designs. Security review and founder exact-SHA approval remain required.
