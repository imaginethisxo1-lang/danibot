
require('dotenv').config();
const { Client, GatewayIntentBits, Partials, ActionRowBuilder, ButtonBuilder, ButtonStyle, Events } = require('discord.js');
const express = require('express'); // <-- added for keepalive

const heldMessages = new Map();
const MOD_CHANNEL_ID = '1260042560848531537'; // replace with your mod channel ID

// Create Discord client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ],
    partials: [Partials.Message, Partials.Channel],
});

// Keepalive server for Railway free tier
const app = express();
app.get('/', (req, res) => res.send('Bot is alive!'));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Keepalive server running on port ${PORT}`));

// Discord ready event
client.once('ready', () => {
    console.log(`✅ Logged in as ${client.user.tag}`);
});

// Detect messages with links
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    const linkPattern = /(https?:\/\/[^\s]+)/gi;
    if (linkPattern.test(message.content)) {
        try {
            await message.delete();

            const modChannel = message.guild.channels.cache.get(MOD_CHANNEL_ID);
            if (!modChannel) {
                console.log('Mod channel not found. Check MOD_CHANNEL_ID.');
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

            // Save original message info keyed by mod message ID
            heldMessages.set(modMessage.id, {
                author: message.author,
                content: message.content,
                originalChannel: message.channel
            });

            console.log('Storing held message:', modMessage.id, message.content, message.channel.id);

            await message.author.send(
                `Your message with a link in **${message.guild.name}** was held for moderation. A moderator will review it soon.`
            );
        } catch (err) {
            console.error('Error handling message:', err);
        }
    }
});

// Handle button clicks
client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isButton()) return;

    const held = heldMessages.get(interaction.message.id);
    if (!held) {
        await interaction.reply({ content: 'This message is no longer available.', ephemeral: true });
        return;
    }

    if (interaction.customId === 'approve') {
        await held.originalChannel.send(`🔗 Message from ${held.author.tag}: ${held.content}`);
        await interaction.update({ content: '✅ Link approved and posted in original channel.', components: [] });
        heldMessages.delete(interaction.message.id);
    } else if (interaction.customId === 'deny') {
        await interaction.update({ content: '❌ Link denied.', components: [] });
        heldMessages.delete(interaction.message.id);
    }
});

// Login
client.login(process.env.DISCORD_TOKEN);
