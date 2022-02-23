/* A Discord bot for the DICED Discord server.
 * Follows the recommended tutorial:
 * https://discordjs.guide/#before-you-begin
 *
 * Permissions: 380373289984
*/

const fs = require('fs');

const Sequelize = require('sequelize');

const { Client, Collection, Intents } = require('discord.js');
// New Discord client
const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MEMBERS, Intents.FLAGS.GUILD_MESSAGES] });
client.commands = new Collection();
// Commands are stored in /commands in separate files
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
// Events are stored in /events in separate files
const eventFiles = fs.readdirSync('./events').filter(file => file.endsWith('.js'));

// Initialise database
const sequelize = new Sequelize({
	host: 'localhost',
	dialect: 'sqlite',
	logging: false,
	storage: 'database.sqlite',
});

// Define the messages table
const Messages = sequelize.define('messages', {
	tag: {
		type: Sequelize.STRING,
		unique: true,
	},
	content: Sequelize.TEXT,
});

// Define the social media posts table
const Social = sequelize.define('social', {
	link: {
		type: Sequelize.STRING,
		unique: true,
	},
	platform: Sequelize.STRING,
});

// Load environment variables from .env
// Must contain:
// TOKEN: The Discord API Token
const dotenv = require('dotenv');
dotenv.config();

// Parse command files into discord client commands
for (const file of commandFiles) {
	const command = require(`./commands/${file}`);
	client.commands.set(command.data.name, command);
}

// Parse events files into discord client events
for (const file of eventFiles) {
	const event = require(`./events/${file}`);
	if (event.once) {
		client.once(event.name, (...args) => event.execute(...args));
	}
	else {
		client.on(event.name, (...args) => event.execute(...args));
	}
}

const scraping = (process.env.AUTO_SOCIAL_SCRAPING === 'true');

// Save custom data to the client instance
client.DICED = {
	database: sequelize,
	messages_scheme: Messages,
	social_scheme: Social,
	youtube_messages: scraping,
};

// Discord login
client.login(process.env.TOKEN);