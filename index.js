const express = require('express');
const session = require('express-session');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Tes identifiants sont maintenant intégrés (mais utilise les variables d'environnement sur Render !)
const CLIENT_ID = process.env.CLIENT_ID || '1493233483596828692';
const CLIENT_SECRET = process.env.CLIENT_SECRET || 'TX2NdVV2f1mdjFsbxwHqaKYyms501aWg';

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

passport.use(new DiscordStrategy({
    clientID: CLIENT_ID,
    clientSecret: CLIENT_SECRET,
    // On utilise /auth ici comme demandé
    callbackURL: `https://${process.env.RENDER_EXTERNAL_HOSTNAME}/auth`,
    scope: ['identify', 'guilds']
}, (accessToken, refreshToken, profile, done) => {
    process.nextTick(() => done(null, profile));
}));

app.set('view engine', 'ejs');
app.use(session({ secret: 'solo-bot-secret-key', resave: false, saveUninitialized: false }));
app.use(passport.initialize());
app.use(passport.session());
app.use(express.urlencoded({ extended: true }));

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildInvites]
});

// --- ROUTES ---

app.get('/', (req, res) => {
    if (req.isAuthenticated()) return res.redirect('/dashboard');
    res.render('dashboard', { user: null, bot: client });
});

// Route de connexion modifiée en /login -> /auth
app.get('/login', passport.authenticate('discord'));

app.get('/auth', passport.authenticate('discord', { failureRedirect: '/' }), (req, res) => {
    res.redirect('/dashboard');
});

app.get('/logout', (req, res) => {
    req.logout(() => res.redirect('/'));
});

app.get('/dashboard', (req, res) => {
    if (!req.isAuthenticated()) return res.redirect('/');
    const adminGuilds = req.user.guilds.filter(g => (g.permissions & 0x8) === 0x8);
    res.render('dashboard', { user: req.user, guilds: adminGuilds, bot: client });
});

client.login(process.env.TOKEN);
app.listen(port, () => console.log(`🚀 Dashboard en ligne`));
