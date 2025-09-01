export interface User {
  id: string;
  username: string;
  name: string;
  isLoggedIn: boolean;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  location: string;
  assignedDate: string;
  status: 'active' | 'completed' | 'pending';
}

export interface DataEntry {
  id: string;
  projectId: string;
  activityType: 'Survey' | 'Plantation' | 'Maintenance';
  date: string;
  latitude: number;
  longitude: number;
  weather: string;
  measurements: string;
  notes: string;
  photos: MediaItem[];
  synced: boolean;
  createdAt: string;
}

export interface MediaItem {
  id: string;
  uri: string;
  type: 'photo' | 'video';
  latitude?: number;
  longitude?: number;
  timestamp: string;
}

export interface SyncStatus {
  isOnline: boolean;
  lastSyncDate?: string;
  pendingEntries: number;
  pendingMedia: number;
}
