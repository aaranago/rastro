import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";

import {
  blockChatMemberInputSchema,
  chatConversationIdInputSchema,
  openReportChatConversationInputSchema,
  reportChatConversationInputSchema,
  sendChatMessageInputSchema,
} from "@acme/validators";

import type { ChatRepositoryErrorCode } from "../chat-repository";
import { ChatRepositoryError } from "../chat-repository";
import { protectedProcedure } from "../trpc";

export const chatRouter = {
  openReportConversation: protectedProcedure
    .input(openReportChatConversationInputSchema)
    .mutation(({ ctx, input }) =>
      withChatRepositoryErrors(() =>
        ctx.chatRepository.openReportConversation({
          contactMemberId: ctx.session.user.id,
          reportId: input.reportId,
        }),
      ),
    ),
  detail: protectedProcedure
    .input(chatConversationIdInputSchema)
    .query(({ ctx, input }) =>
      withChatRepositoryErrors(() =>
        ctx.chatRepository.getConversation({
          conversationId: input.conversationId,
          viewerMemberId: ctx.session.user.id,
        }),
      ),
    ),
  list: protectedProcedure.query(({ ctx }) =>
    withChatRepositoryErrors(() =>
      ctx.chatRepository.listConversations({
        viewerMemberId: ctx.session.user.id,
      }),
    ),
  ),
  sendMessage: protectedProcedure
    .input(sendChatMessageInputSchema)
    .mutation(({ ctx, input }) =>
      withChatRepositoryErrors(() =>
        ctx.chatRepository.sendMessage({
          conversationId: input.conversationId,
          senderMemberId: ctx.session.user.id,
          text: input.text,
        }),
      ),
    ),
  hideConversation: protectedProcedure
    .input(chatConversationIdInputSchema)
    .mutation(({ ctx, input }) =>
      withChatRepositoryErrors(() =>
        ctx.chatRepository.hideConversation({
          conversationId: input.conversationId,
          memberId: ctx.session.user.id,
        }),
      ),
    ),
  blockMember: protectedProcedure
    .input(blockChatMemberInputSchema)
    .mutation(({ ctx, input }) =>
      withChatRepositoryErrors(() =>
        ctx.chatRepository.blockMember({
          blockedMemberId: input.blockedMemberId,
          blockerMemberId: ctx.session.user.id,
          conversationId: input.conversationId,
        }),
      ),
    ),
  reportConversation: protectedProcedure
    .input(reportChatConversationInputSchema)
    .mutation(({ ctx, input }) =>
      withChatRepositoryErrors(() =>
        ctx.chatRepository.reportConversation({
          conversationId: input.conversationId,
          note: input.note,
          reason: input.reason,
          reporterMemberId: ctx.session.user.id,
        }),
      ),
    ),
} satisfies TRPCRouterRecord;

async function withChatRepositoryErrors<T>(
  operation: () => Promise<T>,
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof ChatRepositoryError) {
      throw new TRPCError({
        code: toTRPCErrorCode(error.code),
        message: error.message,
      });
    }

    throw error;
  }
}

function toTRPCErrorCode(code: ChatRepositoryErrorCode) {
  switch (code) {
    case "chat_conversation_not_found":
    case "chat_report_not_public":
      return "NOT_FOUND";
    case "chat_conversation_member_required":
    case "chat_member_blocked":
    case "chat_report_self_contact_not_allowed":
      return "FORBIDDEN";
    case "chat_report_contact_not_enabled":
      return "PRECONDITION_FAILED";
    case "chat_member_block_target_required":
    case "chat_message_text_required":
      return "BAD_REQUEST";
  }
}
