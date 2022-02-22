/* A Discord bot for the DICED Discord server.
 * Follows the recommended tutorial:
 * https://discordjs.guide/#before-you-begin
*/

const fs = require('fs');

const Sequelize = require('sequelize');

const { Client, Collection, Intents } = require('discord.js');
// New Discord client
const client = new Client({ intents: [Intents.FLAGS.GUILDS] });
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

// Initialise the messages table
const Messages = sequelize.define('messages', {
	tag: {
		type: Sequelize.STRING,
		unique: true,
	},
	content: Sequelize.TEXT,
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

// Save custom data to the client instance
client.DICED = {
	database: sequelize,
	messages_scheme: Messages,
};

// Discord login
client.login(process.env.TOKEN);