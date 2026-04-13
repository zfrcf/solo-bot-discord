const express = require('express');
const session = require('express-session');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const { Client, GatewayIntentBits } = require('discord.js');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Force le rendu EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(session({ 
    secret: 'secret', 
    resave: false, 
    saveUninitialized: false 
}));
app.use(passport.initialize());
app.use(passport.session());

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// Route d'accueil ultra-simple pour tester
app.get('/', (req, res) => {
    // On passe des objets vides pour éviter que EJS ne plante sur une variable manquante
    res.render('dashboard', { 
        user: null, 
        guilds: [], 
        botName: "Solo Bot",
        avatar: "",
        bot: client 
    });
});

// Ton URL /auth pour Discord
app.get('/login', passport.authenticate('discord'));
app.get('/auth', passport.authenticate('discord', { failureRedirect: '/' }), (req, res) => {
    res.redirect('/');
});

client.login(process.env.TOKEN);
app.listen(port, () => console.log("Le serveur tourne !"));
