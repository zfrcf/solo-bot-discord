const express = require('express');
const session = require('express-session');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const { Client, GatewayIntentBits, Collection, REST, Routes, SlashCommandBuilder } = require('discord.js');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// --- CONFIGURATION OAUTH2 (Passport) ---
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

passport.use(new DiscordStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: `https://${process.env.RENDER_EXTERNAL_HOSTNAME}/callback`, // S'adapte automatiquement sur Render
    scope: ['identify', 'guilds']
}, (accessToken, refreshToken, profile, done) => {
    process.nextTick(() => done(null, profile));
}));

app.set('view engine', 'ejs');
app.use(session({ secret: 'keyboard cat', resave: false, saveUninitialized: false }));
app.use(passport.initialize());
app.use(passport.session());
app.use(express.urlencoded({ extended: true }));

// --- CONFIGURATION DU BOT ---
const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildInvites]
});

// Cache pour les invitations
const invitesCache = new Map();

client.once('ready', async () => {
    console.log(`✅ Solo-Bot est prêt : ${client.user.tag}`);
    // Refresh des invites au démarrage
    client.guilds.cache.forEach(async (guild) => {
        const firstInvites = await guild.invites.fetch().catch(() => new Collection());
        invitesCache.set(guild.id, new Collection(firstInvites.map(i => [i.code, i.uses])));
    });
});

// --- ROUTES DU DASHBOARD ---

// Accueil (Login)
app.get('/', (req, res) => {
    if (req.isAuthenticated()) return res.redirect('/dashboard');
    res.render('dashboard', { user: null, bot: client });
});

// Connexion
app.get('/login', passport.authenticate('discord'));
app.get('/callback', passport.authenticate('discord', { failureRedirect: '/' }), (req, res) => {
    res.redirect('/dashboard');
});
app.get('/logout', (req, res) => {
    req.logout(() => res.redirect('/'));
});

// Dashboard (Une fois connecté)
app.get('/dashboard', (req, res) => {
    if (!req.isAuthenticated()) return res.redirect('/');
    
    // On ne garde que les serveurs où l'utilisateur est ADMIN
    const adminGuilds = req.user.guilds.filter(g => (g.permissions & 0x8) === 0x8);
    
    res.render('dashboard', { 
        user: req.user, 
        guilds: adminGuilds,
        bot: client
    });
});

client.login(process.env.TOKEN);
app.listen(port, () => console.log(`🚀 Site sur le port ${port}`));
