const express = require('express');
const session = require('express-session');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const { Client, GatewayIntentBits } = require('discord.js');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// CONFIGURATION OAUTH2
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

passport.use(new DiscordStrategy({
    clientID: process.env.CLIENT_ID || '1493233483596828692',
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: `https://solo-invites-tracker.onrender.com/auth`,
    scope: ['identify', 'guilds']
}, (accessToken, refreshToken, profile, done) => {
    process.nextTick(() => done(null, profile));
}));

// CONFIGURATION EXPRESS & EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views')); // Force le chemin du dossier
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({ 
    secret: 'secret-key-solo-bot', 
    resave: false, 
    saveUninitialized: false 
}));
app.use(passport.initialize());
app.use(passport.session());

// CONFIGURATION DU BOT
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// ROUTES
app.get('/', (req, res) => {
    res.render('dashboard', { user: req.user || null, guilds: [], bot: client });
});

app.get('/login', passport.authenticate('discord'));

app.get('/auth', passport.authenticate('discord', { failureRedirect: '/' }), (req, res) => {
    res.redirect('/dashboard');
});

app.get('/dashboard', (req, res) => {
    if (!req.isAuthenticated()) return res.redirect('/');
    // Filtrer les serveurs où l'utilisateur est admin
    const adminGuilds = req.user.guilds ? req.user.guilds.filter(g => (g.permissions & 0x8) === 0x8) : [];
    res.render('dashboard', { user: req.user, guilds: adminGuilds, bot: client });
});

app.get('/logout', (req, res) => {
    req.logout(() => res.redirect('/'));
});

client.login(process.env.TOKEN);
app.listen(port, () => console.log(`🚀 Serveur actif sur le port ${port}`));
