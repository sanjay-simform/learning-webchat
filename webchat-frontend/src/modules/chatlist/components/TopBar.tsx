import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import { motion, AnimatePresence } from "motion/react";
import { clearAuthSession } from "../../../utils/auth-session";
import { useUserProfile } from "../../../api-client/services/profile";
import { UPLOAD_BASE_URL } from "../../../api-client/api-client";

export const TopBar = ({
  onSearchChange,
}: {
  onSearchChange: (query: string) => void;
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const userProfileQuery = useUserProfile();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  const handleLogout = () => {
    clearAuthSession();
    navigate("/signin");
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchValue(value);
    onSearchChange(value);
  };

  return (
    <div className="bg-base border-b border-obsidian-500 border-opacity-30 sticky top-0 z-40">
      <div className="h-16 px-4 md:px-6 flex items-center justify-between gap-4">
        {/* Search Bar */}
        <div className="flex-1 min-w-0">
          <div className="relative hidden md:block">
            <input
              type="text"
              placeholder="Search chats..."
              value={searchValue}
              onChange={handleSearchChange}
              className="w-full chat-input pl-10 pr-4 text-sm"
            />
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
        </div>

        {/* Profile Dropdown */}
        <div className="relative flex items-center gap-4">
          {/* Mobile Search Icon */}
          <button className="md:hidden p-2 hover:bg-elevated rounded-lg transition-colors">
            <svg
              className="w-5 h-5 text-text-secondary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </button>

          {/* Profile Button */}
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-2 p-1 bg-elevated border border-obsidian-500 border-opacity-50 hover:bg-card rounded-full transition-colors"
          >
            <div className="w-8 h-8  bg-accent-cyan bg-opacity-20 flex items-center justify-center">
              {userProfileQuery?.isLoading ? (
                <span className="text-xs font-semibold text-accent-cyan">
                  {user?.username?.charAt(0).toUpperCase()}
                </span>
              ) : userProfileQuery.data?.data?.avatarUrl ? (
                <img
                  src={UPLOAD_BASE_URL + userProfileQuery.data.data.avatarUrl}
                  alt={user?.username || "Profile"}
                  className="w-full h-full object-cover rounded-full"
                />
              ) : (
                <span className="text-xs font-semibold text-accent-cyan">
                  {user?.username?.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
          </button>

          {/* Dropdown Menu */}
          <AnimatePresence>
            {isDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
                className="absolute top-12 right-0 w-48 chat-floating rounded-lg shadow-elevation-2 overflow-hidden border border-obsidian-500 border-opacity-50"
              >
                <div className="p-3 border-b border-obsidian-500 border-opacity-30">
                  <p className="text-lg font-medium text-primary">
                    {userProfileQuery?.data?.data?.displayName || ""}
                  </p>
                  <p className="text-sm font-medium text-primary">
                    {user?.username}
                  </p>
                </div>
                <div className="p-2 space-y-1">
                  <button
                    onClick={() => {
                      navigate("/profile");
                      setIsDropdownOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-elevated transition-colors text-text-primary flex items-center gap-2"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    Profile
                  </button>
                  <button
                    onClick={() => {
                      navigate("/settings");
                      setIsDropdownOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-elevated transition-colors text-text-primary flex items-center gap-2"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    Settings
                  </button>
                </div>
                <div className="p-2 border-t border-obsidian-500 border-opacity-30">
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-semantic-danger hover:bg-opacity-10 transition-colors text-semantic-danger flex items-center gap-2"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                      />
                    </svg>
                    Sign Out
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Mobile Search Bar - shown only on mobile */}
      <div className="md:hidden px-4 pb-3">
        <div className="relative">
          <input
            type="text"
            placeholder="Search chats..."
            value={searchValue}
            onChange={handleSearchChange}
            className="w-full chat-input pl-10 pr-4 text-sm"
          />
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
      </div>
    </div>
  );
};
