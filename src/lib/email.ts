const RESEND_API_KEY = import.meta.env.VITE_RESEND_API_KEY || 're_RgoMXu8s_Ev9cQEMjBy7j9iRXgED2QBD2';
// Dynamic URL handled inside the function
const ADMIN_EMAILS = ['tapmadeit@gmail.com', 'prodbysean21@gmail.com', 'sanjosean96@gmail.com', 'pkwav961@gmail.com', 'visualsbn@gmail.com'];
// Using verified domain with display name so emails show "Producer Streak" in the inbox.
const FROM_EMAIL = import.meta.env.VITE_RESEND_FROM_EMAIL || 'Producer Streak <noreply@producerstreak.com>';

interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
  bcc?: string | string[];
}

export const sendEmail = async (params: SendEmailParams): Promise<{ success: boolean; error?: string }> => {
  try {
    const isLocal = ['127.0.0.1', 'localhost'].includes(window.location.hostname);
    const customProxy = import.meta.env.VITE_EMAIL_PROXY_URL || '';
    
    const endpoints = [
      ...(customProxy ? [customProxy] : []),
      isLocal ? '/api/resend' : 'https://thingproxy.freeboard.io/fetch/https://api.resend.com/emails',
      'https://thingproxy.freeboard.io/fetch/https://api.resend.com/emails',
      'https://proxy.cors.sh/https://api.resend.com/emails',
      'https://cors.bridge.wtf/https://api.resend.com/emails',
      'https://corsproxy.io/?url=https://api.resend.com/emails',
      'https://cors.eu.org/https://api.resend.com/emails'
    ];

    let lastError = 'Failed to connect to email service';
    let currentFrom = FROM_EMAIL;
    
    // Attempt 1: Try sending with the configured domain FROM_EMAIL
    // Attempt 2: Fall back to onboarding@resend.dev if it fails due to domain verification!
    for (let attempt = 1; attempt <= 2; attempt++) {
      let triggerFallback = false;
      for (const endpoint of endpoints) {
        try {
          console.log(`Attempting email delivery (${attempt}/2) via ${endpoint} from ${currentFrom}...`);
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${RESEND_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: currentFrom,
              to: params.to,
              subject: params.subject,
              html: params.html,
              ...(params.bcc && { bcc: params.bcc })
            }),
          });

          if (response.ok) {
            console.log(`Email successfully sent via ${endpoint}!`);
            return { success: true };
          }

          let errorMessage = 'Failed to send';
          try {
            const error = await response.json();
            errorMessage = error.message || error.error || JSON.stringify(error);
          } catch (jsonErr) {
            errorMessage = await response.text();
          }
          
          console.warn(`Endpoint ${endpoint} returned error:`, errorMessage);
          lastError = errorMessage;
          
          // Check for domain verification / sandbox errors
          const errLower = errorMessage.toLowerCase();
          if (
            errLower.includes('domain') || 
            errLower.includes('verification') || 
            errLower.includes('from address') ||
            errLower.includes('restricted') ||
            errLower.includes('sandbox') ||
            errLower.includes('not verified')
          ) {
            if (currentFrom !== 'onboarding@resend.dev') {
              console.warn("Domain verification issue detected. Falling back to onboarding@resend.dev...");
              currentFrom = 'onboarding@resend.dev';
              triggerFallback = true;
              break; // break the endpoint loop to start again with onboarding@resend.dev!
            }
          }
        } catch (err: any) {
          console.warn(`Failed to fetch from ${endpoint}:`, err);
          lastError = err.message || String(err);
        }
      }
      if (!triggerFallback) {
        // If we didn't trigger a fallback, no need to try attempt 2
        break;
      }
    }

    return { success: false, error: lastError };
  } catch (error) {
    console.error('Email send error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to send email' };
  }
};

