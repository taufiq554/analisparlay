import React, { useRef, useEffect, useState } from 'react';
import { X, Download, Copy, Check, Sparkles, Image as ImageIcon, Layers } from 'lucide-react';
import { BRAND } from '../config/brand';

interface SocialShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  sport?: string;
  league?: string;
  date?: string;
  legs: {
    match: string;
    pick: string;
    market: string;
    odds?: string | number;
    confidence?: string;
  }[];
  totalOdds?: string | number;
  confidenceScore?: string;
}

export const SocialShareModal: React.FC<SocialShareModalProps> = ({
  isOpen,
  onClose,
  title = 'AI PARLAY OF THE DAY',
  sport = 'Sepak Bola',
  league = 'Top European Leagues',
  date = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
  legs,
  totalOdds = '4.65',
  confidenceScore = '78%',
}) => {
  const [aspectRatio, setAspectRatio] = useState<'9:16' | '1:1'>('9:16');
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Dimension setup: High-res for razor-sharp text on mobile
    const width = aspectRatio === '9:16' ? 1080 : 1080;
    const height = aspectRatio === '9:16' ? 1920 : 1080;
    canvas.width = width;
    canvas.height = height;

    // 1. Sleek Background Gradient
    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    bgGrad.addColorStop(0, '#0f172a'); // slate-900
    bgGrad.addColorStop(0.5, '#020617'); // slate-950
    bgGrad.addColorStop(1, '#090d16');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Decorative glow orbs
    const glow1 = ctx.createRadialGradient(200, 200, 10, 200, 200, 500);
    glow1.addColorStop(0, 'rgba(37, 99, 235, 0.25)'); // Blue glow
    glow1.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glow1;
    ctx.fillRect(0, 0, width, height);

    const glow2 = ctx.createRadialGradient(width - 200, height - 300, 10, width - 200, height - 300, 600);
    glow2.addColorStop(0, 'rgba(16, 185, 129, 0.18)'); // Emerald glow
    glow2.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glow2;
    ctx.fillRect(0, 0, width, height);

    // Top Header Badge: MAX AI ANALIS PARLAY
    const headerY = aspectRatio === '9:16' ? 160 : 110;

    // Header Pill
    ctx.fillStyle = 'rgba(30, 41, 59, 0.85)';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(width / 2 - 260, headerY - 50, 520, 75, 40);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 30px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('⚡ MAX AI SPORTS ANALYTICS', width / 2, headerY - 1);

    // Main Title
    const titleY = headerY + 110;
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 68px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(title.toUpperCase(), width / 2, titleY);

    // Subtitle / Date / League
    ctx.fillStyle = '#94a3b8';
    ctx.font = '500 32px sans-serif';
    ctx.fillText(`${sport.toUpperCase()} • ${league} • ${date}`, width / 2, titleY + 58);

    // Score & Odds Banner
    const bannerY = titleY + 115;
    const bannerWidth = width - 180;
    const bannerHeight = aspectRatio === '9:16' ? 170 : 130;
    const bannerX = 90;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(bannerX, bannerY, bannerWidth, bannerHeight, 28);
    ctx.fill();
    ctx.stroke();

    // Confidence Box (Left)
    ctx.textAlign = 'left';
    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 24px sans-serif';
    ctx.fillText('AI CONFIDENCE', bannerX + 50, bannerY + 55);

    ctx.fillStyle = '#10b981'; // Green
    ctx.font = 'bold 54px sans-serif';
    ctx.fillText(`${confidenceScore}`, bannerX + 50, bannerY + 118);

    // Total Odds Box (Right)
    ctx.textAlign = 'right';
    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 24px sans-serif';
    ctx.fillText('TOTAL ESTIMATED ODDS', bannerX + bannerWidth - 50, bannerY + 55);

    ctx.fillStyle = '#38bdf8'; // Sky blue
    ctx.font = 'bold 54px sans-serif';
    ctx.fillText(`@ ${totalOdds}`, bannerX + bannerWidth - 50, bannerY + 118);

    // Middle Match Cards
    const cardStartY = bannerY + bannerHeight + 50;
    const availableHeight = height - cardStartY - (aspectRatio === '9:16' ? 240 : 170);
    const displayLegs = legs.slice(0, aspectRatio === '9:16' ? 5 : 3);
    const cardHeight = Math.min(
      aspectRatio === '9:16' ? 200 : 160,
      Math.floor((availableHeight - (displayLegs.length - 1) * 25) / displayLegs.length)
    );

    displayLegs.forEach((leg, idx) => {
      const cy = cardStartY + idx * (cardHeight + 25);
      const cx = 90;
      const cw = width - 180;

      // Card Background
      ctx.fillStyle = 'rgba(30, 41, 59, 0.75)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(cx, cy, cw, cardHeight, 24);
      ctx.fill();
      ctx.stroke();

      // Accent pill on left
      ctx.fillStyle = '#2563eb';
      ctx.beginPath();
      ctx.roundRect(cx + 25, cy + 28, 50, cardHeight - 56, 12);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 28px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${idx + 1}`, cx + 50, cy + cardHeight / 2 + 10);

      // Match Name
      ctx.textAlign = 'left';
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 38px sans-serif';
      ctx.fillText(leg.match, cx + 105, cy + cardHeight * 0.44);

      // Market & Pick
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 30px sans-serif';
      ctx.fillText(`PICK: ${leg.pick}`, cx + 105, cy + cardHeight * 0.78);

      // Market badge on right
      ctx.textAlign = 'right';
      ctx.fillStyle = '#94a3b8';
      ctx.font = '600 26px sans-serif';
      ctx.fillText(`${leg.market}`, cx + cw - 40, cy + cardHeight * 0.44);

      if (leg.odds) {
        ctx.fillStyle = '#10b981';
        ctx.font = 'bold 34px sans-serif';
        ctx.fillText(`@ ${leg.odds}`, cx + cw - 40, cy + cardHeight * 0.78);
      }
    });

    // Footer Watermark & Disclaimer
    const footerY = height - (aspectRatio === '9:16' ? 120 : 70);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#64748b';
    ctx.font = '500 24px sans-serif';
    ctx.fillText(
      'Analisis Kuantitatif Berbasis AI & Data Statistik Resmi • Dilarang Menjamin 100% Kemenangan',
      width / 2,
      footerY - 35
    );

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 30px sans-serif';
    ctx.fillText('max-ai-sports.applet', width / 2, footerY + 12);
  }, [isOpen, aspectRatio, title, sport, league, date, legs, totalOdds, confidenceScore]);

  if (!isOpen) return null;

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `MAX-AI-PARLAY-${aspectRatio.replace(':', 'x')}-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const handleCopy = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        // @ts-ignore
        if (navigator.clipboard && navigator.clipboard.write) {
          // @ts-ignore
          await navigator.clipboard.write([
            // @ts-ignore
            new ClipboardItem({ 'image/png': blob }),
          ]);
          setCopied(true);
          setTimeout(() => setCopied(false), 2500);
        } else {
          handleDownload();
        }
      }, 'image/png');
    } catch {
      handleDownload();
    }
  };

  return (
    <div
      id="modal-social-share"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md animate-fadeIn"
    >
      <div className="relative flex max-h-[95vh] w-full max-w-2xl flex-col rounded-3xl border border-slate-700/60 bg-slate-900 text-slate-100 shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <div className="flex items-center space-x-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-sky-400 shadow-sm text-white">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Generator Slip Iklan Medsos</h3>
              <p className="text-xs text-slate-400">Siap diposting ke Instagram Stories, WhatsApp Status & Feed</p>
            </div>
          </div>
          <button
            id="btn-close-share-modal"
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Controls Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-slate-950/50 px-6 py-3">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold text-slate-400">Format Gambar:</span>
            <div className="flex rounded-lg bg-slate-800/80 p-0.5 border border-slate-700/60">
              <button
                id="btn-ratio-9-16"
                onClick={() => setAspectRatio('9:16')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition ${
                  aspectRatio === '9:16'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                9:16 (Story / TikTok)
              </button>
              <button
                id="btn-ratio-1-1"
                onClick={() => setAspectRatio('1:1')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition ${
                  aspectRatio === '1:1'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                1:1 (Post / Square)
              </button>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              id="btn-copy-canvas-image"
              onClick={handleCopy}
              className="flex items-center space-x-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-1.5 text-xs font-semibold text-slate-200 transition hover:bg-slate-700 hover:text-white"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 text-emerald-400" />
                  <span className="text-emerald-400">Tersalin!</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 text-slate-400" />
                  <span>Salin Gambar</span>
                </>
              )}
            </button>

            <button
              id="btn-download-canvas-image"
              onClick={handleDownload}
              className="flex items-center space-x-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 px-4 py-1.5 text-xs font-bold text-white shadow-md transition hover:from-blue-700 hover:to-sky-600"
            >
              <Download className="h-4 w-4" />
              <span>Unduh HD (PNG)</span>
            </button>
          </div>
        </div>

        {/* Canvas Preview Container */}
        <div className="flex-1 overflow-y-auto p-6 flex items-center justify-center bg-slate-950">
          <div
            className={`relative rounded-2xl border border-slate-800 shadow-2xl overflow-hidden ${
              aspectRatio === '9:16' ? 'max-w-[340px] aspect-[9/16]' : 'max-w-[420px] aspect-square'
            } w-full`}
          >
            <canvas
              ref={canvasRef}
              className="w-full h-full object-contain block"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
