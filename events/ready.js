/* discord.js ready event will fire when the bot is started and a connection is established */

const Social = require('../help/social.js');
const DiscordLog = require('../help/log.js');

module.exports = {
	name: 'ready',
	once: true,
	execute(client) {
		console.log(`Logged in as ${client.user.tag}`);

		// Initialise database tables
		client.DICED.messages_scheme.sync({ alter: true });
		client.DICED.social_scheme.sync({ alter: true });
		console.log('Database ready.');

		// Start social media scraping
		Social.checkSocial(client);
		console.log('Begun social media scraping.');

		// Started
		DiscordLog.log(client, 'Der Bot ist gestartet.');
	},
};