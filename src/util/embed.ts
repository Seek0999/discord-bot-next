import { unexpectedErrorShort } from './texts';
import { EmbedBuilder, User } from 'discord.js';

export const createEmbed = () => {
  return new EmbedBuilder().setColor(2021216).setTimestamp();
};

export const notLinkedEmbed = (targetUser: User) =>
  createEmbed()
    .setTitle(
      `${targetUser.username} did not link their Discord account to their Stats.fm account`
    )
    .setDescription(
      'You can link your Discord account to your Stats.fm account by going to <https://stats.fm/account/connections>!'
    )
    .toJSON();

export const unexpectedErrorEmbed = () =>
  createEmbed()
    .setTitle('An unexpected error occurred')
    .setDescription(unexpectedErrorShort)
    .toJSON();

export const privacyEmbed = (targetUser: User, message: string) =>
  createEmbed()
    .setTitle(
      'Some privacy settings are preventing me from running this command'
    )
    .setDescription(message.replace('{TARGET_USER}', targetUser.tag));
