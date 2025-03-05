const { EmbedBuilder, Collection, PermissionsBitField } = require('discord.js');
const ms = require('ms');
const client = require('..');
const config = require('../config.json');
const { Events, InteractionType } = require('discord.js');
const Jail = require('../models/jail');
const dropCommand = require('../slashCommands/economy/drop');
const { trackCommandUsage } = require('../utils/trackCommandUsage');

const cooldown = new Collection();

client.on('interactionCreate', async interaction => {
	const slashCommand = client.slashCommands.get(interaction.commandName);
	
	if (interaction.type == 4) {
		if (slashCommand && slashCommand.autocomplete) {
			const choices = [];
			await slashCommand.autocomplete(interaction, choices);
		}
	}

	if (!interaction.type == 2) return;

	if (interaction.isButton()) {
		const customId = interaction.customId;

		// Bail button
		if (customId.startsWith('bail_')) {
			const userId = customId.split('_')[1];
			await handleBailButton(interaction, userId, client);
		}
		
		// Jail info button
		if (customId.startsWith('jailinfo_')) {
			const userId = customId.split('_')[1];
			await handleJailInfoButton(interaction, userId, client);
		}

		// Drop claim button
		if (customId.startsWith('drop_')) {
			await dropCommand.buttonHandler(client, interaction);
		}

		return;
	}

	if (!slashCommand) return client.slashCommands.delete(interaction.commandName);

	try {
		if (slashCommand.cooldown) {
			if (cooldown.has(`slash-${slashCommand.name}${interaction.user.id}`)) {
				return interaction.reply({
					content: config.messages["COOLDOWN_MESSAGE"].replace('<duration>', ms(cooldown.get(`slash-${slashCommand.name}${interaction.user.id}`) - Date.now(), { long: true })),
					ephemeral: true
				});
			}
			
			if (slashCommand.userPerms || slashCommand.botPerms) {
				if (!interaction.memberPermissions.has(PermissionsBitField.resolve(slashCommand.userPerms || []))) {
					const userPerms = new EmbedBuilder()
						.setDescription(`🚫 ${interaction.user}, You don't have \`${slashCommand.userPerms}\` permissions to use this command!`)
						.setColor('Red');
					return interaction.reply({ embeds: [userPerms] });
				}
				if (!interaction.guild.members.cache.get(client.user.id).permissions.has(PermissionsBitField.resolve(slashCommand.botPerms || []))) {
					const botPerms = new EmbedBuilder()
						.setDescription(`🚫 ${interaction.user}, I don't have \`${slashCommand.botPerms}\` permissions to use this command!`)
						.setColor('Red');
					return interaction.reply({ embeds: [botPerms] });
				}
			}

			// Voer het commando uit
			await slashCommand.run(client, interaction);
			
			// Houd het gebruik bij van dit commando
			trackCommandUsage(slashCommand.name, interaction.user).catch(err => 
				console.error(`Fout bij het bijhouden van gebruik van ${slashCommand.name}:`, err)
			);
			
			cooldown.set(`slash-${slashCommand.name}${interaction.user.id}`, Date.now() + slashCommand.cooldown);
			setTimeout(() => cooldown.delete(`slash-${slashCommand.name}${interaction.user.id}`), slashCommand.cooldown);
		} else {
			// Voer het commando uit
			await slashCommand.run(client, interaction);
			
			// Houd het gebruik bij van dit commando
			trackCommandUsage(slashCommand.name, interaction.user).catch(err => 
				console.error(`Fout bij het bijhouden van gebruik van ${slashCommand.name}:`, err)
			);
		}
	} catch (error) {
		console.log(error);
	}
});

