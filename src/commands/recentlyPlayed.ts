import { RecentlyStreamedCommand } from '../interactions';
import { createCommand } from '../util/Command';
import { getStatsfmUserFromDiscordUser } from '../util/getStatsfmUserFromDiscordUser';
import {
  createEmbed,
  notLinkedEmbed,
  privacyEmbed,
  unexpectedErrorEmbed,
} from '../util/embed';
import { Api, RecentlyPlayedTrack } from '@statsfm/statsfm.js';
import { container } from 'tsyringe';
import { URLs } from '../util/URLs';
import {
  createPaginationComponentTypes,
  createPaginationManager,
} from '../util/PaginationManager';
import { PrivacyManager } from '../util/PrivacyManager';
import * as Sentry from '@sentry/node';

const statsfmApi = container.resolve(Api);
const privacyManager = container.resolve(PrivacyManager);

const RecentlyPlayingComponents =
  createPaginationComponentTypes('recently-playing');

export default createCommand(RecentlyStreamedCommand)
  .registerChatInput(async (interaction, args, statsfmUserSelf, respond) => {
    await interaction.deferReply();
    const targetUser = args.user?.user ?? interaction.user;
    const statsfmUser =
      targetUser === interaction.user
        ? statsfmUserSelf
        : await getStatsfmUserFromDiscordUser(targetUser);
    if (!statsfmUser)
      return respond(interaction, {
        embeds: [notLinkedEmbed(targetUser)],
      });

    const privacySettingCheck = privacyManager.doesHaveMatchingPrivacySettings(
      'recentlyPlayed',
      statsfmUser.privacySettings
    );
    if (!privacySettingCheck)
      return respond(interaction, {
        embeds: [
          privacyEmbed(
            targetUser,
            privacyManager.getPrivacySettingsMessage(
              'recentlyPlayed',
              'recentlyPlayed'
            )
          ),
        ],
      });

    let recentlyStreamed: RecentlyPlayedTrack[] = [];

    try {
      recentlyStreamed = await statsfmApi.users.recentlyStreamed(
        statsfmUser.id
      );
    } catch (err) {
      Sentry.captureException(err, {
        user: {
          id: interaction.user.id,
          username: interaction.user.tag,
        },
        extra: {
          interaction: interaction.toJSON(),
        },
      });
      return respond(interaction, {
        embeds: [unexpectedErrorEmbed()],
      });
    }

    if (recentlyStreamed.length === 0)
      return respond(interaction, {
        embeds: [
          createEmbed()
            .setTitle(`${targetUser.username} has not streamed recently`)
            .toJSON(),
        ],
      });

    const pagination = createPaginationManager(
      recentlyStreamed,
      (currPage, totalPages, currData) => {
        return createEmbed()
          .setAuthor({
            name: `${targetUser.username}'s recently streamed tracks`,
            url: statsfmUser.profileUrl,
          })
          .setDescription(
            currData
              .map((stream) => {
                const trackURL = URLs.TrackUrl(stream.track.id);
                const artists = stream.track.artists
                  .map(
                    (artist) => `[${artist.name}](${URLs.ArtistUrl(artist.id)})`
                  )
                  .join(', ');

                return `- **[${
                  stream.track.name
                }](${trackURL})** by **${artists}**  (<t:${Math.round(
                  new Date(stream.endTime).getTime() / 1000
                )}:R>)`;
              })
              .join('\n')
          )
          .setFooter({ text: `Page ${currPage} of ${totalPages}` });
      }
    );

    const message = await respond(
      interaction,
      pagination.createMessage<'reply'>(
        await pagination.current(),
        RecentlyPlayingComponents
      )
    );

    pagination.manageCollector(
      message,
      RecentlyPlayingComponents,
      interaction.user
    );

    return message;
  })
  .build();
