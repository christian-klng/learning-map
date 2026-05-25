import { pgTable, uuid, text, jsonb, timestamp, index } from 'drizzle-orm/pg-core';

export type NodeType = 'note' | 'image' | 'file' | 'iframe' | 'quiz';

export type NoteContent = { body: string };
export type ImageContent = { url: string; alt?: string; caption?: string };
export type FileContent = { url: string; filename: string; mime: string; size: number };
export type IframeContent = { url: string; height?: number };
export type QuizContent = { question: string; choices: string[]; answer: number };

export type NodeContent =
  | NoteContent
  | ImageContent
  | FileContent
  | IframeContent
  | QuizContent
  | Record<string, unknown>;

export const nodes = pgTable(
  'nodes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    type: text('type').$type<NodeType>().notNull(),
    title: text('title'),
    content: jsonb('content').$type<NodeContent>().notNull().default({}),
    parentId: uuid('parent_id').references((): any => nodes.id, { onDelete: 'cascade' }),
    position: jsonb('position').$type<{ x: number; y: number } | null>(),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (t) => [index('nodes_parent_id_idx').on(t.parentId), index('nodes_type_idx').on(t.type)]
);

export type EdgeKind = 'reference' | 'related' | 'prerequisite' | 'leads_to';

export const edges = pgTable(
  'edges',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sourceId: uuid('source_id')
      .notNull()
      .references(() => nodes.id, { onDelete: 'cascade' }),
    targetId: uuid('target_id')
      .notNull()
      .references(() => nodes.id, { onDelete: 'cascade' }),
    kind: text('kind').$type<EdgeKind>().notNull().default('reference'),
    label: text('label'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (t) => [index('edges_source_id_idx').on(t.sourceId), index('edges_target_id_idx').on(t.targetId)]
);

export type NodeRow = typeof nodes.$inferSelect;
export type EdgeRow = typeof edges.$inferSelect;
export type NewNode = typeof nodes.$inferInsert;
export type NewEdge = typeof edges.$inferInsert;
