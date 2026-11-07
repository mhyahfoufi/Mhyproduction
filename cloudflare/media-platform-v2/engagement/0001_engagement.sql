-- Candidate migration. Not applied to any live database.
CREATE TABLE engagement_reactions (
 item_id TEXT NOT NULL, visitor_id TEXT NOT NULL, value INTEGER NOT NULL CHECK(value IN (-1,1)),
 created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, PRIMARY KEY(item_id, visitor_id)
);
CREATE INDEX engagement_reactions_time ON engagement_reactions(updated_at,item_id);
CREATE TABLE engagement_events (
 item_id TEXT NOT NULL, visitor_id TEXT NOT NULL, kind TEXT NOT NULL CHECK(kind IN ('play','listen','image_view','external_open')),
 bucket INTEGER NOT NULL, created_at INTEGER NOT NULL, PRIMARY KEY(item_id,visitor_id,kind,bucket)
);
CREATE INDEX engagement_events_time ON engagement_events(created_at,item_id);
CREATE TABLE engagement_comments (
 id TEXT PRIMARY KEY, item_id TEXT NOT NULL, visitor_id TEXT NOT NULL, body TEXT NOT NULL CHECK(length(body)<=1000),
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','hidden','deleted')),
 author_type TEXT NOT NULL DEFAULT 'visitor' CHECK(author_type IN ('visitor','studio')),
 parent_id TEXT REFERENCES engagement_comments(id), created_at INTEGER NOT NULL, moderated_at INTEGER
);
CREATE INDEX engagement_comments_queue ON engagement_comments(status,created_at);
CREATE INDEX engagement_comments_item ON engagement_comments(item_id,status,created_at);
CREATE TABLE engagement_reports (
 comment_id TEXT NOT NULL REFERENCES engagement_comments(id), visitor_id TEXT NOT NULL,
 reason TEXT NOT NULL CHECK(reason IN ('abuse','spam','other')), created_at INTEGER NOT NULL,
 PRIMARY KEY(comment_id,visitor_id)
);
CREATE TABLE engagement_blocks (
 visitor_id TEXT PRIMARY KEY, until_at INTEGER NOT NULL, reason TEXT NOT NULL CHECK(reason IN ('abuse','spam')), created_at INTEGER NOT NULL
);
CREATE TABLE engagement_policies (
 item_id TEXT PRIMARY KEY, comments_enabled INTEGER NOT NULL DEFAULT 1 CHECK(comments_enabled IN (0,1))
);
CREATE TABLE engagement_audit (
 id TEXT PRIMARY KEY, actor_id TEXT NOT NULL, action TEXT NOT NULL, target_id TEXT NOT NULL, created_at INTEGER NOT NULL
);
