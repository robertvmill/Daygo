import { Timestamp } from "firebase/firestore";

export type JournalEntry = {
  id: string;
  title: string;
  content: string;
  createdAt: Timestamp;
  userId: string;
  templateId?: string;
  templateFields?: Record<string, string | undefined>;
};

export type TemplateField = {
  name: string;
  type: 'text' | 'textarea' | 'boolean' | 'mantra' | 'table' | 'fillable_table';
  label: string;
  placeholder?: string;
  required?: boolean;
  tableData?: {
    rows: number;
    columns: number;
    headers: string[];
    cells?: string[][];
    cellsJson?: string;
  };
};

export type JournalTemplate = {
  id: string;
  name: string;
  description: string;
  fields: TemplateField[];
  createdAt: Timestamp;
  userId: string;
  isDefault?: boolean;
};

// DayScore types
export type DaySegment = {
  id: string;
  startTime: string; // HH:MM format
  endTime: string;   // HH:MM format
  title: string;
  description?: string;
  category?: 'work' | 'personal' | 'health' | 'learning' | 'social' | 'other';
  score?: number;    // 1-10 scale, null if not scored yet
  notes?: string;    // Coaching notes and reflection
  completed?: boolean; // Whether the segment was actually completed as planned
};

export type DayScore = {
  id: string;
  userId: string;
  date: string;      // YYYY-MM-DD format
  segments: DaySegment[];
  overallScore?: number;    // Average of all segment scores
  dailyReflection?: string; // Overall reflection for the day
  createdAt: Timestamp;
  updatedAt?: Timestamp;
  isTemplate?: boolean;     // If this is a template for recurring days
  templateName?: string;    // Name for template days
}; 