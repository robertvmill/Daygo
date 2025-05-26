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