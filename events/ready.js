/* discord.js ready event will fire when the bot is started and a connection is established */

module.exports = {
	name: 'ready',
	once: true,
	execute(client) {
		console.log(`Logged in as ${client.user.tag}`);

		// Initialise database tables
		client.DICED.messages_scheme.sync();
		console.log('Database ready.');
	},
};