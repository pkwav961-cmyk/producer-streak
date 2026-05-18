/**
 * High-Fidelity Social Share Card Exporter for Producer Streak
 * Generates stylized, premium 1200x1200px square graphics using HTML5 Canvas for instant download and social media sharing.
 */

interface SessionItem {
  title: string;
  duration: number; // in seconds or minutes
  date?: string;
  genre?: string;
  bpm?: string;
}

interface CreditItem {
  title: string;
  artist: string;
  role: string;
  status?: string;
  image?: string;
}
 
const loadImage = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => {
      const fallback = new Image();
      fallback.crossOrigin = "anonymous";
      fallback.onload = () => resolve(fallback);
      fallback.src = "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=100";
    };
    img.src = src;
  });
};
 
export const exportCreditsCard = async (creditsList: CreditItem[], userName: string) => {
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  
  const items = creditsList; // display all items
  const startY = 370;
  const rowHeight = 135;
  const footerPadding = 150;
  const computedHeight = startY + (items.length || 1) * rowHeight + footerPadding;
  const height = Math.max(1200, computedHeight);
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;
 
  // Render Template
  drawCardTemplate(ctx, 'Verified Placement Credits', 'Officially verified producer credits catalog', userName, height);
  
  // Pre-load cover images
  const loadedImages = await Promise.all(
    items.map(item => loadImage(item.image || "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=100"))
  );
 
  let currentY = startY;
 
  if (items.length === 0) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.font = 'italic bold 28px system-ui';
    ctx.fillText('NO VERIFIED PLACEMENTS CLAIMED YET.', 100, currentY + 100);
  } else {
    items.forEach((credit, idx) => {
      // Draw background row glass panel
      ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(100, currentY, 1000, 110, 20);
      ctx.fill();
      ctx.stroke();
 
      // Numbering
      ctx.fillStyle = '#ec4899';
      ctx.font = 'italic 32px system-ui';
      const numStr = idx + 1 < 10 ? `0${idx + 1}` : `${idx + 1}`;
      ctx.fillText(numStr, 130, currentY + 65);
 
      // Cover Art Image
      const img = loadedImages[idx];
      if (img) {
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(190, currentY + 20, 70, 70, 12);
        ctx.clip();
        ctx.drawImage(img, 190, currentY + 20, 70, 70);
        ctx.restore();
      }
 
      // Song Title
      ctx.fillStyle = '#ffffff';
      ctx.font = '800 26px system-ui';
      ctx.fillText(credit.title.toUpperCase(), 285, currentY + 50);
 
      // Artist & Role
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.font = 'bold 15px system-ui';
      ctx.fillText(`${credit.artist.toUpperCase()} • ${credit.role.toUpperCase()}`, 285, currentY + 80);
 
      // Verified / Pending status
      const isPending = credit.status === 'pending_verification';
      ctx.fillStyle = isPending ? '#f59e0b' : '#3b82f6';
      ctx.font = '800 20px system-ui';
      ctx.fillText(isPending ? 'PENDING' : 'VERIFIED', 930, currentY + 65);
 
      currentY += rowHeight;
    });
  }
 
  triggerDownload(canvas, `${userName.replace(/\s+/g, '-')}-credits.png`);
};

interface LeaderboardUser {
  displayName: string;
  xp: number;
  level: number;
  rank?: number;
}

