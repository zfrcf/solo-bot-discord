const express = require('express');
const session = require('express-session');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const { Client, GatewayIntentBits, PermissionsBitField } = require('discord.js');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// --- CONFIGURATION SÉCURISÉE ---
const CLIENT_ID = '1493233483596828692';
const CLIENT_SECRET = 'EEL2dDbDcounOXp1WGgooqJS2a7ppaG6'; // Ton nouveau secret
const CALLBACK_URL = 'https://solo-invites-tracker.onrender.com/auth';

// --- BOT DISCORD ---
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });

// --- PASSPORT CONFIG ---
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

passport.use(new DiscordStrategy({
    clientID: CLIENT_ID,
    clientSecret: CLIENT_SECRET,
    callbackURL: CALLBACK_URL,
    scope: ['identify', 'guilds']
}, (accessToken, refreshToken, profile, done) => {
    process.nextTick(() => done(null, profile));
}));

// --- MIDDLEWARES ---
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('trust proxy', 1);

app.use(session({
    secret: 'solo-secret-session-key',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } 
}));

app.use(passport.initialize());
app.use(passport.session());

// --- ROUTES ---

app.get('/', (req, res) => {
    if (req.isAuthenticated()) return res.redirect('/dashboard');
    res.render('dashboard', { user: null, guilds: [], clientId: CLIENT_ID });
});

app.get('/login', passport.authenticate('discord'));

app.get('/auth', (req, res, next) => {
    console.log("📥 Tentative d'échange de code avec Discord...");
    next();
}, passport.authenticate('discord', { 
    failureRedirect: '/', 
    successRedirect: '/dashboard' 
}));

app.get('/dashboard', (req, res) => {
    if (!req.isAuthenticated()) return res.redirect('/');

    const adminGuilds = req.user.guilds ? req.user.guilds.filter(g => (BigInt(g.permissions) & 0x8n) === 0x8n) : [];

    res.render('dashboard', { 
        user: req.user, 
        guilds: adminGuilds, 
        clientId: CLIENT_ID,
        selectedGuildId: req.query.guild || null
    });
});

app.get('/logout', (req, res) => {
    req.logout(() => res.redirect('/'));
});

// Lancement
client.login(process.env.TOKEN);
app.listen(port, () => console.log(`🚀 Serveur prêt sur le port ${port}`));
