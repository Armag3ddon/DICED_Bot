/* A Discord bot for the DICED Discord server.
 * Follows the recommended tutorial:
 * https://discordjs.guide/#before-you-begin
*/

const fs = require('fs');

const Discord = require('discord.js');
const client = new Discord.Client();
client.commands = new Discord.Collection();
// Commands are stored in /commands in separate files
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
// Events are stored in /events in separate files
const eventFiles = fs.readdirSync('./events').filter(file => file.endsWith('.js'));

// Load environment variables from .env
// Must contain:
// TOKEN: The Discord API Token
const dotenv = require('dotenv');
dotenv.config();

// Parse command files into discord client commands
for (const file of commandFiles) {
	const command = require(`./commands/${file}`);
	client.commands.set(command.name, command);
}

// Parse events files into discord client events
for (const file of eventFiles) {
	const event = require(`./events/${file}`);
	if (event.once) {
		client.once(event.name, (...args) => event.execute(...args, client));
	}
	else {
		client.on(event.name, (...args) => event.execute(...args, client));
	}
}

// Discord login
client.login(process.env.TOKEN);