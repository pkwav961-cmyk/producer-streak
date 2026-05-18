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
      fallback.src = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=250";
    };
    img.src = src;
  });
};

const drawInstagramVerifiedBadge = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
  ctx.save();
  ctx.beginPath();
  
  const points = 8;
  const outerRadius = size / 2;
  const innerRadius = outerRadius * 0.82;
  const cx = x;
  const cy = y;

  // Draw scalloped wavy circular badge
  for (let i = 0; i < points * 2; i++) {
    const angle = (i * Math.PI) / points;
    const r = i % 2 === 0 ? outerRadius : innerRadius;
    const currX = cx + Math.cos(angle) * r;
    const currY = cy + Math.sin(angle) * r;
    if (i === 0) {
      ctx.moveTo(currX, currY);
    } else {
      const nextAngle = ((i + 1) * Math.PI) / points;
      const nextR = (i + 1) % 2 === 0 ? outerRadius : innerRadius;
      const nextX = cx + Math.cos(nextAngle) * nextR;
      const nextY = cy + Math.sin(nextAngle) * nextR;
      
      const midX = (currX + nextX) / 2;
      const midY = (currY + nextY) / 2;
      ctx.quadraticCurveTo(currX, currY, midX, midY);
    }
  }
  ctx.closePath();
  ctx.fillStyle = '#0095f6'; // Official Instagram Verified Blue
  ctx.fill();

  // Draw the clean white checkmark
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = size * 0.12;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  const startX = cx - size * 0.22;
  const startY = cy - size * 0.02;
  const midX = cx - size * 0.04;
  const midY = cy + size * 0.18;
  const endX = cx + size * 0.24;
  const endY = cy - size * 0.16;

  ctx.moveTo(startX, startY);
  ctx.lineTo(midX, midY);
  ctx.lineTo(endX, endY);
  ctx.stroke();

  ctx.restore();
};

