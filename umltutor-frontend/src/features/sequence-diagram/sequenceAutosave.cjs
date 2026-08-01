"use strict";

const SAVE_DEBOUNCE_MS = 1000;

class SequenceAutosave {
  constructor({ debounceMs = SAVE_DEBOUNCE_MS, save } = {}) {
    this.debounceMs = debounceMs;
    this.save = save || (() => { });
    this.pending = null;
    this.disposed = false;
  }

  /**
   * Called on every render where nodes/edges/activeUseCaseId/... change.
   */
  schedule({ activeUseCaseId, nodes, edges, mode, isReadOnly }) {
    if (this.disposed) return;

    if (isReadOnly || !activeUseCaseId) {
      this._clearPending();
      return;
    }

    // The active use case changed: persist the outgoing use case's pending
    // edits NOW instead of letting the debounce reset drop them.
    if (this.pending && this.pending.useCaseId !== activeUseCaseId) {
      this.flush();
    }

    if (this.pending && this.pending.timer) {
      clearTimeout(this.pending.timer);
      this.pending.timer = null;
    }

    const snapshot = { useCaseId: activeUseCaseId, nodes, edges, mode, timer: null };
    snapshot.timer = setTimeout(() => {
      if (this.pending === snapshot) this.pending = null;
      this._saveSnapshot(snapshot);
    }, this.debounceMs);
    this.pending = snapshot;
  }

  /**
   * Immediately persist any pending snapshot (e.g. on use-case switch/unmount).
   */
  flush() {
    if (!this.pending) return;
    const snapshot = this.pending;
    this._clearPending();
    this._saveSnapshot(snapshot);
  }

  /**
   * Flush remaining edits and mark this coordinator as done. Called when the
   * editor unmounts so no user edits are ever lost to a cancelled debounce.
   */
  dispose() {
    this.flush();
    this.disposed = true;
  }

  _saveSnapshot(snapshot) {
    if (!snapshot) return;
    this.save({
      mode: snapshot.mode,
      id: snapshot.useCaseId,
      sequence: {
        nodes: snapshot.nodes,
        edges: snapshot.edges,
        useCaseId: snapshot.useCaseId
      }
    });
  }

  _clearPending() {
    if (this.pending && this.pending.timer) {
      clearTimeout(this.pending.timer);
      this.pending.timer = null;
    }
    this.pending = null;
  }
}

module.exports = { SequenceAutosave, SAVE_DEBOUNCE_MS };
