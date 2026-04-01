/**
 * Microstep 15A — Secure Session Manager. Session registry (Map-based).
 * Append-only philosophy: status changes are recorded as new versions in history.
 */

import type { Session } from './secure_session_types.js';
import { SessionError, SessionErrorCode } from './secure_session_errors.js';

export class SessionRegistry {
  readonly MAX_SESSIONS_PER_NODE = 5;
  private readonly latest = new Map<string, Session>();
  private readonly byRemote = new Map<string, Set<string>>();
  private readonly history = new Map<string, Session[]>();

  create(session: Session): void {
    // Enforce concurrency control on ACTIVE sessions only.
    if (session.status === 'active') {
      this.enforceConcurrency(session.node_id_remote);
    }

    this.latest.set(session.session_id, session);
    const set = this.byRemote.get(session.node_id_remote) ?? new Set<string>();
    set.add(session.session_id);
    this.byRemote.set(session.node_id_remote, set);
    const h = this.history.get(session.session_id) ?? [];
    h.push(session);
    this.history.set(session.session_id, h);
  }

  get(session_id: string): Session | null {
    return this.latest.get(session_id) ?? null;
  }

  getByNode(node_id_remote: string): Session[] {
    const ids = this.byRemote.get(node_id_remote);
    if (!ids) return [];
    const out: Session[] = [];
    for (const id of ids) {
      const s = this.latest.get(id);
      if (s) out.push(s);
    }
    return out;
  }

  revoke(session_id: string): void {
    const current = this.latest.get(session_id);
    if (!current) throw new SessionError(SessionErrorCode.SESSION_NOT_FOUND, `Session not found: ${session_id}`);
    if (current.status === 'revoked') return;
    const updated: Session = Object.freeze({ ...current, status: 'revoked' });
    this.create(updated);
  }

  expire(session_id: string): void {
    const current = this.latest.get(session_id);
    if (!current) throw new SessionError(SessionErrorCode.SESSION_NOT_FOUND, `Session not found: ${session_id}`);
    if (current.status === 'expired') return;
    const updated: Session = Object.freeze({ ...current, status: 'expired' });
    this.create(updated);
  }

  /** Optional: audit timeline per session. */
  getHistory(session_id: string): readonly Session[] {
    return Object.freeze([...(this.history.get(session_id) ?? [])]);
  }

  /** Touch updates last_activity_at for an active session (no concurrency enforcement). */
  touch(session_id: string, now: number): void {
    const current = this.latest.get(session_id);
    if (!current) throw new SessionError(SessionErrorCode.SESSION_NOT_FOUND, `Session not found: ${session_id}`);
    if (current.status !== 'active') return;
    const updated: Session = Object.freeze({ ...current, last_activity_at: now });
    // Bypass concurrency enforcement: this is activity refresh.
    this.latest.set(updated.session_id, updated);
    const set = this.byRemote.get(updated.node_id_remote) ?? new Set<string>();
    set.add(updated.session_id);
    this.byRemote.set(updated.node_id_remote, set);
    const h = this.history.get(updated.session_id) ?? [];
    h.push(updated);
    this.history.set(updated.session_id, h);
  }

  private enforceConcurrency(node_id_remote: string): void {
    const active = this.getByNode(node_id_remote)
      .filter((s) => s.status === 'active')
      .sort((a, b) => a.created_at - b.created_at || a.session_id.localeCompare(b.session_id));

    while (active.length >= this.MAX_SESSIONS_PER_NODE && active.length > 0) {
      const oldest = active.shift()!;
      this.markStatus(oldest.session_id, 'revoked');
      // refresh active list after revocation
      const nextActive = this.getByNode(node_id_remote).filter((s) => s.status === 'active');
      active.splice(0, active.length, ...nextActive.sort((a, b) => a.created_at - b.created_at || a.session_id.localeCompare(b.session_id)));
    }
  }

  private markStatus(session_id: string, status: 'revoked' | 'expired'): void {
    const current = this.latest.get(session_id);
    if (!current) return;
    if (current.status === status) return;
    const updated: Session = Object.freeze({ ...current, status });
    // direct append of updated session snapshot (no further concurrency enforcement).
    this.latest.set(updated.session_id, updated);
    const set = this.byRemote.get(updated.node_id_remote) ?? new Set<string>();
    set.add(updated.session_id);
    this.byRemote.set(updated.node_id_remote, set);
    const h = this.history.get(updated.session_id) ?? [];
    h.push(updated);
    this.history.set(updated.session_id, h);
  }
}

