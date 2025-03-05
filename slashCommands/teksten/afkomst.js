const { ApplicationCommandType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { embedColor } = require('../../config.json')

module.exports = {
    name: 'afkomst',
    description: "Selecteer je afkomst door op de vlag van je land te klikken",
    type: ApplicationCommandType.ChatInput,
    run: async (client, interaction) => {
        const guild = client.guilds.cache.get(interaction.guildId);

        // Landen en vlag-emoji's (vervang met landrollen in je server)
        const countries = [
            { name: 'Marokko', emoji: '🇲🇦', roleId: '1331986256023912509' },
            { name: 'Nederland', emoji: '🇳🇱', roleId: '1331986451847581850' },
            { name: 'Algerije', emoji: '🇩🇿', roleId: '1331986495338184715' },
            { name: 'Pakistan', emoji: '🇵🇰', roleId: '1331986667934056518' },
            { name: 'Afghanistan', emoji: '🇦🇫', roleId: '1331987576311255101' },
            { name: 'België', emoji: '🇧🇪', roleId: '1331987662956924998' },
            { name: 'Duitsland', emoji: '🇩🇪', roleId: '1331987740849344641' },
            { name: 'Frankrijk', emoji: '🇫🇷', roleId: '1331987818855010344' },
            { name: 'Spanje', emoji: '🇪🇸', roleId: '1331988241762484224' },
            { name: 'Italië', emoji: '🇮🇹', roleId: '1331988287220486184' },
            { name: 'Turkije', emoji: '🇹🇷', roleId: '1331988336939761756' },
            { name: 'Egypte', emoji: '🇪🇬', roleId: '1331988419580264549' },
            { name: 'Saoedi-Arabië', emoji: '🇸🇦', roleId: '1331988503072084093' },
            { name: 'China', emoji: '🇨🇳', roleId: '1331988570491326634' },
            { name: 'Brazilië', emoji: '🇧🇷', roleId: '1331988687361146901' },
            { name: 'Mexico', emoji: '🇲🇽', roleId: '1331988768395104306' },
            { name: 'Verenigde Staten', emoji: '🇺🇸', roleId: '1331988831490146355' },
            { name: 'Vietnam', emoji: '🇻🇳', roleId: '1331988914398953482' },
            { name: 'Polen', emoji: '🇵🇱', roleId: '1331988982913044553' },
            { name: 'Suriname', emoji: '🇸🇷', roleId: '1331989061010722888' },
            { name: 'Curaçao', emoji: '🇨🇼', roleId: '1331989178191184005' },
            { name: 'Indonesië', emoji: '🇮🇩', roleId: '1331989221337989170' },
            { name: 'Filipijnen', emoji: '🇵🇭', roleId: '1331989277051064360' },
            { name: 'Palestina', emoji: '🇵🇸', roleId: '1331989336677417120' }
        ];

        // Speciale landen die geen rol geven, maar een bericht sturen
        const specialLands = [
            { name: 'Koerdistan', emoji: '🏴', message: 'Koerdistan is geen erkend land.' }
        ];

        // Embed voor afkomstselectie
        const embed = new EmbedBuilder()
            .setTitle('Selecteer je afkomst')
            .setDescription('Klik op de vlag van je land om een rol te krijgen. Klik nogmaals om de rol te verwijderen.')
            .setColor(embedColor);

        // Maak knoppen aan voor elk land
        const rows = [];
        let currentRow = new ActionRowBuilder();
        let buttonCount = 0;

        // Voeg eerst normale landen toe
        countries.forEach((country) => {
            if (buttonCount % 5 === 0 && buttonCount !== 0) { // Elke 5 knoppen een nieuwe rij
                rows.push(currentRow);
                currentRow = new ActionRowBuilder();
            }

            currentRow.addComponents(
                new ButtonBuilder()
                    .setCustomId(`country_${country.roleId}`)  // Gebruik rol-ID in CustomId voor identificatie
                    .setEmoji(country.emoji)
                    .setStyle(ButtonStyle.Secondary)
            );
            
            buttonCount++;
        });

        // Voeg speciale landen toe
        specialLands.forEach((specialLand) => {
            if (buttonCount % 5 === 0 && buttonCount !== 0) { // Elke 5 knoppen een nieuwe rij
                rows.push(currentRow);
                currentRow = new ActionRowBuilder();
            }

            currentRow.addComponents(
                new ButtonBuilder()
                    .setCustomId(`special_country_${specialLand.name}`)  // Speciale prefix voor identificatie
                    .setEmoji(specialLand.emoji)
                    .setStyle(ButtonStyle.Danger) // Gebruik een andere stijl voor speciale landen
            );
            
            buttonCount++;
        });

        // Voeg de laatste rij toe
        rows.push(currentRow);

        // Verstuur het embed-bericht met knoppen
        await interaction.channel.send({ embeds: [embed], components: rows, });
    },
};