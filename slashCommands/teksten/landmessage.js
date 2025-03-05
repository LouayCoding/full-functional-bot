const { ApplicationCommandType, EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const Land = require('../../models/Land');
const { embedColor } = require('../../config.json');
const { getLandenLijst } = require('../../utils/landRollen');

// Bouw de slash command met alle landen als opties
const builder = new SlashCommandBuilder()
    .setName('landmessage')
    .setDescription('Stuur een bericht naar alle gebruikers met een specifieke land-rol')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addStringOption(option =>
        option.setName('land')
            .setDescription('Kies het land waarnaar je een bericht wilt sturen')
            .setRequired(true)
            .setAutocomplete(true)
    )
    .addStringOption(option =>
        option.setName('bericht')
            .setDescription('Het bericht dat je wilt versturen')
            .setRequired(true)
    )
    .addBooleanOption(option =>
        option.setName('embed')
            .setDescription('Bericht als embed versturen?')
            .setRequired(false)
    );

module.exports = {
    ...builder.toJSON(),
    type: ApplicationCommandType.ChatInput,
    
    async autocomplete(interaction) {
        const focusedValue = interaction.options.getFocused().toLowerCase();
        const { countries, specialLands } = getLandenLijst();
        
        // Combineer normale en speciale landen voor autocomplete
        const allLands = [...countries, ...specialLands];
        
        // Filter landen op basis van de ingevoerde tekst
        const filtered = allLands.filter(country => 
            country.name.toLowerCase().includes(focusedValue)
        ).slice(0, 25); // Discord staat max 25 opties toe
        
        // Stuur de gefilterde landen terug
        await interaction.respond(
            filtered.map(country => ({
                name: `${country.emoji} ${country.name}`,
                value: country.name
            }))
        );
    },
    
    run: async (client, interaction) => {
        await interaction.deferReply({ ephemeral: true });
        
        try {
            const landNaam = interaction.options.getString('land');
            const bericht = interaction.options.getString('bericht');
            const useEmbed = interaction.options.getBoolean('embed') || false;
            
            // Zoek het land in de database
            let landRecord = await Land.findOne({ name: landNaam });
            
            // Als het land niet in de database is, zoek het in de landenlijst
            if (!landRecord) {
                const { countries, specialLands } = getLandenLijst();
                
                // Zoek eerst in normale landen
                const country = countries.find(c => c.name.toLowerCase() === landNaam.toLowerCase());
                
                if (country) {
                    // Haal de rol op uit de server
                    const role = await interaction.guild.roles.fetch(country.roleId).catch(() => null);
                    
                    if (!role) {
                        return interaction.editReply(`❌ De rol voor "${landNaam}" bestaat niet in deze server. Voer eerst \`/synclanden\` uit om deze aan te maken.`);
                    }
                    
                    // Maak het land aan in de database
                    landRecord = await Land.create({
                        name: country.name,
                        emoji: country.emoji,
                        roleId: country.roleId,
                        special: false
                    });
                } else {
                    // Zoek in speciale landen
                    const specialLand = specialLands.find(c => c.name.toLowerCase() === landNaam.toLowerCase());
                    
                    if (specialLand) {
                        // Voor speciale landen zoals Koerdistan, stuur een bericht dat het geen erkend land is
                        return interaction.editReply({
                            content: `⚠️ ${specialLand.message || `${specialLand.name} is een speciaal geval en heeft geen rol in de server.`}`,
                            ephemeral: true
                        });
                    } else {
                        return interaction.editReply(`❌ Land "${landNaam}" niet gevonden. Gebruik de autoaanvulling om een geldig land te selecteren.`);
                    }
                }
            }
            
            // Controleer of het een speciaal land is
            if (landRecord.special || landRecord.roleId === 'special') {
                return interaction.editReply({
                    content: `⚠️ ${landRecord.message || `${landRecord.name} is geen erkend land en heeft geen rol in de server.`}`,
                    ephemeral: true
                });
            }
            
            // Haal de rol op uit de server
            const role = await interaction.guild.roles.fetch(landRecord.roleId).catch(() => null);
            
            if (!role) {
                return interaction.editReply(`❌ De rol voor "${landNaam}" (ID: ${landRecord.roleId}) kan niet worden gevonden in deze server. Voer \`/synclanden\` uit om rollen te synchroniseren.`);
            }
            
            // Bouw het bericht
            let messageOptions = {};
            
            if (useEmbed) {
                const embed = new EmbedBuilder()
                    .setTitle(`Bericht voor ${landRecord.emoji} ${landRecord.name}`)
                    .setDescription(bericht)
                    .setColor(embedColor)
                    .setTimestamp();
                    
                messageOptions.embeds = [embed];
            } else {
                messageOptions.content = `**Bericht voor ${landRecord.emoji} ${landRecord.name}:**\n\n${bericht}`;
            }
            
            // Voeg de mention toe aan het bericht
            messageOptions.content = (messageOptions.content || '') + `\n<@&${role.id}>`;
            
            // Stuur het bericht
            const channel = interaction.channel;
            await channel.send(messageOptions);
            
            // Stuur een bevestigingsbericht
            await interaction.editReply(`✅ Bericht succesvol verstuurd naar ${landRecord.emoji} ${landRecord.name} (${role.members.size} leden).`);
            
        } catch (error) {
            console.error('Fout bij versturen van landbericht:', error);
            await interaction.editReply(`❌ Er is een fout opgetreden: ${error.message}`);
        }
    }
}; 