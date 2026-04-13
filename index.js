const express = require('express');
const session = require('express-session');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const { Client, GatewayIntentBits } = require('discord.js');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Identifiants
const CLIENT_ID = '1493233483596828692';
const CLIENT_SECRET = 'EEL2dDbDcounOXp1WGgooqJS2a7ppaG6';

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

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
app.use(express.static(path.join(__dirname, 'public')));

// Configuration Session Ultra-Stable
app.use(session({
    secret: 'solo-bot-stable-key',
    resave: true,
    saveUninitialized: true
}));

app.use(passport.initialize());
app.use(passport.session());

// Routes
app.get('/', (req, res) => {
    res.render('dashboard', { user: req.user || null, guilds: [], clientId: CLIENT_ID });
});

app.get('/login', passport.authenticate('discord'));

app.get('/auth', passport.authenticate('discord', { failureRedirect: '/' }), (req, res) => {
    res.redirect('/dashboard');
});

app.get('/dashboard', (req, res) => {
    if (!req.user) return res.redirect('/');
    
    // Filtre Admin (0x8)
    const adminGuilds = req.user.guilds.filter(g => (g.permissions & 0x8) === 0x8);

    res.render('dashboard', { 
        user: req.user, 
        guilds: adminGuilds, 
        clientId: CLIENT_ID
    });
});

app.get('/logout', (req, res) => {
    req.logout(() => res.redirect('/'));
});

client.login(process.env.TOKEN).catch(() => console.log("Token invalide"));
app.listen(port, () => console.log('🚀 Connexion OK sur le port ' + port));
