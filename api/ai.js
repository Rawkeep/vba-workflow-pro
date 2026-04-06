import express from 'express';

const router = express.Router();

const DAILY_LIMIT = parseInt(process.env.FREE_DAILY_LIMIT || '5', 10);
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;

// ─── Per-IP Usage Tracking ───

const usage = new Map(); // ip -> { count, resetAt }

function getUsage(ip) {
  const now = Date.now();
  let entry = usage.get(ip);
  if (!entry || now >= entry.resetAt) {
    const midnight = new Date();
    midnight.setHours(24, 0, 0, 0);
    entry = { count: 0, resetAt: midnight.getTime() };
    usage.set(ip, entry);
  }
  return entry;
}

function getRemaining(ip) {
  return Math.max(0, DAILY_LIMIT - getUsage(ip).count);
}

// ─── BYOK Support ───

function getUserKey(req) {
  return req.headers['x-user-api-key'] || null;
}

function getApiKey(req) {
  return getUserKey(req) || ANTHROPIC_KEY;
}

function isByok(req) {
  return !!getUserKey(req);
}

// ─── Freemium Guard ───

function freemiumGuard(req, res, next) {
  if (isByok(req)) return next();

  const ip = req.ip || req.connection?.remoteAddress || 'unknown';
  const entry = getUsage(ip);
  if (entry.count >= DAILY_LIMIT) {
    return res.status(429).json({
      error: 'Tageslimit erreicht',
      remaining: 0,
      needsKey: true,
      resetAt: new Date(entry.resetAt).toISOString(),
    });
  }
  entry.count++;
  req._remaining = DAILY_LIMIT - entry.count;
  req._ip = ip;
  next();
}

// ─── Claude API Call ───

async function callClaude(apiKey, system, userMessage, maxTokens = 2000) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: userMessage }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Claude API ${res.status}: ${err}`);
  }

  const data = await res.json();
  return data.content?.[0]?.text || '';
}

// ─── Routes ───

// 1. Workflow Builder: Natural language → Pipeline config
router.post('/suggest', express.json(), freemiumGuard, async (req, res) => {
  try {
    const { description, columns } = req.body;
    if (!description) return res.status(400).json({ error: 'Description required' });

    const system = `Du bist ein VBA BEAST Workflow-Experte. Du erstellst Pipeline-Konfigurationen aus natürlicher Sprache.
Verfügbare Schritte: SELECT_CASE, IF_ELSE, SWITCH, CALC, SORT, FILTER, SEARCH_REPLACE, TEXT_FUNCTION, PIVOT, CHART, PDF_EXPORT, DOCX_MERGE, EMAIL.
Antworte NUR mit gültigem JSON-Array von Pipeline-Schritten. Keine Erklärung.
Jeder Schritt: { "type": "...", "config": { ... } }`;

    const prompt = `Spalten: ${(columns || []).join(', ')}\n\nAufgabe: ${description}`;
    const result = await callClaude(getApiKey(req), system, prompt, 1500);

    res.json({ result, remaining: isByok(req) ? null : req._remaining });
  } catch (err) {
    console.error('[AI suggest]', err.message);
    res.status(500).json({ error: 'AI request failed' });
  }
});

// 2. Data Profiler: Column samples → Cleanup suggestions
router.post('/profile', express.json(), freemiumGuard, async (req, res) => {
  try {
    const { columns, samples } = req.body;
    if (!columns?.length) return res.status(400).json({ error: 'Columns required' });

    const system = `Du bist ein Daten-Analyst. Analysiere die Spalten-Samples und schlage Bereinigungsschritte vor.
Antworte als JSON-Array: [{ "column": "...", "issues": ["..."], "fix": "..." }]
Erkenne: Tippfehler, inkonsistente Formate, fehlende Werte, Duplikate, Ausreißer.`;

    const prompt = columns.map((col, i) =>
      `${col}: ${(samples[i] || []).slice(0, 8).join(', ')}`
    ).join('\n');

    const result = await callClaude(getApiKey(req), system, prompt, 1500);
    res.json({ result, remaining: isByok(req) ? null : req._remaining });
  } catch (err) {
    console.error('[AI profile]', err.message);
    res.status(500).json({ error: 'AI request failed' });
  }
});

// 3. Formula Assistant: Natural language → Calc column definition
router.post('/formula', express.json(), freemiumGuard, async (req, res) => {
  try {
    const { description, columns } = req.body;
    if (!description) return res.status(400).json({ error: 'Description required' });

    const system = `Du bist ein VBA BEAST Formel-Assistent. Erstelle eine berechnete Spalte aus natürlicher Sprache.
Verfügbare Funktionen: +, -, *, /, ROUND(), IF(), AND(), OR(), LEN(), LEFT(), RIGHT(), MID(), UPPER(), LOWER(), TRIM(), CONCATENATE(), SUMIF(), COUNTIF(), ABS(), MIN(), MAX()
Antworte NUR als JSON: { "name": "Spaltenname", "formula": "Formel mit Spaltennamen" }`;

    const prompt = `Spalten: ${(columns || []).join(', ')}\n\nBeschreibung: ${description}`;
    const result = await callClaude(getApiKey(req), system, prompt, 500);
    res.json({ result, remaining: isByok(req) ? null : req._remaining });
  } catch (err) {
    console.error('[AI formula]', err.message);
    res.status(500).json({ error: 'AI request failed' });
  }
});

// 4. Template Generator: Description → Word merge template
router.post('/template', express.json(), freemiumGuard, async (req, res) => {
  try {
    const { description, columns } = req.body;
    if (!description) return res.status(400).json({ error: 'Description required' });

    const system = `Du bist ein VBA BEAST Template-Generator. Erstelle eine Word-Merge-Vorlage mit {{Platzhaltern}}.
Die Platzhalter müssen exakt den Spaltennamen entsprechen: {{Spaltenname}}
Antworte NUR mit dem Template-Text (kein JSON, kein Markdown). Verwende professionelle deutsche Geschäftssprache.`;

    const prompt = `Spalten: ${(columns || []).join(', ')}\n\nBeschreibung: ${description}`;
    const result = await callClaude(getApiKey(req), system, prompt, 1500);
    res.json({ result, remaining: isByok(req) ? null : req._remaining });
  } catch (err) {
    console.error('[AI template]', err.message);
    res.status(500).json({ error: 'AI request failed' });
  }
});

// ─── Usage Info ───

router.get('/usage', (req, res) => {
  const ip = req.ip || req.connection?.remoteAddress || 'unknown';
  const remaining = getRemaining(ip);
  res.json({
    remaining,
    dailyLimit: DAILY_LIMIT,
    freemium: !isByok(req),
    hasKey: isByok(req),
  });
});

export default router;
