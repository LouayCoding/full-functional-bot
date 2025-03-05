require('dotenv').config(); // Zorg ervoor dat dotenv bovenaan is
const mongoose = require('mongoose');
const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
const { DisTube } = require('distube');

const { SpotifyPlugin } = require('@distube/spotify')
const { SoundCloudPlugin } = require('@distube/soundcloud');
const { YtDlpPlugin } = require('@distube/yt-dlp');

// Discord-XP voor leveling systeem
const Levels = require("discord-xp");
Levels.setURL(process.env.MONGODB_URI); // Verbinding met MongoDB voor XP

const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent,
		GatewayIntentBits.GuildMembers,
		GatewayIntentBits.GuildPresences,
		GatewayIntentBits.GuildVoiceStates,
		GatewayIntentBits.GuildMessageReactions
	],
	partials: [
		Partials.Message,
		Partials.Channel,
		Partials.Reaction,
		Partials.User,
		Partials.GuildMember
	]
});

client.distube = new DisTube(client, {
	
	emitNewSongOnly: true,
	emitAddSongWhenCreatingQueue: false,
	emitAddListWhenCreatingQueue: false,
	plugins: [
		new SpotifyPlugin({

		}),
		new SoundCloudPlugin(),
		new YtDlpPlugin()
	]
})

// Vang fouten op
client.distube.on("ffmpegDebug", console.log);
// Catch all unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection:', reason);
    // Optionally log the reason for debugging purposes
});
mongoose.set('strictQuery', true);
mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('Verbonden met MongoDB'))
    .catch((err) => console.error('Kan geen verbinding maken met MongoDB:', err));

const fs = require('fs');
const config = require('./config.json');

client.commands = new Collection()
client.aliases = new Collection()
client.slashCommands = new Collection();
client.buttons = new Collection();
client.prefix = config.prefix;
client.config = config;

module.exports = client;

// Initialiseer het leveling systeem
const { initLevelingSystem } = require('./events/levelingSystem');
initLevelingSystem(client);

// Laad alle handlers
fs.readdirSync('./handlers').forEach((handler) => {
  require(`./handlers/${handler}`)(client)
});

// Voer de functie uit wanneer de bot klaar is
client.once('ready', async () => {
  console.log(`${client.user.tag} is online!`)
  
  // Stel de status van de bot in
  client.user.setActivity(`Liberte Bot`, { type: 'WATCHING' });
  
  // Laad jail knoppen opnieuw
  try {
    const { reloadJailButtons } = require('./utils/jailButtonReloader');
    await reloadJailButtons(client);
    console.log('Jail knoppen herladen succesvol');
  } catch (error) {
    console.error('Fout bij het herladen van jail knoppen:', error);
  }
});

client.login(process.env.TOKEN)