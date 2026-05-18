/**
 * src/lib/adminEmails.ts
 *
 * Comprehensive admin email notification system.
 * All emails are sent to the admin team via Resend.
 * Sender shows as "Producer Streak" in the inbox.
 */

import { sendEmail } from './email';

const ADMIN_EMAILS = ['tapmadeit@gmail.com', 'prodbysean21@gmail.com', 'sanjosean96@gmail.com', 'pkwav961@gmail.com', 'visualsbn@gmail.com'];

// ── Shared HTML wrapper ──────────────────────────────────────────────────────

function adminEmailTemplate(title: string, emoji: string, color: string, body: string): string {
  return `
    <div style="background-color: #050505; color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; border-radius: 20px; max-width: 600px; margin: 0 auto; border: 1px solid #1a1a1a;">
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="font-size: 36px; margin-bottom: 8px;">${emoji}</div>
        <h1 style="color: #ffffff; font-size: 22px; font-weight: 900; text-transform: uppercase; font-style: italic; letter-spacing: -0.5px; margin: 0;">${title}</h1>
        <p style="color: ${color}; font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; margin: 6px 0 0;">Producer Streak · Admin Alert</p>
      </div>
      <div style="background-color: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); padding: 24px; border-radius: 16px; margin-bottom: 24px;">
        ${body}
      </div>
      <div style="text-align: center; color: #4b5563; font-size: 9px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">
        <p style="margin: 0;">Sent from Producer Streak Admin System · ${new Date().toLocaleString()}</p>
      </div>
    </div>
  `;
}

function infoRow(label: string, value: string): string {
  return `<div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.05);"><span style="color: #9ca3af; font-size: 12px; font-weight: bold; text-transform: uppercase;">${label}</span><span style="color: #ffffff; font-size: 12px; font-weight: bold;">${value}</span></div>`;
}

// ══════════════════════════════════════════════════════════════════════════════
//  1. USER SIGNUP EVENTS
// ══════════════════════════════════════════════════════════════════════════════

/** Spike alert — called when signup count exceeds a threshold */
export const sendSignupSpikeEmail = async (count: number, period: string = 'today') => {
  const html = adminEmailTemplate('Signup Spike Detected', '📈', '#22c55e',
    `<p style="color: #cbd5e1; font-size: 14px; line-height: 1.6;">
      <strong style="color: #22c55e; font-size: 28px;">${count}</strong> new users signed up ${period}.
    </p>
    <p style="color: #9ca3af; font-size: 12px;">This is above normal activity. Review the admin panel for details.</p>`
  );
  return sendEmail({ to: ADMIN_EMAILS, subject: `📈 ${count} new users ${period}!`, html });
};

/** Every waiting list signup — sent to admins */
export const sendWaitingListAdminEmail = async (email: string) => {
  const html = adminEmailTemplate('New Waiting List Signup', '📋', '#a855f7',
    `<p style="color: #cbd5e1; font-size: 14px; line-height: 1.6;">A new person just joined the waiting list!</p>
    ${infoRow('Email', email)}
    ${infoRow('Time', new Date().toLocaleString())}`
  );
  return sendEmail({ to: ADMIN_EMAILS, subject: `📋 Waiting List: ${email}`, html });
};

// ══════════════════════════════════════════════════════════════════════════════
//  2. PAYMENT EVENTS
// ══════════════════════════════════════════════════════════════════════════════

export const sendNewProSubscriptionEmail = async (userName: string, email: string, plan: string) => {
  const html = adminEmailTemplate('New Pro Subscription', '💎', '#eab308',
    `<p style="color: #cbd5e1; font-size: 14px;">A user has upgraded to Pro!</p>
    ${infoRow('User', userName)}
    ${infoRow('Email', email)}
    ${infoRow('Plan', plan)}
    ${infoRow('Time', new Date().toLocaleString())}`
  );
  return sendEmail({ to: ADMIN_EMAILS, subject: `💎 New Pro: ${userName} (${plan})`, html });
};

