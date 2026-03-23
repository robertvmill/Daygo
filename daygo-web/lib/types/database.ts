export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          avatar_url: string | null;
          created_at: string;
          subscription_tier: 'free' | 'pro';
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          subscription_status: 'inactive' | 'active' | 'canceled' | 'past_due';
          subscription_current_period_end: string | null;
          onboarding_completed: boolean;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          subscription_tier?: 'free' | 'pro';
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          subscription_status?: 'inactive' | 'active' | 'canceled' | 'past_due';
          subscription_current_period_end?: string | null;
          onboarding_completed?: boolean;
        };
        Update: {
          id?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          subscription_tier?: 'free' | 'pro';
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          subscription_status?: 'inactive' | 'active' | 'canceled' | 'past_due';
          subscription_current_period_end?: string | null;
          onboarding_completed?: boolean;
        };
      };
      habits: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string | null;
          weight: number;
          is_active: boolean;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          description?: string | null;
          weight?: number;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          description?: string | null;
          weight?: number;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
        };
      };
      habit_logs: {
        Row: {
          id: string;
          habit_id: string;
          user_id: string;
          date: string;
          completed: boolean;
        };
        Insert: {
          id?: string;
          habit_id: string;
          user_id: string;
          date?: string;
          completed?: boolean;
        };
        Update: {
          id?: string;
          habit_id?: string;
          user_id?: string;
          date?: string;
          completed?: boolean;
        };
      };
      goals: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          description: string | null;
          icon: string | null;
          metric_name: string;
          metric_target: number;
          metric_current: number;
          deadline: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          description?: string | null;
          icon?: string | null;
          metric_name: string;
          metric_target: number;
          metric_current?: number;
          deadline?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          description?: string | null;
          icon?: string | null;
          metric_name?: string;
          metric_target?: number;
          metric_current?: number;
          deadline?: string | null;
          created_at?: string;
        };
      };
      habit_goal_links: {
        Row: {
          id: string;
          habit_id: string;
          goal_id: string;
        };
        Insert: {
          id?: string;
          habit_id: string;
          goal_id: string;
        };
        Update: {
          id?: string;
          habit_id?: string;
          goal_id?: string;
        };
      };
      mantras: {
        Row: {
          id: string;
          user_id: string;
          text: string;
          is_active: boolean;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          text: string;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          text?: string;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
        };
      };
      journal_prompts: {
        Row: {
          id: string;
          user_id: string;
          prompt: string;
          template_text: string | null;
          icon: string | null;
          color: string | null;
          is_active: boolean;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          prompt: string;
          template_text?: string | null;
          icon?: string | null;
          color?: string | null;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          prompt?: string;
          template_text?: string | null;
          icon?: string | null;
          color?: string | null;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
        };
      };
      journal_entries: {
        Row: {
          id: string;
          prompt_id: string;
          user_id: string;
          entry: string;
          date: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          prompt_id: string;
          user_id: string;
          entry: string;
          date?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          prompt_id?: string;
          user_id?: string;
          entry?: string;
          date?: string;
          created_at?: string;
        };
      };
      todos: {
        Row: {
          id: string;
          user_id: string;
          text: string;
          date: string;
          completed: boolean;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          text: string;
          date: string;
          completed?: boolean;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          text?: string;
          date?: string;
          completed?: boolean;
          sort_order?: number;
          created_at?: string;
        };
      };
      home_visions: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          subtitle: string | null;
          pillars: any;
          rule_title: string | null;
          rule_text: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title?: string;
          subtitle?: string | null;
          pillars?: any;
          rule_title?: string | null;
          rule_text?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          subtitle?: string | null;
          pillars?: any;
          rule_title?: string | null;
          rule_text?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      visions: {
        Row: {
          id: string;
          user_id: string;
          text: string;
          is_active: boolean;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          text: string;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          text?: string;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
        };
      };
      feedback: {
        Row: {
          id: string;
          user_email: string | null;
          message: string;
          screenshot_url: string | null;
          resolved: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_email?: string | null;
          message: string;
          screenshot_url?: string | null;
          resolved?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_email?: string | null;
          message?: string;
          screenshot_url?: string | null;
          resolved?: boolean;
          created_at?: string;
        };
      };
      notes: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          content: string;
          note_type: 'text' | 'canvas';
          canvas_data: Record<string, unknown> | null;
          tags: string[];
          is_starred: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          content?: string;
          note_type?: 'text' | 'canvas';
          canvas_data?: Record<string, unknown> | null;
          tags?: string[];
          is_starred?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          content?: string;
          note_type?: 'text' | 'canvas';
          canvas_data?: Record<string, unknown> | null;
          tags?: string[];
          is_starred?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      schedule_events: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          description: string | null;
          date: string;
          start_time: string;
          end_time: string;
          is_ai_generated: boolean;
          completed: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          description?: string | null;
          date: string;
          start_time: string;
          end_time: string;
          is_ai_generated?: boolean;
          completed?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          description?: string | null;
          date?: string;
          start_time?: string;
          end_time?: string;
          is_ai_generated?: boolean;
          completed?: boolean;
          created_at?: string;
        };
      };
      habit_miss_notes: {
        Row: {
          id: string;
          user_id: string;
          habit_id: string;
          date: string;
          note: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          habit_id: string;
          date: string;
          note: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          habit_id?: string;
          date?: string;
          note?: string;
          created_at?: string;
        };
      };
      calendar_rules: {
        Row: {
          id: string;
          user_id: string;
          rule_text: string;
          is_active: boolean;
          priority: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          rule_text: string;
          is_active?: boolean;
          priority?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          rule_text?: string;
          is_active?: boolean;
          priority?: number;
          created_at?: string;
        };
      };
      google_calendar_tokens: {
        Row: {
          id: string;
          user_id: string;
          access_token: string;
          refresh_token: string;
          token_expiry: string;
          calendar_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          access_token: string;
          refresh_token: string;
          token_expiry: string;
          calendar_id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          access_token?: string;
          refresh_token?: string;
          token_expiry?: string;
          calendar_id?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      user_preferences: {
        Row: {
          id: string;
          user_id: string;
          wake_time: string;
          bed_time: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          wake_time?: string;
          bed_time?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          wake_time?: string;
          bed_time?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      daily_notes: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          note: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          date: string;
          note?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          date?: string;
          note?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      kanban_columns: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          description: string;
          color: string;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          description?: string;
          color?: string;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          description?: string;
          color?: string;
          sort_order?: number;
          created_at?: string;
        };
      };
      kanban_cards: {
        Row: {
          id: string;
          user_id: string;
          column_id: string;
          title: string;
          description: string;
          status: 'todo' | 'in_progress' | 'done';
          tags: string[];
          high_priority: boolean;
          priority: number | null;
          sort_order: number;
          created_at: string;
          updated_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          column_id: string;
          title: string;
          description?: string;
          status?: 'todo' | 'in_progress' | 'done';
          tags?: string[];
          high_priority?: boolean;
          priority?: number | null;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
          completed_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          column_id?: string;
          title?: string;
          description?: string;
          status?: 'todo' | 'in_progress' | 'done';
          tags?: string[];
          high_priority?: boolean;
          priority?: number | null;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
          completed_at?: string | null;
        };
      };
      kanban_subtasks: {
        Row: {
          id: string;
          user_id: string;
          card_id: string;
          text: string;
          completed: boolean;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          card_id: string;
          text: string;
          completed?: boolean;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          card_id?: string;
          text?: string;
          completed?: boolean;
          sort_order?: number;
          created_at?: string;
        };
      };
      kanban_goal_links: {
        Row: {
          id: string;
          card_id: string;
          goal_id: string;
        };
        Insert: {
          id?: string;
          card_id: string;
          goal_id: string;
        };
        Update: {
          id?: string;
          card_id?: string;
          goal_id?: string;
        };
      };
      kanban_time_entries: {
        Row: {
          id: string;
          user_id: string;
          card_id: string;
          start_time: string;
          end_time: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          card_id: string;
          start_time: string;
          end_time?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          card_id?: string;
          start_time?: string;
          end_time?: string | null;
          created_at?: string;
        };
      };
      schedule_templates: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string | null;
          template_data: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          description?: string | null;
          template_data: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          description?: string | null;
          template_data?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      ai_journals: {
        Row: {
          id: string;
          user_id: string;
          prompt: string;
          response: string | null;
          date: string;
          is_active: boolean;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          prompt: string;
          response?: string | null;
          date?: string;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          prompt?: string;
          response?: string | null;
          date?: string;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
        };
      };
      inspirations: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          reason: string;
          image_url: string | null;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          reason: string;
          image_url?: string | null;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          reason?: string;
          image_url?: string | null;
          sort_order?: number;
          created_at?: string;
        };
      };
      food_images: {
        Row: {
          id: string;
          user_id: string;
          category: 'plants' | 'meats' | 'fish' | 'fruit' | 'superfoods';
          image_url: string;
          name: string | null;
          sort_order: number;
          weight: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          category: 'plants' | 'meats' | 'fish' | 'fruit' | 'superfoods';
          image_url: string;
          name?: string | null;
          sort_order?: number;
          weight?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          category?: 'plants' | 'meats' | 'fish' | 'fruit' | 'superfoods';
          image_url?: string;
          name?: string | null;
          sort_order?: number;
          weight?: number;
          created_at?: string;
        };
      };
      identities: {
        Row: {
          id: string;
          user_id: string;
          text: string;
          is_active: boolean;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          text: string;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          text?: string;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
        };
      };
      books: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          author: string | null;
          is_reading: boolean;
          completed_at: string | null;
          started_at: string;
          notes: string | null;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          author?: string | null;
          is_reading?: boolean;
          completed_at?: string | null;
          started_at?: string;
          notes?: string | null;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          author?: string | null;
          is_reading?: boolean;
          completed_at?: string | null;
          started_at?: string;
          notes?: string | null;
          sort_order?: number;
          created_at?: string;
        };
      };
      values: {
        Row: {
          id: string;
          user_id: string;
          text: string;
          is_active: boolean;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          text: string;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          text?: string;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
        };
      };
      book_learnings: {
        Row: {
          id: string;
          book_id: string;
          user_id: string;
          content: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          book_id: string;
          user_id: string;
          content: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          book_id?: string;
          user_id?: string;
          content?: string;
          created_at?: string;
        };
      };
      crystal_day_logs: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          item_key: string;
          completed: boolean;
          note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          date: string;
          item_key: string;
          completed?: boolean;
          note?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          date?: string;
          item_key?: string;
          completed?: boolean;
          note?: string | null;
          created_at?: string;
        };
      };
      expenses: {
        Row: {
          id: string;
          user_id: string;
          amount: number;
          category: 'Food' | 'Transport' | 'Entertainment' | 'Shopping' | 'Bills' | 'Health' | 'Other';
          description: string | null;
          date: string;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          amount: number;
          category: 'Food' | 'Transport' | 'Entertainment' | 'Shopping' | 'Bills' | 'Health' | 'Other';
          description?: string | null;
          date: string;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          amount?: number;
          category?: 'Food' | 'Transport' | 'Entertainment' | 'Shopping' | 'Bills' | 'Health' | 'Other';
          description?: string | null;
          date?: string;
          is_active?: boolean;
          created_at?: string;
        };
      };
      gift_ideas: {
        Row: {
          id: string;
          user_id: string;
          recipient: string;
          idea: string;
          used: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          recipient?: string;
          idea: string;
          used?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          recipient?: string;
          idea?: string;
          used?: boolean;
          created_at?: string;
        };
      };
      pushup_logs: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          count: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          date: string;
          count: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          date?: string;
          count?: number;
          created_at?: string;
        };
      };
      daily_reflections: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          answer: boolean;
          reason: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          date: string;
          answer: boolean;
          reason?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          date?: string;
          answer?: boolean;
          reason?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: {
      daily_scores: {
        Row: {
          user_id: string;
          date: string;
          score: number;
          completed_count: number;
          total_count: number;
        };
      };
    };
    Functions: {};
    Enums: {};
  };
}

