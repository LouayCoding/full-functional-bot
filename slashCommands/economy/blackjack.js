const { ApplicationCommandType, EmbedBuilder, ApplicationCommandOptionType, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { checkChannel } = require('../../utils/channelCheck');
const { embedColor } = require('../../config.json');

// Kaarten configuratie
const suits = ['♥', '♦', '♠', '♣'];
const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

// Actieve games bijhouden
const activeGames = new Map();

module.exports = {
    name: 'blackjack',
    description: "Speel een potje blackjack tegen de dealer.",
    type: ApplicationCommandType.ChatInput,
    cooldown: 5000,
    options: [
        {
            name: 'inzet',
            description: 'Het bedrag dat je wilt inzetten',
            type: ApplicationCommandOptionType.Integer,
            required: true
        }
    ],
    run: async (client, interaction) => {
        try {
        // Controleer of het commando in het juiste kanaal wordt gebruikt
        const economyChannelId = process.env.ECONOMY_CHANNEL_ID;
        if (!(await checkChannel(interaction, economyChannelId))) {
            return; // Als niet in het juiste kanaal, stop de uitvoering
        }

            const gebruiker = interaction.user;
            const inzet = interaction.options.getInteger('inzet');
            
            // Controleer of de inzet positief is
            if (inzet <= 0) {
                return interaction.reply({
                    content: 'Je inzet moet een positief getal zijn!',
                    ephemeral: true
                });
            }
            
            // Controleer of er al een actief spel is voor deze gebruiker
            if (activeGames.has(gebruiker.id)) {
                return interaction.reply({
                    content: 'Je hebt al een actief blackjack spel. Maak dat eerst af!',
                    ephemeral: true
                });
            }
            
            // Haal gebruiker op uit economy systeem
            const economyUser = client.eco.cache.users.get({
                memberID: gebruiker.id,
                guildID: interaction.guild.id
            });
            
            if (!economyUser) {
                return interaction.reply({
                    content: 'Je economy profiel kon niet worden geladen. Probeer het later opnieuw.',
                    ephemeral: true
                });
            }
            
            // Controleer of gebruiker genoeg geld heeft
            const userBalance = await economyUser.balance.get();
            
            if (userBalance < inzet) {
                return interaction.reply({
                    content: `Je hebt niet genoeg geld! Je huidige saldo is €${userBalance}.`,
                    ephemeral: true
                });
            }
            
            // Maak een nieuw spel aan
            const gameState = {
                inzet: inzet,
                deck: createShuffledDeck(),
                playerHand: [],
                dealerHand: [],
                gameOver: false,
                result: null,
                canDoubleDown: true,
                canSplit: false,
                economyUser: economyUser,
                userBalance: userBalance
            };
            
            // Deal initiële kaarten
            gameState.playerHand.push(drawCard(gameState.deck));
            gameState.dealerHand.push(drawCard(gameState.deck));
            gameState.playerHand.push(drawCard(gameState.deck));
            gameState.dealerHand.push(drawCard(gameState.deck));
            
            // Controleer of split mogelijk is
            if (getCardValue(gameState.playerHand[0]) === getCardValue(gameState.playerHand[1])) {
                gameState.canSplit = true;
            }
            
            // Sla het spel op
            activeGames.set(gebruiker.id, gameState);
            
            // Maak knoppen
            const buttons = createGameButtons(gameState);
            
            // Maak en stuur het bericht
            const embed = createGameEmbed(gameState, gebruiker, false);
            
            await interaction.reply({ 
                embeds: [embed],
                components: [buttons],
                fetchReply: true 
            });
            
            // Maak collector voor button interacties
            const message = await interaction.fetchReply();
            const collector = message.createMessageComponentCollector({ 
                time: 60000 // 1 minuut timeout
            });
            
            collector.on('collect', async i => {
                // Controleer of het de juiste gebruiker is
                if (i.user.id !== gebruiker.id) {
                    return i.reply({ 
                        content: 'Dit is niet jouw blackjack spel!', 
                        ephemeral: true 
                    });
                }
                
                const gameState = activeGames.get(gebruiker.id);
                if (!gameState) {
                    return i.reply({ 
                        content: 'Dit spel is verlopen of bestaat niet meer.', 
                        ephemeral: true 
                    });
                }
                
                // Verwerk de actie op basis van de knop
                if (i.customId === 'hit') {
                    handleHit(gameState, gebruiker, i);
                } else if (i.customId === 'stand') {
                    await handleStand(client, gameState, gebruiker, i);
                } else if (i.customId === 'doubledown') {
                    await handleDoubleDown(client, gameState, gebruiker, i);
                } else if (i.customId === 'split') {
                    await i.reply({ 
                        content: 'Split functionaliteit is momenteel niet beschikbaar.', 
                        ephemeral: true 
                    });
                }
                
                // Als het spel voorbij is, stop de collector
                if (gameState.gameOver) {
                    collector.stop();
                    activeGames.delete(gebruiker.id);
                }
            });
            
            collector.on('end', () => {
                // Als het spel automatisch eindigt vanwege timeout
                if (activeGames.has(gebruiker.id)) {
                    const gameState = activeGames.get(gebruiker.id);
                    if (!gameState.gameOver) {
                        // Automatisch stand als de tijd verloopt
                        handleAutoStand(client, gameState, gebruiker, interaction);
                        activeGames.delete(gebruiker.id);
                    }
                }
            });
            
        } catch (error) {
            console.error('Fout bij blackjack commando:', error);
            return interaction.reply({
                content: 'Er is een fout opgetreden bij het uitvoeren van deze commando. Probeer het later opnieuw.',
                ephemeral: true
            });
        }
    }
};

// Hulpfuncties
function createShuffledDeck() {
    const deck = [];
    for (const suit of suits) {
        for (const value of values) {
            deck.push({ suit, value });
        }
    }
    
    // Fisher-Yates shuffle
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    
    return deck;
}

function drawCard(deck) {
    return deck.pop();
}

function getCardValue(card) {
    if (['J', 'Q', 'K'].includes(card.value)) {
        return 10;
    } else if (card.value === 'A') {
        return 11; // Aas is standaard 11, wordt later aangepast indien nodig
    } else {
        return parseInt(card.value);
    }
}

function calculateHandValue(hand) {
    let value = 0;
    let aceCount = 0;
    
    for (const card of hand) {
        value += getCardValue(card);
        if (card.value === 'A') {
            aceCount++;
        }
    }
    
    // Pas azen aan indien nodig
    while (value > 21 && aceCount > 0) {
        value -= 10; // Verander een Aas van 11 naar 1
        aceCount--;
    }
    
    return value;
}

function createGameEmbed(gameState, gebruiker, showDealerCards) {
    const playerValue = calculateHandValue(gameState.playerHand);
    const dealerValue = showDealerCards 
        ? calculateHandValue(gameState.dealerHand) 
        : getCardValue(gameState.dealerHand[0]);
    
    // Uitkomst tekst
    let resultText = "";
    let resultAmount = "";
    
    if (gameState.gameOver) {
        if (gameState.result === 'bust') {
            resultText = "Bust";
            resultAmount = `-${gameState.inzet.toLocaleString()}`;
        } else if (gameState.result === 'win') {
            resultText = "Gewonnen";
            resultAmount = `+${gameState.inzet.toLocaleString()}`;
        } else if (gameState.result === 'blackjack') {
            resultText = "Blackjack";
            resultAmount = `+${Math.floor(gameState.inzet * 1.5).toLocaleString()}`;
        } else if (gameState.result === 'lose') {
            resultText = "Verloren";
            resultAmount = `-${gameState.inzet.toLocaleString()}`;
        } else if (gameState.result === 'push') {
            resultText = "Gelijkspel";
            resultAmount = "±0";
        } else if (gameState.result === 'doublewin') {
            resultText = "Dubbel Gewonnen";
            resultAmount = `+${(gameState.inzet * 2).toLocaleString()}`;
        } else if (gameState.result === 'doublelose') {
            resultText = "Dubbel Verloren";
            resultAmount = `-${(gameState.inzet * 2).toLocaleString()}`;
        }
    }
    
    // Maak kaarten strings
    const playerCards = gameState.playerHand
        .map(card => `${card.suit}${card.value}`)
        .join(' ');
    
    const dealerCards = showDealerCards
        ? gameState.dealerHand.map(card => `${card.suit}${card.value}`).join(' ')
        : `${gameState.dealerHand[0].suit}${gameState.dealerHand[0].value} ?`;
    
    const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setAuthor({ name: `${gebruiker.username}#${gebruiker.discriminator}`, iconURL: gebruiker.displayAvatarURL() });
    
    // Voeg resultaat toe indien het spel voorbij is
    if (gameState.gameOver) {
        embed.setDescription(`Result: ${resultText} ${resultAmount}`);
    }
    
    // Voeg kaarten toe
    embed.addFields(
        { name: 'Your Hand', value: playerCards, inline: true },
        { name: 'Dealer Hand', value: dealerCards, inline: true }
    );
    
    // Voeg waarden toe
    embed.addFields(
        { name: 'Value:', value: `${playerValue}`, inline: true },
        { name: 'Value:', value: `${showDealerCards ? dealerValue : '?'}`, inline: true }
    );
    
    return embed;
}

function createGameButtons(gameState) {
    const row = new ActionRowBuilder();
    
    // Hit knop
    row.addComponents(
        new ButtonBuilder()
            .setCustomId('hit')
            .setLabel('Hit')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(gameState.gameOver)
    );
    
    // Stand knop
    row.addComponents(
        new ButtonBuilder()
            .setCustomId('stand')
            .setLabel('Stand')
            .setStyle(ButtonStyle.Success)
            .setDisabled(gameState.gameOver)
    );
    
    // Double Down knop
    row.addComponents(
        new ButtonBuilder()
            .setCustomId('doubledown')
            .setLabel('Double Down')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(!gameState.canDoubleDown || gameState.gameOver)
    );
    
    // Split knop
    row.addComponents(
        new ButtonBuilder()
            .setCustomId('split')
            .setLabel('Split')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(!gameState.canSplit || gameState.gameOver)
    );
    
    return row;
}

async function handleHit(gameState, gebruiker, interaction) {
    // Kan niet meer Double Down na een hit
    gameState.canDoubleDown = false;
    gameState.canSplit = false;
    
    // Trek een nieuwe kaart
    gameState.playerHand.push(drawCard(gameState.deck));
    
    // Bereken nieuwe hand waarde
    const playerValue = calculateHandValue(gameState.playerHand);
    
    // Controleer op bust
    if (playerValue > 21) {
        gameState.gameOver = true;
        gameState.result = 'bust';
        
        // Update economy
        await gameState.economyUser.balance.subtract(gameState.inzet, 'Verloren bij blackjack');
        
        // Update UI met resultaat
        const embed = createGameEmbed(gameState, gebruiker, true);
        const buttons = createGameButtons(gameState);
        
        await interaction.update({ 
            embeds: [embed],
            components: [buttons]
        });
    } else {
        // Spel gaat door
        const embed = createGameEmbed(gameState, gebruiker, false);
        const buttons = createGameButtons(gameState);
        
        await interaction.update({ 
            embeds: [embed],
            components: [buttons]
        });
    }
}

async function handleStand(client, gameState, gebruiker, interaction) {
    // Dealer speelt nu
    let dealerValue = calculateHandValue(gameState.dealerHand);
    
    // Dealer trekt kaarten totdat waarde 17 of hoger is
    while (dealerValue < 17) {
        gameState.dealerHand.push(drawCard(gameState.deck));
        dealerValue = calculateHandValue(gameState.dealerHand);
    }
    
    // Bepaal de uitkomst
    const playerValue = calculateHandValue(gameState.playerHand);
    
    gameState.gameOver = true;
    
    if (playerValue === 21 && gameState.playerHand.length === 2) {
        // Speler heeft blackjack
        gameState.result = 'blackjack';
        const winst = Math.floor(gameState.inzet * 1.5);
        await gameState.economyUser.balance.add(winst, 'Blackjack gewonnen');
    } else if (dealerValue > 21) {
        // Dealer is bust
        gameState.result = 'win';
        await gameState.economyUser.balance.add(gameState.inzet, 'Blackjack gewonnen');
    } else if (playerValue > dealerValue) {
        // Speler wint
        gameState.result = 'win';
        await gameState.economyUser.balance.add(gameState.inzet, 'Blackjack gewonnen');
    } else if (playerValue < dealerValue) {
        // Dealer wint
        gameState.result = 'lose';
        await gameState.economyUser.balance.subtract(gameState.inzet, 'Blackjack verloren');
    } else {
        // Gelijkspel
        gameState.result = 'push';
        // Geen geldtransacties bij gelijkspel
    }
    
    // Update UI met resultaat
    const embed = createGameEmbed(gameState, gebruiker, true);
    const buttons = createGameButtons(gameState);
    
    await interaction.update({ 
        embeds: [embed],
        components: [buttons]
    });
}

async function handleDoubleDown(client, gameState, gebruiker, interaction) {
    // Controleer of gebruiker genoeg geld heeft voor verdubbeling
    if (gameState.userBalance < gameState.inzet * 2) {
        return interaction.reply({
            content: `Je hebt niet genoeg geld om te verdubbelen! Je hebt €${gameState.userBalance} maar je hebt €${gameState.inzet * 2} nodig.`,
            ephemeral: true
        });
    }
    
    // Verdubbel de inzet
    gameState.inzet *= 2;
    
    // Trek één kaart
    gameState.playerHand.push(drawCard(gameState.deck));
    
    // Na double down eindigt de beurt van de speler
    const playerValue = calculateHandValue(gameState.playerHand);
    
    if (playerValue > 21) {
        // Bust na double down
        gameState.gameOver = true;
        gameState.result = 'doublelose';
        await gameState.economyUser.balance.subtract(gameState.inzet, 'Double Down verloren bij blackjack');
    } else {
        // Dealer speelt nu
        let dealerValue = calculateHandValue(gameState.dealerHand);
        
        while (dealerValue < 17) {
            gameState.dealerHand.push(drawCard(gameState.deck));
            dealerValue = calculateHandValue(gameState.dealerHand);
        }
        
        gameState.gameOver = true;
        
        if (dealerValue > 21) {
            // Dealer bust, speler wint
            gameState.result = 'doublewin';
            await gameState.economyUser.balance.add(gameState.inzet, 'Double Down gewonnen bij blackjack');
        } else if (playerValue > dealerValue) {
            // Speler wint
            gameState.result = 'doublewin';
            await gameState.economyUser.balance.add(gameState.inzet, 'Double Down gewonnen bij blackjack');
        } else if (playerValue < dealerValue) {
            // Dealer wint
            gameState.result = 'doublelose';
            await gameState.economyUser.balance.subtract(gameState.inzet, 'Double Down verloren bij blackjack');
        } else {
            // Gelijkspel
            gameState.result = 'push';
            // Geen geldtransacties bij gelijkspel, speler krijgt inzet terug
        }
    }
    
    // Update UI met resultaat
    const embed = createGameEmbed(gameState, gebruiker, true);
    const buttons = createGameButtons(gameState);
    
    await interaction.update({ 
        embeds: [embed],
        components: [buttons]
    });
}

async function handleAutoStand(client, gameState, gebruiker, interaction) {
    // Deze functie wordt aangeroepen als de tijd verloopt
    if (!gameState.gameOver) {
        // Dealer speelt nu
        let dealerValue = calculateHandValue(gameState.dealerHand);
        
        while (dealerValue < 17) {
            gameState.dealerHand.push(drawCard(gameState.deck));
            dealerValue = calculateHandValue(gameState.dealerHand);
        }
        
        // Bepaal de uitkomst
        const playerValue = calculateHandValue(gameState.playerHand);
        
        gameState.gameOver = true;
        
        if (playerValue === 21 && gameState.playerHand.length === 2) {
            // Speler heeft blackjack
            gameState.result = 'blackjack';
            const winst = Math.floor(gameState.inzet * 1.5);
            await gameState.economyUser.balance.add(winst, 'Blackjack gewonnen');
        } else if (dealerValue > 21) {
            // Dealer is bust
            gameState.result = 'win';
            await gameState.economyUser.balance.add(gameState.inzet, 'Blackjack gewonnen');
        } else if (playerValue > dealerValue) {
            // Speler wint
            gameState.result = 'win';
            await gameState.economyUser.balance.add(gameState.inzet, 'Blackjack gewonnen');
        } else if (playerValue < dealerValue) {
            // Dealer wint
            gameState.result = 'lose';
            await gameState.economyUser.balance.subtract(gameState.inzet, 'Blackjack verloren');
        } else {
            // Gelijkspel
            gameState.result = 'push';
            // Geen geldtransacties bij gelijkspel
        }
        
        // Update UI met resultaat
        const embed = createGameEmbed(gameState, gebruiker, true);
        const buttons = createGameButtons(gameState);
        
        await interaction.editReply({ 
            embeds: [embed],
            components: [buttons]
        });
    }
} 