export const sendFailedPaymentEmail = async (userName: string, email: string, reason: string) => {
  const html = adminEmailTemplate('Failed Payment', '❌', '#ef4444',
    `<p style="color: #cbd5e1; font-size: 14px;">A payment has failed.</p>
    ${infoRow('User', userName)}
    ${infoRow('Email', email)}
    ${infoRow('Reason', reason)}
    ${infoRow('Time', new Date().toLocaleString())}`
  );
  return sendEmail({ to: ADMIN_EMAILS, subject: `❌ Failed Payment: ${userName}`, html });
};

export const sendRefundRequestEmail = async (userName: string, email: string, amount: string, reason: string) => {
  const html = adminEmailTemplate('Refund Request', '💸', '#f97316',
    `<p style="color: #cbd5e1; font-size: 14px;">A user has requested a refund.</p>
    ${infoRow('User', userName)}
    ${infoRow('Email', email)}
    ${infoRow('Amount', amount)}
    ${infoRow('Reason', reason)}`
  );
  return sendEmail({ to: ADMIN_EMAILS, subject: `💸 Refund Request: ${userName} (${amount})`, html });
};

export const sendChargebackWarningEmail = async (userName: string, email: string, amount: string) => {
  const html = adminEmailTemplate('Chargeback Warning', '🚨', '#dc2626',
    `<p style="color: #ef4444; font-size: 14px; font-weight: bold;">⚠️ URGENT: A chargeback has been initiated.</p>
    ${infoRow('User', userName)}
    ${infoRow('Email', email)}
    ${infoRow('Amount', amount)}
    <p style="color: #fca5a5; font-size: 12px; margin-top: 12px;">Respond within 24 hours to dispute or accept.</p>`
  );
  return sendEmail({ to: ADMIN_EMAILS, subject: `🚨 CHARGEBACK: ${userName} (${amount})`, html });
};

// ══════════════════════════════════════════════════════════════════════════════
//  3. REPORTS & MODERATION
// ══════════════════════════════════════════════════════════════════════════════

export const sendUserReportedEmail = async (reportedUser: string, reportedBy: string, reason: string) => {
  const html = adminEmailTemplate('User Reported', '🚩', '#ef4444',
    `<p style="color: #cbd5e1; font-size: 14px;">A user has been reported.</p>
    ${infoRow('Reported User', reportedUser)}
    ${infoRow('Reported By', reportedBy)}
    ${infoRow('Reason', reason)}
    ${infoRow('Time', new Date().toLocaleString())}`
  );
  return sendEmail({ to: ADMIN_EMAILS, subject: `🚩 User Reported: ${reportedUser}`, html });
};

export const sendScamDetectedEmail = async (userName: string, details: string) => {
  const html = adminEmailTemplate('Scam / Spam Detected', '🛑', '#dc2626',
    `<p style="color: #ef4444; font-size: 14px; font-weight: bold;">Potential scam or spam activity detected.</p>
    ${infoRow('User', userName)}
    ${infoRow('Details', details)}
    ${infoRow('Time', new Date().toLocaleString())}`
  );
  return sendEmail({ to: ADMIN_EMAILS, subject: `🛑 Scam/Spam: ${userName}`, html });
};

export const sendNSFWContentEmail = async (userName: string, contentType: string, details: string) => {
  const html = adminEmailTemplate('NSFW / Stolen Content', '⛔', '#dc2626',
    `<p style="color: #ef4444; font-size: 14px;">Flagged content uploaded.</p>
    ${infoRow('User', userName)}
    ${infoRow('Content Type', contentType)}
    ${infoRow('Details', details)}`
  );
  return sendEmail({ to: ADMIN_EMAILS, subject: `⛔ Content Flagged: ${userName} (${contentType})`, html });
};

