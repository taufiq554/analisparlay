import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Izinkan payload JSON besar untuk screenshot base64
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

/**
 * Helper retry delay untuk mengatasi intermittent rate limit / network jitter
 */
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Lazy initialization Google GenAI client
 */
let geminiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  const key = process.env.GEMINI_API_KEY || '';
  if (!key) {
    throw new Error('GEMINI_API_KEY environment variable is required');
  }
  if (!geminiClient) {
    geminiClient = new GoogleGenAI({ apiKey: key });
  }
  return geminiClient;
}

/**
 * OpenRouter Chat Completion Call helper
 */
async function callOpenRouterServer(
  model: string,
  apiKey: string,
  prompt: string,
  base64DataUrl?: string,
  enableWebSearch: boolean = false
): Promise<{ content: string; httpStatus: number }> {
  let messageContent: any = prompt;

  if (base64DataUrl) {
    messageContent = [
      {
        type: 'text',
        text: prompt,
      },
      {
        type: 'image_url',
        image_url: {
          url: base64DataUrl,
        },
      },
    ];
  }

  const requestBody: any = {
    model: model,
    messages: [
      {
        role: 'system',
        content:
          'Kamu adalah AI Sports Research & Analysis Engine profesional. Cari dan gunakan data aktual terkini (form, H2H, cedera, lineup, standings) sebelum melakukan analisis multi-market. Dilarang mengarang data statistik atau menjamin kemenangan.',
      },
      {
        role: 'user',
        content: messageContent,
      },
    ],
    max_tokens: 4096,
    temperature: 0.2,
  };

  if (enableWebSearch) {
    requestBody.tools = [{ type: 'openrouter:web_search' }];
  }

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://aistudio.google.com',
      'X-Title': 'MAX AI Pro Parlay',
    },
    body: JSON.stringify(requestBody),
  });

  const rawText = await response.text();
  if (!response.ok) {
    throw new Error(`OpenRouter error (${response.status}): ${rawText}`);
  }

  const json = JSON.parse(rawText);
  const choice = json.choices?.[0];
  const content = choice?.message?.content || '';

  return { content, httpStatus: response.status };
}

// ----------------------------------------------------
// API ROUTES
// ----------------------------------------------------

app.get('/api/health', (req, res) => {
  const hasGemini = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== '');
  const hasOpenRouter = Boolean(
    (process.env.VITE_OPENROUTER_PRIMARY_KEY && process.env.VITE_OPENROUTER_PRIMARY_KEY.trim() !== '') ||
    (process.env.OPENROUTER_PRIMARY_KEY && process.env.OPENROUTER_PRIMARY_KEY.trim() !== '') ||
    (process.env.OPENROUTER_API_KEY && process.env.OPENROUTER_API_KEY.trim() !== '')
  );

  res.json({
    status: 'ok',
    hasGemini,
    hasOpenRouter,
    primaryEngine: hasGemini ? 'Google Gemini (Native AI Studio)' : hasOpenRouter ? 'OpenRouter' : 'none',
  });
});

/**
 * Melakukan live web search untuk pasaran / odds riil bursa taruhan resmi (Pinnacle, SBOBET, Bet365)
 */
async function searchLiveMarketSnippets(
  homeTeam: string,
  awayTeam: string,
  sport?: string,
  league?: string
): Promise<string> {
  try {
    const query = encodeURIComponent(
      `${homeTeam} vs ${awayTeam} ${league || ''} odds asian handicap over under betting market Pinnacle SBOBET bet365`
    );
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6500);
    const res = await fetch(`https://html.duckduckgo.com/html/?q=${query}`, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!res.ok) return '';
    const html = await res.text();
    const snippets: string[] = [];
    const regex = /<a class="result__snippet[^"]*"[^>]*>(.*?)<\/a>/gi;
    let match;
    while ((match = regex.exec(html)) !== null && snippets.length < 6) {
      const clean = match[1]
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&#39;/g, "'")
        .replace(/&quot;/g, '"')
        .trim();
      if (clean && clean.length > 25) snippets.push(clean);
    }
    return snippets.join('\n');
  } catch (err: any) {
    console.warn(`[searchLiveMarketSnippets] Warning for ${homeTeam} vs ${awayTeam}:`, err?.message);
    return '';
  }
}

/**
 * POST /api/search-market
 * Mencari pasaran bursa taruhan riil (Asian Handicap / Voor, Over/Under, 1X2) dari live search
 */
