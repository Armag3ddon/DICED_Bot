/*
 * Manage the weekly challenge.
 * Whenever an image gets posted in a certain channel, users can be awarded a certain for a week.
 */

const { MessageActionRow, MessageButton } = require('discord.js');
const ButtonCollector = require('./buttoncollector.js');
const DiscordLog = require('./log.js');

module.exports = {
	// Detect if an image contains an image. Images can either be an embed or an attachment, so better check both.
	checkImageContent(message) {
		if (message.embeds.length == 0 && message.attachments.length == 0) return false;

		let has_image = false;

		if (message.embeds.length > 0) {
			for (let i = 0; i < message.embeds.length; i++) {
				if (message.embeds[i].type == 'image') {
					has_image = true;
				}
			}
		}

		if (!has_image && message.attachments.size > 0) {
			message.attachments.forEach(attachment => {
				if (attachment.contentType.startsWith('image')) {
					has_image = true;
				}
			});
		}

		return has_image;
	},
	// Check whether a member already has the challenger role and just posted another image within the week.
	async checkMemberIsChallenger(message) {
		const entry = await message.client.DICED.challenge_scheme.findOne({ where: { owner: message.author.id } });
		if (entry) return entry;
		return null;
	},
	// Check whether a member just posted a message with an image (within the last 70 seconds).
	// If yes, then don't immediately prompt again as this could just be a couple of images of the same thing.
	// A truely new entry is only recognised if posted later than that
	// In theory, this could lead to a person posting something like a reaction image and then their own entry.
	// Their own entry would be ignored.
	async dontAskAgain(old_message, message) {
		if (old_message === null) return false;

		// If the message is confirmed, check whether there is an unconfirmed message pending.
		// If the member confirms a new message, it will simply replace the old entry and the role period is longer.
		if (old_message.confirmed) {
			const unconfirmed = await message.client.DICED.challenge_scheme.findOne({ where: { owner: message.author.id, confirmed: false } });
			if (unconfirmed) return true;
			return false;
		}

		// No further checks required. The entry is still in the confirmation timeframe (70 seconds) until it will be autoremoved.
		// However, do alert the moderation team.
		DiscordLog.log(message.client, `${message.author.username} hat ein Bild für die Wochenchallenge gepostet, aber es lief bereits eine Abfrage wegen eines anderen Bildes. Es ist möglich, dass das kein Problem ist, wenn nur mehrere gleiche Bilder gepostet wurden.\nZur Überprüfung: ${message.url}`);
		return true;
	},
	// Save the message containing the image to the database.
	async saveMessage(message) {
		await message.client.DICED.challenge_scheme.create({ message: message.id, owner: message.author.id, confirmed: false });
		await message.react('❓');
	},
	// Check whether a message is already saved (only checked when messageUpdate is fired).
	// Don't ask twice about a single message.
	async isSaved(message) {
		const entry = message.client.DICED.challenge_scheme.findOne({ where: { message: message.id } });
		return entry;
	},
	// Ask the member for confirmation that a posted image really is an entry for the weekly challenge.
	// If yes, assign the corresponding to the member.
	// prior_entry is a potential earlier message already saved in the database.
	async askForConfirmation(message, prior_entry) {
		// Make a message to ask for confirmation
		const to_mention = `<@${message.author.id}>`;
		const button_id = `challenge_confirm_${message.id}`;
		const row = new MessageActionRow()
			.addComponents(
				new MessageButton()
					.setCustomId(button_id)
					.setLabel('Bestätigen')
					.setStyle('SUCCESS'),
			);
		let to_send = `Ping! ${to_mention}\nMir scheint, dass du ein Bild/Bilder für die Wochenchallenge präsentierst. Stimmt das? Dann drücke innerhalb einer Minute auf Bestätigen und du bekommst die Wochenchallenger-Rolle für eine Woche!`;
		if (prior_entry !== null) {
			to_send = `Pong! ${to_mention}\n Du bist zwar schon ein Wochenchallenger, aber du scheinst ein neues Bild/Bilder für die Wochenchallenge zu präsentieren. Ist das ein neuer Beitrag? Dann drücker innerhalb einer Minute auf Bestätigen und deine Challenger-Zeit wird verlängert!`;
		}
		const new_message = await message.channel.send({ content: to_send, components: [row] });
		// Receive answers to button presses
		ButtonCollector.messageCollector(
			new_message,
			{ clicked: 'A new Wochenchallenger appears!', clickedLog: 'Die Wochenchallenger-Rolle wird an USER vergeben.' },
			button_id,
			message.author.id,
			async interaction => {
				try {
					const message_id = interaction.customId.slice(18);
					await interaction.client.DICED.challenge_scheme.update({ confirmed: true }, { where: { message: message_id } });
					if (prior_entry !== null) await prior_entry.destroy();
					if (interaction.member.manageable) {
						await interaction.member.roles.add(process.env.CHALLENGE_ROLE);
					}
					else {
						DiscordLog.log(interaction.client, `${interaction.user.username} sollte Wochenchallenger werden, aber der Bot hat nicht die benötigten Rechte.`);
					}
					const old_message = await interaction.channel.messages.fetch(message_id);
					if (old_message) {
						const DICED_reactions = await message.reactions.cache.filter(reaction => reaction.users.cache.has(interaction.client.user.id));
						for (const reaction of DICED_reactions.values()) {
							await reaction.users.remove(interaction.client.user.id);
						}
						old_message.react('✅');
					}
				}
				catch (error) {
					DiscordLog.log(interaction.client, 'Es gab einen Fehler beim Zuteilen der Wochenchallenge-Rolle.');
					console.error(error);
				}
			});
		// Remove the button after 70 seconds (the answers will be invalid after 60 seconds)
		setTimeout(async () => {
			const entry = await message.client.DICED.challenge_scheme.findOne({ where: { message: message.id } });
			if (!entry || entry.confirmed) return;

			const DICED_reactions = await message.reactions.cache.filter(reaction => reaction.users.cache.has(message.client.user.id));
			for (const reaction of DICED_reactions.values()) {
				await reaction.users.remove(message.client.user.id);
			}
			await message.react('❌');
			await new_message.edit({ content: 'Zeit abgelaufen.', components: [] });
			await entry.destroy();
		}, 70000);
	},
	challengeLoop(client) {
		const hour = 60 * 60 * 1000;
		setInterval(async () => {
			try {
				const challengers = await client.DICED.challenge_scheme.findAll();
				const now = Date.now();
				const week = 1000 * 60 * 60 * 24 * 7;
				for (let i = 0; i < challengers.length; i++) {
					const difference = Math.floor(now - challengers[i].createdAt);
					if (difference > week) {
						const guild = await client.guilds.fetch(process.env.DICED_GUILD_ID);
						if (!guild) return;

						const member = await guild.members.fetch(challengers[i].owner);
						if (member) {
							if (member.manageable) {
								member.roles.remove(process.env.CHALLENGE_ROLE);
								DiscordLog.log(client, `${member.user.username} ist kein Wochenchallenger mehr (Zeitablauf).`);
							}
							else {
								DiscordLog.log(client, `${member.user.username} sollte kein Wochenchallenger mehr sein, aber der Bot hat nicht die benötigten Rechte.`);
							}
						}
						else {
							DiscordLog.log(client, `Beim Aufräumen der Wochenchallenger konnte Benutzer-ID ${challengers[i].owner} nicht mehr auf dem Server gefunden werden.`);
						}
						await challengers[i].destroy();
					}
				}
			}
			catch (error) {
				DiscordLog.log(client, 'Es gab ein Problem beim Aufräumen der Wochenchallenger.');
				console.error(error);
			}
		}, hour);
	},
};