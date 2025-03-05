const { ApplicationCommandType, EmbedBuilder, ApplicationCommandOptionType, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { checkChannel } = require('../../utils/channelCheck');
const { embedColor } = require('../../config.json');

// Bijhouden van actieve drops
const activeDrops = new Map();

module.exports = {
    name: 'drop',
    description: "Drop een bedrag dat andere gebruikers kunnen claimen.",
    type: ApplicationCommandType.ChatInput,
    cooldown: 10000,
    options: [
        {
            name: 'bedrag',
            description: 'Hoeveel geld wil je droppen',
            type: ApplicationCommandOptionType.Integer,
            required: true
        },
        {
            name: 'personen',
            description: 'Maximaal aantal personen dat kan claimen',
            type: ApplicationCommandOptionType.Integer,
            required: true,
            minValue: 1,
            maxValue: 50
        },
        {
            name: 'tijd',
            description: 'Hoeveel seconden is de drop geldig',
            type: ApplicationCommandOptionType.Integer,
            required: true,
            minValue: 5,
            maxValue: 300
        }
    ],
    run: async (client, interaction) => {
        try {
        // Controleer of het commando in het juiste kanaal wordt gebruikt
        // const economyChannelId = process.env.ECONOMY_CHANNEL_ID;
        // if (!(await checkChannel(interaction, economyChannelId))) {
        //     return; // Als niet in het juiste kanaal, stop de uitvoering
        // }

            const gebruiker = interaction.user;
            const bedrag = interaction.options.getInteger('bedrag');
            const maxPersonen = interaction.options.getInteger('personen');
            const tijdInSeconden = interaction.options.getInteger('tijd');
            
            // Controleer of het bedrag positief is
            if (bedrag <= 0) {
                return interaction.reply({
                    content: 'Het bedrag moet positief zijn!',
                    ephemeral: true
                });
            }
            
            // Maak drop informatie aan
            const dropInfo = {
                id: Date.now().toString(),
                creatorId: gebruiker.id,
                guildId: interaction.guild.id,
                amount: bedrag,
                maxClaims: maxPersonen,
                timeoutSeconds: tijdInSeconden,
                claimedBy: [],
                totalClaimed: 0,
                messageId: null,
                ended: false
            };
            
            // Maak drop bericht
            const dropEmbed = new EmbedBuilder()
                .setColor(embedColor)
                .setTitle('💰 Geld Drop! 💰')
                .setDescription(`**${gebruiker.username}** heeft €${bedrag} gedropt!`)
                .addFields(
                    { name: 'Bedrag per persoon', value: `€${bedrag}`, inline: true },
                    { name: 'Claims', value: `0/${maxPersonen}`, inline: true },
                    { name: 'Tijd', value: `${tijdInSeconden} seconden`, inline: true }
                )
                .setFooter({ text: `Klik op de knop om €${bedrag} te claimen!` })
                .setTimestamp();
            
            // Maak claim knop
            const buttonRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`drop_${dropInfo.id}`)
                        .setLabel('💰 Claim!')
                        .setStyle(ButtonStyle.Success)
                );
            
            // Stuur het bericht
            const message = await interaction.reply({
                embeds: [dropEmbed],
                components: [buttonRow],
                fetchReply: true
            });
            
            // Sla het message ID op
            dropInfo.messageId = message.id;
            
            // Sla de drop info op in de actieve drops map
            activeDrops.set(dropInfo.id, dropInfo);
            
            // Progress bar bijwerken interval
            const updateInterval = setInterval(async () => {
                if (dropInfo.ended) {
                    clearInterval(updateInterval);
                    return;
                }
                
                const currentDropInfo = activeDrops.get(dropInfo.id);
                if (!currentDropInfo || currentDropInfo.ended) {
                    clearInterval(updateInterval);
                    return;
                }
                
                // Werk de embed bij met de huidige status
                const updatedEmbed = new EmbedBuilder()
                    .setColor(embedColor)
                    .setTitle('💰 Geld Drop! 💰')
                    .setDescription(`**${gebruiker.username}** heeft €${bedrag} gedropt!`)
                    .addFields(
                        { name: 'Bedrag per persoon', value: `€${bedrag}`, inline: true },
                        { name: 'Claims', value: `${currentDropInfo.claimedBy.length}/${maxPersonen}`, inline: true },
                        { name: 'Tijd', value: `${Math.max(0, tijdInSeconden - Math.floor((Date.now() - parseInt(currentDropInfo.id)) / 1000))} seconden`, inline: true }
                    )
                    .setFooter({ text: `Klik op de knop om €${bedrag} te claimen!` })
                    .setTimestamp();
                
                try {
                    await message.edit({ embeds: [updatedEmbed] });
                } catch (error) {
                    console.error('Fout bij bijwerken drop bericht:', error);
                    clearInterval(updateInterval);
                }
            }, 5000); // Update elke 5 seconden
            
            // Drop laten verlopen na de ingestelde tijd
            setTimeout(async () => {
                const currentDropInfo = activeDrops.get(dropInfo.id);
                if (!currentDropInfo || currentDropInfo.ended) return;
                
                // Markeer de drop als beëindigd
                currentDropInfo.ended = true;
                
                // Werk de UI bij om te tonen dat de drop is afgelopen
                const endedEmbed = new EmbedBuilder()
                    .setColor('#808080') // Grijs
                    .setTitle('💰 Geld Drop Afgelopen! 💰')
                    .setDescription(`**${gebruiker.username}**'s drop van €${bedrag} is afgelopen!`)
                    .addFields(
                        { name: 'Bedrag per persoon', value: `€${bedrag}`, inline: true },
                        { name: 'Geclaimd door', value: `${currentDropInfo.claimedBy.length}/${maxPersonen} personen`, inline: true },
                        { name: 'Totaal uitgegeven', value: `€${currentDropInfo.claimedBy.length * bedrag}`, inline: true }
                    )
                    .setFooter({ text: `Deze drop is verlopen` })
                    .setTimestamp();
                
                const disabledButtonRow = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId(`drop_expired_${currentDropInfo.id}`)
                            .setLabel('❌ Verlopen')
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(true)
                    );
                
                try {
                    await message.edit({
                        embeds: [endedEmbed],
                        components: [disabledButtonRow]
                    });
                } catch (error) {
                    console.error('Fout bij bijwerken drop na timeout:', error);
                }
                
                // Verwijder de drop uit de actieve drops
                activeDrops.delete(dropInfo.id);
            }, tijdInSeconden * 1000);
            
        } catch (error) {
            console.error('Fout bij drop commando:', error);
            return interaction.reply({
                content: 'Er is een fout opgetreden bij het uitvoeren van deze commando. Probeer het later opnieuw.',
                ephemeral: true
            });
        }
    }
};

