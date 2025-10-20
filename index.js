
require('dotenv').config();
const {
    Client,
    GatewayIntentBits,
    Partials,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    Events,
    PermissionsBitField
} = require('discord.js');

const heldMessages = new Map();
const MOD_CHANNEL_ID = '1260042560848531537'; // Replace with your mod channel ID

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ],
    partials: [Partials.Message, Partials.Channel],
});

client.once('ready', () => {
    console.log(`✅ Logged in as ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    // 🚫 Ignore users with Administrator permissions
    if (message.member?.permissions.has(PermissionsBitField.Flags.Administrator)) {
        console.log(`Skipping admin message from ${message.author.tag}`);
        return;
    }

    const linkPattern = /(https?:\/\/[^\s]+)/gi;

    if (linkPattern.test(message.content)) {
        const lowerContent = message.content.toLowerCase();

        // 🚫 Ignore GIF links
        if (
            lowerContent.endsWith('.gif') ||
            lowerContent.includes('tenor.com') ||
            lowerContent.includes('giphy.com')
        ) {
            console.log(`Skipping GIF link from ${message.author.tag}`);
            return;
        }

        try {
            await message.delete();

            const modChannel = message.guild.channels.cache.get(MOD_CHANNEL_ID);
            if (!modChannel) {
                console.log('❌ Mod channel not found. Check MOD_CHANNEL_ID.');
                return;
            }

            // Create approve/deny buttons
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('approve')
                    .setLabel('✅ Approve')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('deny')
                    .setLabel('❌ Deny')
                    .setStyle(ButtonStyle.Danger)
            );

            const modMessage = await modChannel.send({
                content: `🔗 **Link from ${message.author.tag}** in <#${message.channel.id}>:\n${message.content}`,
                components: [row],
            });

            // Save the held message
            heldMessages.set(modMessage.id, {
                author: message.author,
                content: message.content,
                originalChannel: message.channel
            });

            console.log(
                `🕒 Holding message from ${message.author.tag} for approval.`
            );

            await message.author.send(
                `Your message with a link in **${message.guild.name}** was held for moderation. A moderator will review it soon.`
            );
        } catch (err) {
            console.error('⚠️ Error handling message:', err);
        }
    }
});

client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isButton()) return;

    const held = heldMessages.get(interaction.message.id);
    if (!held) {
        await interaction.reply({
            content: 'This message is no longer available.',
            ephemeral: true
        });
        return;
    }

    if (interaction.customId === 'approve') {
        await held.originalChannel.send(`🔗 Message from ${held.author.tag}: ${held.content}`);
        await interaction.update({
            content: '✅ Link approved and posted in original channel.',
            components: []
        });
        heldMessages.delete(interaction.message.id);
    } else if (interaction.customId === 'deny') {
        await interaction.update({ content: '❌ Link denied.', components: [] });
        heldMessages.delete(interaction.message.id);
    }
});

client.login(process.env.DISCORD_TOKEN);

// Keep bot awake on Replit
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Bot is running! 👑');
});

app.listen(PORT, () => {
  console.log(`🌐 Web server is listening on port ${PORT}`);
});
