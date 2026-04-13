const express = require('express');
const { Client, GatewayIntentBits, Collection, REST, Routes, SlashCommandBuilder } = require('discord.js');

// --- CONFIGURATION DU SERVEUR WEB (Pour Render) ---
const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('<h1>✅ Solo-Bot est en ligne !</h1><p>Le bot et le dashboard fonctionnent.</p>');
});

app.listen(port, () => {
    console.log(`✅ Serveur web actif sur le port ${port}`);
});

// --- CONFIGURATION DU BOT DISCORD ---
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildInvites
    ]
});

const invitesCache = new Map();

client.once('ready', async () => {
    console.log(`✅ Connecté en tant que ${client.user.tag}`);

    // Enregistrement de la commande /invite
    const commands = [
        new SlashCommandBuilder()
            .setName('invite')
            .setDescription('Génère un lien d\'invitation unique.')
    ].map(command => command.toJSON());

    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

    try {
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
        console.log('✅ Commande /invite enregistrée.');
    } catch (error) {
        console.error('❌ Erreur slash commands:', error);
    }

    // Charger les invitations existantes au démarrage
    client.guilds.cache.forEach(async (guild) => {
        try {
            const firstInvites = await guild.invites.fetch();
            invitesCache.set(guild.id, new Collection(firstInvites.map((inv) => [inv.code, inv.uses])));
        } catch (err) {
            console.log(`Impossible de lire les invites pour ${guild.name}`);
        }
    });
});

// Logique de la commande /invite
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'invite') {
        const invite = await interaction.channel.createInvite({
            maxAge: 0,
            unique: true,
            reason: `Lien pour ${interaction.user.tag}`
        });

        await interaction.reply({
            content: `Voici ton lien unique : ${invite.url}\nPartage-le pour que je puisse compter tes invitations !`,
            ephemeral: true
        });
    }
});

// Détection des nouveaux membres et de l'inviteur
client.on('guildMemberAdd', async (member) => {
    try {
        const newInvites = await member.guild.invites.fetch();
        const oldInvites = invitesCache.get(member.guild.id);
        
        const inviteUsed = newInvites.find(inv => inv.uses > (oldInvites.get(inv.code) || 0));

        if (inviteUsed) {
            console.log(`👤 ${member.user.tag} a rejoint ! Invité par : ${inviteUsed.inviter.tag}`);
        }

        // Mise à jour du cache
        invitesCache.set(member.guild.id, new Collection(newInvites.map((inv) => [inv.code, inv.uses])));
    } catch (e) {
        console.error("Erreur suivi membre :", e);
    }
});

client.login(process.env.TOKEN);
