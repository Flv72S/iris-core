-- Migration 001: Initial Schema
-- 
-- Crea tutte le tabelle necessarie per IRIS persistence.
-- 
-- Riferimenti vincolanti:
-- - IRIS_STEP5.7_Persistence_Map.md

-- ============================================================================
-- TABELLA: threads
-- ============================================================================
CREATE TABLE IF NOT EXISTS threads (
    id TEXT PRIMARY KEY,
    state TEXT NOT NULL CHECK(state IN ('OPEN', 'PAUSED', 'CLOSED', 'ARCHIVED')),
    last_state_change_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_threads_state ON threads(state);

-- ============================================================================
-- TABELLA: messages
-- ============================================================================
CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    thread_id TEXT NOT NULL,
    sender_alias TEXT NOT NULL,
    payload TEXT NOT NULL,
    state TEXT NOT NULL CHECK(state IN ('DRAFT', 'SENT', 'DELIVERED', 'READ', 'ARCHIVED', 'EXPIRED', 'FAILED', 'CANCELLED')),
    created_at INTEGER NOT NULL,
    client_message_id TEXT UNIQUE,
    retry_count INTEGER DEFAULT 0,
    FOREIGN KEY (thread_id) REFERENCES threads(id)
);

CREATE INDEX IF NOT EXISTS idx_messages_thread_id ON messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_client_message_id ON messages(client_message_id);

-- ============================================================================
-- TABELLA: delivery_status
-- ============================================================================
CREATE TABLE IF NOT EXISTS delivery_status (
    message_id TEXT PRIMARY KEY,
    thread_id TEXT NOT NULL,
    state TEXT NOT NULL CHECK(state IN ('SENT', 'DELIVERED', 'READ', 'FAILED')),
    sent_at INTEGER NOT NULL,
    delivered_at INTEGER,
    read_at INTEGER,
    failed_at INTEGER,
    failure_reason TEXT,
    FOREIGN KEY (message_id) REFERENCES messages(id),
    FOREIGN KEY (thread_id) REFERENCES threads(id)
);

CREATE INDEX IF NOT EXISTS idx_delivery_status_thread_id ON delivery_status(thread_id);
CREATE INDEX IF NOT EXISTS idx_delivery_status_state ON delivery_status(state);

-- ============================================================================
-- TABELLA: sync_status
-- ============================================================================
CREATE TABLE IF NOT EXISTS sync_status (
    id INTEGER PRIMARY KEY CHECK(id = 1),
    last_sync_at INTEGER,
    estimated_latency INTEGER
);

-- Inserisce riga iniziale per sync_status
INSERT OR IGNORE INTO sync_status (id, last_sync_at, estimated_latency) VALUES (1, NULL, NULL);

-- ============================================================================
-- TABELLA: offline_queue
-- ============================================================================
CREATE TABLE IF NOT EXISTS offline_queue (
    message_id TEXT PRIMARY KEY,
    thread_id TEXT NOT NULL,
    sender_alias TEXT NOT NULL,
    payload TEXT NOT NULL,
    state TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    client_message_id TEXT,
    retry_count INTEGER DEFAULT 0,
    FOREIGN KEY (message_id) REFERENCES messages(id)
);

CREATE INDEX IF NOT EXISTS idx_offline_queue_created_at ON offline_queue(created_at);

-- ============================================================================
-- TABELLA: rate_limits
-- ============================================================================
CREATE TABLE IF NOT EXISTS rate_limits (
    sender_alias TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    PRIMARY KEY (sender_alias, timestamp)
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_sender_alias ON rate_limits(sender_alias);
CREATE INDEX IF NOT EXISTS idx_rate_limits_timestamp ON rate_limits(timestamp);

-- ============================================================================
-- TABELLA: aliases
-- ============================================================================
CREATE TABLE IF NOT EXISTS aliases (
    id TEXT PRIMARY KEY,
    is_root INTEGER NOT NULL DEFAULT 0 CHECK(is_root IN (0, 1))
);

CREATE INDEX IF NOT EXISTS idx_aliases_is_root ON aliases(is_root);
