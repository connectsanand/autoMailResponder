const express = require('express');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { google } = require('googleapis');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Serve frontend from root/frontend/
const frontendPath = path.join(__dirname, 'frontend');
app.use(express.static(frontendPath));

// Session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'secret123',
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

// Serialize user
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

// Google Strategy
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_REDIRECT_URI,
  accessType: 'offline',
  prompt: 'consent',
  scope: [
    'https://www.googleapis.com/auth/gmail.settings.basic',
    'https://www.googleapis.com/auth/gmail.modify',
    'profile',
    'email'
  ]
}, (accessToken, refreshToken, profile, done) => {
  profile.accessToken = accessToken;
  profile.refreshToken = refreshToken;
  return done(null, profile);
}));

// Auth routes
app.get('/auth/google', passport.authenticate('google'));

app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/' }),
  (req, res) => {
    console.log('✅ Authenticated as:', req.user.displayName || req.user.emails?.[0]?.value);
    res.redirect('/dashboard.html');
  }
);

app.get('/logout', (req, res, next) => {
  req.logout(err => {
    if (err) return next(err);
    res.redirect('/');
  });
});

// ✅ Auto-responder API
app.post('/api/auto-responder', async (req, res) => {
  if (!req.user || !req.user.accessToken) {
    return res.status(401).json({ error: 'User not authenticated' });
  }

  const { active, message } = req.body;

  try {
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: req.user.accessToken });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    await gmail.users.settings.updateVacation({
      userId: 'me',
      requestBody: {
        enableAutoReply: active,
        responseSubject: 'Auto Reply',
        responseBodyPlainText: message || 'Hi, I’m currently away and will get back to you soon.',
        restrictToContacts: false,
        restrictToDomain: false
      }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('❌ Gmail API Error:', error.response?.data || error.message || error);
    res.status(500).json({ error: 'Failed to update auto-responder' });
  }
});

// Fallback route
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
