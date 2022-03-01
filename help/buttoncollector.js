/*
 * Provide unified functionality to attach a Collector to buttons.
 */

const DiscordLog = require('./log.js');

module.exports = {
	channelCollector(interaction, messages, customId, onClick) {
		const collector = interaction.channel.createMessageComponentCollector({ componentType: 'BUTTON', time: 60000, max: 1 });

		collector.on('collect', async i => {
			if (i.customId === customId &&
				i.user.id === interaction.user.id) {
				await i.update({ content: messages.clicked, components: [] });
				DiscordLog.log(i.client, messages.clickedLog.replace('USER', `<@${i.member.user.id}>`));
				onClick(i);
			}
		});
	},
	messageCollector(message, messages, customId, authorId, onClick) {
		const filter = (interaction) => interaction.customId === customId && interaction.user.id === authorId;
		const collector = message.createMessageComponentCollector({ filter, time: 60000 });

		collector.on('collect', async i => {
			await i.update({ content: messages.clicked, components: [] });
			DiscordLog.log(i.client, messages.clickedLog.replace('USER', i.user.username));
			onClick(i);
		});
	},
};