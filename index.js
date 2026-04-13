const express = require('express');
const session = require('express-session');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const { Client, GatewayIntentBits, PermissionsBitField } = require('discord.js');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// --- CONFIGURATION DISCORD OAUTH2 ---
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

passport.use(new DiscordStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: `https://${process.env.RENDER_EXTERNAL_HOSTNAME}/auth`,
    scope: ['identify', 'guilds']
}, (accessToken, refreshToken, profile, done) => {
    process.nextTick(() => done(null, profile));
}));

// --- CONFIGURATION EXPRESS ---
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(session({ secret: 'solo-bot-ultra-secret', resave: false, saveUninitialized: false }));
app.use(passport.initialize());
app.use(passport.session());

// --- LOGIQUE DU BOT ---
const client = new Client({ 
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] 
});

// --- ROUTES DU SITE ---

// Page d'accueil (Bouton Connexion)
app.get('/', (req, res) => {
    if (req.isAuthenticated()) return res.redirect('/dashboard');
    res.render('dashboard', { user: null, guilds: [], bot: client });
});

// Lien vers Discord pour se connecter
app.get('/login', passport.authenticate('discord'));

// Retour de Discord après connexion
app.get('/auth', passport.authenticate('discord', { failureRedirect: '/' }), (req, res) => {
    res.redirect('/dashboard');
});

// Page principale (Une fois connecté)
app.get('/dashboard', (req, res) => {
    if (!req.isAuthenticated()) return res.redirect('/');
    
    // On filtre les serveurs où l'utilisateur est ADMIN
    const adminGuilds = req.user.guilds.filter(g => {
        const p = new PermissionsBitField(BigInt(g.permissions));
        return p.has(PermissionsBitField.Flags.Administrator);
    });

    res.render('dashboard', { 
        user: req.user, 
        guilds: adminGuilds, 
        bot: client 
    });
});

app.get('/logout', (req, res) => {
    req.logout(() => res.redirect('/'));
});

client.login(process.env.TOKEN);
app.listen(port, () => console.log(`🚀 Dashboard complet sur le port ${port}`));