// Welcome email template
export const sendWelcomeEmail = async (email: string, displayName: string, roles: string[]) => {
  const rolesText = roles.join(', ');
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; color: #333; line-height: 1.6; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #a855f7 0%, #ec4899 100%); color: white; padding: 40px 20px; text-align: center; border-radius: 10px; }
          .header h1 { margin: 0; font-size: 28px; }
          .content { padding: 40px 20px; background: #f9f9f9; border-radius: 10px; margin-top: 20px; }
          .button { display: inline-block; background: linear-gradient(135deg, #a855f7 0%, #ec4899 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; margin-top: 20px; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎵 Welcome to Producer Streak!</h1>
          </div>
          <div class="content">
            <p>Hey <strong>${displayName}</strong>!</p>
            <p>Welcome to the ultimate platform for music creators. We're thrilled to have you join us as a <strong>${rolesText}</strong>.</p>
            <p>Your account is now set up and ready to go. Here's what you can do:</p>
            <ul>
              <li>Upload and showcase your beats</li>
              <li>Connect with other producers, artists, and engineers</li>
              <li>Find collaboration opportunities</li>
              <li>Track your production sessions and stats</li>
            </ul>
            <p>Start exploring the matcher section to find your perfect collaborators!</p>
            <a href="https://producerstreak.com" class="button">Get Started →</a>
          </div>
          <div class="footer">
            <p>© 2026 Producer Streak. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: '🎵 Welcome to Producer Streak!',
    html,
  });
};

// Admin notification for new user signup
export const sendAdminNewUserEmail = async (userData: {
  email: string;
  displayName: string;
  country: string;
  roles: string[];
  genres: string[];
}) => {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; color: #333; line-height: 1.6; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #2c2c2c; color: white; padding: 20px; text-align: center; border-radius: 10px; }
          .content { padding: 20px; background: #f5f5f5; border-radius: 10px; margin-top: 20px; }
          .user-info { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; }
          .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
          .label { font-weight: bold; color: #666; }
          .value { color: #333; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎵 New User Signup</h1>
          </div>
          <div class="content">
            <p>A new user has signed up for Producer Streak!</p>
            <div class="user-info">
              <div class="info-row">
                <span class="label">Email:</span>
                <span class="value">${userData.email}</span>
              </div>
              <div class="info-row">
                <span class="label">Name:</span>
                <span class="value">${userData.displayName}</span>
              </div>
              <div class="info-row">
                <span class="label">Country:</span>
                <span class="value">${userData.country}</span>
              </div>
              <div class="info-row">
                <span class="label">Roles:</span>
                <span class="value">${userData.roles.join(', ')}</span>
              </div>
              <div class="info-row">
                <span class="label">Genres:</span>
                <span class="value">${userData.genres.join(', ')}</span>
              </div>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: ADMIN_EMAILS,
    subject: `🎵 New User Signup: ${userData.displayName}`,
    html,
  });
};

// Match notification email for user
export const sendMatchNotificationEmail = async (email: string, displayName: string, matchName: string, matchRole: string) => {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; color: #333; line-height: 1.6; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #a855f7 0%, #ec4899 100%); color: white; padding: 40px 20px; text-align: center; border-radius: 10px; }
          .header h1 { margin: 0; font-size: 28px; }
          .content { padding: 40px 20px; background: #f9f9f9; border-radius: 10px; margin-top: 20px; }
          .button { display: inline-block; background: linear-gradient(135deg, #a855f7 0%, #ec4899 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; margin-top: 20px; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 You've Got a Match!</h1>
          </div>
          <div class="content">
            <p>Exciting news, ${displayName}!</p>
            <p>You've been matched with <strong>${matchName}</strong>, a talented <strong>${matchRole}</strong>.</p>
            <p>This is a great opportunity to collaborate and create something amazing together. Check out their profile and get in touch!</p>
            <a href="https://producerstreak.com/matcher" class="button">View Match →</a>
          </div>
          <div class="footer">
            <p>© 2026 Producer Streak. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: `🎉 Match Found: ${matchName}!`,
    html,
  });
};

// Admin notification for match
export const sendAdminMatchNotificationEmail = async (user1Email: string, user1Name: string, user2Email: string, user2Name: string) => {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; color: #333; line-height: 1.6; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #2c2c2c; color: white; padding: 20px; text-align: center; border-radius: 10px; }
          .content { padding: 20px; background: #f5f5f5; border-radius: 10px; margin-top: 20px; }
          .user-box { background: white; padding: 15px; border-radius: 8px; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎵 New Match Created</h1>
          </div>
          <div class="content">
            <p>A new match has been created on Producer Streak!</p>
            <div class="user-box">
              <strong>${user1Name}</strong><br>
              Email: ${user1Email}
            </div>
            <p style="text-align: center; font-weight: bold;">↔️ MATCHED WITH ↔️</p>
            <div class="user-box">
              <strong>${user2Name}</strong><br>
              Email: ${user2Email}
            </div>
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: ADMIN_EMAILS,
    subject: `🎵 New Match: ${user1Name} × ${user2Name}`,
    html,
  });
};

// Newsletter / Waitlist Signup email template
export const sendNewsletterSignupEmail = async (email: string) => {
  const html = `
    <div style="background-color: #050505; color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 40px; border-radius: 20px; max-width: 600px; margin: 0 auto; border: 1px solid #1a1a1a; text-align: center;">
      <div style="margin-bottom: 30px;">
        <img src="https://i.postimg.cc/k44rqjNL/Chat-GPT-Image-May-16-2026-04-45-32-PM.png" alt="Logo" style="width: 64px; height: 64px; border-radius: 12px; box-shadow: 0 4px 20px rgba(168, 85, 247, 0.4); object-fit: cover;" />
        <h1 style="color: #ffffff; font-size: 28px; font-weight: 900; letter-spacing: -1px; text-transform: uppercase; font-style: italic; margin-top: 15px; margin-bottom: 5px;">Producer Streak</h1>
        <p style="color: #a855f7; font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; margin: 0;">Verified Music Creator Network</p>
      </div>
      
      <div style="background-color: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.05); padding: 30px; border-radius: 20px; text-align: left; margin-bottom: 30px;">
        <h2 style="color: #ffffff; font-size: 20px; font-weight: 900; text-transform: uppercase; font-style: italic; margin-top: 0;">You're on the list! 🔥</h2>
        <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6; margin-bottom: 20px;">
          Thank you for joining the waiting list. We are thrilled to welcome you to the next generation of music creator networking.
        </p>
        
        <div style="background-color: rgba(168, 85, 247, 0.1); border: 1px solid rgba(168, 85, 247, 0.2); padding: 20px; border-radius: 15px; margin-bottom: 20px;">
          <p style="color: #e9d5ff; font-size: 13px; font-weight: bold; line-height: 1.6; margin: 0;">
            💡 <strong>The Story Behind the Vision:</strong><br />
            Producer Streak was created by 13-year-old music producer <strong>Staz EQ</strong>. Staz understands firsthand the hurdles upcoming producers, artists, and engineers face when trying to share beats, aggregate credits, and build real industry relationships.
          </p>
        </div>
        
        <p style="color: #94a3b8; font-size: 13px; line-height: 1.6; margin-bottom: 0;">
          <strong>What's Next?</strong><br />
          Our platform officially opens on <strong>June 22, 2026</strong>. You will receive priority onboarding to start swiping on the Collab Matcher, syncing your Genius & Spotify credits, and automating your outbound campaigns.
        </p>
      </div>
      
      <div style="color: #4b5563; font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">
        <p style="margin-bottom: 5px;">Staz EQ • Producer Streak Founder</p>
        <p style="margin: 0;">&copy; 2026 Producer Streak. All rights reserved.</p>
      </div>
    </div>
  `;

  return sendEmail({
    to: email,
    bcc: "admin@producerstreak.com",
    subject: "You're on the list! 🔥",
    html
  });
};
