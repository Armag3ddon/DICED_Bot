const { MessageActionRow, MessageButton } = require('discord.js');
const { SlashCommandBuilder } = require('@discordjs/builders');
const DiscordLog = require('../help/log.js');
const ButtonCollector = require('../help/buttoncollector.js');

/* Configure the message when new YouTube uploads happen or disable the sending of messages. */

module.exports = {
	data: new SlashCommandBuilder()
		.setName('youtube')
		.setDescription('Die Ankündigungsnachricht für neue YouTube-Videos ändern oder anschauen oder das Scraping aussetzen.')
		.addSubcommand(subcommand =>
			subcommand
				.setName('anzeigen')
				.setDescription('Zeigt die derzeit eingestellte Ankündigungsnachricht an.'))
		.addSubcommand(subcommand =>
			subcommand
				.setName('festlegen')
				.setDescription('Die Nachricht ändern. Der Platzhalter %%% wird durch den Link zum Video ersetzt.')
				.addStringOption(option =>
					option.setName('nachricht')
						.setDescription('Die Ankündigungsnachricht. Beispiel: "Neuer Upload: %%%"')
						.setRequired(true)))
		.addSubcommand(subcommand =>
			subcommand
				.setName('status')
				.setDescription('Das Senden von Ankündigungen für YouTube-Videos aussetzen/wieder starten.'),
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('neustes')
				.setDescription('Zeigt das letzte gespeicherte Video an und gibt die Möglichkeit, es aus der Datenbank zu löschen.')),
	async execute(interaction) {
		// Show the currently implemented message
		if (interaction.options.getSubcommand() == 'anzeigen') {
			const message = await interaction.client.DICED.messages_scheme.findOne({ where: { tag: 'youtube' } });
			if (message) {
				const reply = message.get('content');
				return await interaction.reply({ content: `Die derzeitige Ankündigungsnachricht ist:\n${reply}`, ephemeral: true });
			}
			else {
				return await interaction.reply({ content: 'Es wurde bisher keine Ankündigungsnachricht festgelegt.', ephemeral: true });
			}
		}
		// Change the currently implemented YouTube message
		if (interaction.options.getSubcommand() == 'festlegen') {
			const new_message = interaction.options.getString('nachricht');
			try {
				const action_taker = interaction.member.user.id;
				await interaction.client.DICED.messages_scheme.upsert({ tag: 'youtube', content: new_message });
				DiscordLog.log(interaction.client, `Die Ankündigungsnachricht für YouTube-Videos wurde von <@${action_taker}> geändert.`);
				return await interaction.reply({ content: 'Die neue Ankündigungsnachricht wurde eingetragen.', ephemeral: true });
			}
			catch (error) {
				console.error(error);
				DiscordLog.log(interaction.client, 'Die Ankündigungsnachricht für YouTube-Videos sollte geändert werden, aber es ist ein Fehler mit der Datenbank aufgetreten.');
				return await interaction.reply({ content: 'Etwas ist beim Eintragen der Ankündigungsnachricht schief gelaufen.', ephemeral: true });
			}
		}
		// Stop or resume the sending of messages
		if (interaction.options.getSubcommand() == 'status') {
			let button_id = 'youtube_deactivate';
			let button_label = 'Deaktivieren';
			let button_style = 'DANGER';
			let message = 'Das automatische Senden von Ankündigungsnachrichten für neue YouTube-Videos ist zur Zeit **aktiviert**.';
			let on_click_message = 'Das automatische Senden von Ankündigungsnachrichten für neue YouTube-Videos wurde **deaktiviert**.';
			let log_message = 'USER hat Ankündigungen für neue YouTube-Videos **deaktiviert**.';
			let click_function = i => {
				i.client.DICED.youtube_messages = false;
			};
			if (!interaction.client.DICED.youtube_messages) {
				button_id = 'youtube_activate';
				button_label = 'Aktivieren';
				button_style = 'SUCCESS';
				message = 'Das automatische Senden von Ankündigungsnachrichten für neue YouTube-Videos ist zur Zeit **deaktiviert**.';
				on_click_message = 'Das automatische Senden von Ankündigungsnachrichten für neue YouTube-Videos wurde **aktiviert**.';
				log_message = 'USER hat Ankündigungen für neue YouTube-Videos **aktiviert**.';
				click_function = i => {
					i.client.DICED.youtube_messages = true;
				};
			}
			const row = new MessageActionRow()
				.addComponents(
					new MessageButton()
						.setCustomId(button_id)
						.setLabel(button_label)
						.setStyle(button_style),
				);
			ButtonCollector.channelCollector(
				interaction,
				{ clicked: on_click_message, clickedLog: log_message },
				button_id,
				click_function);
			return await interaction.reply({ content: message, components: [row], ephemeral: true });
		}
		// Show the latest database entry and give the option to delete it.
		if (interaction.options.getSubcommand() == 'neustes') {
			const entry = await interaction.client.DICED.social_scheme.findOne({ where: { platform: 'youtube' }, order: [['createdAt', 'DESC']] });
			if (!entry) return await interaction.reply({ content: 'Es ist noch kein YouTube-Video in der Datenbank gespeichert.', ephemeral: true });
			const row = new MessageActionRow()
				.addComponents(
					new MessageButton()
						.setCustomId('youtube_delete')
						.setLabel('Eintrag löschen')
						.setStyle('DANGER'),
				);
			ButtonCollector.channelCollector(
				interaction,
				{ clicked: 'Der Eintrag wurde gelöscht.', clickedLog: 'USER hat den letzten YouTube-Video-Eintrag aus der Datenbank gelöscht.' },
				'youtube_delete',
				i => {
					try {
						i.client.DICED.social_scheme.destroy({ where: { link: entry.link } });
					}
					catch (error) {
						console.error(error);
						DiscordLog.log(i.client, 'Es ist ein Fehler beim Löschen des Eintrags aufgetreten.');
					}
				},
			);
			return await interaction.reply({ content: `Das letzte gespeicherte YouTube-Video in der Datenbank ist: ${entry.link}`, components: [row], ephemeral: true });
		}
		return await interaction.reply({ content: 'Irgendwas ist mit dem Befehl schief gelaufen.', ephemeral: true });
	},
};