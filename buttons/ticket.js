const { ChannelType, PermissionsBitField, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { embedColor, ticketCategory, ticketRole } = require('../config.json');

module.exports = {
    id: 'create_ticket',
    permissions: [],
    run: async (client, interaction) => {
        const guild = interaction.guild;
        const member = interaction.member;

        const categoryId = ticketCategory;
        const category = guild.channels.cache.get(categoryId);

        // Controleer of de categorie geldig is
        if (!category || category.type !== ChannelType.GuildCategory) {
            return interaction.reply({
                content: 'De ticketcategorie is niet gevonden of is geen geldige categorie. Neem contact op met de serverbeheerder.',
                ephemeral: true,
            });
        }

        // Controleer of de gebruiker al een ticket heeft
        const existingChannel = guild.channels.cache.find(
            (channel) =>
                channel.type === ChannelType.GuildText &&
                channel.parentId === categoryId &&
                channel.topic === `Ticket voor: ${member.id}`
        );

        if (existingChannel) {
            return interaction.reply({
                content: `Je hebt al een ticket: <#${existingChannel.id}>`,
                ephemeral: true,
            });
        }

        // Maak een nieuw ticketkanaal
        try {
            const ticketChannel = await guild.channels.create({
                name: `ticket-${member.user.username}`,
                type: ChannelType.GuildText,
                parent: categoryId,
                topic: `Ticket voor: ${member.id}`,
                permissionOverwrites: [
                    {
                        id: guild.id,
                        deny: [PermissionsBitField.Flags.ViewChannel],
                    },
                    {
                        id: member.id,
                        allow: [
                            PermissionsBitField.Flags.ViewChannel,
                            PermissionsBitField.Flags.SendMessages,
                            PermissionsBitField.Flags.AttachFiles,
                        ],
                    },
                    {
                        id: ticketRole,
                        allow: [
                            PermissionsBitField.Flags.ViewChannel,
                            PermissionsBitField.Flags.SendMessages,
                            PermissionsBitField.Flags.ManageMessages,
                        ],
                    },
                ],
            });

            // Verstuur bericht naar de gebruiker
            await interaction.reply({
                content: `Ticket is aangemaakt en kan je vinden in dit kanaal: <#${ticketChannel.id}>`,
                ephemeral: true,
            });

            // Embed met informatie over het ticket
            const embed = new EmbedBuilder()
                .setAuthor({
                    name: `Ticket van ${member.user.username}`,
                    iconURL: member.user.displayAvatarURL(),
                })
                .setDescription('We gaan je zo snel mogelijk helpen. Een stafflid zal spoedig aanwezig zijn.')
                .setColor(embedColor)
                .setFooter({
                    text: `${guild.name}`,

                })
                .setTimestamp();

            // Knoppenrij met "Ticket Sluiten"
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('close_ticket')
                    .setLabel('Ticket Sluiten')
                    .setStyle(ButtonStyle.Danger)
            );

            // Stuur de embed en knoppen in het ticketkanaal
            await ticketChannel.send({
                embeds: [embed],
                components: [row],
            });
        } catch (error) {
            console.error('Fout bij het aanmaken van een ticketkanaal:', error);
            await interaction.reply({
                content: 'Er ging iets mis bij het aanmaken van je ticket. Probeer het later opnieuw.',
                ephemeral: true,
            });
        }
    },
};
