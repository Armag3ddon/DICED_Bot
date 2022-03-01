/* discord.js interactionCreate is fired when a user uses a slash command */

const DiscordLog = require('../help/log.js');
const Challenge = require('../help/challenge.js');

module.exports = {
	name: 'messageCreate',
	async execute(message) {
		if (message.channelId != process.env.CHALLENGE_CHANNEL) return;
		if (message.author.bot) return;

		try {
			if (Challenge.checkImageContent(message)) {
				const old_message = await Challenge.checkMemberIsChallenger(message);
				if (await Challenge.dontAskAgain(old_message, message)) return;
				await Challenge.saveMessage(message);
				await Challenge.askForConfirmation(message, old_message);
			}
		}
		catch (error) {
			DiscordLog.log(message.client, 'Es gab einen Fehler bei der Auswertung einer Nachricht zur Wochenchallenge.');
			console.error(error);
		}
	},
};