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
    temperature: 0.2,
    max_tokens: 4096,
  };

  if (enableWebSearch) {
    requestBody.plugins = [{ id: 'web-search' }];
  }

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://maxanalis.ai',
      'X-Title': 'MAX AI Analis Sports Engine',
    },
    body: JSON.stringify(requestBody),
  });

  const status = response.status;
  const rawText = await response.text();

  if (!response.ok) {
    throw new Error(`OpenRouter HTTP ${status}: ${rawText.slice(0, 200)}`);
  }

  const json = JSON.parse(rawText);
  const content = json.choices?.[0]?.message?.content || '';
  return { content, httpStatus: status };
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
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

    const openRouterKey =
      userApiKey ||
      process.env.VITE_OPENROUTER_PRIMARY_KEY ||
      process.env.OPENROUTER_PRIMARY_KEY ||
      process.env.OPENROUTER_API_KEY ||
      '';

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
        console.warn('[Vercel Server] OpenRouter Vision failed, falling back to Gemini:', orErr.message);
        if (!process.env.GEMINI_API_KEY) {
          throw orErr;
        }
      }
    }

    if (process.env.GEMINI_API_KEY) {
      const ai = getGeminiClient();
      const matchRegex = base64DataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      const mimeType = matchRegex ? matchRegex[1] : 'image/jpeg';
      const rawBase64 = matchRegex ? matchRegex[2] : base64DataUrl;

      const candidateModels = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
      let responseText = '';
      let usedModel = candidateModels[0];
      let lastErr: any = null;

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
          if (responseText) {
            usedModel = modelName;
            lastErr = null;
            break;
          }
        } catch (modelErr: any) {
          lastErr = modelErr;
          console.warn(`[Vercel Server Vision] ${modelName} issue:`, modelErr.message?.slice(0, 100));
        }
      }

      if (!responseText && lastErr) {
        throw lastErr;
      }

      return res.json({
        rawResult: responseText,
        httpStatus: 200,
        provider: 'Google AI Studio (Gemini Vision)',
        model: usedModel,
      });
    }

    return res.status(400).json({
      error: 'API Key belum dikonfigurasi. Pastikan GEMINI_API_KEY atau OpenRouter API Key aktif.',
    });
  } catch (error: any) {
    console.error('[Vercel /api/parse-screenshot Error]:', error);
    res.status(500).json({ error: error.message || 'Gagal memproses gambar screenshot.' });
  }
});

// Analyze Matches Endpoint
app.post('/api/analyze', async (req, res) => {
  try {
    const { prompt, base64DataUrl, userApiKey } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt analisis diperlukan.' });
    }

    const openRouterKey =
      userApiKey ||
      process.env.VITE_OPENROUTER_PRIMARY_KEY ||
      process.env.OPENROUTER_PRIMARY_KEY ||
      process.env.OPENROUTER_API_KEY ||
      '';

    if (openRouterKey && openRouterKey.trim() !== '') {
      try {
        const { content, httpStatus } = await callOpenRouterServer(
          'google/gemini-2.5-flash',
          openRouterKey.trim(),
          prompt,
          base64DataUrl,
          true
        );

        return res.json({
          rawResult: content,
          httpStatus,
          provider: 'OpenRouter (google/gemini-2.5-flash + Web Search)',
          model: 'google/gemini-2.5-flash',
        });
      } catch (orErr: any) {
        console.warn('[Vercel Server] OpenRouter Primary call failed, falling back:', orErr.message);

        const fallbackKey =
          process.env.VITE_OPENROUTER_FALLBACK_KEY ||
          process.env.OPENROUTER_FALLBACK_KEY ||
          openRouterKey.trim();

        try {
          const { content, httpStatus } = await callOpenRouterServer(
            'deepseek/deepseek-chat-v3.1',
            fallbackKey,
            prompt,
            base64DataUrl,
            false
          );

          return res.json({
            rawResult: content,
            httpStatus,
            provider: 'OpenRouter Fallback (deepseek/deepseek-chat-v3.1)',
            model: 'deepseek/deepseek-chat-v3.1',
          });
        } catch (deepseekErr: any) {
          console.warn('[Vercel Server] DeepSeek Fallback call failed:', deepseekErr.message);
          if (!process.env.GEMINI_API_KEY) {
            throw deepseekErr;
          }
        }
      }
    }

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

      const candidateModels = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
      let responseText = '';
      let usedModel = candidateModels[0];
      let lastErr: any = null;

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
          if (responseText) {
            usedModel = modelName;
            lastErr = null;
            break;
          }
        } catch (modelErr: any) {
          lastErr = modelErr;
          console.warn(`[Vercel Server Analyze] ${modelName} issue:`, modelErr.message?.slice(0, 100));
        }
      }

      if (!responseText && lastErr) {
        throw lastErr;
      }

      return res.json({
        rawResult: responseText,
        httpStatus: 200,
        provider: 'Google AI Studio (Gemini Engine)',
        model: usedModel,
      });
    }

    return res.status(400).json({
      error: 'API Key belum dikonfigurasi. Pastikan GEMINI_API_KEY atau OpenRouter API Key aktif.',
    });
  } catch (error: any) {
    console.error('[Vercel /api/analyze Error]:', error);
    res.status(500).json({ error: error.message || 'Gagal menjalankan analisis AI.' });
  }
});

export default app;
