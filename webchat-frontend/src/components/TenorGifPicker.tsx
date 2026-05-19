import { useState, useRef, useCallback, useEffect } from "react";
import { motion } from "motion/react";
import { Search, Loader2 } from "lucide-react";
import { cn } from "../lib/cn";
import {
  TenorService,
  type TenorGif,
} from "../api-client/services/tenor/tenor.service";

interface TenorGifPickerProps {
  onGifSelected: (gifFile: File) => Promise<void>;
  isLoading?: boolean;
}

export const TenorGifPicker = ({
  onGifSelected,
  isLoading: externalIsLoading = false,
}: TenorGifPickerProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [gifs, setGifs] = useState<TenorGif[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [nextPos, setNextPos] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const gridContainerRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  // Load trending GIFs on first mount
  useEffect(() => {
    if (!hasLoaded) {
      loadTrendingGifs();
      setHasLoaded(true);
    }
  }, [hasLoaded]);

  const loadTrendingGifs = async () => {
    try {
      setIsSearching(true);
      setError(null);
      const result = await TenorService.getTrendingGifs();
      setGifs(result.results);
      setNextPos(result.next);
    } catch (err) {
      setError("Failed to load trending GIFs");
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);

    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Debounce search
    searchTimeoutRef.current = setTimeout(async () => {
      if (!query.trim()) {
        // Load trending if search is empty
        setGifs([]);
        setNextPos(undefined);
        await loadTrendingGifs();
        return;
      }

      try {
        setIsSearching(true);
        setError(null);
        const result = await TenorService.searchGifs(query);
        setGifs(result.results);
        setNextPos(result.next);
      } catch (err) {
        setError("Failed to search GIFs");
        console.error(err);
      } finally {
        setIsSearching(false);
      }
    }, 500);
  }, []);

  const handleLoadMore = async () => {
    if (!nextPos || isLoadingMore || isSearching) return;

    try {
      setIsLoadingMore(true);
      setError(null);
      const result = await TenorService.searchGifs(
        searchQuery || "trending",
        nextPos,
      );
      setGifs((prev) => [...prev, ...result.results]);
      setNextPos(result.next);
    } catch (err) {
      setError("Failed to load more GIFs");
      console.error(err);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleGifSelect = async (gif: TenorGif) => {
    try {
      setIsDownloading(true);
      setError(null);
      const gifFile = await TenorService.downloadGifAsFile(
        gif.media_formats.gif.url,
        gif.title,
      );
      await onGifSelected(gifFile);
    } catch (err) {
      setError("Failed to download GIF");
      console.error(err);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleScroll = useCallback(() => {
    if (!gridContainerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = gridContainerRef.current;
    // Load more when user scrolls to bottom
    if (scrollHeight - scrollTop - clientHeight < 500) {
      handleLoadMore();
    }
  }, [handleLoadMore]);

  return (
    <div className="px-4 md:px-6 py-3 border-t border-obsidian-500 border-opacity-30 bg-elevated">
      {/* Search Input */}
      <div className="mb-3">
        <div className="relative">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
          />
          <input
            type="text"
            placeholder="Search for GIFs..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            disabled={isSearching || externalIsLoading}
            className="w-full pl-10 pr-4 py-2 bg-card border border-obsidian-500 border-opacity-30 rounded-lg text-sm text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-cyan focus:border-opacity-50 disabled:opacity-60"
          />
        </div>
      </div>

      {/* GIF Grid */}
      <div
        ref={gridContainerRef}
        onScroll={handleScroll}
        className="max-h-60 overflow-y-auto"
      >
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 rounded-lg bg-semantic-danger/10 border border-semantic-danger/30 text-semantic-danger text-sm text-center"
          >
            {error}
          </motion.div>
        )}

        {isSearching ? (
          <div className="flex items-center justify-center h-32">
            <div className="flex flex-col items-center gap-2">
              <Loader2 size={24} className="animate-spin text-accent-cyan" />
              <p className="text-xs text-text-muted">Searching GIFs...</p>
            </div>
          </div>
        ) : gifs.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <p className="text-center text-text-muted text-sm">
              {searchQuery
                ? "No GIFs found. Try a different search!"
                : "No GIFs to display"}
            </p>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-3 sm:grid-cols-4 gap-2"
          >
            {gifs.map((gif) => (
              <motion.button
                key={gif.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleGifSelect(gif)}
                disabled={isDownloading || externalIsLoading}
                className={cn(
                  "relative group rounded-lg overflow-hidden border border-obsidian-500 border-opacity-30 hover:border-accent-cyan hover:border-opacity-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed",
                  "aspect-square bg-card",
                )}
              >
                <img
                  src={
                    gif.media_formats.tinygif?.url || gif.media_formats.gif.url
                  }
                  alt={gif.title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                  <span className="text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity text-center px-2 truncate">
                    {gif.title}
                  </span>
                </div>
              </motion.button>
            ))}
          </motion.div>
        )}

        {/* Load More Button */}
        {nextPos && !isSearching && gifs.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 flex justify-center"
          >
            <button
              onClick={handleLoadMore}
              disabled={isLoadingMore || isDownloading || externalIsLoading}
              className="px-3 py-1.5 text-xs bg-accent-cyan/10 border border-accent-cyan/30 rounded-lg text-accent-cyan hover:bg-accent-cyan/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isLoadingMore ? (
                <>
                  <Loader2 size={12} className="animate-spin" />
                  Loading...
                </>
              ) : (
                "Load More"
              )}
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default TenorGifPicker;