export const sendMassDMAbuseEmail = async (userName: string, messageCount: number, timeframe: string) => {
  const html = adminEmailTemplate('Mass DM Abuse', '📨', '#f97316',
    `<p style="color: #cbd5e1; font-size: 14px;">A user is sending an unusual number of DMs.</p>
    ${infoRow('User', userName)}
    ${infoRow('Messages Sent', String(messageCount))}
    ${infoRow('Timeframe', timeframe)}`
  );
  return sendEmail({ to: ADMIN_EMAILS, subject: `📨 Mass DM Abuse: ${userName} (${messageCount} msgs)`, html });
};

// ══════════════════════════════════════════════════════════════════════════════
//  4. VERIFICATION REQUESTS
// ══════════════════════════════════════════════════════════════════════════════

export const sendVerificationPendingEmail = async (userName: string, email: string, type: string = 'Producer') => {
  const html = adminEmailTemplate('Verification Pending', '✅', '#3b82f6',
    `<p style="color: #cbd5e1; font-size: 14px;">A new verification request needs review.</p>
    ${infoRow('User', userName)}
    ${infoRow('Email', email)}
    ${infoRow('Type', type)}
    ${infoRow('Submitted', new Date().toLocaleString())}
    <p style="color: #93c5fd; font-size: 12px; margin-top: 12px;">Review in the Admin Panel → Verifications tab.</p>`
  );
  return sendEmail({ to: ADMIN_EMAILS, subject: `✅ Verification Pending: ${userName} (${type})`, html });
};

export const sendCreditsVerificationEmail = async (userName: string, email: string, trackTitle: string, artist: string) => {
  const html = adminEmailTemplate('Credits Verification Pending', '🎵', '#8b5cf6',
    `<p style="color: #cbd5e1; font-size: 14px;">A user is claiming production credits.</p>
    ${infoRow('User', userName)}
    ${infoRow('Email', email)}
    ${infoRow('Track', trackTitle)}
    ${infoRow('Artist', artist)}
    ${infoRow('Submitted', new Date().toLocaleString())}`
  );
  return sendEmail({ to: ADMIN_EMAILS, subject: `🎵 Credit Claim: ${userName} → "${trackTitle}" by ${artist}`, html });
};

// ══════════════════════════════════════════════════════════════════════════════
//  5. SERVER / APP ISSUES
// ══════════════════════════════════════════════════════════════════════════════

export const sendAppCrashSpikeEmail = async (errorCount: number, sampleError: string) => {
  const html = adminEmailTemplate('App Crash Spike', '💥', '#dc2626',
    `<p style="color: #ef4444; font-size: 14px; font-weight: bold;">Multiple app crashes detected!</p>
    ${infoRow('Error Count', String(errorCount))}
    ${infoRow('Time Window', 'Last 1 hour')}
    <p style="color: #9ca3af; font-size: 11px; margin-top: 12px;">Sample error:</p>
    <pre style="background: rgba(0,0,0,0.3); color: #fca5a5; padding: 12px; border-radius: 8px; font-size: 11px; overflow: auto;">${sampleError}</pre>`
  );
  return sendEmail({ to: ADMIN_EMAILS, subject: `💥 CRASH SPIKE: ${errorCount} errors detected`, html });
};

export const sendDatabaseIssueEmail = async (operation: string, error: string) => {
  const html = adminEmailTemplate('Database Issue', '🗄️', '#ef4444',
    `<p style="color: #cbd5e1; font-size: 14px;">A database operation failed.</p>
    ${infoRow('Operation', operation)}
    ${infoRow('Time', new Date().toLocaleString())}
    <pre style="background: rgba(0,0,0,0.3); color: #fca5a5; padding: 12px; border-radius: 8px; font-size: 11px; overflow: auto;">${error}</pre>`
  );
  return sendEmail({ to: ADMIN_EMAILS, subject: `🗄️ Database Issue: ${operation}`, html });
};

