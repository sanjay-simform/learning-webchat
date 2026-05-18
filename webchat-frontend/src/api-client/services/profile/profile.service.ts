import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import axiosClient from "../../api-client";
import type { AxiosErrorResponse } from "../auth/auth.service.dto";
import type {
  ApiResponse,
  UpdateProfileRequestDto,
  UserProfileDto,
} from "./profile.service.dto";

// ============================================================================
// Raw API Functions - No throwing errors, return {data, error} pattern
// ============================================================================

/**
 * Get user profile API call
 * Returns {data, error} pattern for type-safe error handling
 * If error is null, data will be there
 * If data is null, error will be there
 */
async function getUserProfileApi(): Promise<ApiResponse<UserProfileDto>> {
  try {
    const response = await axiosClient.get<UserProfileDto>("/profile");

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
        message: error.message || "Failed to fetch profile",
        code: error.code,
        details: error.response?.data,
      } satisfies AxiosErrorResponse,
    };
  }
}

/**
 * Update user profile API call
 * Returns {data, error} pattern for type-safe error handling
 */
async function updateUserProfileApi(
  payload: UpdateProfileRequestDto,
): Promise<ApiResponse<UserProfileDto>> {
  try {
    const response = await axiosClient.patch<UserProfileDto>(
      "/profile",
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
        message: error.message || "Failed to update profile",
        code: error.code,
        details: error.response?.data,
      } satisfies AxiosErrorResponse,
    };
  }
}

// ============================================================================
// TanStack Query Hooks
// ============================================================================

/**
 * Hook for fetching user profile
 * Usage:
 * const { data, error, isPending, isError } = useUserProfile();
 *
 * if (isPending) return <div>Loading...</div>;
 * if (error) return <div>Error: {error.message}</div>;
 * if (data) return <div>{data.displayName}</div>;
 */
export function useUserProfile() {
  return useQuery({
    queryKey: ["userProfile"],
    queryFn: getUserProfileApi,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1,
  });
}

/**
 * Hook for updating user profile mutation
 * Usage:
 * const { mutate, isPending, data, error } = useUpdateUserProfile();
 *
 * mutate({ displayName: "John Doe", avatarUrl: "...", status: "Online" });
 * if (isPending) return <div>Updating...</div>;
 * if (error) handle error
 * if (data) handle success
 */
export function useUpdateUserProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateUserProfileApi,
    onSuccess: (response) => {
      // Invalidate user profile query to refetch latest data
      if (response.data) {
        queryClient.invalidateQueries({ queryKey: ["userProfile"] });
      }
    },
  });
}

/**
 * Raw API functions exported for direct use if needed
 * Example: const response = await profileApi.getUserProfile();
 */
export const profileApi = {
  getUserProfile: getUserProfileApi,
  updateUserProfile: updateUserProfileApi,
};

// ============================================================================
// USAGE EXAMPLES
// ============================================================================

/**
 * Example 1: Using useUserProfile hook to fetch profile
 *
 * function ProfileDisplay() {
 *   const { data: profile, isPending, error } = useUserProfile();
 *
 *   if (isPending) return <div>Loading profile...</div>;
 *   if (error) return <div>Error: {error.error?.message}</div>;
 *
 *   return (
 *     <div>
 *       <h1>{profile?.data?.displayName}</h1>
 *       <img src={profile?.data?.avatarUrl} alt="avatar" />
 *       <p>Status: {profile?.data?.status}</p>
 *     </div>
 *   );
 * }
 */

/**
 * Example 2: Using useUpdateUserProfile hook to update profile
 *
 * function EditProfile() {
 *   const { mutate: updateProfile, isPending, error, data } = useUpdateUserProfile();
 *   const [displayName, setDisplayName] = useState("");
 *   const [status, setStatus] = useState("");
 *
 *   const handleSubmit = (e: React.FormEvent) => {
 *     e.preventDefault();
 *     updateProfile({
 *       displayName,
 *       status,
 *     });
 *   };
 *
 *   return (
 *     <form onSubmit={handleSubmit}>
 *       <input
 *         value={displayName}
 *         onChange={(e) => setDisplayName(e.target.value)}
 *         placeholder="Display Name"
 *       />
 *       <input
 *         value={status}
 *         onChange={(e) => setStatus(e.target.value)}
 *         placeholder="Status"
 *       />
 *       <button type="submit" disabled={isPending}>
 *         {isPending ? "Updating..." : "Update Profile"}
 *       </button>
 *       {error?.error && <p>Error: {error.error.message}</p>}
 *       {data?.data && <p>Profile updated successfully!</p>}
 *     </form>
 *   );
 * }
 */

/**
 * Example 3: Using both hooks together - Display and Edit
 *
 * function UserProfilePage() {
 *   const { data: profile, isPending: profileLoading } = useUserProfile();
 *   const { mutate: updateProfile, isPending: updating } = useUpdateUserProfile();
 *
 *   const handleAvatarChange = (newAvatarUrl: string) => {
 *     updateProfile({
 *       avatarUrl: newAvatarUrl,
 *     });
 *   };
 *
 *   return (
 *     <div className="profile-container">
 *       {profileLoading && <div>Loading...</div>}
 *       {profile?.data && (
 *         <>
 *           <img
 *             src={profile.data.avatarUrl}
 *             alt={profile.data.displayName}
 *             className="profile-avatar"
 *           />
 *           <h2>{profile.data.displayName}</h2>
 *           <p>{profile.data.status}</p>
 *           <button
 *             onClick={() => handleAvatarChange("new-url")}
 *             disabled={updating}
 *           >
 *             {updating ? "Updating..." : "Change Avatar"}
 *           </button>
 *         </>
 *       )}
 *     </div>
 *   );
 * }
 */

/**
 * Example 4: Using raw API function directly (if you need to skip React Query)
 *
 * async function fetchProfileDirectly() {
 *   const response = await profileApi.getUserProfile();
 *
 *   if (response.error) {
 *     console.error("Failed to fetch profile:", response.error.message);
 *     return;
 *   }
 *
 *   console.log("Profile:", response.data);
 * }
 */
