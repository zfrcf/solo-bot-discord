const express = require('express');
const session = require('express-session');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const { Client, GatewayIntentBits, PermissionsBitField } = require('discord.js');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Tes identifiants vérifiés
const CLIENT_ID = '1493233483596828692';
const CLIENT_SECRET = 'EEL2dDbDcounOXp1WGgooqJS2a7ppaG6';

const client = new Client({ 
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] 
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
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    secret: 'solo-secret-key',
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

// ROUTES SIMPLES
app.get('/', (req, res) => {
    res.render('dashboard', { user: req.user || null, guilds: [], clientId: CLIENT_ID });
});

app.get('/login', passport.authenticate('discord'));

app.get('/auth', passport.authenticate('discord', { failureRedirect: '/' }), (req, res) => {
    res.redirect('/dashboard');
});

app.get('/dashboard', (req, res) => {
    if (!req.user) return res.redirect('/');
    
    // On filtre pour n'avoir que les serveurs où tu es ADMIN
    const adminGuilds = req.user.guilds.filter(g => (BigInt(g.permissions) & 0x8n) === 0x8n);

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

client.login(process.env.TOKEN);
app.listen(port, () => console.log('✅ Serveur stable en ligne'));
