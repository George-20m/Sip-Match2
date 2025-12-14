import axios from 'axios';

const SPOTIFY_CLIENT_ID = process.env.EXPO_PUBLIC_SPOTIFY_CLIENT_ID || '';
const SPOTIFY_CLIENT_SECRET = process.env.EXPO_PUBLIC_SPOTIFY_CLIENT_SECRET || '';

let accessToken: string | null = null;
let tokenExpiry: number = 0;

export interface SpotifyTrack {
  id: string;
  name: string;
  artists: { name: string }[];
  album: {
    name: string;
    images: { url: string; height: number; width: number }[];
  };
  preview_url: string | null;
  duration_ms: number;
}

/**
 * Get Spotify access token using Client Credentials flow
 */
async function getAccessToken(): Promise<string> {
  // Return cached token if still valid
  if (accessToken && Date.now() < tokenExpiry) {
    return accessToken;
  }

  // Validate credentials
  if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
    throw new Error('Spotify credentials are not configured');
  }

  try {
    const credentials = `${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`;
    const encodedCredentials = btoa(credentials);
    
    const response = await axios.post(
      'https://accounts.spotify.com/api/token',
      'grant_type=client_credentials',
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${encodedCredentials}`,
        },
      }
    );

    accessToken = response.data.access_token;
    // Set expiry to 5 minutes before actual expiry for safety
    tokenExpiry = Date.now() + (response.data.expires_in - 300) * 1000;
    
    if (!accessToken) {
      throw new Error('No access token received from Spotify');
    }
    
    return accessToken;
  } catch (error) {
    console.error('Error getting Spotify access token:', error);
    throw new Error('Failed to authenticate with Spotify');
  }
}

/**
 * Search for tracks on Spotify
 */
export async function searchTracks(query: string, limit: number = 20): Promise<SpotifyTrack[]> {
  try {
    const token = await getAccessToken();
    
    const response = await axios.get('https://api.spotify.com/v1/search', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      params: {
        q: query,
        type: 'track',
        limit,
      },
    });

    return response.data.tracks.items;
  } catch (error) {
    console.error('Error searching tracks:', error);
    throw new Error('Failed to search tracks');
  }
}

/**
 * Get mood-based track recommendations
 */
export async function getMoodBasedTracks(mood: string): Promise<SpotifyTrack[]> {
  const moodQueries: { [key: string]: string } = {
    happy: 'happy upbeat pop',
    calm: 'calm relaxing ambient',
    energetic: 'energetic workout pump up',
    tired: 'chill sleep relaxing',
    romantic: 'romantic love songs',
    focused: 'focus study instrumental',
  };

  const query = moodQueries[mood] || 'popular music';
  return searchTracks(query, 15);
}