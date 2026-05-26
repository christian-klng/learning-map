import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { sql } from 'drizzle-orm';
import { nodes, edges, type NewNode, type NewEdge } from './schema';

const connectionString =
  process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/learning_map';

const pool = new pg.Pool({ connectionString });
const db = drizzle(pool, { schema: { nodes, edges } });

await db.execute(sql`TRUNCATE TABLE edges, nodes RESTART IDENTITY CASCADE`);

// Three "planets" (notes) and a few "moons" (image/iframe/file satellites)
const [photosynthesis] = await db
  .insert(nodes)
  .values({
    type: 'note',
    title: 'Photosynthesis',
    content: {
      body: '# Photosynthesis\n\nPlants convert light energy into chemical energy stored in glucose.'
    },
    metadata: { color: '#10b981', design: 'craters' } // emerald — biology
  } satisfies NewNode)
  .returning();

const [respiration] = await db
  .insert(nodes)
  .values({
    type: 'note',
    title: 'Cellular respiration',
    content: {
      body: '# Cellular respiration\n\nCells break down glucose to release ATP for energy.'
    },
    metadata: { color: '#f97316', design: 'bands' } // orange — energy
  } satisfies NewNode)
  .returning();

const [carbonCycle] = await db
  .insert(nodes)
  .values({
    type: 'note',
    title: 'The carbon cycle',
    content: {
      body: '# Carbon cycle\n\nCarbon moves between atmosphere, biosphere, oceans, and geosphere.'
    },
    metadata: { color: '#3b82f6', design: 'rings' } // blue — atmosphere
  } satisfies NewNode)
  .returning();

const [ecosystems] = await db
  .insert(nodes)
  .values({
    type: 'note',
    title: 'Ecosystems',
    content: {
      body: '# Ecosystems\n\nAn ecosystem includes all living organisms and their physical environment, interacting as a system.'
    },
    metadata: { color: '#a855f7', design: 'swirl' }, // purple — ecology
    position: { x: 450, y: -100 }
  } satisfies NewNode)
  .returning();

// Satellites of "photosynthesis"
await db.insert(nodes).values([
  {
    type: 'image',
    title: 'Leaf cross-section',
    parentId: photosynthesis.id,
    content: {
      url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Leaf_Tissue_Structure.svg/640px-Leaf_Tissue_Structure.svg.png',
      alt: 'Leaf cross-section showing chloroplasts'
    }
  },
  {
    type: 'iframe',
    title: 'Wikipedia: Photosynthesis',
    parentId: photosynthesis.id,
    content: { url: 'https://en.wikipedia.org/wiki/Photosynthesis' }
  },
  {
    type: 'note',
    title: 'Chlorophyll',
    parentId: photosynthesis.id,
    content: { body: 'Green pigment that absorbs red and blue light.' }
  },
  {
    type: 'quiz',
    title: 'Quick check',
    parentId: photosynthesis.id,
    content: {
      question: 'What is the primary pigment in photosynthesis?',
      choices: ['Hemoglobin', 'Chlorophyll', 'Melanin', 'Keratin'],
      answer: 1
    }
  }
] satisfies NewNode[]);

// Satellites of "respiration"
await db.insert(nodes).values([
  {
    type: 'note',
    title: 'ATP',
    parentId: respiration.id,
    content: { body: 'Adenosine triphosphate — the cell\'s energy currency.' }
  },
  {
    type: 'iframe',
    title: 'Khan Academy: Cellular respiration',
    parentId: respiration.id,
    content: { url: 'https://www.khanacademy.org/science/biology/cellular-respiration-and-fermentation' }
  }
] satisfies NewNode[]);

// Satellite of "carbon cycle"
await db.insert(nodes).values([
  {
    type: 'image',
    title: 'Carbon cycle diagram',
    parentId: carbonCycle.id,
    content: {
      url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Carbon_cycle.jpg/640px-Carbon_cycle.jpg',
      alt: 'Diagram of the global carbon cycle'
    }
  }
] satisfies NewNode[]);

// Satellite of "ecosystems"
await db.insert(nodes).values([
  {
    type: 'note',
    title: 'Food webs',
    parentId: ecosystems.id,
    content: { body: 'A food web shows the interconnected food chains within an ecosystem, illustrating energy flow from producers to consumers.' }
  }
] satisfies NewNode[]);

// Knowledge connections between planets
await db.insert(edges).values([
  { sourceId: photosynthesis.id, targetId: respiration.id, kind: 'related', label: 'inverse process' },
  { sourceId: photosynthesis.id, targetId: carbonCycle.id, kind: 'related', label: 'fixes CO₂' },
  { sourceId: respiration.id, targetId: carbonCycle.id, kind: 'related', label: 'releases CO₂' },
  { sourceId: photosynthesis.id, targetId: ecosystems.id, kind: 'leads_to', label: 'energy source', unlockDirection: 'source' }
] satisfies NewEdge[]);

await pool.end();
console.log('seed: 4 planets + 8 satellites + 4 edges (1 directed)');
