/* discord.js guildMemberAdd is fired when a user joins a guild */

const DiscordLog = require('../help/log.js');

module.exports = {
	name: 'guildMemberAdd',
	async execute(member) {
		try {
			let message = await member.client.DICED.messages_scheme.findOne({ where: { tag: 'willkommen' } });
			if (message) {
				const channel = await member.client.channels.fetch(process.env.WELCOME_CHANNEL);
				message = message.content.replace('%%%', `<@${member.id}>`);
				channel.send(message);
			}
			else {
				DiscordLog.log(member.client, `Eine neue Person ist beigetreten (${member.user.username}), konnte aber nicht begrüßt werden, da keine Willkommensnachricht eingestellt ist.`);
				throw 'guildMemberAdd: Missing welcome message.';
			}
		}
		catch (error) {
			console.error(error);
		}
	},
};