export const sendAPIFailureEmail = async (endpoint: string, statusCode: number, error: string) => {
  const html = adminEmailTemplate('API Failure', '🔌', '#f97316',
    `<p style="color: #cbd5e1; font-size: 14px;">An external API call failed.</p>
    ${infoRow('Endpoint', endpoint)}
    ${infoRow('Status Code', String(statusCode))}
    ${infoRow('Time', new Date().toLocaleString())}
    <pre style="background: rgba(0,0,0,0.3); color: #fca5a5; padding: 12px; border-radius: 8px; font-size: 11px; overflow: auto;">${error}</pre>`
  );
  return sendEmail({ to: ADMIN_EMAILS, subject: `🔌 API Failure: ${endpoint} (${statusCode})`, html });
};

export const sendStorageAlmostFullEmail = async (usedPercent: number, usedGB: string, totalGB: string) => {
  const html = adminEmailTemplate('Storage Almost Full', '💾', '#eab308',
    `<p style="color: #eab308; font-size: 14px; font-weight: bold;">Storage is running low!</p>
    ${infoRow('Used', `${usedPercent}%`)}
    ${infoRow('Space Used', usedGB)}
    ${infoRow('Total Space', totalGB)}
    <p style="color: #fde68a; font-size: 12px; margin-top: 12px;">Consider cleaning up old uploads or upgrading storage.</p>`
  );
  return sendEmail({ to: ADMIN_EMAILS, subject: `💾 Storage ${usedPercent}% Full`, html });
};

// ══════════════════════════════════════════════════════════════════════════════
//  6. SECURITY ALERTS
// ══════════════════════════════════════════════════════════════════════════════

export const sendFailedAdminLoginsEmail = async (attempts: number, ipAddress: string) => {
  const html = adminEmailTemplate('Failed Admin Logins', '🔐', '#dc2626',
    `<p style="color: #ef4444; font-size: 14px; font-weight: bold;">Multiple failed admin login attempts detected.</p>
    ${infoRow('Failed Attempts', String(attempts))}
    ${infoRow('IP Address', ipAddress)}
    ${infoRow('Time', new Date().toLocaleString())}
    <p style="color: #fca5a5; font-size: 12px; margin-top: 12px;">If this wasn't you, change admin passwords immediately.</p>`
  );
  return sendEmail({ to: ADMIN_EMAILS, subject: `🔐 SECURITY: ${attempts} Failed Admin Logins`, html });
};

export const sendSuspiciousActivityEmail = async (userName: string, activity: string) => {
  const html = adminEmailTemplate('Suspicious Account Activity', '👁️', '#f97316',
    `<p style="color: #cbd5e1; font-size: 14px;">Suspicious activity detected on an account.</p>
    ${infoRow('User', userName)}
    ${infoRow('Activity', activity)}
    ${infoRow('Time', new Date().toLocaleString())}`
  );
  return sendEmail({ to: ADMIN_EMAILS, subject: `👁️ Suspicious Activity: ${userName}`, html });
};

export const sendBotAttackEmail = async (details: string, requestCount: number) => {
  const html = adminEmailTemplate('Possible Bot Attack', '🤖', '#dc2626',
    `<p style="color: #ef4444; font-size: 14px; font-weight: bold;">⚠️ Possible bot attack in progress!</p>
    ${infoRow('Requests', String(requestCount))}
    ${infoRow('Time', new Date().toLocaleString())}
    <p style="color: #9ca3af; font-size: 12px; margin-top: 8px;">${details}</p>`
  );
  return sendEmail({ to: ADMIN_EMAILS, subject: `🤖 BOT ATTACK: ${requestCount} suspicious requests`, html });
};

// ══════════════════════════════════════════════════════════════════════════════
//  7. SUPPORT TICKETS
// ══════════════════════════════════════════════════════════════════════════════

