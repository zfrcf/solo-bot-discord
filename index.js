const express = require('express');
const session = require('express-session');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const { Client, GatewayIntentBits, PermissionsBitField } = require('discord.js');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// CONFIGURATION (Vérifie bien ces 2 lignes)
const CLIENT_ID = '1493233483596828692';
const CLIENT_SECRET = 'EEL2dDbDcounOXp1WGgooqJS2a7ppaG6'; 

let serverConfigs = {};

const client = new Client({ 
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages] 
});

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

passport.use(new DiscordStrategy({
    clientID: CLIENT_ID,
    clientSecret: CLIENT_SECRET,
    callbackURL: `https://solo-invites-tracker.onrender.com/auth`,
    scope: ['identify', 'guilds']
}, (accessToken, refreshToken, profile, done) => {
    return done(null, profile);
}));

app.set('view engine', 'ejs');
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// SESSION SIMPLIFIÉE AU MAXIMUM
app.use(session({
    secret: 'keyboard cat',
    resave: true,
    saveUninitialized: true
}));

app.use(passport.initialize());
app.use(passport.session());

// ROUTES
app.get('/', (req, res) => {
    res.render('dashboard', { user: req.user || null, guilds: [], clientId: CLIENT_ID });
});

app.get('/login', passport.authenticate('discord'));

app.get('/auth', passport.authenticate('discord', { failureRedirect: '/' }), (req, res) => {
    res.redirect('/dashboard');
});

app.get('/dashboard', (req, res) => {
    if (!req.user) return res.redirect('/');
    
    // Filtre les serveurs Admin
    const adminGuilds = req.user.guilds.filter(g => (g.permissions & 0x8) === 0x8);
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
    if (!req.user) return res.sendStatus(401);
    const { guildId, welcomeMessage, inviterTracker } = req.body;
    serverConfigs[guildId] = { welcomeMessage, inviterTracker: inviterTracker === 'on' };
    res.redirect(`/dashboard?guild=${guildId}`);
});

client.login(process.env.TOKEN);
app.listen(port, () => console.log('✅ Serveur prêt'));
