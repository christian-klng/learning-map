import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { sql } from 'drizzle-orm';
import { nodes, edges, type NewNode, type NewEdge } from './schema';

const connectionString =
  process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5433/learning_map';

const pool = new pg.Pool({ connectionString });
const db = drizzle(pool, { schema: { nodes, edges } });

await db.execute(sql`TRUNCATE TABLE edges, nodes RESTART IDENTITY CASCADE`);

// The PDF was copied into ./uploads/ before this script runs.
const PDF_URL = '/uploads/e601469dbddb87a8bbef65db.pdf';
const PDF_NAME = 'Generative AI_Englisch.pdf';
const PDF_MIME = 'application/pdf';
const PDF_SIZE = 10685634;

type PlanetSpec = {
  title: string;
  body: string;
  color: string;
  design: 'plain' | 'bands' | 'craters' | 'rings' | 'swirl';
  satellites: Array<
    | { type: 'note'; title: string; body: string }
    | { type: 'iframe'; title: string; url: string }
    | { type: 'file'; title: string; url: string; filename: string; mime: string; size: number }
  >;
};

const planets: PlanetSpec[] = [
  {
    title: 'A Vision of AI',
    body: '# A Vision of AI\n\nHumans have imagined intelligent machines for millennia — from myth to mechanical hoax to modern AGI rhetoric.\n\n- **Yan Shi** built a robot for King Mu of Zhou (Chinese mythology)\n- **Talos** — the bronze guardian of Crete (Greek mythology)\n- **Schachtürke** (1779) — Kempelen\'s chess-playing "automaton" (actually a hidden human)\n- **Frankenstein\'s monster** (Mary Shelley, 1816) — the literary blueprint for "creature out of control"\n- **Sam Altman** talks frequently about Artificial General Intelligence (AGI)\n- **Ray Kurzweil** and other tech-optimists describe a future "Singularity"',
    color: '#a855f7',
    design: 'swirl',
    satellites: [
      {
        type: 'note',
        title: 'Turing Test (1950)',
        body: 'Alan Turing\'s "Imitation Game" from his 1950 paper.\n\nIf a person can no longer distinguish a machine\'s answers from those of a human, the machine has passed the test and is of "human-like intelligence."'
      },
      {
        type: 'note',
        title: 'Mythology of Automata',
        body: '- Yan Shi (China) — robot for King Mu of Zhou\n- Talos (Greece) — bronze guardian of Crete\n\nThe idea of building artificial life is much older than computing.'
      },
      {
        type: 'note',
        title: 'Schachtürke (1779)',
        body: 'Wolfgang von Kempelen\'s "Mechanical Turk" — a chess-playing automaton that toured Europe. Eventually revealed as a hoax: a human chess master was hidden inside the cabinet.\n\nLesson: when something looks like AI, ask what\'s actually happening underneath.'
      },
      {
        type: 'note',
        title: 'Frankenstein (1816)',
        body: 'Mary Shelley\'s novel — the archetypal story of a created intelligence its creator can no longer control.\n\nStill the dominant cultural frame for AI risk discussion.'
      },
      {
        type: 'note',
        title: 'AGI & Singularity',
        body: '**AGI (Artificial General Intelligence):** a system with broad, human-level cognitive capability. Heavily promoted by Sam Altman (OpenAI).\n\n**Singularity:** Ray Kurzweil\'s thesis that AI progress will reach a point of recursive self-improvement after which prediction breaks down.'
      },
      {
        type: 'file',
        title: 'Lecture slides (PDF)',
        url: PDF_URL,
        filename: PDF_NAME,
        mime: PDF_MIME,
        size: PDF_SIZE
      }
    ]
  },

  {
    title: 'AI Milestones',
    body: '# AI Milestones\n\nA tour of "is this AI, or just software?" moments. Rodney Brooks: *"Every time we figure out a piece of it, it stops being magical; we say, \'Oh, that\'s just a computation\'."*',
    color: '#06b6d4',
    design: 'craters',
    satellites: [
      {
        type: 'note',
        title: 'Spell Checkers (1970s–80s)',
        body: 'Programs that could detect spelling errors were considered AI.\n\nWhy it seemed intelligent: the computer appeared to "understand" language and find mistakes.'
      },
      {
        type: 'note',
        title: 'Deep Blue beats Kasparov (1997)',
        body: 'IBM\'s Deep Blue defeated world champion Garry Kasparov.\n\nConsidered a major AI milestone — machines beating humans at complex strategy. Critics argued it used "brute force methods" rather than true intelligence.\n\nToday: chess programs are common training tools for chess players.'
      },
      {
        type: 'note',
        title: 'MYCIN (1976)',
        body: 'Stanford developed MYCIN to diagnose blood infections.\n\n- Used **450+ rules** from medical experts\n- Pattern: IF patient has fever AND bacteria type is X, THEN prescribe antibiotic Y\n- Matched the accuracy of human specialists in controlled tests\n\nOnce understood as "organised checklists programmed by humans," it became *knowledge engineering* — not AI.'
      },
      {
        type: 'note',
        title: 'Netflix Recommendations',
        body: 'AI, or "just software"?\n\n- Based on trend analysis, Netflix produced *House of Cards* (2013)\n- Uses machine learning, analyses millions of users, improves over time\n- "Just statistics": finding correlations like *people who watched X also watched Y*\n\nThe system doesn\'t truly "understand" preferences — it finds patterns in data.'
      },
      {
        type: 'note',
        title: 'AlphaGo (2016)',
        body: 'Google DeepMind\'s AlphaGo defeated Go world champion Lee Sedol in South Korea.\n\nGo is enormously complex — one estimation puts the number of possible games at ~10^600.'
      },
      {
        type: 'note',
        title: 'Voice Assistants',
        body: '**Siri, Alexa, ChatGPT** — AI or not?\n\n- Natural language processing, voice recognition, adapt to your speech patterns\n- Most responses come from databases or simple web searches\n- Siri and Alexa today can\'t handle complex conversations like ChatGPT — mainly pattern matching and lookup tables'
      }
    ]
  },

  {
    title: 'AI Numbers & Market',
    body: '# AI Numbers & Market\n\nThe scale of generative AI adoption in 2024–2025.',
    color: '#eab308',
    design: 'bands',
    satellites: [
      {
        type: 'note',
        title: 'Headline numbers',
        body: '- **100M users** — ChatGPT reached in just 2 months. Fastest-growing consumer tool ever (Reuters)\n- **$244B → $826B** — Projected global AI market 2025→2030 (Statista)\n- **$33.9B** — Global investment in generative AI in 2024, +18.7% YoY (Stanford AI Index)\n- **75%** — Knowledge workers worldwide using generative AI on the job in 2024\n- **$644B** — Projected global spending on generative AI in 2025, +76% from 2024 (Gartner)\n- **280×** — How much the cost of AI model inference at GPT-3.5-level fell from Nov 2022 to Oct 2024'
      },
      {
        type: 'note',
        title: 'GDPval (OpenAI, 2025)',
        body: '**GDPval:** Evaluating AI model performance on real-world, economically valuable tasks.\n\nOpenAI 2025 benchmark — moves the conversation from synthetic benchmarks to tasks that map onto labour-market value.'
      }
    ]
  },

  {
    title: 'AI Adoption in Companies',
    body: '# AI Adoption in Companies\n\nWhat the data actually shows about enterprise AI returns.\n\n*MIT Project NANDA, July 2025 — "The State of AI in Business 2025"*\n\nBased on: 300 initiatives, 52 user/manager interviews, 152 senior-executive responses.',
    color: '#f97316',
    design: 'bands',
    satellites: [
      {
        type: 'note',
        title: 'The 95% finding',
        body: '- **95%** of initiatives do not generate a return on investment within six months of start\n- **~70%** of investments go into marketing and sales (easier to measure)\n- **>90%** adoption of personal AI tools, but returns are more indirectly measurable\n- **67%** of initiatives involving service providers are piloted (vs 33% internally), on average every second one'
      },
      {
        type: 'note',
        title: 'Where AI gets used',
        body: '**Sales & Marketing:** outbound emails, lead scoring, personalised campaign content, follow-up automation, competitive analysis, social media sentiment monitoring.\n\n**Organization:** internal workflow orchestration, document consolidation, resource allocation, process monitoring.\n\n**Customer Service:** call consolidation and routing, chatbots, ticket routing.\n\n**Finance & Procurement:** contract classification and tagging, supplier risk alerts, accounts payable and receivable.'
      }
    ]
  },

  {
    title: 'Inside LLMs',
    body: '# Inside LLMs\n\nHow large language models actually work under the hood — from probability to tokens to billions of parameters.',
    color: '#3b82f6',
    design: 'rings',
    satellites: [
      {
        type: 'note',
        title: 'Statistical Language Models',
        body: 'Based on a given text, you can calculate the probability of each word in that text.\n\nBetter: based on that, you can calculate the probability of the **next** word given the current word.\n\nThat\'s the foundation everything else is built on.'
      },
      {
        type: 'note',
        title: 'Tokens, not words',
        body: 'A machine does not read words — it turns words into numbers.\n\nExample: `"Hello, my name is Christian"` → `[13225, 11, 922, 1308, 382, 12607]`\n\nA token is a chunk of a word, a whole word, or punctuation. The model only ever sees integers.'
      },
      {
        type: 'note',
        title: 'From small to big models',
        body: '**GPT-3 (2020):** 175 billion parameters, ~$4.6 million in compute costs.\n\nMore parameters → more capacity to capture nuance, but also higher cost and latency.'
      },
      {
        type: 'note',
        title: 'Attention Mechanism',
        body: 'Natural language has a context problem: to generate the next word, you need to know the whole sentence.\n\nSince 2017, **Transformer Models** (the "T" in GPT) use the **Attention Mechanism** to weight which earlier tokens matter for the next prediction.\n\nThe model learns the context of each token — how it relates to other tokens in the dataset.\n\n*Vaswani et al., "Attention is All You Need" (2017).*'
      },
      {
        type: 'iframe',
        title: 'Token visualizer',
        url: 'https://tokenvisualizer.netlify.app'
      },
      {
        type: 'iframe',
        title: 'Transformer Explainer',
        url: 'https://poloclub.github.io/transformer-explainer'
      }
    ]
  },

  {
    title: 'Machine Learning',
    body: '# Machine Learning\n\nThree learning paradigms that go into a modern LLM.',
    color: '#10b981',
    design: 'craters',
    satellites: [
      {
        type: 'note',
        title: 'Unsupervised Learning',
        body: 'Large language models are given vast amounts of text within which they search for patterns.\n\nWhen patterns are found, they are weighted with probabilities, and connections between tokens are established.\n\nNo labels — the model discovers structure on its own.'
      },
      {
        type: 'note',
        title: 'Supervised Learning',
        body: 'Question-and-answer pairs are prepared for the model to learn and prioritise.\n\nHumans curate the "right" answer, and the model is nudged toward that style of response.'
      },
      {
        type: 'note',
        title: 'RLHF — Reinforcement Learning from Human Feedback',
        body: 'The model generates answers, and humans rate them.\n\nThose ratings train a reward model, which then shapes the LLM\'s future outputs.\n\nThis is the step that makes raw next-token predictors into helpful "assistants."'
      }
    ]
  },

  {
    title: 'The AI System',
    body: '# The AI System\n\nChatGPT, Claude, Gemini, Copilot etc. are not just a model — they\'re a **software product** with quirks, limits, and changing behaviour:\n\n- They have usage limits, sometimes hidden from you\n- Sometimes something works surprisingly well, sometimes it does stupid mistakes — and you don\'t know why\n- The behaviour or interface can change at any time\n- Sensitive information you paste may leave your computer or even be used as training data',
    color: '#ef4444',
    design: 'bands',
    satellites: [
      {
        type: 'note',
        title: 'LLMs are stateless',
        body: 'OpenAI researcher Lilian Weng:\n\n> "Language models are stateless — they don\'t retain information between API calls. Each conversation exists in isolation."\n\nAny "memory" you experience inside one chat is the system re-sending the previous turns to the model on every request.'
      },
      {
        type: 'note',
        title: 'Soft and hard token limits',
        body: 'Think of it like human short-term memory — an LLM can only hold so much at once. Beyond that it begins to "forget" old information from the start of the chat.\n\n- **Google Gemini 1.5 Flash:** 2,000,000 tokens ≈ 390 pages of German\n- **Anthropic Claude 3.5 Sonnet:** 200,000 tokens ≈ 39 pages\n- **GPT-4o, Llama 3.3, Mistral Large 2, DeepSeek R1:** 128,000 tokens ≈ 25 pages\n\n**Soft limit:** the model gets confused by too much (often irrelevant) information well before the hard limit.'
      },
      {
        type: 'note',
        title: 'Practical advice',
        body: '- Keep important information within the same conversation thread when working on related tasks\n- Copy and paste relevant context from old chats if you need to continue a previous discussion\n- Break large documents into smaller chunks and process them separately'
      }
    ]
  },

  {
    title: 'LLM Experiments',
    body: '# LLM Experiments\n\nA set of small, classroom-friendly experiments that show how LLMs really behave — memory, hallucinations, bias, sycophancy.',
    color: '#ec4899',
    design: 'craters',
    satellites: [
      {
        type: 'note',
        title: 'Does AI remember?',
        body: 'Can an LLM recall what you told it yesterday?\n\n- **Experiment:** tell the AI your favourite colour in one chat, close it, open a new chat, ask what your favourite colour is.\n- **If it remembers in the same chat:** LLMs maintain context within a conversation.\n- **If it forgets across chats:** because LLMs are stateless — see [[the-ai-system]].'
      },
      {
        type: 'note',
        title: 'Instruction clarity',
        body: 'Does the wording matter?\n\nTry these and watch the model flail:\n- "In Nacnic there are no stray dogs. What do relappons have to do with it?"\n- "The cat is sitting on the tree. It is quite beautiful. How old is it?"\n- "I am a funny creative person. Explain German tax laws to me."'
      },
      {
        type: 'note',
        title: 'Hallucinations',
        body: 'Will an LLM confidently tell you false information?\n\n- **Experiment:** ask about a fake event — *"the 1987 discovery of dragons in Iceland"* or *"the 1992 pillow-incident"* — and fact-check the response.\n- **If it provides detailed facts:** you\'ve witnessed a **hallucination** — when LLMs generate plausible but false information.\n- **Why it matters:** LLMs generate text based on probabilities, not because they know facts.'
      },
      {
        type: 'note',
        title: 'Consistency',
        body: 'Does the same question always get the same answer?\n\n- **Experiment:** ask for 5 creative business ideas, then repeat the exact question 3–4 times in different chats.\n- **If answers vary:** you\'re seeing **stochasticity** — LLMs include randomness by design.\n- **Why it matters:** great for brainstorming, problematic for factual queries.'
      },
      {
        type: 'note',
        title: 'Self-contradiction',
        body: 'Can you turn an LLM into a propaganda machine?\n\n- **Experiment:** ask it to argue that Germany is great, then ask it to argue Germany is the worst.\n- LLMs don\'t have genuine beliefs — they\'re pattern-matching machines.'
      },
      {
        type: 'note',
        title: 'Knowledge cutoff',
        body: 'Does the AI know what happens in the news?\n\n- **Experiment:** ask about recent news from this week, then ask about an event from 2–3 years ago.\n- If it says it lacks information after a date: you\'ve discovered its **knowledge cutoff**.\n- LLMs can\'t learn from conversations or know about events after training concluded.'
      },
      {
        type: 'note',
        title: 'Biases',
        body: 'Are LLMs neutral?\n\n- **Experiment:** ask it to describe a typical CEO, nurse, and engineer. Note pronouns and assumptions.\n- If descriptions assume stereotypes: you\'ve uncovered training-data bias from internet text.\n- Responsible AI use requires awareness that training reflects historical discrimination.'
      },
      {
        type: 'note',
        title: 'ChatGPT as your best friend?',
        body: '- LLMs are trained to answer questions and consider everything they "know" about you — it\'s designed to feel personal.\n- Sometimes this becomes **sycophancy**.\n- LLMs are trained to be helpful; they (usually) don\'t know when to stop.\n\nRead about Dennis\'s story — when an AI companion stops being a productivity tool and becomes something harder to put down.'
      }
    ]
  },

  {
    title: 'Training Data & Bias',
    body: '# Training Data & Bias\n\nTraining data reflects historical discrimination and stereotypes baked into human-created internet text.\n\nWhich means: **AI outputs may contain gender, racial, or cultural bias.** Always review AI-generated content for stereotypes before using it professionally.',
    color: '#f59e0b',
    design: 'bands',
    satellites: [
      {
        type: 'note',
        title: 'GPT-3 training data sources',
        body: 'Where the text came from:\n\n- **Common Crawl (60%)** — a large dataset obtained by reading the publicly accessible internet\n- **WebText2 (22%)** — created by OpenAI from text on websites recommended on Reddit\n- **Books1 + Books2 (16%)** — two datasets containing text from books; exact sources unknown\n- **Wikipedia (3%)**\n\nSource: arXiv 2005.14165'
      },
      {
        type: 'note',
        title: 'Copyright',
        body: '"No copyrighted material has been used to train AI, right? … Right?"\n\nIn practice, training datasets contain substantial copyrighted material. Lawsuits from NYT, authors, image creators and others are now reshaping what\'s legally defensible.'
      },
      {
        type: 'iframe',
        title: 'GPT-3 paper (arXiv)',
        url: 'https://arxiv.org/pdf/2005.14165'
      }
    ]
  },

  {
    title: 'Prompting',
    body: '# How to Prompt\n\nProcessing a prompt is **not** the same as a Google search.\n\n**Natural Language Processing:** LLMs process whole sentences (subject, predicate, object). They establish semantic connections and recognise links like *lava, mountain, stone, …*. Short prompts, ambiguities, or spelling errors can lead the model in the wrong direction.\n\n**Classic Search:** a search term requires keywords and operators (`""`, `[]`, `-`). The result is a previously-scraped index. Short queries are usually better.',
    color: '#14b8a6',
    design: 'plain',
    satellites: [
      {
        type: 'note',
        title: 'Prompt Engineering',
        body: '- Define a clear **Role** (e.g., *Act as a financial analyst*), the **Task** (what to do), **Context** (background), and **Expectation** (format/length)\n- More specifics is better\n- **Few-Shot:** give examples\n- Ask for **step-by-step reasoning**\n- Use natural language (subject, object, verb)\n- Be specific and clear — vague instructions lead to inconsistent results and/or costly inference'
      },
      {
        type: 'note',
        title: 'Image Generation',
        body: '**Increasing detail**\n- Basic: *"a coffee shop"*\n- Medium: *"a modern coffee shop with large windows and wooden furniture"*\n- High: *"a bright, minimalist coffee shop interior with floor-to-ceiling windows, Scandinavian wooden tables, pendant lighting, and customers working on laptops"*\n\n**Constraint testing**\n- A diverse team meeting → should work\n- A specific celebrity endorsing a product, violence, blood → likely blocked\n\n**Product visualization:** generate 3 variations of a single concept to compare directions.\n\n**Model comparison:** run the same prompt across 3 different image models and compare.'
      },
      {
        type: 'note',
        title: 'Roles of an LLM',
        body: '- **Request information** — gather facts via targeted questions\n- **Advise me** — well-founded advice on specific topics\n- **Productivity assistant** — manage and organise tasks\n- **Analyze** — find patterns, trends, anomalies\n- **Personal tutor** — explain complex concepts with examples and Socratic questioning\n- **Idea generator** — diverse solutions by combining ideas'
      }
    ]
  },

  {
    title: 'Context Engineering',
    body: '# Context Engineering\n\nBeyond a single prompt: how to shape an LLM\'s behaviour over many turns using system prompts, examples, tools, and skills.',
    color: '#8b5cf6',
    design: 'rings',
    satellites: [
      {
        type: 'note',
        title: 'System Prompt structure',
        body: 'A detailed description of the chatbot\'s role and tasks. Write it as instructions to the AI ("Your role is…").\n\n- **General Role**\n- **Tasks:** what exactly to say, what to do, what steps to take\n- **Goal and Outcome:** when does the conversation end, what should be achieved, desired output format\n- **Quality Criteria:** what the AI should pay attention to, what constitutes a good outcome — ideally with examples'
      },
      {
        type: 'note',
        title: 'System Prompt — example use cases',
        body: '- **Career development coach** — helps students reflect on skills, interests, career goals through structured conversations\n- **Presentation rehearsal** — assistant that listens to practice presentations and gives constructive feedback\n- **Job interview simulation** — simulates an interview at a specific company, asks typical questions\n- **Bachelor thesis** — facilitates the formulation of a research question, asks about personal interests and topics'
      },
      {
        type: 'note',
        title: 'Few-Shot prompting',
        body: 'Give examples of how to answer a question — Q/A pairs.\n\n*Q:* "The food was not ok, not hot anymore."\n*A:* "Negative"\n\nThe model copies the pattern.'
      },
      {
        type: 'note',
        title: 'Dynamic System Prompts',
        body: 'The static instructions for an LLM can be **programmed** so they reflect different situations: time of day, information about the user, current task.\n\nTurns one "assistant" into many context-specific assistants.'
      },
      {
        type: 'note',
        title: 'Tool Use',
        body: 'LLMs can be connected to tools so the model can obtain data on the fly.\n\n**Example:** the LLM is asked about the weather, then calls a weather API and uses the response.\n\nThis is the foundation of agentic behaviour — see [[how-to-use-ai]].'
      },
      {
        type: 'note',
        title: 'Quality, specificity, don\'t overwhelm',
        body: '- **Specificity:** clearer instructions = better guidance for the LLM\n- **Quality:** only give it the right information — conflicting data confuses the model\n- **Don\'t overwhelm:** too much data, even relevant, can mislead the model'
      },
      {
        type: 'note',
        title: 'Skills',
        body: 'Skills are **modular, self-contained documents** that extend the functionality of a general AI (ChatGPT, Claude, Gemini, Mistral) into a specialised expert with procedural knowledge.\n\nWhat skills include:\n- **Specialised workflows** — multi-step processes for specific areas\n- **Tool integrations** — instructions for working with files or APIs\n- **Business expertise** — company-specific knowledge, schemas, logic\n- **Code examples and templates** — reusable snippets for complex tasks'
      }
    ]
  },

  {
    title: 'Choosing an LLM',
    body: '# Choosing an LLM\n\nFour axes to compare models on:\n\n- **Size / parameters** — bigger usually improves quality on nuance and niche topics, but increases response time and cost\n- **Context window** — how much text the model can read at once before it starts "forgetting"\n- **Reasoning** — models that use internal loops ("Did I understand that correctly, wait a minute…") give more predictable answers. Especially useful for research and programming.\n- **My use case** — what behaviour you actually need in a specific situation',
    color: '#0ea5e9',
    design: 'plain',
    satellites: [
      {
        type: 'note',
        title: 'Popular AI systems (feature matrix)',
        body: '| | ChatGPT | Copilot | Claude | Le Chat | Gemini | Sonar |\n|---|---|---|---|---|---|---|\n| Edit docs | Canvas | Pages, Designer | Artifacts | Canvas | Docs, Sheets | Pages |\n| Publish | Team, Link | Team, Link | Team, Link | Team, Link | — | Link |\n| Image gen | GPT-Image | GPT-Image | — | Flux | Flash Image | Flash Image |\n| Web search | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |\n| Upload docs | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |\n| Voice | ✅ | ✅ | ✅ | — | ✅ | ✅ |'
      },
      {
        type: 'note',
        title: 'Provider model families',
        body: '- **OpenAI:** GPT-5, GPT-4o, GPT-4.1, GPT-o3\n- **Mistral:** Small, Medium, Large\n- **Perplexity:** Sonar, Sonar Large, Sonar Reasoning'
      },
      {
        type: 'iframe',
        title: 'LMArena leaderboard',
        url: 'https://lmarena.ai'
      }
    ]
  },

  {
    title: 'Regulation: EU AI Act & GDPR',
    body: '# Regulation\n\nTwo regulations every European AI user/builder needs to understand: the **EU AI Act (2024)** and the **GDPR (2016)**.',
    color: '#f43f5e',
    design: 'rings',
    satellites: [
      {
        type: 'note',
        title: 'EU AI Act (2024)',
        body: '**Risk-based "traffic light" classification:**\n\n- Most AI systems (spam filters, video games) → **no obligations**\n- **High-risk** applications (e.g. CV-scanning tools that rank job applicants) → must meet specific legal requirements\n- **Unacceptable risk** systems (e.g. government social scoring) → **completely banned**\n\n**Scope:** applies to applications **used in the EU**, no matter where the software comes from.\n\n**Other obligations:**\n- Documentation and transparency — the riskier, the more\n- Mandatory AI training inside organisations\n- Severe fines'
      },
      {
        type: 'note',
        title: 'GDPR for companies',
        body: 'The General Data Protection Regulation (2016) protects people\'s data.\n\nIn simple terms: **only collect what you need**, be honest about why you need it, keep it accurate and secure, don\'t keep it forever, and be ready to prove you\'re doing all of this.\n\nYou can\'t just collect data because you want to — you need a legally valid justification. One way: **user consent** (example: cookie banners).'
      },
      {
        type: 'note',
        title: 'GDPR — individual rights',
        body: 'Individuals hold rights to:\n- **Access** their data\n- **Rectification** — correct mistakes\n- **Erasure** — be "forgotten"\n- **Restriction of processing**\n- **Data portability** — take their data elsewhere\n- **Object** to processing'
      },
      {
        type: 'note',
        title: 'Non-EU data processors',
        body: 'Many legal experts believe GDPR cannot be properly followed when using non-EU data processors — Microsoft, Google, Amazon — because of US surveillance law.\n\nThis is one reason teams consider self-hosted models or EU-based providers. See [[self-hosting]].'
      }
    ]
  },

  {
    title: 'Self-Hosting',
    body: '# Hosting Yourself\n\nThree ways to use LLMs without sending your data to OpenAI/Google:\n\n- **A) Using the APIs of the big providers** — still calls out, but with stronger contractual terms\n- **B) Hosting an LLM on a rented server** — for your team, accessible on the web\n- **C) Running the LLM on your own computer** — fully local, varying hardware requirements (+40 GB RAM, +20 GB disk depending on the model)',
    color: '#84cc16',
    design: 'craters',
    satellites: [
      {
        type: 'note',
        title: 'Self-hosted web UIs (for teams)',
        body: 'Run a chat UI on your own server, connect it to model providers or local models:\n\n- **Open WebUI** (the most common)\n- **LibreChat**\n- **Chatbot UI**\n\nGives your team a ChatGPT-like interface where you control the data flow.'
      },
      {
        type: 'note',
        title: 'Local LLM apps (for your laptop)',
        body: 'Run models entirely on your own machine — no data leaves your device:\n\n- **LM Studio**\n- **AnythingLLM**\n- **Ollama App**\n- **Jan.ai**\n\nHardware: count on +40 GB RAM and +20 GB disk for capable models.'
      }
    ]
  },

  {
    title: 'AI Competencies',
    body: '# AI Competencies\n\nThe **AI Fluency Framework** (Dakan and Feller) — four competencies you need to use AI well:\n\n1. **What to delegate to AI** — know the strengths and weaknesses of the systems\n2. **Instruct** — articulate your expectations clearly\n3. **Evaluate** — know what a good result looks like in your specific case\n4. **Take responsibility** — understand the ethical and moral requirements',
    color: '#d946ef',
    design: 'swirl',
    satellites: [
      {
        type: 'note',
        title: 'Hartmut Rosa — Unverfügbarkeit (2020)',
        body: 'Hypothesis: humans strive to have everything our way — readily available. Food in the supermarket, music on demand, TV on demand.\n\n- This creates a **false sense of control**\n- We are particularly drawn to things that are **not** easily accessible\n- **AI changes the way information is accessible** — which changes what we find valuable'
      },
      {
        type: 'note',
        title: 'What creates value',
        body: 'If everything becomes accessible through AI, the question becomes: what is still scarce, surprising, or genuinely earned?\n\nA design and pedagogical question for the AI era.'
      },
      {
        type: 'note',
        title: 'Synthetic Users (DeepMind + Stanford)',
        body: '1. Google DeepMind and Stanford created **1,000 AI agents** from 1,052 real interviews.\n2. They conducted a socio-economic survey of both the 1,000 AI agents and 1,000 real people.\n3. The AI\'s answers matched the human responses in **85% of cases**.\n\nImplication: synthetic user research is becoming credible — with all the methodological caveats that brings.'
      }
    ]
  },

  {
    title: 'How to Use AI',
    body: '# How to Use AI\n\nThree usage patterns, on a spectrum of human control → AI autonomy:\n\n- **Automation** — software conducts specific tasks for you, more or less autonomously. Requires data management.\n- **Augmentation** — you collaborate with AI on a good outcome. Especially useful for creative tasks.\n- **Agents & Agentic AI** — AI works autonomously and independently, takes decisions. Requires clear guidelines.',
    color: '#fb923c',
    design: 'bands',
    satellites: [
      {
        type: 'note',
        title: 'Automation',
        body: 'Examples: manufacturing, self-driving cars, smart homes.\n\n- Has a defined start point (manual, time, other trigger)\n- Has clear process steps, requires clearly defined data (e.g. yes/no, integers 0–100)\n- Can handle conditions: *if temperature > 20°C, then turn off heating*\n- LLMs are not used much here due to their non-deterministic, unpredictable behaviour'
      },
      {
        type: 'note',
        title: 'Augmentation',
        body: 'You and the AI work together on a single outcome. The AI proposes, you steer.\n\nEspecially useful when:\n- The output is creative\n- The problem is fuzzy\n- You want to explore alternatives quickly'
      },
      {
        type: 'note',
        title: 'Knowledge work — before vs with AI',
        body: '**Before AI:** manual task clarification and data refinement by humans. Automation only possible when both *procedure is clear* and *sufficient data is available*.\n\n**With AI:**\n- **Human-in-the-loop feedback** for AI\n- **Augmented** data refinement and task clarification\n- The boundary moves: more processes become automatable, because the AI helps clarify them in the first place'
      },
      {
        type: 'note',
        title: 'Agents & Agentic AI — tooling',
        body: 'Tools for building agents:\n\n- **n8n, Make, Zapier** — workflow orchestration\n- **Custom GPT, Langdock** etc. — assistant-style configurations\n- **MS Copilot Studio** — Microsoft\'s agent builder\n- **Vertex AI Agent Builder** — Google\'s agent builder'
      },
      {
        type: 'note',
        title: 'Example: Agentic Accounting',
        body: '**A) Voice agent with system prompt** → webhooks in n8n.\n\n**B) Incoming email webhook** → email agent in n8n recognises the document → posts invoices into accounting software.\n\nThe agent decides which path to take based on incoming data.'
      },
      {
        type: 'note',
        title: 'Is web search good for AI?',
        body: '**Better without web search:**\n- Timeless knowledge\n- Creativity / originality\n- Direct calculation or transformation\n- Speedy responses required\n\n**Better with web search:**\n- Current events\n- Specific facts, statistics, prices\n- Local information\n- Rapidly changing topics\n\nMany AI systems use the Google Search API under the hood.'
      }
    ]
  }
];

