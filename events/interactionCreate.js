/* discord.js interactionCreate is fired when a user uses a slash command */

module.exports = {
	name: 'interactionCreate',
	async execute(interaction) {
		if (!interaction.isCommand()) return;
		if (!interaction.member.roles.cache.has(process.env.ADMIN_ROLE)) return interaction.reply({ content: 'Keine Berechtigung.', ephemeral: true });

		const command = interaction.client.commands.get(interaction.commandName);

		if (!command) return;

		try {
			await command.execute(interaction);
		}
		catch (error) {
			console.error(error);
			await interaction.reply({ content: 'Es gab einen Fehler bei der Ausführung des Kommandos.', ephemeral: true });
		}
	},
};