// Convenience types
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Habit = Database['public']['Tables']['habits']['Row'];
export type HabitLog = Database['public']['Tables']['habit_logs']['Row'];
export type Goal = Database['public']['Tables']['goals']['Row'];
export type HabitGoalLink = Database['public']['Tables']['habit_goal_links']['Row'];
export type Mantra = Database['public']['Tables']['mantras']['Row'];
export type JournalPrompt = Database['public']['Tables']['journal_prompts']['Row'];
export type JournalEntry = Database['public']['Tables']['journal_entries']['Row'];
export type Todo = Database['public']['Tables']['todos']['Row'];
export type Vision = Database['public']['Tables']['visions']['Row'];
export type Note = Database['public']['Tables']['notes']['Row'];
export type ScheduleEvent = Database['public']['Tables']['schedule_events']['Row'];
export type HabitMissNote = Database['public']['Tables']['habit_miss_notes']['Row'];
export type CalendarRule = Database['public']['Tables']['calendar_rules']['Row'];
export type GoogleCalendarToken = Database['public']['Tables']['google_calendar_tokens']['Row'];
export type UserPreferences = Database['public']['Tables']['user_preferences']['Row'];
export type DailyNote = Database['public']['Tables']['daily_notes']['Row'];
export type DailyScore = Database['public']['Views']['daily_scores']['Row'];
export type ScheduleTemplate = Database['public']['Tables']['schedule_templates']['Row'];
export type AIJournal = Database['public']['Tables']['ai_journals']['Row'];
export type Inspiration = Database['public']['Tables']['inspirations']['Row'];
export type FoodImage = Database['public']['Tables']['food_images']['Row'];
export type FoodCategory = 'plants' | 'meats' | 'fish' | 'carbs' | 'fruit' | 'superfoods';
export type Identity = Database['public']['Tables']['identities']['Row'];
export type Book = Database['public']['Tables']['books']['Row'];
export type Value = Database['public']['Tables']['values']['Row'];
export type BookLearning = Database['public']['Tables']['book_learnings']['Row'];
export type CrystalDayLog = Database['public']['Tables']['crystal_day_logs']['Row'];
export type Expense = Database['public']['Tables']['expenses']['Row'];
export type ExpenseCategory = Expense['category'];
export type GiftIdea = Database['public']['Tables']['gift_ideas']['Row'];
export type PushupLog = Database['public']['Tables']['pushup_logs']['Row'];
export type DailyReflection = Database['public']['Tables']['daily_reflections']['Row'];

// Extended types for UI
export type HabitWithLog = Habit & {
  completed: boolean;
  missNote: string | null;
};

export type GoalWithHabits = Goal & {
  habits: Habit[];
  progress: number; // 0-100
};

export type JournalPromptWithEntry = JournalPrompt & {
  todayEntry: string | null;
};

// Unified item type for the Today screen drag-and-drop
export type TodayItem =
  | { type: 'mantra'; data: Mantra }
  | { type: 'habit'; data: HabitWithLog }
  | { type: 'journal'; data: JournalPromptWithEntry }
  | { type: 'todo'; data: Todo }
  | { type: 'vision'; data: Vision }
  | { type: 'identity'; data: Identity };