const drawCardTemplate = (
  ctx: CanvasRenderingContext2D,
  title: string,
  subtitle: string,
  userName: string,
  height: number = 1200
) => {
  // 1. Draw Background Gradient
  const grad = ctx.createLinearGradient(0, 0, 1200, height);
  grad.addColorStop(0, '#0a0518');
  grad.addColorStop(0.5, '#050506');
  grad.addColorStop(1, '#1b072b');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1200, height);

  // 2. Draw Subtle Diagonal Light Lines / Grids (Premium Aesthetic)
  ctx.strokeStyle = 'rgba(168, 85, 247, 0.04)';
  ctx.lineWidth = 2;
  for (let i = -1200; i < 2400; i += 100) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + height, height);
    ctx.stroke();
  }

  // 3. Draw Outer Glowing Frame Border
  const frameGrad = ctx.createLinearGradient(50, 50, 1150, height - 50);
  frameGrad.addColorStop(0, '#a855f7');
  frameGrad.addColorStop(0.5, 'rgba(168, 85, 247, 0.2)');
  frameGrad.addColorStop(1, '#ec4899');
  ctx.strokeStyle = frameGrad;
  ctx.lineWidth = 6;
  ctx.lineJoin = 'round';
  ctx.strokeRect(50, 50, 1100, height - 100);

  // 4. Header Logo
  ctx.fillStyle = '#ffffff';
  ctx.font = 'italic 48px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('PRODUCER STREAK', 100, 140);

  // Subtitle / Verified badge label
  ctx.fillStyle = '#a855f7';
  ctx.font = '800 16px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('VERIFIED MUSIC CREATOR NETWORK', 100, 175);

  // 5. Main Title Centered
  ctx.fillStyle = '#ffffff';
  ctx.font = 'italic 56px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(title.toUpperCase(), 100, 270);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.font = 'bold 20px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(subtitle.toUpperCase(), 100, 310);

  // 6. User Tag Box (Top-Right)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(800, 90, 300, 95, 20);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#a855f7';
  ctx.font = 'bold 12px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('CREATOR CARD', 830, 125);

  ctx.fillStyle = '#ffffff';
  ctx.font = '800 22px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(userName.toUpperCase(), 830, 155);

  // 7. Footer Branding
  ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.font = 'bold 16px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('BUILD YOUR LEGACY • ONE BEAT AT A TIME', 100, height - 70);

  ctx.fillStyle = '#a855f7';
  ctx.font = '800 16px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('PRODUCERSTREAK.COM', 900, height - 70);
};

const triggerDownload = (canvas: HTMLCanvasElement, filename: string) => {
  const url = canvas.toDataURL('image/png');
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
};

export const exportSessionsCard = (sessionsList: SessionItem[], userName: string) => {
  const canvas = document.createElement('canvas');
  canvas.width = 1200;

  const items = sessionsList; // display all items
  const startY = 370;
  const rowHeight = 135;
  const footerPadding = 150;
  const computedHeight = startY + (items.length || 1) * rowHeight + footerPadding;
  const height = Math.max(1200, computedHeight);
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Render Template
  drawCardTemplate(ctx, 'Collab Sessions Summary', 'Track your session analytics and focus time', userName, height);

  // Render Session Items
  let currentY = startY;

  if (items.length === 0) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.font = 'italic bold 28px system-ui';
    ctx.fillText('NO SESSIONS RECORDED YET. GET SWIPING!', 100, currentY + 100);
  } else {
    items.forEach((session, idx) => {
      // Draw background row glass panel
      ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(100, currentY, 1000, 110, 20);
      ctx.fill();
      ctx.stroke();

      // Numbering
      ctx.fillStyle = '#a855f7';
      ctx.font = 'italic 32px system-ui';
      const numStr = idx + 1 < 10 ? `0${idx + 1}` : `${idx + 1}`;
      ctx.fillText(numStr, 140, currentY + 65);

      // Session Name / Genre
      ctx.fillStyle = '#ffffff';
      ctx.font = '800 28px system-ui';
      ctx.fillText(session.title.toUpperCase(), 210, currentY + 50);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.font = 'bold 16px system-ui';
      ctx.fillText(`${session.genre || 'GENERAL'} • BPM ${session.bpm || '140'}`, 210, currentY + 80);

      // Duration Focus Time
      const mins = Math.floor(session.duration / 60) || session.duration;
      ctx.fillStyle = '#10b981';
      ctx.font = '800 32px system-ui';
      ctx.fillText(`${mins} MINS`, 930, currentY + 65);

      currentY += rowHeight;
    });
  }

  triggerDownload(canvas, `${userName.replace(/\s+/g, '-')}-sessions.png`);
};



