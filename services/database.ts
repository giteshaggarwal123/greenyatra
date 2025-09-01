import * as SQLite from 'expo-sqlite';
import { DataEntry, MediaItem, Project } from '../types';

class DatabaseService {
  private db: SQLite.SQLiteDatabase | null = null;

  async init() {
    this.db = await SQLite.openDatabaseAsync('greenyatra.db');
    await this.createTables();
  }

  private async createTables() {
    if (!this.db) return;

    await this.db.execAsync(`
      PRAGMA journal_mode = WAL;
      
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        location TEXT,
        assignedDate TEXT,
        status TEXT DEFAULT 'active'
      );

      CREATE TABLE IF NOT EXISTS data_entries (
        id TEXT PRIMARY KEY,
        projectId TEXT,
        activityType TEXT,
        date TEXT,
        latitude REAL,
        longitude REAL,
        weather TEXT,
        measurements TEXT,
        notes TEXT,
        synced INTEGER DEFAULT 0,
        createdAt TEXT,
        FOREIGN KEY (projectId) REFERENCES projects (id)
      );

      CREATE TABLE IF NOT EXISTS media_items (
        id TEXT PRIMARY KEY,
        dataEntryId TEXT,
        uri TEXT,
        type TEXT,
        latitude REAL,
        longitude REAL,
        timestamp TEXT,
        FOREIGN KEY (dataEntryId) REFERENCES data_entries (id)
      );
    `);
  }

  async getProjects(): Promise<Project[]> {
    if (!this.db) return [];
    const result = await this.db.getAllAsync('SELECT * FROM projects ORDER BY assignedDate DESC');
    return result as Project[];
  }

  async saveDataEntry(entry: DataEntry): Promise<void> {
    if (!this.db) return;

    await this.db.runAsync(
      `INSERT OR REPLACE INTO data_entries 
       (id, projectId, activityType, date, latitude, longitude, weather, measurements, notes, synced, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        entry.id,
        entry.projectId,
        entry.activityType,
        entry.date,
        entry.latitude,
        entry.longitude,
        entry.weather,
        entry.measurements,
        entry.notes,
        entry.synced ? 1 : 0,
        entry.createdAt,
      ]
    );

    // Save media items
    for (const media of entry.photos) {
      await this.db.runAsync(
        `INSERT OR REPLACE INTO media_items (id, dataEntryId, uri, type, latitude, longitude, timestamp)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [media.id, entry.id, media.uri, media.type, media.latitude, media.longitude, media.timestamp]
      );
    }
  }

  async getUnsyncedEntries(): Promise<DataEntry[]> {
    if (!this.db) return [];
    
    const entries = await this.db.getAllAsync(
      'SELECT * FROM data_entries WHERE synced = 0 ORDER BY createdAt DESC'
    ) as DataEntry[];

    // Fetch media for each entry
    for (const entry of entries) {
      const media = await this.db.getAllAsync(
        'SELECT * FROM media_items WHERE dataEntryId = ?',
        [entry.id]
      ) as MediaItem[];
      entry.photos = media;
    }

    return entries;
  }

  async markEntriesAsSynced(entryIds: string[]): Promise<void> {
    if (!this.db || entryIds.length === 0) return;
    
    const placeholders = entryIds.map(() => '?').join(',');
    await this.db.runAsync(
      `UPDATE data_entries SET synced = 1 WHERE id IN (${placeholders})`,
      entryIds
    );
  }
}

export const databaseService = new DatabaseService();
