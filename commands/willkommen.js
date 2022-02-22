const { SlashCommandBuilder } = require('@discordjs/builders');
const DiscordLog = require('../help/log.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('willkommen')
		.setDescription('Die Willkommensnachricht für neue Beitritte festlegen/ändern oder anschauen.')
		.addSubcommand(subcommand =>
			subcommand
				.setName('anzeigen')
				.setDescription('Zeigt die derzeit eingestellte Willkommensnachricht an.'))
		.addSubcommand(subcommand =>
			subcommand
				.setName('festlegen')
				.setDescription('Die Nachricht ändern. Der Platzhalter %%% wird durch den Nick der neuen Person ersetzt.')
				.addStringOption(option =>
					option.setName('nachricht')
						.setDescription('Die Willkommensnachricht. Beispiel: "Willkommen %%%!"')
						.setRequired(true))),
	async execute(interaction) {
		// Show the currently implemented welcome message
		if (interaction.options.getSubcommand() == 'anzeigen') {
			const message = await interaction.client.DICED.messages_scheme.findOne({ where: { tag: 'willkommen' } });
			if (message) {
				const to_mention = interaction.member.user.id;
				let reply = message.get('content');
				reply = reply.replace('%%%', `<@${to_mention}>`);
				return interaction.reply({ content: `Die derzeitige Willkommensnachricht ist:\n${reply}`, ephemeral: true });
			}
			else {
				return interaction.reply({ content: 'Es wurde bisher keine Willkommensnachricht festgelegt.', ephemeral: true });
			}
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