const drawCardTemplate = async (
  ctx: CanvasRenderingContext2D,
  title: string,
  subtitle: string,
  userName: string,
  height: number = 1200,
  userPhotoUrl?: string
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

  // Draw the Instagram Verification Badge right next to the title or logo
  const logoWidth = ctx.measureText('PRODUCER STREAK').width;
  drawInstagramVerifiedBadge(ctx, 100 + logoWidth + 30, 122, 32);

  // Subtitle / Verified badge label
  ctx.fillStyle = '#a855f7';
  ctx.font = '800 16px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('VERIFIED MUSIC CREATOR NETWORK', 100, 182);

  // 5. Main Title Centered
  ctx.fillStyle = '#ffffff';
  ctx.font = 'italic 56px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(title.toUpperCase(), 100, 270);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.font = 'bold 20px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(subtitle.toUpperCase(), 100, 310);

  // 6. User Tag Box (Top-Right)
  const boxX = 760;
  const boxY = 90;
  const boxW = 340;
  const boxH = 95;

  ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(boxX, boxY, boxW, boxH, 20);
  ctx.fill();
  ctx.stroke();

  // Load User profile image asynchronously
  let userImg: HTMLImageElement | null = null;
  if (userPhotoUrl) {
    try {
      userImg = await loadImage(userPhotoUrl);
    } catch (e) {
      console.warn("Failed to load user avatar in card templates", e);
    }
  }

  // Draw profile photo inside the Creator Card box
  const photoSize = 56;
  const photoX = boxX + 20;
  const photoY = boxY + (boxH - photoSize) / 2;

  if (userImg) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(photoX + photoSize / 2, photoY + photoSize / 2, photoSize / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(userImg, photoX, photoY, photoSize, photoSize);
    ctx.restore();
    
    // Subtle border around profile pic
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(photoX + photoSize / 2, photoY + photoSize / 2, photoSize / 2, 0, Math.PI * 2);
    ctx.stroke();
  } else {
    // Fallback: draw beautiful circular gradient with first letter
    ctx.save();
    const avatarGrad = ctx.createLinearGradient(photoX, photoY, photoX + photoSize, photoY + photoSize);
    avatarGrad.addColorStop(0, '#a855f7');
    avatarGrad.addColorStop(1, '#ec4899');
    ctx.fillStyle = avatarGrad;
    ctx.beginPath();
    ctx.arc(photoX + photoSize / 2, photoY + photoSize / 2, photoSize / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(userName.charAt(0).toUpperCase(), photoX + photoSize / 2, photoY + photoSize / 2);
    ctx.textAlign = 'left'; // Reset
    ctx.textBaseline = 'alphabetic'; // Reset
  }

  // Draw Username & Role next to profile pic
  const textX = photoX + photoSize + 16;
  ctx.fillStyle = '#a855f7';
  ctx.font = 'bold 11px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('CREATOR CARD', textX, boxY + 36);

  ctx.fillStyle = '#ffffff';
  ctx.font = '800 20px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  // Truncate name if too long to avoid clipping inside top box
  const displayName = userName.toUpperCase();
  const truncatedName = displayName.length > 14 ? displayName.substring(0, 12) + '...' : displayName;
  ctx.fillText(truncatedName, textX, boxY + 64);

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

export const exportCreditsCard = async (creditsList: CreditItem[], userName: string, userPhotoUrl?: string) => {
  const itemsPerPage = 6;
  const totalPages = Math.ceil(creditsList.length / itemsPerPage) || 1;

  for (let page = 0; page < totalPages; page++) {
    const pageItems = creditsList.slice(page * itemsPerPage, (page + 1) * itemsPerPage);
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    
    const startY = 370;
    const rowHeight = 115;
    const footerPadding = 150;
    const computedHeight = startY + 6 * rowHeight + footerPadding;
    const height = Math.max(1200, computedHeight);
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) continue;

    // Render Template (Async loading user photo inside)
    const pageSubtitle = totalPages > 1 
      ? `Officially verified producer credits catalog • Card ${page + 1} of ${totalPages}`
      : 'Officially verified producer credits catalog';
    await drawCardTemplate(ctx, 'Verified Placement Credits', pageSubtitle, userName, height, userPhotoUrl);
    
    // Pre-load cover images
    const loadedImages = await Promise.all(
      pageItems.map(item => loadImage(item.image || "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=100"))
    );

    let currentY = startY;

    if (pageItems.length === 0) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.font = 'italic bold 28px system-ui';
      ctx.fillText('NO VERIFIED PLACEMENTS CLAIMED YET.', 100, currentY + 100);
    } else {
      pageItems.forEach((credit, idx) => {
        const globalIdx = page * itemsPerPage + idx;

        // Draw background row glass panel
        ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(100, currentY, 1000, 95, 20);
        ctx.fill();
        ctx.stroke();

        // Numbering
        ctx.fillStyle = '#ec4899';
        ctx.font = 'italic bold 28px system-ui';
        const numStr = (globalIdx + 1) < 10 ? `0${globalIdx + 1}` : `${globalIdx + 1}`;
        ctx.fillText(numStr, 130, currentY + 56);

        // Cover Art Image
        const img = loadedImages[idx];
        if (img) {
          ctx.save();
          ctx.beginPath();
          ctx.roundRect(190, currentY + 15, 65, 65, 12);
          ctx.clip();
          ctx.drawImage(img, 190, currentY + 15, 65, 65);
          ctx.restore();
        }

        // Song Title
        ctx.fillStyle = '#ffffff';
        ctx.font = '800 24px system-ui';
        ctx.fillText(credit.title.toUpperCase(), 280, currentY + 44);

        // Artist & Role
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.font = 'bold 14px system-ui';
        ctx.fillText(`${credit.artist.toUpperCase()} • ${credit.role.toUpperCase()}`, 280, currentY + 72);

        // Verified / Pending status pill
        const isPending = credit.status === 'pending_verification';
        
        ctx.fillStyle = isPending ? 'rgba(245, 158, 11, 0.05)' : 'rgba(168, 85, 247, 0.05)';
        ctx.strokeStyle = isPending ? 'rgba(245, 158, 11, 0.2)' : 'rgba(168, 85, 247, 0.2)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(880, currentY + 30, 180, 35, 18);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = isPending ? '#f59e0b' : '#a855f7';
        ctx.font = '800 12px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText(isPending ? 'PROCESSING CLAIM' : 'VERIFIED', 970, currentY + 52);
        ctx.textAlign = 'left'; // Reset alignment

        currentY += rowHeight;
      });
    }

    triggerDownload(canvas, `${userName.replace(/\s+/g, '-')}-credits-card-${page + 1}.png`);
  }
};

