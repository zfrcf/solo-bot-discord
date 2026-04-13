const express = require('express');
const { Client, GatewayIntentBits } = require('discord.js');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Configuration pour lire les formulaires HTML
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true })); 

const client = new Client({ 
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] 
});

// Variables que l'on pourra modifier depuis le Dashboard
let botSettings = {
    welcomeMessage: "Bienvenue sur le serveur !",
    logChannel: "general"
};

// Route pour afficher le Dashboard
app.get('/', (req, res) => {
    // Calcul des statistiques en direct
    const serverCount = client.guilds.cache.size;
    const memberCount = client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);

    res.render('dashboard', {
        botName: client.user ? client.user.username : 'Solo-Bot',
        avatar: client.user ? client.user.displayAvatarURL() : 'https://cdn.discordapp.com/embed/avatars/0.png',
        servers: serverCount,
        members: memberCount,
        status: client.ws.status === 0 ? 'Connecté' : 'Déconnecté',
        settings: botSettings
    });
});

// Route pour sauvegarder les réglages du Dashboard
app.post('/save-settings', (req, res) => {
    botSettings.welcomeMessage = req.body.welcomeMessage;
    botSettings.logChannel = req.body.logChannel;
    
    console.log("🛠️ Nouveaux paramètres sauvegardés via le Dashboard !");
    // On redirige vers l'accueil après la sauvegarde
    res.redirect('/'); 
});

client.once('ready', () => {
    console.log(`✅ ${client.user.tag} est prêt !`);
});

client.login(process.env.TOKEN);

app.listen(port, () => {
    console.log(`🚀 Dashboard en ligne sur le port ${port}`);
});