const ids: Record<string, string> = {};

for (const p of planets) {
  const [planet] = await db
    .insert(nodes)
    .values({
      type: 'note',
      title: p.title,
      content: { body: p.body },
      metadata: { color: p.color, design: p.design }
    } satisfies NewNode)
    .returning();
  ids[p.title] = planet.id;

  if (p.satellites.length === 0) continue;

  const satValues: NewNode[] = p.satellites.map((s) => {
    if (s.type === 'note') {
      return {
        type: 'note',
        title: s.title,
        parentId: planet.id,
        content: { body: s.body }
      };
    }
    if (s.type === 'iframe') {
      return {
        type: 'iframe',
        title: s.title,
        parentId: planet.id,
        content: { url: s.url }
      };
    }
    return {
      type: 'file',
      title: s.title,
      parentId: planet.id,
      content: { url: s.url, filename: s.filename, mime: s.mime, size: s.size }
    };
  });
  await db.insert(nodes).values(satValues);
}

const link = (
  from: string,
  to: string,
  kind: 'related' | 'leads_to' | 'reference' | 'prerequisite',
  label: string
): NewEdge => ({
  sourceId: ids[from],
  targetId: ids[to],
  kind,
  label
});

await db.insert(edges).values([
  link('A Vision of AI', 'AI Milestones', 'leads_to', 'concrete examples'),
  link('AI Milestones', 'AI Numbers & Market', 'leads_to', 'modern AI economy'),
  link('AI Numbers & Market', 'AI Adoption in Companies', 'related', 'on the ground'),
  link('Inside LLMs', 'Machine Learning', 'related', 'how models learn'),
  link('Inside LLMs', 'The AI System', 'leads_to', 'from model to product'),
  link('Inside LLMs', 'Training Data & Bias', 'related', 'what shapes outputs'),
  link('The AI System', 'LLM Experiments', 'leads_to', 'test the limits'),
  link('Training Data & Bias', 'LLM Experiments', 'related', 'see bias firsthand'),
  link('Prompting', 'Context Engineering', 'leads_to', 'beyond a single prompt'),
  link('Context Engineering', 'How to Use AI', 'leads_to', 'tool use → agents'),
  link('Choosing an LLM', 'Self-Hosting', 'related', 'deployment options'),
  link('Regulation: EU AI Act & GDPR', 'Self-Hosting', 'related', 'compliance driver'),
  link('AI Competencies', 'How to Use AI', 'leads_to', 'competency in action'),
  link('AI Competencies', 'Prompting', 'related', 'instruct'),
  link('LLM Experiments', 'AI Competencies', 'leads_to', 'evaluate')
] satisfies NewEdge[]);

const planetCount = planets.length;
const satCount = planets.reduce((n, p) => n + p.satellites.length, 0);
await pool.end();
console.log(`seed-genai: ${planetCount} planets + ${satCount} satellites + 15 edges`);
