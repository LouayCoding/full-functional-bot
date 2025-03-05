# Full Functional Bot

This Discord bot is a fully functional solution featuring moderation, logging, country selection, economy, and unique community tools to create an interactive and organized Discord server.

## Features

- **Moderation Tools**: Jail/ban/timeout systems for effective community management
- **Country Selection**: Users can choose their country of origin with emoji flags and country roles
- **Economy System**: Complete economy system with currency, work, and daily rewards
- **Ticket System**: Support for users via tickets
- **Music Bot**: Play music from various sources like Spotify and YouTube
- **Counting Game**: Interactive counting game for the community
- **Automatic Logging**: Logging of messages, voice activities, and moderation actions

## Installation

1. Clone this repository:
   ```
   git clone https://github.com/yourusername/full-functional-bot.git
   cd full-functional-bot
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file based on the `.env.example` file:
   ```
   cp .env.example .env
   ```

4. Fill in the required information in the `.env` file:
   ```
   TOKEN=your_discord_bot_token_here
   MONGODB_URI=your_mongodb_connection_string_here
   ```

5. Create a `config.json` based on the `config.json.example` file:
   ```
   cp config.json.example config.json
   ```

6. Adjust the settings in `config.json` for your own server.

7. Start the bot:
   ```
   npm start
   ```

## Commands

### General Commands
- `/afkomst` - Select your country of origin with emoji flags
- `/landmessage` - Send a message to a specific country

### Admin Commands
- `/synclanden` - Synchronize countries as roles in the server
- `/jail` - Put a user in jail
- `/unjail` - Remove a user from jail

### Economy Commands
- `/work` - Earn currency by working
- `/daily` - Receive your daily reward
- `/balance` - View your current balance

## Configuration

### config.json

The `config.json` file contains important settings such as:

- `embedColor`: The color used for embeds
- `prefix`: Command prefixes for text commands
- `modRoles`: Role IDs for moderation permissions
- `verifyRole`: Role ID for verified users
- Channel IDs for various functionalities
- Settings for gamemode features

### Environment Variables (.env)

- `TOKEN`: Your Discord bot token
- `MONGODB_URI`: MongoDB connection string
- Other optional settings

## Country Roles System

The country roles system allows users to select their country of origin:

- Automatic synchronization of countries as roles
- Special handling for unrecognized countries (like Kurdistan)
- Admin command to send messages to specific countries
- Anti-nuke protection through delayed role creation

## Contributing

Contributions to this project are welcome! Feel free to create issues or submit pull requests.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.

## Contact

For questions or support, contact the project owner via Discord or GitHub.

---

Made with ❤️ for the Discord community.
