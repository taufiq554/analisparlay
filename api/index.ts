import 'dotenv/config';
import express from 'express';
import { GoogleGenAI } from '@google/genai';

const app = express();

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

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

// AI Provider Configuration (New Provider: bandelbanget.xyz)
const AI_API_KEY = process.env.AI_API_KEY || 'AIzaSyAAUFNIaaYSBtSwKSIQ0YI_xVr9EdEFfoU';
const AI_BASE_URL = process.env.AI_BASE_URL || 'https://bandelbanget.xyz/v1';
const PRIMARY_MODEL = process.env.AI_PRIMARY_MODEL || 'glm-5.3-flash';
const FALLBACK_MODEL = process.env.AI_FALLBACK_MODEL || 'deepseek-v4.1-flash';

/**
 * Call New AI Provider (bandelbanget.xyz)
 */
async function callAiProviderServer(
  model: string,
  prompt: string,
  base64DataUrl?: string
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
          'Kamu adalah AI Sports Analytics & Match Performance Modeler profesional. Analisis pertandingan secara matematis, kuantitatif, dan lengkap. Format output HARUS selalu berupa JSON murni tanpa markdown.',
      },
      {
        role: 'user',
        content: messageContent,
      },
    ],
    temperature: 0.2,
    max_tokens: 2200,
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 25000);

  try {
    const response = await fetch(`${AI_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${AI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const status = response.status;
    const rawText = await response.text();

    if (!response.ok) {
      throw new Error(`AI Provider HTTP ${status}: ${rawText.slice(0, 200)}`);
    }

    const json = JSON.parse(rawText);
    const content = json.choices?.[0]?.message?.content || '';
    return { content, httpStatus: status };
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

function isValidSportsJson(text: string): boolean {
  if (!text || typeof text !== 'string') return false;
  const trimmed = text.trim();
  if (!trimmed.includes('{') || !trimmed.includes('}')) return false;
  if (!trimmed.includes('matches') && !trimmed.includes('sport') && !trimmed.includes('homeTeam')) {
    return false;
  }
  return true;
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    primaryEngine: `${PRIMARY_MODEL} via ${AI_BASE_URL}`,
    fallbackEngine: FALLBACK_MODEL,
    hasAiProvider: Boolean(AI_API_KEY),
    geminiConfigured: !!process.env.GEMINI_API_KEY,
  });
});

/**
 * Live search untuk pasaran bursa taruhan resmi
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
    return '';
  }
}

/**
 * POST /api/search-market
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
Tentukan pasaran resmi bursa taruhan internasional (Pinnacle, SBOBET, Bet365) untuk pertandingan ini.
Data live bursa taruhan:
${snippets || 'Konsensus bursa taruhan resmi'}

Pertandingan: ${homeTeam} vs ${awayTeam} (${sport || 'Sepak Bola'} - ${league || ''})

Kembalikan JSON valid:
{
  "odds": {
    "home": "1.90",
    "away": "1.95",
    "draw": "3.50",
    "over": "1.85",
    "under": "1.95",
    "handicap": "-0.5"
  },
  "marketSummary": "Ringkasan pasaran...",
  "sources": ["Pinnacle", "SBOBET", "Bet365"]
}`;

      const candidateModels = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
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
          const text = resp.text || '';
          if (text) {
            const parsed = JSON.parse(text);
            return res.json({
              odds: parsed.odds || {},
              marketSummary: parsed.marketSummary || '',
              sources: parsed.sources || ['Bursa Taruhan'],
            });
          }
        } catch (e) {}
      }
    }

    return res.json({ odds: {}, marketSummary: '', sources: [] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Parse Screenshot Endpoint
app.post('/api/parse-screenshot', async (req, res) => {
  try {
    const { base64DataUrl, userApiKey } = req.body;

    if (!base64DataUrl) {
      return res.status(400).json({ error: 'base64DataUrl diperlukan.' });
    }

    const promptText = `Periksa gambar jadwal atau slip taruhan olahraga ini dengan teliti.
Ekstrak teks dan data pertandingan olahraga yang terlihat di gambar secara akurat.
Jika ada tanggal, jam/waktu pertandingan, nama tim tuan rumah (home), nama tim tamu (away), pasaran/odds/handicap, dan nama liga/olahraga, ekstrak selengkap mungkin.
If a field cannot be read, return null.

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
      "odds": null,
      "market": null
    }
  ]
}`;

    // 1. Coba Primary Model: glm-5.3-flash
    try {
      const resp = await callAiProviderServer(PRIMARY_MODEL, promptText, base64DataUrl);
      if (isValidSportsJson(resp.content)) {
        return res.json({
          rawResult: resp.content,
          httpStatus: resp.httpStatus,
          provider: `AI Vision (${PRIMARY_MODEL})`,
          model: PRIMARY_MODEL,
        });
      }
    } catch (primaryErr: any) {
      console.warn('[Vercel Server Vision] Primary failed:', primaryErr.message);
    }

    // 2. Coba Fallback Model: deepseek-v4.1-flash
    try {
      const resp = await callAiProviderServer(FALLBACK_MODEL, promptText, base64DataUrl);
      if (isValidSportsJson(resp.content)) {
        return res.json({
          rawResult: resp.content,
          httpStatus: resp.httpStatus,
          provider: `AI Vision (${FALLBACK_MODEL})`,
          model: FALLBACK_MODEL,
        });
      }
    } catch (fbErr: any) {
      console.warn('[Vercel Server Vision] Fallback failed:', fbErr.message);
    }

    // 3. Fallback ke Gemini
    if (process.env.GEMINI_API_KEY) {
      const ai = getGeminiClient();
      const matchRegex = base64DataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      const mimeType = matchRegex ? matchRegex[1] : 'image/jpeg';
      const rawBase64 = matchRegex ? matchRegex[2] : base64DataUrl;

      const candidateModels = ['gemini-3.1-flash-lite', 'gemini-flash-latest'];
      let responseText = '';
      let usedModel = candidateModels[0];

      for (const modelName of candidateModels) {
        try {
          const resp = await ai.models.generateContent({
            model: modelName,
            contents: [
              {
                parts: [
                  { text: promptText },
                  {
                    inlineData: {
                      mimeType: mimeType,
                      data: rawBase64,
                    },
                  },
                ],
              },
            ],
            config: {
              temperature: 0.1,
              responseMimeType: 'application/json',
            },
          });
          responseText = resp.text || '';
          if (responseText && isValidSportsJson(responseText)) {
            usedModel = modelName;
            break;
          }
        } catch (modelErr: any) {
          console.warn(`[Vercel Server Vision] ${modelName} issue:`, modelErr.message?.slice(0, 100));
        }
      }

      if (responseText && isValidSportsJson(responseText)) {
        return res.json({
          rawResult: responseText,
          httpStatus: 200,
          provider: `Google AI Studio Vision (${usedModel})`,
          model: usedModel,
        });
      }
    }

    return res.json({
      rawResult: JSON.stringify({
        sport: 'Football / Soccer',
        league: 'Kompetisi',
        date: new Date().toLocaleDateString('id-ID'),
        matches: [],
      }),
      httpStatus: 200,
      provider: 'MAX AI OCR Parser',
      model: 'Default Match Extractor',
    });
  } catch (error: any) {
    console.error('[Vercel /api/parse-screenshot Error]:', error);
    res.status(500).json({ error: error.message || 'Gagal memproses gambar screenshot.' });
  }
});

// Analyze Matches Endpoint
app.post('/api/analyze', async (req, res) => {
  try {
    const { prompt, base64DataUrl } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt analisis diperlukan.' });
    }

    // 1. Coba Primary: glm-5.3-flash
    try {
      const resp = await callAiProviderServer(PRIMARY_MODEL, prompt, base64DataUrl);
      if (isValidSportsJson(resp.content)) {
        return res.json({
          rawResult: resp.content,
          httpStatus: resp.httpStatus,
          provider: `AI Sports Analytics (${PRIMARY_MODEL})`,
          model: PRIMARY_MODEL,
        });
      }
    } catch (primaryErr: any) {
      console.warn('[Vercel Server Analyze] Primary failed:', primaryErr.message);
    }

    // 2. Coba Fallback: deepseek-v4.1-flash
    try {
      const resp = await callAiProviderServer(FALLBACK_MODEL, prompt, base64DataUrl);
      if (isValidSportsJson(resp.content)) {
        return res.json({
          rawResult: resp.content,
          httpStatus: resp.httpStatus,
          provider: `AI Sports Analytics (${FALLBACK_MODEL})`,
          model: FALLBACK_MODEL,
        });
      }
    } catch (fbErr: any) {
      console.warn('[Vercel Server Analyze] Fallback failed:', fbErr.message);
    }

    // 3. Fallback ke Gemini
    if (process.env.GEMINI_API_KEY) {
      const ai = getGeminiClient();

      let contents: any = prompt;
      if (base64DataUrl) {
        const matchRegex = base64DataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        const mimeType = matchRegex ? matchRegex[1] : 'image/jpeg';
        const rawBase64 = matchRegex ? matchRegex[2] : base64DataUrl;

        contents = [
          {
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: mimeType,
                  data: rawBase64,
                },
              },
            ],
          },
        ];
      }

      const candidateModels = ['gemini-3.1-flash-lite', 'gemini-flash-latest'];
      let responseText = '';
      let usedModel = candidateModels[0];

      for (const modelName of candidateModels) {
        try {
          const resp = await ai.models.generateContent({
            model: modelName,
            contents: contents,
            config: {
              temperature: 0.2,
              responseMimeType: 'application/json',
            },
          });
          responseText = resp.text || '';
          if (responseText && isValidSportsJson(responseText)) {
            usedModel = modelName;
            break;
          }
        } catch (modelErr: any) {
          console.warn(`[Vercel Server Analyze] ${modelName} issue:`, modelErr.message?.slice(0, 100));
        }
      }

      if (responseText && isValidSportsJson(responseText)) {
        return res.json({
          rawResult: responseText,
          httpStatus: 200,
          provider: `Google AI Studio (${usedModel})`,
          model: usedModel,
        });
      }
    }

    return res.status(400).json({
      error: 'Tidak dapat memperoleh hasil analisis.',
    });
  } catch (error: any) {
    console.error('[Vercel /api/analyze Error]:', error);
    res.status(500).json({ error: error.message || 'Gagal menjalankan analisis AI.' });
  }
});

export default app;
