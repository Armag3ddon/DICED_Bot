/*
 * The bot logs actions in a separate Discord channel.
 */

module.exports = {
	log(client, message) {
		client.channels.fetch(process.env.LOG_CHANNEL)
			.then(channel => {
				channel.send(message);
			});
	},
};