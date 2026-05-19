import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  useUserProfile,
  useUpdateUserProfile,
} from "../api-client/services/profile";
import {
  UploadService,
  type UploadProgressEvent,
} from "../api-client/services/upload";
import { Button } from "./Button";
import { FormInput } from "./FormInput";
import { Skeleton, SkeletonCircle, SkeletonText } from "./Skeleton";
import { cn } from "../lib/cn";
import { UPLOAD_BASE_URL } from "../api-client/api-client";
import { Circle, CircleMinus, Cross, LucideCross } from "lucide-react";

interface ProfileCardProps {
  className?: string;
}

export const ProfileCard = ({ className }: ProfileCardProps) => {
  const {
    data: profileResponse,
    isPending: isLoading,
    isError: isProfileError,
  } = useUserProfile();
  const {
    mutate: updateProfile,
    isPending: isUpdating,
    error: updateError,
  } = useUpdateUserProfile();

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  let profile = profileResponse?.data;

  // Initialize edit fields when profile loads
  useEffect(() => {
    if (profile) {
      setEditName(profile.displayName || "");
      setEditStatus(profile.status || "");
    }
  }, [profile]);

  const handleEditClick = () => {
    setIsEditing(true);
    setUploadError(null);
    setSuccessMessage(null);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditName(profile?.displayName || "");
    setEditStatus(profile?.status || "");
    setUploadError(null);
  };

  const handleSaveChanges = () => {
    updateProfile(
      {
        displayName: editName,
        status: editStatus,
      },
      {
        onSuccess: (response) => {
          if (response.data) {
            setSuccessMessage("Profile updated successfully!");
            setIsEditing(false);
            setTimeout(() => setSuccessMessage(null), 3000);
          }
        },
      },
    );
  };

  const handleProfilePictureClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);
    setUploadProgress(0);

    try {
      const response = await UploadService.uploadImage(
        file,
        (progress: UploadProgressEvent) => {
          setUploadProgress(progress.percentage);
        },
      );

      // Update profile with new avatar URL
      updateProfile(
        {
          avatarUrl: response.url,
        },
        {
          onSuccess: (updateResponse) => {
            if (updateResponse.data) {
              setSuccessMessage("Profile picture updated successfully!");
              setTimeout(() => setSuccessMessage(null), 3000);
            }
          },
        },
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to upload image";
      setUploadError(errorMessage);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveAvatar = () => {
    updateProfile(
      {
        avatarUrl: null,
      },
      {
        onSuccess: (response) => {
          if (response.data) {
            setSuccessMessage("Profile picture removed successfully!");
            setTimeout(() => setSuccessMessage(null), 3000);
          }
        },
      },
    );
  };

  // Get initials for avatar fallback
  const getInitials = () => {
    if (profile?.displayName) {
      return profile.displayName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return "U";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24 }}
      className={cn("chat-card p-6 space-y-6", className)}
    >
      {/* Loading State */}
      {isLoading ? (
        <div className="space-y-6">
          <div className="flex flex-col items-center gap-4">
            <SkeletonCircle size="lg" />
            <SkeletonText lines={1} className="w-32" />
            <SkeletonText lines={1} className="w-40" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
          </div>
        </div>
      ) : isProfileError ? (
        // Error State
        <div className="text-center space-y-4">
          <p className="text-semantic-danger">Failed to load profile</p>
          <Button
            variant="secondary"
            size="md"
            onClick={() => window.location.reload()}
          >
            Retry
          </Button>
        </div>
      ) : (
        <>
          {/* Profile Picture Section */}
          <div className="flex flex-col items-center gap-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative"
            >
              {/* Avatar/Profile Picture */}
              <div
                className={cn(
                  "relative w-24 h-24 rounded-full overflow-hidden border-2 border-accent-cyan border-opacity-50 flex items-center justify-center bg-gradient-to-br from-accent-cyan/20 to-accent-violet/20",
                  isUploading && "opacity-70",
                )}
              >
                {profile?.avatarUrl ? (
                  <img
                    src={UPLOAD_BASE_URL + profile.avatarUrl}
                    alt={profile.displayName || "Profile"}
                    className="w-full h-full object-cover aspect-square"
                  />
                ) : (
                  <span className="text-3xl font-bold text-accent-cyan">
                    {getInitials()}
                  </span>
                )}

                {/* Upload Progress Overlay */}
                {isUploading && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 rounded-full border-4 border-accent-cyan border-t-transparent animate-spin" />
                      <span className="text-xs text-white font-medium">
                        {uploadProgress}%
                      </span>
                    </div>
                  </motion.div>
                )}

                {/* Upload Icon Overlay */}
                {!isUploading && isEditing && !profile?.avatarUrl && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center cursor-pointer hover:bg-opacity-60 transition-all"
                    onClick={handleProfilePictureClick}
                  >
                    <svg
                      className="w-6 h-6 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                  </motion.div>
                )}
              </div>
              {profile?.avatarUrl && isEditing ? (
                <span
                  className={cn(
                    "bg-red-500 rounded-full absolute top-0 right-0   cursor-pointer hover:bg-red-600 transition-colors",
                    isUpdating && "opacity-50 cursor-not-allowed",
                  )}
                  onClick={handleRemoveAvatar}
                  title="Remove profile picture"
                >
                  <CircleMinus className="w-6 h-6 text-white" />
                </span>
              ) : null}

              {/* Hidden File Input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
                disabled={isUploading || !isEditing}
              />
            </motion.div>

            {/* Display Name and Status - Read Mode */}
            {!isEditing && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center space-y-2"
              >
                <h2 className="text-xl font-semibold text-primary">
                  {profile?.displayName || "No name set"}
                </h2>
                <p className="text-sm text-text-muted">
                  {profile?.status || "No status set"}
                </p>
              </motion.div>
            )}
          </div>

          {/* Edit Form */}
          <AnimatePresence mode="wait">
            {isEditing ? (
              <motion.div
                key="edit-mode"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-4 pt-4 border-t border-obsidian-500 border-opacity-30"
              >
                <FormInput
                  label="Display Name"
                  placeholder="Enter your display name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  disabled={isUpdating}
                />

                <FormInput
                  label="Status"
                  placeholder="What's on your mind?"
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  disabled={isUpdating}
                />

                {/* Error Messages */}
                {uploadError && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 bg-semantic-danger/10 border border-semantic-danger/30 rounded text-semantic-danger text-sm"
                  >
                    {uploadError}
                  </motion.div>
                )}

                {updateError?.error && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 bg-semantic-danger/10 border border-semantic-danger/30 rounded text-semantic-danger text-sm"
                  >
                    {updateError.error.message}
                  </motion.div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 pt-2">
                  <Button
                    variant="primary"
                    size="md"
                    className="flex-1"
                    onClick={handleSaveChanges}
                    isLoading={isUpdating}
                    disabled={isUploading}
                  >
                    Save Changes
                  </Button>
                  <Button
                    variant="secondary"
                    size="md"
                    className="flex-1"
                    onClick={handleCancel}
                    disabled={isUpdating || isUploading}
                  >
                    Cancel
                  </Button>
                </div>
              </motion.div>
            ) : (
              /* Edit Button - Read Mode */
              <motion.div
                key="read-mode"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <Button
                  variant="primary"
                  size="md"
                  className="w-full"
                  onClick={handleEditClick}
                >
                  Edit Profile
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Success Message */}
          <AnimatePresence>
            {successMessage && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-3 bg-semantic-success/10 border border-semantic-success/30 rounded text-semantic-success text-sm text-center"
              >
                ✓ {successMessage}
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </motion.div>
  );
};