export const sendNewSupportMessageEmail = async (userName: string, email: string, message: string) => {
  const html = adminEmailTemplate('New Support Message', '💬', '#3b82f6',
    `<p style="color: #cbd5e1; font-size: 14px;">A user has sent a support message.</p>
    ${infoRow('User', userName)}
    ${infoRow('Email', email)}
    <div style="background: rgba(0,0,0,0.3); padding: 16px; border-radius: 12px; margin-top: 12px;">
      <p style="color: #e2e8f0; font-size: 13px; line-height: 1.6; margin: 0;">${message}</p>
    </div>`
  );
  return sendEmail({ to: ADMIN_EMAILS, subject: `💬 Support: ${userName}`, html });
};

export const sendContactSubmissionEmail = async (name: string, email: string, subject: string, message: string) => {
  const html = adminEmailTemplate('New Contact Form Submission', '✉️', '#a855f7',
    `<p style="color: #cbd5e1; font-size: 14px;">A new contact message has been submitted on the site.</p>
    ${infoRow('Name', name)}
    ${infoRow('Email', email)}
    ${infoRow('Subject', subject)}
    <div style="background: rgba(0,0,0,0.3); padding: 16px; border-radius: 12px; margin-top: 12px;">
      <p style="color: #9ca3af; font-size: 10px; font-weight: bold; text-transform: uppercase; margin: 0 0 6px;">Message:</p>
      <p style="color: #e2e8f0; font-size: 13px; line-height: 1.6; margin: 0;">${message}</p>
    </div>`
  );
  return sendEmail({ to: ADMIN_EMAILS, subject: `✉️ Contact: [${subject}] from ${name}`, html });
};

export const sendHighPrioritySupportEmail = async (userName: string, email: string, issue: string) => {
  const html = adminEmailTemplate('HIGH PRIORITY Support', '🆘', '#dc2626',
    `<p style="color: #ef4444; font-size: 14px; font-weight: bold;">A high-priority support request needs immediate attention.</p>
    ${infoRow('User', userName)}
    ${infoRow('Email', email)}
    <div style="background: rgba(220,38,38,0.1); border: 1px solid rgba(220,38,38,0.2); padding: 16px; border-radius: 12px; margin-top: 12px;">
      <p style="color: #fca5a5; font-size: 13px; line-height: 1.6; margin: 0;">${issue}</p>
    </div>`
  );
  return sendEmail({ to: ADMIN_EMAILS, subject: `🆘 URGENT Support: ${userName}`, html });
};

// ══════════════════════════════════════════════════════════════════════════════
//  8. MATCH / DM SYSTEM ALERTS
// ══════════════════════════════════════════════════════════════════════════════

export const sendIGSyncFailingEmail = async (userName: string, error: string) => {
  const html = adminEmailTemplate('IG Sync Failing', '📸', '#e11d48',
    `<p style="color: #cbd5e1; font-size: 14px;">Instagram sync is failing for a user.</p>
    ${infoRow('User', userName)}
    ${infoRow('Error', error)}`
  );
  return sendEmail({ to: ADMIN_EMAILS, subject: `📸 IG Sync Failing: ${userName}`, html });
};

export const sendMatcherErrorEmail = async (error: string) => {
  const html = adminEmailTemplate('Matcher Algorithm Error', '💔', '#ef4444',
    `<p style="color: #cbd5e1; font-size: 14px;">The matcher algorithm encountered an error.</p>
    <pre style="background: rgba(0,0,0,0.3); color: #fca5a5; padding: 12px; border-radius: 8px; font-size: 11px; overflow: auto;">${error}</pre>`
  );
  return sendEmail({ to: ADMIN_EMAILS, subject: `💔 Matcher Error`, html });
};

export const sendMessagesNotSendingEmail = async (failedCount: number, sampleError: string) => {
  const html = adminEmailTemplate('Messages Not Sending', '📩', '#f97316',
    `<p style="color: #cbd5e1; font-size: 14px;">Messages are failing to send.</p>
    ${infoRow('Failed Messages', String(failedCount))}
    ${infoRow('Time Window', 'Last 30 minutes')}
    <pre style="background: rgba(0,0,0,0.3); color: #fca5a5; padding: 12px; border-radius: 8px; font-size: 11px; overflow: auto;">${sampleError}</pre>`
  );
  return sendEmail({ to: ADMIN_EMAILS, subject: `📩 ${failedCount} Messages Failing`, html });
};