// Handler voor de bail knop
async function handleBailButton(interaction, userId, client) {
	try {
		// Controleer of de gebruiker nog steeds in de gevangenis zit
		const jailRecord = await Jail.findOne({ 
			userID: userId,
			guildID: interaction.guild.id
		});
		
		if (!jailRecord) {
			return interaction.reply({
				content: 'Deze gebruiker zit niet meer in de gevangenis.',
				ephemeral: true
			});
		}
		
		// Controleer of er een borgsom is ingesteld
		if (jailRecord.bailAmount <= 0) {
			return interaction.reply({
				content: 'Er is geen borgsom ingesteld voor deze gebruiker. Alleen een moderator kan deze gebruiker vrijlaten.',
				ephemeral: true
			});
		}
		
		// Controleer of economy systeem beschikbaar is
		if (!client.eco || !client.eco.cache || !client.eco.cache.users) {
			return interaction.reply({
				content: 'Het economy systeem is momenteel niet beschikbaar. Probeer het later opnieuw of vraag een moderator om hulp.',
				ephemeral: true
			});
		}
		
		// Haal economy gebruiker op
		const economyUser = client.eco.cache.users.get({
			memberID: interaction.user.id,
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
		
		if (userBalance < jailRecord.bailAmount) {
			return interaction.reply({
				content: `Je hebt niet genoeg geld! De borgsom is €${jailRecord.bailAmount} en je hebt maar €${userBalance}.`,
				ephemeral: true
			});
		}
		
		// Haal de gebruiker op die in de gevangenis zit
		const jailedUser = await client.users.fetch(userId).catch(() => null);
		if (!jailedUser) {
			return interaction.reply({
				content: 'Deze gebruiker kon niet worden gevonden.',
				ephemeral: true
			});
		}
		
		// Gebruik deferReply om timeout te voorkomen
		await interaction.deferReply();
		
		// Haal de gevangen gebruiker op als GuildMember
		const jailedMember = await interaction.guild.members.fetch(userId).catch(() => null);
		if (!jailedMember) {
			return interaction.editReply({
				content: 'Deze gebruiker kon niet worden gevonden in de server.',
				ephemeral: true
			});
		}
		
		// Reset alle kanaal permissie overwrites
		try {
			// Haal alle kanalen op
			const allChannels = interaction.guild.channels.cache.filter(
				channel => channel.type !== 'GUILD_CATEGORY'
			);
			
			// Voor het jail kanaal specifiek
			const jailChan = interaction.guild.channels.cache.get(config.jailChannel);
			if (jailChan) {
				// Verwijder de persoonlijke overwrites voor het jail kanaal
				await jailChan.permissionOverwrites.delete(userId).catch(console.error);
			}
			
			// Voor alle andere kanalen waar er permissies zijn ingesteld
			for (const [id, channel] of allChannels) {
				const userOverwrites = channel.permissionOverwrites.cache.get(userId);
				if (userOverwrites) {
					await channel.permissionOverwrites.delete(userId).catch(console.error);
				}
			}
			
			// Herstel de originele rollen
			if (jailRecord.originalRoles && jailRecord.originalRoles.length > 0) {
				for (const roleId of jailRecord.originalRoles) {
					const role = interaction.guild.roles.cache.get(roleId);
					if (role) {
						await jailedMember.roles.add(role, `Vrijgelaten via borgsom betaald door ${interaction.user.tag}`).catch(console.error);
					}
				}
			}
			
		} catch (error) {
			console.error('Fout bij het herstellen van permissies:', error);
			// We gaan door, maar rapporteren de fout
			await interaction.followUp({
				content: 'Er is een fout opgetreden bij het herstellen van permissies. De gebruiker is wel uit de gevangenis, maar mogelijk moeten rechten handmatig worden hersteld.',
				ephemeral: true
			}).catch(console.error);
		}
		
		// Trek het geld af van de gebruiker die betaalt
		try {
			if (client.eco && economyUser && economyUser.balance) {
				await economyUser.balance.subtract(jailRecord.bailAmount, `Borgsom betaald voor ${jailedUser.username}`);
			}
		} catch (error) {
			console.error('Fout bij het aftrekken van balans:', error);
			// We gaan door met vrijlating zelfs als er een fout is met economy
		}
		
		// Maak een embed voor de vrijlating
		const unjailEmbed = new EmbedBuilder()
			.setColor('#2ECC40')
			.setTitle('Gebruiker vrijgelaten uit de gevangenis!')
			.setDescription(`${jailedUser} is vrijgelaten uit de gevangenis dankzij ${interaction.user} die de borgsom heeft betaald!`)
			.addFields(
				{ name: 'Borgsom betaald', value: `€${jailRecord.bailAmount}`, inline: false },
				{ name: 'Oorspronkelijke reden voor gevangenisstraf', value: jailRecord.reason, inline: false },
				{ name: 'Tijd in gevangenis', value: `<t:${Math.floor(jailRecord.jailedAt / 1000)}:R>`, inline: false }
			)
			.setThumbnail(jailedUser.displayAvatarURL())
			.setFooter({ text: config.footerText })
			.setTimestamp();
		
		// Antwoord op de interactie
		await interaction.editReply({
			embeds: [unjailEmbed]
		});
		
		// Stuur een bericht naar het jaillog kanaal
		const jailLogChannelObj = interaction.guild.channels.cache.get(config.jailLogChannel);
		
		if (jailLogChannelObj) {
			await jailLogChannelObj.send({
				embeds: [unjailEmbed.setTitle('Bail Log - Borgsom Betaald')]
			});
		}
		
		// Stuur een bericht naar het jail kanaal dat de gebruiker is vrijgelaten
		const jailChan = interaction.guild.channels.cache.get(config.jailChannel);
		if (jailChan) {
			await jailChan.send({
				content: `${jailedUser} is vrijgelaten uit de gevangenis omdat ${interaction.user} de borgsom van €${jailRecord.bailAmount} heeft betaald!`
			});
		}
		
		// Stuur een bericht naar het specifieke kanaal
		const specificChannel = interaction.guild.channels.cache.get('1337061426300321873');
		if (specificChannel) {
			await specificChannel.send({
				content: `${jailedUser} is vrijgelaten uit de gevangenis omdat ${interaction.user} de borgsom van €${jailRecord.bailAmount} heeft betaald!`
			});
		}
		
		// Update het oorspronkelijke jail bericht als het bestaat
		if (jailRecord.jailMessageID) {
			try {
				const jailChannel = interaction.guild.channels.cache.get(config.jailLogChannel);
				const jailMessage = await jailChannel.messages.fetch(jailRecord.jailMessageID);
				
				if (jailMessage) {
					const originalEmbed = jailMessage.embeds[0];
					const updatedEmbed = EmbedBuilder.from(originalEmbed)
						.setColor('#2ECC40')
						.setTitle('Jail Log - Borgsom Betaald')
						.addFields(
							{ name: 'Borgsom betaald door', value: interaction.user.username, inline: false },
							{ name: 'Betaald op', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
						);
					
					await jailMessage.edit({ embeds: [updatedEmbed], components: [] });
				}
			} catch (error) {
				console.log(`Kon het originele jail bericht niet updaten: ${error}`);
			}
		}
		
		// Stuur DM naar de vrijgelaten gebruiker
		try {
			const dmEmbed = new EmbedBuilder()
				.setColor('#2ECC40')
				.setTitle(`Je bent vrijgelaten uit de gevangenis in ${interaction.guild.name}!`)
				.setDescription(`${interaction.user.username} heeft je borgsom van €${jailRecord.bailAmount} betaald!`)
				.addFields(
					{ name: 'Let op', value: 'Je kanaalrechten en rollen zijn hersteld.', inline: false }
				)
				.setFooter({ text: config.footerText })
				.setTimestamp();
			
			await jailedUser.send({ embeds: [dmEmbed] });
		} catch (error) {
			console.log(`Kon geen DM sturen naar ${jailedUser.tag}: ${error}`);
		}
		
		// Verwijder de gebruiker uit de database
		await Jail.findOneAndDelete({
			userID: userId,
			guildID: interaction.guild.id
		});
		
	} catch (error) {
		console.error('Fout bij het betalen van de borgsom:', error);
		return interaction.editReply({
			content: 'Er is een fout opgetreden bij het betalen van de borgsom. Probeer het later opnieuw.',
			ephemeral: true
		});
	}
}

// Handler voor de jail info knop
async function handleJailInfoButton(interaction, userId, client) {
	try {
		// Haal gebruiker op
		const user = await client.users.fetch(userId).catch(() => null);
		if (!user) {
			return interaction.reply({
				content: 'Deze gebruiker kon niet worden gevonden.',
				ephemeral: true
			});
		}
		
		// Controleer of de gebruiker in de gevangenis zit
		const jailRecord = await Jail.findOne({ 
			userID: userId,
			guildID: interaction.guild.id
		});
		
		if (!jailRecord) {
			return interaction.reply({
				content: `${user.username} zit niet meer in de gevangenis.`,
				ephemeral: true
			});
		}
		
		// Haal de moderator gebruiker op
		const moderator = await client.users.fetch(jailRecord.moderatorID).catch(() => null);
		const moderatorName = moderator ? moderator.username : 'Onbekende moderator';
		
		// Maak en stuur embed
		const jailEmbed = new EmbedBuilder()
			.setColor('#FF4136')
			.setTitle(`${user.username}'s gevangenisstatus`)
			.setDescription(`${user} zit momenteel in de gevangenis!`)
			.addFields(
				{ name: 'Reden', value: jailRecord.reason, inline: false },
				{ name: 'In gevangenis sinds', value: `<t:${Math.floor(jailRecord.jailedAt / 1000)}:F> (<t:${Math.floor(jailRecord.jailedAt / 1000)}:R>)`, inline: false },
				{ name: 'Opgesloten door', value: moderatorName, inline: false },
				{ name: 'Borgsom', value: jailRecord.bailAmount > 0 ? `€${jailRecord.bailAmount}` : 'Geen borgsom (alleen een moderator kan vrijlaten)', inline: false }
			)
			.setThumbnail(user.displayAvatarURL())
			.setFooter({ text: config.footerText })
			.setTimestamp();
		
		return interaction.reply({
			embeds: [jailEmbed],
			ephemeral: true
		});
		
	} catch (error) {
		console.error('Fout bij het ophalen van jail info:', error);
		return interaction.reply({
			content: 'Er is een fout opgetreden bij het ophalen van de gevangenisinformatie. Probeer het later opnieuw.',
			ephemeral: true
		});
	}
}
