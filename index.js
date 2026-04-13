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
const CLIENT_SECRET = 'EEL2dDbDcounOXp1WGgooqJS2a7ppaG6';
const CALLBACK_URL = 'https://solo-invites-tracker.onrender.com/auth';

// 🧠 MÉMOIRE TEMPORAIRE (En attendant la base de données)
// Structure : { 'guild_id': { welcomeMessage: '...', inviterTracker: true } }
let serverConfigs = {};

// --- BOT DISCORD ---
const client = new Client({ 
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] 
});

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

app.use(express.static(path.join(__dirname, 'public')));
// 🆕 Indispensable pour lire les données envoyées par le formulaire de sauvegarde
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: 'solo-secret-session-key-v2',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } 
}));

app.use(passport.initialize());
app.use(passport.session());

// --- ROUTES ---

// 1. Accueil
app.get('/', (req, res) => {
    if (req.isAuthenticated()) return res.redirect('/dashboard');
    res.render('dashboard', { user: null, guilds: [], clientId: CLIENT_ID });
});

// 2. Connexion
app.get('/login', passport.authenticate('discord'));

// 3. Callback auth
app.get('/auth', passport.authenticate('discord', { failureRedirect: '/' }), (req, res) => {
    res.redirect('/dashboard');
});

// 4. Dashboard (Lecture)
app.get('/dashboard', (req, res) => {
    if (!req.isAuthenticated()) return res.redirect('/');

    const adminGuilds = req.user.guilds ? req.user.guilds.filter(g => (BigInt(g.permissions) & 0x8n) === 0x8n) : [];
    const selectedGuildId = req.query.guild || null;

    // Récupérer la config du serveur (ou une config par défaut)
    const currentConfig = serverConfigs[selectedGuildId] || { 
        welcomeMessage: 'Bienvenue {user} ! Tu as été invité par {inviter}. Nous sommes maintenant {count} !',
        inviterTracker: true 
    };

    res.render('dashboard', { 
        user: req.user, 
        guilds: adminGuilds, 
        clientId: CLIENT_ID,
        selectedGuildId: selectedGuildId,
        config: currentConfig // 🆕 On envoie la config actuelle au HTML
    });
});

// 🆕 5. SAUVEGARDE (C'est ici que le bouton Sauvegarder envoie les données)
app.post('/api/save-welcome', (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send('Non autorisé');

    const { guildId, welcomeMessage, inviterTracker } = req.body;

    // Vérification de sécurité rapide : l'utilisateur est-il admin de ce serveur ?
    constisAdmin = req.user.guilds.some(g => g.id === guildId && (BigInt(g.permissions) & 0x8n) === 0x8n);
    if (!isAdmin) return res.status(403).send('Interdit');

    // On stocke dans la mémoire temporaire
    serverConfigs[guildId] = {
        welcomeMessage: welcomeMessage,
        inviterTracker: inviterTracker === 'on' // Convertit le switch en booléen
    };

    console.log(`💾 Config sauvegardée pour le serveur ${guildId}`);
    
    // Redirige vers la même page pour "rafraîchir"
    res.redirect(`/dashboard?guild=${guildId}`);
});

// 6. Déconnexion
app.get('/logout', (req, res) => {
    req.logout(() => res.redirect('/'));
});

// Lancement
client.login(process.env.TOKEN);
app.listen(port, () => console.log(`🚀 Dashboard DraftBot-like prêt sur https://solo-invites-tracker.onrender.com`));