app.post('/api/search-market', async (req, res) => {
  try {
    const { homeTeam, awayTeam, sport, league } = req.body;
    if (!homeTeam || !awayTeam) {
      return res.status(400).json({ error: 'homeTeam and awayTeam are required' });
    }

    const snippets = await searchLiveMarketSnippets(homeTeam, awayTeam, sport, league);

    if (process.env.GEMINI_API_KEY) {
      const ai = getGeminiClient();
      const prompt = `Kamu adalah Sports Betting Market & Asian Handicap Odds Analyst profesional.
Tugasmu adalah menentukan pasaran resmi bursa taruhan internasional (Pinnacle, SBOBET, Bet365) untuk pertandingan ini.
DILARANG KERAS MENGGUNAKAN DATA DUMMY ATAU PASARAN KHAYALAN!

Data live research bursa taruhan terkini:
${snippets || 'Konsensus bursa taruhan resmi internasional'}

Pertandingan:
- Olahraga: ${sport || 'Sepak Bola'}
- Liga: ${league || 'Kompetisi Resmi'}
- Tim Tuan Rumah (Home): ${homeTeam}
- Tim Tamu (Away): ${awayTeam}

TENTUKAN PASARAN BURSA TARUHAN NYATA:
1. Asian Handicap (HDP / Voor): Tentukan secara presisi tim mana yang memberi voor (-) dan yang menerima voor (+).
   - Format handicap: nilai angka voor untuk tim home (misal jika ${homeTeam} memberi voor 0.5 gol, tulis "-0.5". Jika menerima voor, tulis "+0.5". Jika voor imbang, tulis "0.0").
   - Angka voor lazim: 0.0, -0.25 (0-0.5), -0.5, -0.75 (0.5-1), -1.0, -1.25, -1.5, dll.
2. Total Over/Under (O/U): Batas total gol/poin (contoh: 2.25, 2.5, 2.75, 3.0 untuk bola, atau 221.5 untuk basket).
3. Odds Desimal: Home odds, Away odds, Draw odds, Over odds, Under odds yang realistis (rata-rata 1.80 - 2.10 untuk handicap/OU balance).

KEMBALIKAN HANYA JSON VALID TANPA MARKDOWN BACKTICKS:
{
  "odds": {
    "home": "1.90",
    "away": "1.95",
    "draw": "3.50",
    "over": "1.85",
    "under": "1.95",
    "handicap": "-0.5"
  },
  "marketSummary": "Rangkuman tren pasaran dan siapa yang memberi voor...",
  "sources": ["Pinnacle", "SBOBET", "Bet365", "AsianOdds"]
}`;

      const candidateModels = ['gemini-3.1-flash-lite', 'gemini-flash-latest', 'gemini-3.8-flash'];
      for (const modelName of candidateModels) {
        try {
          const resp = await ai.models.generateContent({
            model: modelName,
            contents: prompt,
            config: {
              temperature: 0.1,
              responseMimeType: 'application/json',
            },
          });
          const text = resp.text || resp.candidates?.[0]?.content?.parts?.[0]?.text || '';
          if (text) {
            const parsed = JSON.parse(text);
            return res.json({
              odds: parsed.odds || {},
              marketSummary: parsed.marketSummary || '',
              sources: parsed.sources || ['Bursa Taruhan Resmi'],
              model: modelName,
            });
          }
        } catch (e: any) {
          // cascade to next candidate
        }
      }
    }

    return res.json({
      odds: {},
      marketSummary: 'Pasaran dapat diisi secara manual atau dicari ulang.',
      sources: [],
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/parse-screenshot
 * Ekstraksi jadwal pertandingan dan pasaran odds dari screenshot gambar
 */
app.post('/api/parse-screenshot', async (req, res) => {
  try {
    const { base64DataUrl, userApiKey } = req.body;

    if (!base64DataUrl) {
      return res.status(400).json({ error: 'base64DataUrl is required' });
    }

    const promptText = `You are a professional sportsbook and sports betting slip / odds table OCR vision parser.
Read the uploaded image carefully. It may be a sportsbook table (SBOBET, IBCBET/MAXBET, Bet365, etc.), livescore table, or match schedule.
Extract EVERY visible match accurately.

For each match identify:
- sport (e.g. Football / Soccer, Basketball, Tennis, etc.)
- league (e.g. English Premier League, NBA, Serie A, etc.)
- date and time
- homeTeam (home team or player)
- awayTeam (away team or player)
- visible odds and betting market lines:
  * Look for Asian Handicap (HDP, Voor, Pur, Spread) column: e.g. "0", "0-0.5" (0.25), "0.5", "0.5-1" (0.75), "1.0", "-0.5", "+0.5", "-4.5", etc.
  * Look for Over/Under (O/U, OU, Total Goals/Points): e.g. "2.5", "2.5-3" (2.75), "3.0", "224.5", etc.
  * Look for odds / kei values for Home, Away, Draw, Over, Under.
  * Set "odds": {
      "home": "string or null",
      "away": "string or null",
      "draw": "string or null",
      "over": "string or null",
      "under": "string or null",
      "handicap": "string or null"
    }
  * market: "Asian Handicap", "Over/Under", "1X2", etc.

Do not invent fake numbers. If an odds field is not in the image, set it to null.
Return valid JSON in this exact structure without any markdown backticks:
{
  "sport": null,
  "league": null,
  "date": null,
  "matches": [
    {
      "homeTeam": null,
      "awayTeam": null,
      "time": null,
      "odds": {
        "home": null,
        "away": null,
        "draw": null,
        "over": null,
        "under": null,
        "handicap": null
      },
      "market": null
    }
  ]
}`;

    const openRouterKey =
      userApiKey ||
      process.env.VITE_OPENROUTER_PRIMARY_KEY ||
      process.env.OPENROUTER_PRIMARY_KEY ||
      process.env.OPENROUTER_API_KEY ||
      '';

    // 1. Coba OpenRouter jika user menyediakan kuncinya
    if (openRouterKey && openRouterKey.trim() !== '') {
      try {
        const { content, httpStatus } = await callOpenRouterServer(
          'google/gemini-2.5-flash',
          openRouterKey.trim(),
          promptText,
          base64DataUrl
        );

        return res.json({
          rawResult: content,
          httpStatus,
          provider: 'OpenRouter (google/gemini-2.5-flash)',
          model: 'google/gemini-2.5-flash',
        });
      } catch (orErr: any) {
        console.warn('[Server] OpenRouter Vision call failed, attempting Gemini fallback:', orErr.message);
        if (!process.env.GEMINI_API_KEY) {
          throw orErr;
        }
      }
    }

    // 2. Gunakan Google GenAI native dari AI Studio (GEMINI_API_KEY)
    if (process.env.GEMINI_API_KEY) {
      const ai = getGeminiClient();
      
      let mimeType = 'image/jpeg';
      let rawBase64 = base64DataUrl;

      if (base64DataUrl.includes(';base64,')) {
        const parts = base64DataUrl.split(';base64,');
        mimeType = parts[0].replace(/^data:/, '').trim() || 'image/jpeg';
        rawBase64 = parts[1].trim();
      }
      // Hapus spasi dan newline yang mungkin ada di base64
      rawBase64 = rawBase64.replace(/\s+/g, '');

      // Priority model: gemini-3.1-flash-lite (sangat cepat & stabil), lalu gemini-flash-latest, lalu gemini-3.8-flash
      const candidateModels = ['gemini-3.1-flash-lite', 'gemini-flash-latest', 'gemini-3.8-flash'];
      let responseText = '';
      let usedModel = candidateModels[0];
      let lastErr: any = null;

      // Retry logic dengan exponential backoff & model cascade
      for (const modelName of candidateModels) {
        let attempts = 0;
        const maxAttemptsPerModel = 2;

        while (attempts < maxAttemptsPerModel) {
          try {
            attempts++;
            const resp = await ai.models.generateContent({
              model: modelName,
              contents: {
                parts: [
                  {
                    inlineData: {
                      mimeType: mimeType,
                      data: rawBase64,
                    },
                  },
                  { text: promptText },
                ],
              },
              config: {
                temperature: 0.1,
                responseMimeType: 'application/json',
              },
            });
            responseText = resp.text || resp.candidates?.[0]?.content?.parts?.[0]?.text || '';
            if (responseText) {
              usedModel = modelName;
              lastErr = null;
              break;
            }
          } catch (modelErr: any) {
            lastErr = modelErr;
            const isHighDemandOrUnavailable =
              modelErr?.status === 503 ||
              modelErr?.message?.includes('503') ||
              modelErr?.message?.includes('high demand') ||
              modelErr?.message?.includes('UNAVAILABLE');

            const isRateLimitOrTimeout =
              modelErr?.status === 429 ||
              modelErr?.message?.includes('429') ||
              modelErr?.message?.includes('quota') ||
              modelErr?.message?.includes('timeout') ||
              modelErr?.message?.includes('RESOURCE_EXHAUSTED');

            console.warn(
              `[Server Vision] Model ${modelName} attempt ${attempts}/${maxAttemptsPerModel} failed (${modelErr.message?.slice(
                0,
                100
              )}).`
            );

            // Jika model sedang mengalami 503 high demand spike, langsung cascade ke model alternatif berikutnya
            if (isHighDemandOrUnavailable) {
              break;
            }

            if (attempts < maxAttemptsPerModel && isRateLimitOrTimeout) {
              // Exponential backoff: tunggu 600ms sebelum retry
              await sleep(600 * attempts);
            } else {
              break;
            }
          }
        }

        if (responseText) {
          break;
        }
      }

      if (!responseText && lastErr) {
        throw lastErr;
      }

      return res.json({
        rawResult: responseText,
        httpStatus: 200,
        provider: 'AI Vision Engine Pro',
        model: 'Advanced Vision System',
      });
    }

    return res.status(400).json({
      error: 'API Key belum dikonfigurasi. Pastikan GEMINI_API_KEY atau OpenRouter API Key aktif.',
    });
  } catch (error: any) {
    console.error('[Server /api/parse-screenshot Error]:', error);
    res.status(500).json({ error: error.message || 'Gagal memproses screenshot pertandingan.' });
  }
});

/**
 * POST /api/analyze
 * Analisis multi-match komprehensif dan perumusan Parlay Summary
 */
app.post('/api/analyze', async (req, res) => {
  try {
    const { prompt, base64DataUrl, matches, sport, league, userApiKey } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'prompt is required' });
    }

    let finalPrompt = prompt;

    // Jika daftar matches dikirimkan, lakukan live market research untuk tiap match agar AI mendapatkan pasaran riil
    if (Array.isArray(matches) && matches.length > 0) {
      try {
        const researchPromises = matches.slice(0, 10).map(async (m: any, i: number) => {
          if (!m?.homeTeam || !m?.awayTeam) return '';
          const snippets = await searchLiveMarketSnippets(m.homeTeam, m.awayTeam, sport, league);
          if (!snippets) return '';
          return `--- RISET PASARAN BURSA NYATA (MATCH #${i + 1}: ${m.homeTeam} vs ${m.awayTeam}) ---\n${snippets}`;
        });
        const researchSnippets = (await Promise.all(researchPromises)).filter(Boolean);
        if (researchSnippets.length > 0) {
          finalPrompt += `\n\n=== DATA RISET PASARAN REAL-TIME DARI BURSA TARUHAN NYATA (WAJIB DIGUNAKAN - DILARANG DATA DUMMY) ===\n${researchSnippets.join(
            '\n\n'
          )}\n===================================================================================================\n`;
        }
      } catch (researchErr: any) {
        console.warn('[Server Analyze] Live research warning:', researchErr?.message);
      }
    }

    const openRouterKey =
      userApiKey ||
      process.env.VITE_OPENROUTER_PRIMARY_KEY ||
      process.env.OPENROUTER_PRIMARY_KEY ||
      process.env.OPENROUTER_API_KEY ||
      '';

    // 1. Jika ada OpenRouter key, jalankan via OpenRouter
    if (openRouterKey && openRouterKey.trim() !== '') {
      try {
        let rawResult = '';
        let httpStatus = 200;
        let usedModel = 'google/gemini-2.5-flash';

        // Coba primary: google/gemini-2.5-flash
        try {
          let usedWebSearch = true;
          try {
            const resp = await callOpenRouterServer(
              'google/gemini-2.5-flash',
              openRouterKey.trim(),
              finalPrompt,
              base64DataUrl,
              true
            );
            rawResult = resp.content;
            httpStatus = resp.httpStatus;
          } catch (searchToolErr: any) {
            usedWebSearch = false;
            const retryResp = await callOpenRouterServer(
              'google/gemini-2.5-flash',
              openRouterKey.trim(),
              finalPrompt,
              base64DataUrl,
              false
            );
            rawResult = retryResp.content;
            httpStatus = retryResp.httpStatus;
          }
        } catch (primaryErr: any) {
          console.warn('[Server] Primary model google/gemini-2.5-flash failed, trying fallback deepseek/deepseek-chat-v3.1:', primaryErr.message);
          usedModel = 'deepseek/deepseek-chat-v3.1';
          try {
            const fbResp = await callOpenRouterServer(
              'deepseek/deepseek-chat-v3.1',
              openRouterKey.trim(),
              finalPrompt,
              undefined,
              false
            );
            rawResult = fbResp.content;
            httpStatus = fbResp.httpStatus;
          } catch (deepseekErr: any) {
            // Also try deepseek/deepseek-chat if v3.1 slug differs on openrouter
            const fbResp2 = await callOpenRouterServer(
              'deepseek/deepseek-chat',
              openRouterKey.trim(),
              finalPrompt,
              undefined,
              false
            );
            rawResult = fbResp2.content;
            httpStatus = fbResp2.httpStatus;
            usedModel = 'deepseek/deepseek-chat';
          }
        }

        return res.json({
          rawResult,
          httpStatus,
          provider: 'OpenRouter',
          model: usedModel,
        });
      } catch (orErr: any) {
        console.warn('[Server] OpenRouter analysis failed, checking Gemini fallback:', orErr.message);
        if (!process.env.GEMINI_API_KEY) {
          throw orErr;
        }
      }
    }

    // 2. Gunakan Google GenAI native dari AI Studio (GEMINI_API_KEY yang sudah aktif)
    if (process.env.GEMINI_API_KEY) {
      const ai = getGeminiClient();
      // Priority model: gemini-3.1-flash-lite (sangat cepat & stabil), lalu gemini-flash-latest, lalu gemini-3.8-flash
      const candidateModels = ['gemini-3.1-flash-lite', 'gemini-flash-latest', 'gemini-3.8-flash'];
      let responseText = '';
      let usedModel = candidateModels[0];
      let lastErr: any = null;

      // Retry logic dengan exponential backoff & model cascade
      for (const modelName of candidateModels) {
        let attempts = 0;
        const maxAttemptsPerModel = 2;

        while (attempts < maxAttemptsPerModel) {
          try {
            attempts++;
            const resp = await ai.models.generateContent({
              model: modelName,
              contents: finalPrompt,
              config: {
                temperature: 0.2,
                responseMimeType: 'application/json',
              },
            });
            responseText = resp.text || resp.candidates?.[0]?.content?.parts?.[0]?.text || '';
            if (responseText) {
              usedModel = modelName;
              lastErr = null;
              break;
            }
          } catch (modelErr: any) {
            lastErr = modelErr;
            const isHighDemandOrUnavailable =
              modelErr?.status === 503 ||
              modelErr?.message?.includes('503') ||
              modelErr?.message?.includes('high demand') ||
              modelErr?.message?.includes('UNAVAILABLE');

            const isRateLimitOrTimeout =
              modelErr?.status === 429 ||
              modelErr?.message?.includes('429') ||
              modelErr?.message?.includes('quota') ||
              modelErr?.message?.includes('timeout') ||
              modelErr?.message?.includes('RESOURCE_EXHAUSTED');

            console.warn(
              `[Server Analyze] Model ${modelName} attempt ${attempts}/${maxAttemptsPerModel} failed (${modelErr.message?.slice(
                0,
                100
              )}).`
            );

            // Jika model sedang mengalami 503 high demand spike, langsung cascade ke model alternatif berikutnya
            if (isHighDemandOrUnavailable) {
              break;
            }

            if (attempts < maxAttemptsPerModel && isRateLimitOrTimeout) {
              // Exponential backoff: tunggu 600ms sebelum retry
              await sleep(600 * attempts);
            } else {
              break;
            }
          }
        }

        if (responseText) {
          break;
        }
      }

      if (!responseText && lastErr) {
        throw lastErr;
      }

      return res.json({
        rawResult: responseText,
        httpStatus: 200,
        provider: 'AI Sports Analytics Engine',
        model: 'Advanced Predictive System',
      });
    }

    return res.status(400).json({
      error: 'API Key belum dikonfigurasi. Pastikan GEMINI_API_KEY atau OpenRouter API Key aktif.',
    });
  } catch (error: any) {
    console.error('[Server /api/analyze Error]:', error);
    res.status(500).json({ error: error.message || 'Gagal menjalankan analisis AI.' });
  }
});

// ----------------------------------------------------
// VITE MIDDLEWARE SETUP
// ----------------------------------------------------
async function start() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[MAX AI Server] running on http://0.0.0.0:${PORT}`);
  });
}

start();