export const exportSessionsCard = async (sessionsList: SessionItem[], userName: string, userPhotoUrl?: string) => {
  const canvas = document.createElement('canvas');
  canvas.width = 1200;

  const items = sessionsList; 
  const startY = 370;
  const rowHeight = 135;
  const footerPadding = 150;
  const computedHeight = startY + (items.length || 1) * rowHeight + footerPadding;
  const height = Math.max(1200, computedHeight);
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Render Template
  await drawCardTemplate(ctx, 'Collab Sessions Summary', 'Track your session analytics and focus time', userName, height, userPhotoUrl);

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

interface LeaderboardUser {
  displayName: string;
  xp: number;
  level: number;
  rank?: number;
}

export const exportLeaderboardCard = async (
  rankings: LeaderboardUser[], 
  userName: string, 
  userRank: number,
  userPhotoUrl?: string
) => {
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 1200;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Render Template
  await drawCardTemplate(ctx, 'Leaderboard Rankings', `Official placement rank: #${userRank}`, userName, 1200, userPhotoUrl);

  // Render Leaderboard Items
  const items = rankings.slice(0, 5); 
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

export const exportSpotlightCard = async (creditsList: CreditItem[], userName: string, userPhotoUrl?: string) => {
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 1200;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Render Template
  await drawCardTemplate(ctx, 'Discography Spotlight', 'Top verified music placements spotlight roster', userName, 1200, userPhotoUrl);

  // Pre-load cover images
  const loadedImages = await Promise.all(
    creditsList.map(item => loadImage(item.image || "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=200"))
  );

  const startX = 120;
  const colWidth = 280;
  const spacing = 60;
  const recordY = 600;

  creditsList.forEach((credit, idx) => {
    const x = startX + idx * (colWidth + spacing) + colWidth / 2;

    // 1. Draw vinyl back-glow
    const glowGrad = ctx.createRadialGradient(x, recordY, 10, x, recordY, 160);
    glowGrad.addColorStop(0, 'rgba(168, 85, 247, 0.15)');
    glowGrad.addColorStop(0.5, 'rgba(236, 72, 153, 0.05)');
    glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(x, recordY, 160, 0, Math.PI * 2);
    ctx.fill();

    // 2. Draw Vinyl Outer Disc (Charcoal circle)
    ctx.fillStyle = '#111113';
    ctx.strokeStyle = '#1d1d21';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(x, recordY, 130, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 3. Draw Groove Lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 1;
    [115, 100, 85, 70].forEach(r => {
      ctx.beginPath();
      ctx.arc(x, recordY, r, 0, Math.PI * 2);
      ctx.stroke();
    });

    // 4. Draw Center Image
    const img = loadedImages[idx];
    if (img) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(x, recordY, 45, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(img, x - 45, recordY - 45, 90, 90);
      ctx.restore();
    }

    // 5. Center Spindle Hole
    ctx.fillStyle = '#0a0518';
    ctx.strokeStyle = '#222222';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, recordY, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 6. Placements metadata below the vinyl
    // Song Title
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 24px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(credit.title.toUpperCase(), x, recordY + 180);

    // Artist
    ctx.fillStyle = '#ec4899';
    ctx.font = 'bold 16px system-ui';
    ctx.fillText(credit.artist.toUpperCase(), x, recordY + 215);

    // Role pill border and text
    ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.strokeStyle = 'rgba(168, 85, 247, 0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(x - 90, recordY + 240, 180, 36, 18);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#a855f7';
    ctx.font = '800 12px system-ui';
    ctx.fillText(credit.role.toUpperCase(), x, recordY + 262);
  });

  triggerDownload(canvas, `${userName.replace(/\s+/g, '-')}-spotlight.png`);
};