export const exportLeaderboardCard = (rankings: LeaderboardUser[], userName: string, userRank: number) => {
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 1200;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Render Template
  drawCardTemplate(ctx, 'Leaderboard Rankings', `Official placement rank: #${userRank}`, userName);

  // Render Leaderboard Items
  const items = rankings.slice(0, 5); // display up to 5 items
  let startY = 370;

  if (items.length === 0) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.font = 'italic bold 28px system-ui';
    ctx.fillText('NO RANKINGS AVAILABLE AT THIS TIME.', 100, startY + 100);
  } else {
    items.forEach((u, idx) => {
      const isMe = u.displayName.toLowerCase() === userName.toLowerCase();

      // Draw background row glass panel (Highlight current user with glow)
      ctx.fillStyle = isMe ? 'rgba(168, 85, 247, 0.08)' : 'rgba(255, 255, 255, 0.02)';
      ctx.strokeStyle = isMe ? '#a855f7' : 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(100, startY, 1000, 110, 20);
      ctx.fill();
      ctx.stroke();

      // Place rank number
      ctx.fillStyle = idx === 0 ? '#fbbf24' : idx === 1 ? '#cbd5e1' : idx === 2 ? '#b45309' : '#ffffff';
      ctx.font = 'italic 36px system-ui';
      ctx.fillText(`#${idx + 1}`, 145, startY + 65);

      // Name / Level
      ctx.fillStyle = '#ffffff';
      ctx.font = '800 28px system-ui';
      ctx.fillText(u.displayName.toUpperCase() + (isMe ? ' (YOU)' : ''), 220, startY + 50);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.font = 'bold 16px system-ui';
      ctx.fillText(`LEVEL ${u.level || 1}`, 220, startY + 80);

      // Total XP
      ctx.fillStyle = '#a855f7';
      ctx.font = '800 28px system-ui';
      ctx.fillText(`${(u.xp || 0).toLocaleString()} XP`, 850, startY + 65);

      startY += 135;
    });
  }

  triggerDownload(canvas, `${userName.replace(/\s+/g, '-')}-leaderboard.png`);
};

export const exportStatsCard = async (
  stats: { monthlyListeners: number; totalStreams: number; creditedSongs: number },
  userName: string
) => {
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 1200;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Render Template
  drawCardTemplate(ctx, 'Official Platform Stats', 'Spotify & Genius placement analytics summary', userName, 1200);

  // Draw big beautiful glass stats panel
  ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(100, 380, 1000, 620, 30);
  ctx.fill();
  ctx.stroke();

  // Glow effect draw helper for 3 stats:
  const drawStatCol = (title: string, value: string, iconColor: string, x: number, y: number) => {
    // Stat label
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.font = 'bold 22px system-ui';
    ctx.fillText(title.toUpperCase(), x, y);

    // Glow effect for stat value
    ctx.shadowColor = iconColor;
    ctx.shadowBlur = 30;
    ctx.fillStyle = value === '0' || value === '' ? 'rgba(255, 255, 255, 0.2)' : iconColor;
    ctx.font = 'italic 800 80px system-ui';
    ctx.fillText(value, x, y + 90);

    // Reset shadow
    ctx.shadowBlur = 0;
  };

  drawStatCol('Monthly Listeners', stats.monthlyListeners.toLocaleString(), '#1db954', 150, 480);
  drawStatCol('Total Streams', stats.totalStreams.toLocaleString(), '#3b82f6', 150, 680);
  drawStatCol('Verified Placements', stats.creditedSongs.toString(), '#a855f7', 150, 880);

  triggerDownload(canvas, `${userName.replace(/\s+/g, '-')}-spotify-stats.png`);
};
