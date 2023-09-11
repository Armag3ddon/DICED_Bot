const { SlashCommandBuilder } = require('@discordjs/builders');
const DiscordLog = require('../help/log.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('challenge')
		.setDescription('Administration der Wochenchallenge: Übersicht, Rollen löschen.')
		.addSubcommand(subcommand =>
			subcommand
				.setName('anzeigen')
				.setDescription('Zeigt alle derzeitigen Wochenchallenger an.'))
		.addSubcommand(subcommand =>
			subcommand
				.setName('loeschen')
				.setDescription('Manuell Einträge aus der Wochenchallenge löschen. Die Rolle wird dann entzogen.')
				.addStringOption(option =>
					option.setName('id')
						.setDescription('Muss eine gespeicherte ID eines Nutzers oder Nachricht sein, die in der Datenbank vorhanden ist.')
						.setRequired(true))),
	async execute(interaction) {
		// Show all challenge entries
		if (interaction.options.getSubcommand() == 'anzeigen') {
			const challenger = await interaction.client.DICED.challenge_scheme.findAll();
			if (challenger.length == 0) {
				return interaction.reply({ content: 'Die Challenger-Datenbank ist leer! :(', ephemeral: true });
			}
			const replies = ['Die derzeitige Liste an Challengern:\n'];
			let current_reply = 0;
			const channel = await interaction.guild.channels.fetch(process.env.CHALLENGE_CHANNEL);
			for (let i = 0; i < challenger.length; i++) {
				let reply = '';
				const message = await channel.messages.fetch(challenger[i].message);
				const member = await interaction.guild.members.fetch(challenger[i].owner);
				if (member) {
					reply += `@${member.user.username} (ID: ${challenger[i].owner}): `;
				}
				else {
					reply += `Nutzer mit ID ${challenger[i].owner} ist nicht mehr auf dem Server: `;
				}
				if (message) {
					reply += `Nachrichtenlink: ${message.url} (ID: ${challenger[i].message}). `;
				}
				else {
					reply += `Die zugehörige Nachricht mit ID ${challenger[i].message} konnte nicht mehr gefunden werden. `;
				}
				if (challenger[i].confirmed) {
					reply += 'Der Eintrag wurde bestätigt. ';
				}
				else {
					reply += 'Der Bestätigungszeitraum läuft jetzt gerade, die Nachricht ist noch unbestätigt. ';
				}
				// Add 7 days to the date to get the time at which the challenge role period ends
				challenger[i].createdAt.setUTCDate(challenger[i].getUTCDate() + 7);
				const end_time = challenger[i].createdAt.toString();
				reply += `Der Eintrag läuft ab am ${end_time}.`;
				// Check that a single message doesn't exceed the allowed character count.
				if (replies[current_reply].length + reply.length > 2000) {
					current_reply++;
					replies[current_reply] = '';
				}
				replies[current_reply] += reply;
			}
			interaction.reply(replies[0]);
			if (replies.length > 1) {
				for (let i = 1; i < replies.length; i++) {
					interaction.followUp(replies[i]);
				}
			}
			return;
		}
		// Change the currently implemented welcome message
		if (interaction.options.getSubcommand() == 'festlegen') {
			const new_message = interaction.options.getString('nachricht');
			try {
				const action_taker = interaction.member.user.id;
				await interaction.client.DICED.messages_scheme.upsert({ tag: 'willkommen', content: new_message });
				DiscordLog.log(interaction.client, `Die Willkommensnachricht wurde von <@${action_taker}> geändert.`);
				return interaction.reply({ content: 'Die neue Willkommensnachricht wurde eingetragen.', ephemeral: true });
			}
			catch (error) {
				console.error(error);
				DiscordLog.log(interaction.client, 'Die Willkommensnachricht sollte geändert werden, aber es ist ein Fehler mit der Datenbank aufgetreten.');
				return interaction.reply({ content: 'Etwas ist beim Eintragen der Willkommensnachricht schief gelaufen.', ephemeral: true });
			}
		}
		return interaction.reply({ content: 'Irgendwas ist mit dem Befehl schief gelaufen.', ephemeral: true });
	},
};