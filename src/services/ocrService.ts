import { createWorker } from 'tesseract.js';
import { DetectedSchedule, MatchItem } from '../types';

export interface OcrProcessingProgress {
  status: string;
  progress: number;
}

const COMMON_SPORTS = [
  'Football / Soccer',
  'Basketball',
  'Tennis',
  'Baseball',
  'Volleyball',
  'Badminton',
  'Futsal',
  'Hockey',
  'American Football',
  'Esports',
  'Other',
];

/**
 * Preprocesses image on an in-memory canvas for optimal OCR character recognition.
 * Enhances contrast and grayscale.
 */
async function preprocessImageFile(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }

        // Scale up if image is low-res
        const scale = img.width < 1000 ? 1.5 : 1.0;
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Simple contrast stretching
        try {
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const d = imgData.data;
          for (let i = 0; i < d.length; i += 4) {
            // Luminance
            const v = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
            // Simple thresholding/high contrast curve
            const adjusted = v > 130 ? Math.min(255, v * 1.15) : Math.max(0, v * 0.85);
            d[i] = adjusted;
            d[i + 1] = adjusted;
            d[i + 2] = adjusted;
          }
          ctx.putImageData(imgData, 0, 0);
          resolve(canvas.toDataURL('image/png'));
        } catch {
          resolve(e.target?.result as string);
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Performs client-side OCR on an uploaded screenshot using Tesseract.js
 */
export async function recognizeScheduleImage(
  file: File,
  onProgress?: (p: OcrProcessingProgress) => void
): Promise<{ text: string; schedule: DetectedSchedule; isConfident: boolean; warning?: string }> {
  const processedDataUrl = await preprocessImageFile(file);

  const worker = await createWorker('eng+ind', 1, {
    logger: (m) => {
      if (m.status && onProgress) {
        onProgress({
          status: m.status === 'recognizing text' ? 'Membaca teks dari gambar...' : 'Menginisialisasi OCR...',
          progress: Math.round((m.progress || 0) * 100),
        });
      }
    },
  });

  try {
    const ret = await worker.recognize(processedDataUrl);
    const text = ret.data.text || '';
    await worker.terminate();

    const schedule = parseOcrTextToSchedule(text);
    const isConfident = schedule.matches.length > 0 && text.trim().length > 15;
    const warning = !isConfident 
      ? 'Data kurang jelas. Silakan periksa atau edit hasil pembacaan.'
      : undefined;

    return {
      text,
      schedule,
      isConfident,
      warning,
    };
  } catch (err) {
    await worker.terminate();
    throw new Error('Gagal memproses gambar OCR: ' + (err instanceof Error ? err.message : String(err)));
  }
}

/**
 * Parses raw extracted OCR text into a structured DetectedSchedule object
 */
export function parseOcrTextToSchedule(rawText: string): DetectedSchedule {
  const lines = rawText
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  let detectedSport = '';
  let detectedLeague = '';
  let detectedDate = '';
  const matches: MatchItem[] = [];

  const lowerText = rawText.toLowerCase();

  // Detect Sport
  if (lowerText.includes('basket') || lowerText.includes('nba') || lowerText.includes('ibl') || lowerText.includes('euroleague')) {
    detectedSport = 'Basketball';
  } else if (lowerText.includes('tennis') || lowerText.includes('atp') || lowerText.includes('wta')) {
    detectedSport = 'Tennis';
  } else if (lowerText.includes('baseball') || lowerText.includes('mlb')) {
    detectedSport = 'Baseball';
  } else if (lowerText.includes('volley')) {
    detectedSport = 'Volleyball';
  } else if (lowerText.includes('badminton') || lowerText.includes('bwf')) {
    detectedSport = 'Badminton';
  } else if (lowerText.includes('futsal')) {
    detectedSport = 'Futsal';
  } else if (lowerText.includes('hockey') || lowerText.includes('nhl')) {
    detectedSport = 'Hockey';
  } else if (lowerText.includes('nfl') || lowerText.includes('american football')) {
    detectedSport = 'American Football';
  } else if (lowerText.includes('dota') || lowerText.includes('csgo') || lowerText.includes('esports') || lowerText.includes('valorant') || lowerText.includes('mobile legends')) {
    detectedSport = 'Esports';
  } else if (
    lowerText.includes('football') ||
    lowerText.includes('soccer') ||
    lowerText.includes('premier') ||
    lowerText.includes('liga') ||
    lowerText.includes('serie a') ||
    lowerText.includes('bundesliga') ||
    lowerText.includes('champions')
  ) {
    detectedSport = 'Football / Soccer';
  }

  // Detect League from lines
  for (const line of lines) {
    const l = line.toLowerCase();
    if (
      l.includes('premier league') ||
      l.includes('la liga') ||
      l.includes('serie a') ||
      l.includes('bundesliga') ||
      l.includes('ligue 1') ||
      l.includes('champions league') ||
      l.includes('europa league') ||
      l.includes('nba') ||
      l.includes('atp') ||
      l.includes('wta') ||
      l.includes('liga 1') ||
      l.includes('copa') ||
      l.includes('cup') ||
      l.includes('division') ||
      l.includes('tournament') ||
      l.includes('league')
    ) {
      if (!detectedLeague) {
        detectedLeague = line.replace(/[^\w\s-]/gi, '').trim();
      }
    }

    // Detect Date pattern: YYYY-MM-DD, DD/MM/YYYY, or "Day, DD Month"
    const dateMatch = line.match(/\b(\d{1,2}[-/.](?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|\d{1,2})[-/.]\d{2,4})\b/i) ||
                      line.match(/\b(Senin|Selasa|Rabu|Kamis|Jumat|Sabtu|Minggu|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)[,\s]+(\d{1,2}\s+[A-Za-z]+)\b/i);
    if (dateMatch && !detectedDate) {
      detectedDate = dateMatch[0];
    }
  }

  // Detect match pairings: patterns like "Team A vs Team B" or "Team A - Team B" or line with "@"
  const matchRegex = /([A-Za-z0-9.\s]+?)\s+(?:vs\.?|v|-|@)\s+([A-Za-z0-9.\s]+)/i;
  const timeRegex = /\b([01]?\d|2[0-3]):([0-5]\d)(?:\s*(?:AM|PM|WIB|WITA|WIT))?\b/i;
  const oddsRegex = /\b(\d{1,2}\.\d{2})\b/g;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const matchFound = line.match(matchRegex);

    if (matchFound) {
      const home = matchFound[1].replace(/[0-9.:]/g, '').trim();
      const away = matchFound[2].replace(/[0-9.:]/g, '').trim();

      // Check if line or adjacent line has time
      const timeFound = line.match(timeRegex) || lines[i - 1]?.match(timeRegex) || lines[i + 1]?.match(timeRegex);
      const timeVal = timeFound ? timeFound[0] : '';

      // Check if line or adjacent lines contain decimal odds (e.g. 1.85, 3.40, 2.10)
      const surroundingText = `${lines[i - 1] || ''} ${line} ${lines[i + 1] || ''}`;
      const oddsMatches = surroundingText.match(oddsRegex) || [];

      const odds: Record<string, string> = {};
      if (oddsMatches && oddsMatches.length >= 2) {
        odds.home = oddsMatches[0] || '';
        odds.away = oddsMatches[1] || '';
        if (oddsMatches.length >= 3 && oddsMatches[2]) {
          odds.draw = oddsMatches[2];
        }
      }

      if (home.length > 2 && away.length > 2) {
        matches.push({
          id: `match_${Date.now()}_${matches.length}`,
          homeTeam: home,
          awayTeam: away,
          time: timeVal,
          odds,
        });
      }
    }
  }

  // If matchRegex didn't catch 2 teams on single line, check two consecutive candidate team lines
  if (matches.length === 0) {
    for (let i = 0; i < lines.length - 1; i++) {
      const line1 = lines[i];
      const line2 = lines[i + 1];
      const isTime1 = timeRegex.test(line1);
      const isTime2 = timeRegex.test(line2);

      if (!isTime1 && !isTime2 && line1.length > 3 && line2.length > 3 && !line1.includes('http') && !line2.includes('http')) {
        // Look for time nearby
        const nearbyTime = lines[i - 1]?.match(timeRegex) || lines[i + 2]?.match(timeRegex);
        // Look for odds nearby
        const surrounding = `${line1} ${line2} ${lines[i + 2] || ''}`;
        const oddsMatches = surrounding.match(oddsRegex) || [];

        const odds: Record<string, string> = {};
        if (oddsMatches && oddsMatches.length >= 2) {
          odds.home = oddsMatches[0] || '';
          odds.away = oddsMatches[1] || '';
        }

        // Add as a potential candidate if looks like team names
        if (/^[A-Za-z0-9\s]+$/.test(line1) && /^[A-Za-z0-9\s]+$/.test(line2) && lines.length < 25) {
          matches.push({
            id: `match_${Date.now()}_${matches.length}`,
            homeTeam: line1.trim(),
            awayTeam: line2.trim(),
            time: nearbyTime ? nearbyTime[0] : '',
            odds,
          });
          i++; // skip next line
        }
      }
    }
  }

  // Default date to today's date string if not found in text
  if (!detectedDate) {
    const now = new Date();
    detectedDate = now.toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  return {
    sport: detectedSport || COMMON_SPORTS[0],
    league: detectedLeague,
    date: detectedDate,
    matches,
  };
}
