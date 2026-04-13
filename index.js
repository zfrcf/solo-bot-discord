const express = require('express');
const session = require('express-session');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const { Client, GatewayIntentBits, PermissionsBitField } = require('discord.js');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Variables importantes
const CLIENT_ID = process.env.CLIENT_ID || '1493233483596828692';
const CLIENT_SECRET = process.env.CLIENT_SECRET;

// --- CONFIGURATION DU BOT DISCORD ---
const client = new Client({ 
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] 
});

client.once('ready', () => {
    console.log(`🤖 Bot connecté en tant que ${client.user.tag}`);
});

// --- CONFIGURATION EXPRESS & SESSION ---
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Indispensable sur Render pour que la session fonctionne
app.set('trust proxy', 1); 

app.use(session({ 
    secret: 'super-secret-solo-bot-key', 
    resave: false, 
    saveUninitialized: false,
    cookie: { secure: false } // Mettre à true si HTTPS forcé, false est plus sûr pour les tests
}));

app.use(passport.initialize());
app.use(passport.session());

// --- CONFIGURATION OAUTH2 ---
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

passport.use(new DiscordStrategy({
    clientID: CLIENT_ID,
    clientSecret: CLIENT_SECRET,
    callbackURL: `https://solo-invites-tracker.onrender.com/auth`,
    scope: ['identify', 'guilds']
}, (accessToken, refreshToken, profile, done) => {
    process.nextTick(() => done(null, profile));
}));

// --- ROUTES DU SITE ---

// 1. Page d'accueil
app.get('/', (req, res) => {
    // Si déjà connecté, on l'envoie direct au dashboard
    if (req.isAuthenticated()) return res.redirect('/dashboard');
    
    res.render('dashboard', { 
        user: null, 
        guilds: [], 
        clientId: CLIENT_ID 
    });
});

// 2. Connexion
app.get('/login', passport.authenticate('discord'));

// 3. Retour de Discord (Le fameux /auth)
app.get('/auth', passport.authenticate('discord', { failureRedirect: '/' }), (req, res) => {
    res.redirect('/dashboard');
});

// 4. Le Dashboard
app.get('/dashboard', (req, res) => {
    // Si pas connecté, on le jette à l'accueil
    if (!req.isAuthenticated()) return res.redirect('/');
    
    // On ne garde que les serveurs où l'utilisateur est Admin
    const adminGuilds = req.user.guilds.filter(g => {
        const p = new PermissionsBitField(BigInt(g.permissions));
        return p.has(PermissionsBitField.Flags.Administrator);
    });

    // On regarde si un serveur précis a été cliqué (ex: /dashboard?guild=123)
    const selectedGuildId = req.query.guild || null;

    res.render('dashboard', { 
        user: req.user, 
        guilds: adminGuilds, 
        clientId: CLIENT_ID,
        selectedGuildId: selectedGuildId
    });
});

// 5. Déconnexion
app.get('/logout', (req, res) => {
    req.logout(() => res.redirect('/'));
});

// Lancement du bot et du site
client.login(process.env.TOKEN).catch(console.error);
app.listen(port, () => console.log(`🚀 Site en ligne sur le port ${port}`));
