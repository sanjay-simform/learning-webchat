import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import axiosClient from "../../api-client";
import type { ApiResponse, AxiosErrorResponse } from "../auth/auth.service.dto";
import type {
  ConversationSummaryDto,
  InviteUserRequestDto,
} from "./conversation.service.dto";

async function inviteUserApi(
  payload: InviteUserRequestDto,
): Promise<ApiResponse<ConversationSummaryDto>> {
  try {
    const response = await axiosClient.post<ConversationSummaryDto>(
      "/conversations/invite",
      payload,
    );

    return {
      data: response.data,
      error: null,
    };
  } catch (err) {
    const error = err as AxiosError;
    return {
      data: null,
      error: {
        status: error.response?.status || 500,
        message: error.message || "Failed to invite user",
        code: error.code,
        details: error.response?.data,
      } satisfies AxiosErrorResponse,
    };
  }
}

async function getConversationsApi(): Promise<
  ApiResponse<ConversationSummaryDto[]>
> {
  try {
    const response =
      await axiosClient.get<ConversationSummaryDto[]>("/conversations");

    return {
      data: response.data,
      error: null,
    };
  } catch (err) {
    const error = err as AxiosError;
    return {
      data: null,
      error: {
        status: error.response?.status || 500,
        message: error.message || "Failed to load conversations",
        code: error.code,
        details: error.response?.data,
      } satisfies AxiosErrorResponse,
    };
  }
}

export function useConversations() {
  return useQuery({
    queryKey: ["conversations"],
    queryFn: getConversationsApi,
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });
}

export function useInviteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: inviteUserApi,
    onSuccess: (response) => {
      if (response.data) {
        queryClient.invalidateQueries({ queryKey: ["conversations"] });
      }
    },
  });
}

export const conversationApi = {
  inviteUser: inviteUserApi,
  getConversations: getConversationsApi,
};
