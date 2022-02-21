const { SlashCommandBuilder } = require('@discordjs/builders');

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
		if (interaction.getSubcommand() == 'Anzeigen') {
			await interaction.reply('Willkommen!');
		}
		if (interaction.getSubcommand() == 'Festlegen') {
			return;
		}
	},
};