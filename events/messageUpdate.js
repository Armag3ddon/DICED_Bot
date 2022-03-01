/* discord.js interactionCreate is fired when a user uses a slash command */

const DiscordLog = require('../help/log.js');
const Challenge = require('../help/challenge.js');

module.exports = {
	name: 'messageUpdate',
	async execute(old_message, new_message) {
		if (old_message.channelId != process.env.CHALLENGE_CHANNEL) return;
		if (old_message.author.bot) return;

		try {
			// Don't react if this message got updated after more than 60 seconds
			const now = Date.now();
			if (now - old_message.createdTimestamp > 60000) {
				DiscordLog.log(old_message.client, `Eine Nachricht im Wochenchallenge-Channel wurde nach mehr als 60 Sekunden bearbeitet. Der Bot hat diese ignoriert. Es ist möglich, dass das kein Problem ist.\nZur Überprüfung: ${old_message.url}`);
				return;
			}
			// Check whether the message is already saved even without the update
			const entry = Challenge.isSaved(old_message);
			if (entry) return;

			if (Challenge.checkImageContent(new_message)) {
				const prior_message = await Challenge.checkMemberIsChallenger(new_message);
				if (await Challenge.dontAskAgain(prior_message, old_message)) return;
				await Challenge.saveMessage(old_message);
				await Challenge.askForConfirmation(old_message, prior_message);
			}
		}
		catch (error) {
			DiscordLog.log(old_message.client, 'Es gab einen Fehler bei der Auswertung einer Nachrichten-Änderung zur Wochenchallenge.');
			console.error(error);
		}


	},
};