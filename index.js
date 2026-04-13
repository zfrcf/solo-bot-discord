const express = require('express');
const session = require('express-session');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const { Client, GatewayIntentBits, PermissionsBitField } = require('discord.js');
const path = require('path');

// --- INITIALISATION ---
const app = express();
const port = process.env.PORT || 3000;

// Variables de configuration
const CLIENT_ID = process.env.CLIENT_ID || '1493233483596828692';
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const CALLBACK_URL = `https://solo-invites-tracker.onrender.com/auth`;

// --- CONFIGURATION DU BOT ---
const client = new Client({ 
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] 
});

client.on('ready', () => {
    console.log(`✅ Bot Discord actif : ${client.user.tag}`);
});

// --- CONFIGURATION PASSPORT (OAUTH2) ---
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

passport.use(new DiscordStrategy({
    clientID: CLIENT_ID,
    clientSecret: CLIENT_SECRET,
    callbackURL: CALLBACK_URL,
    scope: ['identify', 'guilds']
}, (accessToken, refreshToken, profile, done) => {
    // On garde les infos Discord dans la session
    process.nextTick(() => done(null, profile));
}));

// --- MIDDLEWARES EXPRESS ---
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('trust proxy', 1); // Crucial pour Render

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: 'solo-bot-ultra-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } // False car Render gère le SSL en amont
}));

app.use(passport.initialize());
app.use(passport.session());

// --- ROUTES ---

// 1. Accueil : Si connecté -> Dashboard, sinon -> Page de présentation
app.get('/', (req, res) => {
    if (req.isAuthenticated()) return res.redirect('/dashboard');
    res.render('dashboard', { user: null, guilds: [], clientId: CLIENT_ID });
});

// 2. Connexion : Envoie l'utilisateur vers Discord
app.get('/login', passport.authenticate('discord'));

// 3. Callback : Là où Discord renvoie avec le ?code=
app.get('/auth', (req, res, next) => {
    console.log("🔄 Tentative d'authentification reçue de Discord...");
    next();
}, passport.authenticate('discord', { 
    failureRedirect: '/', 
    successRedirect: '/dashboard' 
}));

// 4. Dashboard : Page protégée
app.get('/dashboard', (req, res) => {
    if (!req.isAuthenticated()) {
        console.log("⚠️ Accès refusé : utilisateur non connecté.");
        return res.redirect('/');
    }

    // On récupère les serveurs où l'utilisateur est ADMIN
    const adminGuilds = req.user.guilds ? req.user.guilds.filter(g => {
        const p = new PermissionsBitField(BigInt(g.permissions));
        return p.has(PermissionsBitField.Flags.Administrator);
    }) : [];

    res.render('dashboard', { 
        user: req.user, 
        guilds: adminGuilds, 
        clientId: CLIENT_ID,
        selectedGuildId: req.query.guild || null
    });
});

// 5. Déconnexion
app.get('/logout', (req, res) => {
    req.logout(() => {
        res.redirect('/');
    });
});

// --- DÉMARRAGE ---
client.login(process.env.TOKEN).catch(err => console.error("❌ Erreur Token Bot:", err));

app.listen(port, () => {
    console.log(`🚀 Serveur Web démarré sur : https://solo-invites-tracker.onrender.com`);
});
