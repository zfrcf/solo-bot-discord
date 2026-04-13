const { Client, GatewayIntentBits, Collection, REST, Routes, SlashCommandBuilder } = require('discord.js');

// On vérifie si le token existe dans l'environnement
if (!process.env.TOKEN) {
    console.error("❌ ERREUR : La variable d'environnement 'TOKEN' est manquante sur Render !");
    process.exit(1);
}

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildInvites
    ]
});

const invitesCache = new Map();

client.once('ready', async () => {
    console.log(`✅ Solo-Bot est en ligne : ${client.user.tag}`);

    const commands = [
        new SlashCommandBuilder()
            .setName('invite')
            .setDescription('Génère ton lien unique.')
    ].map(command => command.toJSON());

    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

    try {
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
        console.log('✅ Commandes slash enregistrées.');
    } catch (error) {
        console.error('❌ Erreur enregistrement commandes:', error);
    }

    // Charger les invites au démarrage
    for (const [id, guild] of client.guilds.cache) {
        const firstInvites = await guild.invites.fetch();
        invitesCache.set(guild.id, new Collection(firstInvites.map((inv) => [inv.code, inv.uses])));
    }
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'invite') {
        const invite = await interaction.channel.createInvite({
            maxAge: 0,
            unique: true,
            reason: `Lien pour ${interaction.user.tag}`
        });

        await interaction.reply({
            content: `Ton lien unique : ${invite.url}`,
            ephemeral: true
        });
    }
});

client.on('guildMemberAdd', async (member) => {
    try {
        const newInvites = await member.guild.invites.fetch();
        const oldInvites = invitesCache.get(member.guild.id);
        const inviteUsed = newInvites.find(inv => inv.uses > (oldInvites.get(inv.code) || 0));

        if (inviteUsed) {
            console.log(`New member: ${member.user.tag} invited by ${inviteUsed.inviter.tag}`);
        }
        invitesCache.set(member.guild.id, new Collection(newInvites.map((inv) => [inv.code, inv.uses])));
    } catch (e) {
        console.error("Erreur lors du suivi d'invitation:", e);
    }
});

client.login(process.env.TOKEN);
