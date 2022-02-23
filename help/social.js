/*
 * A simple social media scraper that will check the social feeds for updates and post a message about it.
 */

const Parser = require('rss-parser');
const DiscordLog = require('./log.js');

module.exports = {
	checkSocial(client) {
		// Initialise the rss parser
		client.DICED.parser = new Parser();

		// The bot will check each minute for new uploads/posts
		// In theory, this can lead to the bot missing posts when these are posted quicker than in one minute intervals.
		// That is acceptable.
		const minute = 60000;

		// Check the preset YouTube channel for new video uploads
		const youtube_URL = `https://www.youtube.com/feeds/videos.xml?channel_id=${process.env.YOUTUBE_CHANNEL_ID}`;

		// YouTube
		setInterval(() => {
			try {
				client.DICED.parser.parseURL(youtube_URL)
					.then(async data => {
						try {
							const newest_video = data.items[0].link;
							if (!newest_video) return;

							// Check if the newest uploaded video is already in the database
							const entry = await client.DICED.social_scheme.findOne({ where: { link: newest_video } });
							if (entry) return;

							// It is a new upload!

							// Only send a message if it's currently enabled
							if (client.DICED.youtube_messages) {
								let message = await client.DICED.messages_scheme.findOne({ where: { tag: 'youtube' } });
								if (message) {
									const channel = await client.channels.fetch(process.env.NEWS_CHANNEL);
									message = message.link.replace('%%%', `${entry}`);
									channel.send(message);
								}
								else {
									DiscordLog.log(client, 'Ein neues YouTube-Video wurde hochgeladen, konnte aber nicht angekündigt werden, da keine YouTube-Nachricht eingestellt ist.');
									throw 'social: Missing YouTube message.';
								}
							}
							else {
								DiscordLog.log(client, 'Ein neues YouTube-Video wurde hochgeladen, aber nicht angekündigt, da Ankündigungen für Videos deaktiviert sind.');
							}

							// Save the upload in the table
							client.DICED.social_scheme.create({ link: newest_video, platform: 'youtube' });
						}
						catch (error) {
							DiscordLog.log(client, 'Es ist ein Fehler beim Auslesen des YouTube Feeds aufgetreten.');
							console.error(error);
						}
					});
			}
			catch (error) {
				DiscordLog.log(client, 'Es ist ein Fehler beim Auslesen des YouTube Feeds aufgetreten.');
				console.error(error);
			}
		}, minute);
	},
};