// ══════════════════════════════════════════════════════════════════════════════
//  9. ANALYTICS SUMMARIES
// ══════════════════════════════════════════════════════════════════════════════

export const sendDailySummaryEmail = async (stats: {
  dau: number;
  newUsers: number;
  totalUsers: number;
  matchesMade: number;
  messagesSent: number;
  beatsUploaded: number;
  topCountries: string[];
  mostActiveProducers: string[];
}) => {
  const html = adminEmailTemplate('Daily Analytics Summary', '📊', '#8b5cf6',
    `<p style="color: #cbd5e1; font-size: 14px; margin-bottom: 16px;">Here's your daily platform snapshot.</p>
    ${infoRow('Daily Active Users', String(stats.dau))}
    ${infoRow('New Users Today', String(stats.newUsers))}
    ${infoRow('Total Users', String(stats.totalUsers))}
    ${infoRow('Matches Made', String(stats.matchesMade))}
    ${infoRow('Messages Sent', String(stats.messagesSent))}
    ${infoRow('Beats Uploaded', String(stats.beatsUploaded))}
    ${infoRow('Top Countries', stats.topCountries.join(', ') || 'N/A')}
    ${infoRow('Most Active', stats.mostActiveProducers.join(', ') || 'N/A')}`
  );
  return sendEmail({ to: ADMIN_EMAILS, subject: `📊 Daily Report: ${stats.dau} DAU, ${stats.newUsers} new users`, html });
};

// ══════════════════════════════════════════════════════════════════════════════
//  10. CONTENT MILESTONES
// ══════════════════════════════════════════════════════════════════════════════

export const sendMilestoneEmail = async (milestone: string, currentValue: number) => {
  const html = adminEmailTemplate('Milestone Reached!', '🏆', '#eab308',
    `<div style="text-align: center;">
      <p style="color: #eab308; font-size: 40px; font-weight: 900; margin: 0;">${currentValue.toLocaleString()}</p>
      <p style="color: #ffffff; font-size: 16px; font-weight: 900; text-transform: uppercase; margin: 8px 0 0;">${milestone}</p>
      <p style="color: #9ca3af; font-size: 12px; margin-top: 12px;">Congratulations! The platform keeps growing. 🚀</p>
    </div>`
  );
  return sendEmail({ to: ADMIN_EMAILS, subject: `🏆 MILESTONE: ${milestone} (${currentValue.toLocaleString()})`, html });
};

// ══════════════════════════════════════════════════════════════════════════════
//  MILESTONE CHECKER — call after user actions to auto-trigger milestone emails
// ══════════════════════════════════════════════════════════════════════════════

const MILESTONES = [100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000, 100000];

export const checkUserMilestone = async (totalUsers: number) => {
  if (MILESTONES.includes(totalUsers)) {
    await sendMilestoneEmail(`${totalUsers.toLocaleString()} Users!`, totalUsers);
  }
};

export const checkMatchMilestone = async (totalMatches: number) => {
  const matchMilestones = [100, 500, 1000, 5000, 10000, 50000, 100000];
  if (matchMilestones.includes(totalMatches)) {
    await sendMilestoneEmail(`${totalMatches.toLocaleString()} Matches Made!`, totalMatches);
  }
};

export const checkMessageMilestone = async (totalMessages: number) => {
  const msgMilestones = [1000, 5000, 10000, 50000, 100000, 500000];
  if (msgMilestones.includes(totalMessages)) {
    await sendMilestoneEmail(`${totalMessages.toLocaleString()} Messages Sent!`, totalMessages);
  }
};
