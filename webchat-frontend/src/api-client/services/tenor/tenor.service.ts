import axios from "axios";

export interface TenorGif {
  id: string;
  title: string;
  media_formats: {
    gif: {
      url: string;
    };
    tinygif?: {
      url: string;
    };
  };
  created: number;
  shares: number;
  url: string;
}

export interface TenorSearchResponse {
  results: TenorGif[];
  next: string;
}

export class TenorService {
  private static readonly TENOR_API_BASE = "https://g.tenor.com/v1";
  // Using a public API key - for production, this should be environment-based
  private static readonly API_KEY = import.meta.env.VITE_TENOR_API_KEY || "";
  private static readonly LIMIT = 20;

  /**
   * Search for GIFs on Tenor
   * @param query - Search query
   * @param pos - Position for pagination
   * @returns Promise resolving to search results
   */
  static async searchGifs(
    query: string,
    pos?: string,
  ): Promise<TenorSearchResponse> {
    try {
      if (!query.trim()) {
        return { results: [], next: "" };
      }

      const response = await axios.get<TenorSearchResponse>(
        `${this.TENOR_API_BASE}/search`,
        {
          params: {
            q: query,
            key: this.API_KEY,
            limit: this.LIMIT,
            pos: pos || "0",
            media_filter: "gif",
          },
          withCredentials: true,
        },
      );

      return response.data;
    } catch (error) {
      console.error("Error searching GIFs:", error);
      throw new Error("Failed to search GIFs");
    }
  }

  /**
   * Download a GIF as a File object
   * @param gifUrl - URL of the GIF
   * @param gifTitle - Title for the GIF file
   * @returns Promise resolving to File object
   */
  static async downloadGifAsFile(
    gifUrl: string,
    gifTitle: string,
  ): Promise<File> {
    try {
      const response = await axios.get(gifUrl, {
        responseType: "arraybuffer",
      });

      const blob = new Blob([response.data], { type: "image/gif" });
      const fileName = `${gifTitle.replace(/\s+/g, "_").substring(0, 50)}.gif`;

      return new File([blob], fileName, { type: "image/gif" });
    } catch (error) {
      console.error("Error downloading GIF:", error);
      throw new Error("Failed to download GIF");
    }
  }

  /**
   * Get trending GIFs
   * @returns Promise resolving to trending GIFs
   */
  static async getTrendingGifs(): Promise<TenorSearchResponse> {
    try {
      const response = await axios.get<TenorSearchResponse>(
        `${this.TENOR_API_BASE}/trending`,
        {
          params: {
            key: this.API_KEY,
            limit: this.LIMIT,
            media_filter: "gif",
          },
        },
      );

      return response.data;
    } catch (error) {
      console.error("Error fetching trending GIFs:", error);
      throw new Error("Failed to fetch trending GIFs");
    }
  }
}
