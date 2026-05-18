// Redis keys and channels for presence tracking
export const PRESENCE_KEY_PREFIX = 'user:presence';
export const PRESENCE_CHANNEL = 'presence:updates';
export const TYPING_KEY_PREFIX = 'user:typing';
export const TYPING_CHANNEL = 'typing:updates';

// Presence states
export const PRESENCE_ONLINE = 'online';
export const PRESENCE_OFFLINE = 'offline';

// Timing constants (in seconds)
export const INACTIVITY_TIMEOUT_SECONDS = 180; // 3 minutes
export const TYPING_INDICATOR_TTL_SECONDS = 3; // Auto-expire after 3 seconds of inactivity
export const PRESENCE_ACTIVITY_UPDATE_INTERVAL = 30; // Update activity every 30 seconds to reduce Redis writes

// Cron job timing
export const CLEANUP_CRON_EXPRESSION = '*/1 * * * *'; // Every minute