// Setup een event listener voor button interactions
module.exports.buttonHandler = async (client, interaction) => {
    // Controleer of de interactie een button is en begint met 'drop_'
    if (!interaction.isButton() || !interaction.customId.startsWith('drop_')) return;
    
    try {
        // We use deferReply to acknowledge the interaction right away
        await interaction.deferReply({ ephemeral: true });
        
        // Negeer verlopen knoppen
        if (interaction.customId.startsWith('drop_expired_')) {
            return interaction.editReply({
                content: 'Deze drop is verlopen!',
            });
        }
        
        // Haal drop ID uit de button custom ID
        const dropId = interaction.customId.replace('drop_', '');
        
        // Haal drop info op
        const dropInfo = activeDrops.get(dropId);
        
        // Controleer of drop bestaat
        if (!dropInfo || dropInfo.ended) {
            return interaction.editReply({
                content: 'Deze drop bestaat niet meer of is al afgelopen.',
            });
        }
        
        // Controleer of de gebruiker degene is die de drop heeft gemaakt
        if (interaction.user.id === dropInfo.creatorId) {
            return interaction.editReply({
                content: 'Je kunt niet je eigen drop claimen!',
            });
        }
        
        // Controleer of de gebruiker al heeft geclaimd
        if (dropInfo.claimedBy.includes(interaction.user.id)) {
            return interaction.editReply({
                content: 'Je hebt al geclaimd van deze drop!',
            });
        }
        
        // Controleer of het maximale aantal claims is bereikt
        if (dropInfo.claimedBy.length >= dropInfo.maxClaims) {
            return interaction.editReply({
                content: 'Deze drop is al door het maximale aantal personen geclaimd.',
            });
        }
        
        // Get economy user
        const economyUser = client.eco.cache.users.get({
            memberID: interaction.user.id,
            guildID: interaction.guild.id
        });
        
        if (!economyUser) {
            return interaction.editReply({
                content: 'Je economy profiel kon niet worden geladen. Probeer het later opnieuw.',
            });
        }
        
        // Voeg het geld toe aan de gebruiker (nu het volledige bedrag)
        await economyUser.balance.add(dropInfo.amount, 'Geld geclaimd van drop');
        
        // Update drop info
        dropInfo.claimedBy.push(interaction.user.id);
        dropInfo.totalClaimed += dropInfo.amount;
        
        // Stuur bevestiging
        await interaction.editReply({
            content: `Je hebt €${dropInfo.amount} geclaimd van de drop!`,
        });
        
        // Controleer of het maximale aantal claims is bereikt na deze claim
        if (dropInfo.claimedBy.length >= dropInfo.maxClaims) {
            try {
                // Markeer drop als beëindigd
                dropInfo.ended = true;
                
                // Update UI om te tonen dat de drop is afgelopen
                const message = await interaction.channel.messages.fetch(dropInfo.messageId).catch(console.error);
                
                if (message) {
                    const endedEmbed = new EmbedBuilder()
                        .setColor('#808080') // Grijs
                        .setTitle('💰 Geld Drop Afgelopen! 💰')
                        .setDescription(`De drop van €${dropInfo.amount} is volledig geclaimd!`)
                        .addFields(
                            { name: 'Bedrag per persoon', value: `€${dropInfo.amount}`, inline: true },
                            { name: 'Geclaimd door', value: `${dropInfo.claimedBy.length}/${dropInfo.maxClaims} personen`, inline: true },
                            { name: 'Totaal uitgegeven', value: `€${dropInfo.claimedBy.length * dropInfo.amount}`, inline: true }
                        )
                        .setFooter({ text: `Alle claims zijn verwerkt` })
                        .setTimestamp();
                    
                    const disabledButtonRow = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId(`drop_expired_${dropInfo.id}`)
                                .setLabel('✅ Volledig Geclaimd')
                                .setStyle(ButtonStyle.Secondary)
                                .setDisabled(true)
                        );
                    
                    await message.edit({
                        embeds: [endedEmbed],
                        components: [disabledButtonRow]
                    });
                }
                
                // Verwijder de drop uit de actieve drops
                activeDrops.delete(dropInfo.id);
            } catch (error) {
                console.error('Fout bij afronden drop:', error);
            }
        }
    } catch (error) {
        console.error('Fout bij drop button handler:', error);
        try {
            // Als er nog niet geantwoord is, probeer een antwoord te geven
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: 'Er is een fout opgetreden bij het verwerken van je claim.',
                    ephemeral: true
                });
            } else if (interaction.deferred) {
                // Als er al is gereageerd met deferReply, gebruik editReply
                await interaction.editReply({
                    content: 'Er is een fout opgetreden bij het verwerken van je claim.'
                });
            }
        } catch (responseError) {
            // Als ook het reageren op de fout mislukt, log dit alleen maar
            console.error('Kon niet reageren op interactie na fout:', responseError);
        }
    }
}; 