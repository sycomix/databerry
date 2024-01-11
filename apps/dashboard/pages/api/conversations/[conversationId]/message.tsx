import { WebClient } from '@slack/web-api';
import Cors from 'cors';
import cuid from 'cuid';
import { NextApiResponse } from 'next';
import { z } from 'zod';

import { InboxTemplate, render } from '@chaindesk/emails';
import { ApiError, ApiErrorType } from '@chaindesk/lib/api-error';
import ConversationManager from '@chaindesk/lib/conversation';
import {
  createLazyAuthHandler,
  respond,
} from '@chaindesk/lib/createa-api-handler';
import { client as CrispClient } from '@chaindesk/lib/crisp';
import mailer from '@chaindesk/lib/mailer';
import runMiddleware from '@chaindesk/lib/run-middleware';
import { AIStatus } from '@chaindesk/lib/types/crisp';
import {
  ConversationMetadataSlack,
  CreateAttachmentSchema,
} from '@chaindesk/lib/types/dtos';
import { AppNextApiRequest } from '@chaindesk/lib/types/index';
import validate from '@chaindesk/lib/validate';
import { ConversationChannel, MessageFrom } from '@chaindesk/prisma';
import prisma from '@chaindesk/prisma/client';
const handler = createLazyAuthHandler();

const chatBodySchema = z.object({
  message: z.string(),
  channel: z.nativeEnum(ConversationChannel),
  attachments: z.array(CreateAttachmentSchema).optional(),
});

export const sendMessage = async (
  req: AppNextApiRequest,
  res: NextApiResponse
) => {
  const conversationId = req.query.conversationId as string;
  const payload = chatBodySchema.parse(req.body);
  const session = req.session;
  let externalMessageId: string | undefined;

  const {
    title,
    channelCredentials,
    channelExternalId,
    metadata,
    organizationId,
    organization,
    mailInbox,
    participants,
    contacts,
  } = await prisma.conversation.findUniqueOrThrow({
    where: {
      id: conversationId,
    },
    include: {
      channelCredentials: true,
      organization: true,

      mailInbox: true,
      participants: session?.user?.id
        ? {
            where: {
              id: {
                not: session?.user?.id, // fetch all participants except the current user
              },
            },
          }
        : true,
      contacts: true,
      messages: {
        take: 1,
        orderBy: {
          createdAt: 'desc',
        },
      },
    },
  });

  switch (payload.channel) {
    case 'crisp':
      try {
        const user = await prisma.user.findUnique({
          where: {
            id: session?.user?.id,
          },
          select: {
            name: true,
            picture: true,
          },
        });
        await CrispClient.website.sendMessageInConversation(
          channelCredentials?.externalId, // websiteId
          channelExternalId, // sessionId
          {
            type: 'text',
            from: 'operator',
            origin: 'chat',
            content: payload.message,
            user: {
              type: 'website',
              nickname: user?.name || 'Operator',
              avatar:
                user?.picture ||
                'https://chaindesk.ai/app-rounded-bg-white.png',
            },
          }
        );

        // disable AI
        await CrispClient.website.updateConversationMetas(
          channelCredentials?.externalId, // websiteId
          channelExternalId, // sessionId
          {
            data: {
              aiStatus: AIStatus.disabled,
              aiDisabledDate: new Date(),
            },
          }
        );
      } catch (e) {
        console.error(e);
        throw Error(
          `could not send message through crisp api ${(e as any)?.message}`
        );
      }
      break;
    case 'slack':
      try {
        if (!channelCredentials?.accessToken) {
          throw new Error(
            'Fatal: slack service provider is missing accessToken'
          );
        }

        const slackClient = new WebClient(channelCredentials?.accessToken);

        await slackClient.chat.postMessage({
          channel: channelExternalId!,
          text: `<@${(metadata as ConversationMetadataSlack)?.user_id}> ${
            payload.message
          }`,
        });
      } catch (e) {
        console.error(e);
        throw Error(
          `could not send message through slack api ${(e as any)?.message}`
        );
      }
      break;
    case 'mail':
      if (!mailInbox) {
        throw new ApiError(ApiErrorType.NOT_FOUND);
      }

      const emails: string[] = [
        ...(participants
          ?.map((each) => each?.email as string)
          .filter((each) => !!each) || []),
        ...(contacts?.map((c) => c?.email as string).filter((each) => !!each) ||
          []),
      ];

      if (emails.length <= 0) {
        throw new ApiError(ApiErrorType.INVALID_REQUEST);
      }

      const subject = title || organization?.name || '💌 Request';
      const sent = await mailer.sendMail({
        inReplyTo: channelExternalId!,
        from: {
          name: mailInbox?.fromName!,
          address:
            mailInbox?.customEmail && mailInbox?.isCustomEmailVerified
              ? mailInbox?.customEmail
              : `${mailInbox?.alias}@${process.env.INBOUND_EMAIL_DOMAIN}`,
        },
        to: emails,
        subject,
        attachments: payload.attachments?.map((each) => ({
          filename: each.name!,
          contentType: each.mimeType!,
          path: each.url!,
        })),
        html: render(
          <InboxTemplate
            title={subject}
            message={payload.message}
            signature={mailInbox?.signature!}
            hideBranding={!!mailInbox?.hideBranding}
          />
        ),
      });

      break;
    case 'website':
      // no special treatement for website channel.
      break;
    default:
      throw new Error('Unsupported Communication Channel.');
  }

  const conversationManager = new ConversationManager({
    organizationId: organizationId!,
    conversationId: conversationId,
    channel: payload.channel as ConversationChannel,
    userId: session?.user?.id,
  });

  const answerMsgId = cuid();

  conversationManager.push({
    id: answerMsgId,
    from: MessageFrom.human,
    text: payload.message,
    attachments: payload.attachments,
    // externalId: externalMessageId,
  });

  await conversationManager.save();
};

handler.post(
  validate({
    handler: respond(sendMessage),
  })
);

export default handler;