const express = require('express');
const session = require('express-session');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const { Client, GatewayIntentBits, PermissionsBitField } = require('discord.js');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// --- CONFIGURATION FORCEE ---
const CLIENT_ID = '1493233483596828692';
const CLIENT_SECRET = 'EEL2dDbDcounOXp1WGgooqJS2a7ppaG6'; 
const CALLBACK_URL = 'https://solo-invites-tracker.onrender.com/auth';

// Mémoire temporaire pour les messages
let serverConfigs = {};

// --- BOT DISCORD ---
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });
client.login(process.env.TOKEN).catch(err => console.error("Erreur Token Bot:", err));

// --- PASSPORT / DISCORD AUTH ---
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

passport.use(new DiscordStrategy({
    clientID: CLIENT_ID,
    clientSecret: CLIENT_SECRET,
    callbackURL: CALLBACK_URL,
    scope: ['identify', 'guilds']
}, (accessToken, refreshToken, profile, done) => {
    // Si on arrive ici, l'échange de secret a réussi !
    return done(null, profile);
}));

// --- MIDDLEWARES (L'ordre est vital ici) ---
app.set('view engine', 'ejs');
app.set('trust proxy', 1);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: 'cle-secrete-solo',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 60000 * 60 * 24 } // 24 heures
}));

app.use(passport.initialize());
app.use(passport.session());

// --- ROUTES ---

app.get('/', (req, res) => {
    if (req.isAuthenticated()) return res.redirect('/dashboard');
    res.render('dashboard', { user: null, guilds: [], clientId: CLIENT_ID });
});

app.get('/login', passport.authenticate('discord'));

// LA ROUTE QUI BUGGE (CORRIGÉE)
app.get('/auth', (req, res, next) => {
    passport.authenticate('discord', (err, user, info) => {
        if (err) {
            console.error("❌ ERREUR AUTH DISCORD:", err);
            return res.status(500).send("Erreur d'authentification : " + err.message);
        }
        if (!user) return res.redirect('/');
        
        req.logIn(user, (err) => {
            if (err) return next(err);
            return res.redirect('/dashboard');
        });
    })(req, res, next);
});

app.get('/dashboard', (req, res) => {
    if (!req.isAuthenticated()) return res.redirect('/');

    const adminGuilds = req.user.guilds ? req.user.guilds.filter(g => (BigInt(g.permissions) & 0x8n) === 0x8n) : [];
    const selectedGuildId = req.query.guild || null;
    const config = serverConfigs[selectedGuildId] || { welcomeMessage: 'Bienvenue {user} !', inviterTracker: true };

    res.render('dashboard', { 
        user: req.user, 
        guilds: adminGuilds, 
        clientId: CLIENT_ID,
        selectedGuildId: selectedGuildId,
        config: config
    });
});

app.post('/api/save-welcome', (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const { guildId, welcomeMessage, inviterTracker } = req.body;
    serverConfigs[guildId] = { welcomeMessage, inviterTracker: inviterTracker === 'on' };
    res.redirect(`/dashboard?guild=${guildId}`);
});

app.get('/logout', (req, res) => {
    req.logout(() => res.redirect('/'));
});

app.listen(port, () => console.log(`🚀 Serveur en ligne`));
