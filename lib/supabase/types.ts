// Hand-written mirror of supabase/migrations/*.sql — regenerate with
// `supabase gen types typescript --linked` once a real project is linked,
// then this file can be replaced by the generated output.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type RecurrenceRule = "none" | "daily" | "weekly" | "monthly" | "yearly";
type Priority = "low" | "medium" | "high";
type SavingsColor = "domenico" | "elisabeth" | "together";
type MemberRole = "owner" | "member";

export interface Database {
  public: {
    Tables: {
      families: {
        Row: {
          id: string;
          name: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["families"]["Insert"]>;
      };
      profiles: {
        Row: {
          id: string;
          family_id: string | null;
          display_name: string;
          initial: string;
          color: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          family_id?: string | null;
          display_name: string;
          initial?: string;
          color?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
      };
      family_members: {
        Row: {
          family_id: string;
          profile_id: string;
          role: MemberRole;
          created_at: string;
        };
        Insert: {
          family_id: string;
          profile_id: string;
          role?: MemberRole;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["family_members"]["Insert"]>;
      };
      categories: {
        Row: {
          id: string;
          family_id: string;
          key: string;
          label: string;
          icon: string;
          color: string | null;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          family_id: string;
          key: string;
          label: string;
          icon?: string;
          color?: string | null;
          sort_order?: number;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["categories"]["Insert"]>;
      };
      events: {
        Row: {
          id: string;
          family_id: string;
          category_id: string | null;
          title: string;
          date: string;
          start_time: string | null;
          end_time: string | null;
          all_day: boolean;
          location: string | null;
          notes: string | null;
          color: string | null;
          reminder_minutes_before: number | null;
          recurrence_rule: RecurrenceRule;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          family_id: string;
          category_id?: string | null;
          title: string;
          date: string;
          start_time?: string | null;
          end_time?: string | null;
          all_day?: boolean;
          location?: string | null;
          notes?: string | null;
          color?: string | null;
          reminder_minutes_before?: number | null;
          recurrence_rule?: RecurrenceRule;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["events"]["Insert"]>;
      };
      event_participants: {
        Row: { event_id: string; profile_id: string; created_at: string };
        Insert: { event_id: string; profile_id: string; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["event_participants"]["Insert"]>;
      };
      tasks: {
        Row: {
          id: string;
          family_id: string;
          title: string;
          due_date: string | null;
          priority: Priority;
          done: boolean;
          done_at: string | null;
          is_shopping: boolean;
          recurrence_rule: RecurrenceRule;
          linked_event_id: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          family_id: string;
          title: string;
          due_date?: string | null;
          priority?: Priority;
          done?: boolean;
          done_at?: string | null;
          is_shopping?: boolean;
          recurrence_rule?: RecurrenceRule;
          linked_event_id?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["tasks"]["Insert"]>;
      };
      task_assignees: {
        Row: { task_id: string; profile_id: string; created_at: string };
        Insert: { task_id: string; profile_id: string; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["task_assignees"]["Insert"]>;
      };
      task_subtasks: {
        Row: {
          id: string;
          task_id: string;
          title: string;
          done: boolean;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          task_id: string;
          title: string;
          done?: boolean;
          sort_order?: number;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["task_subtasks"]["Insert"]>;
      };
      reminders: {
        Row: {
          id: string;
          family_id: string;
          event_id: string | null;
          task_id: string | null;
          remind_at: string;
          message: string | null;
          sent: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          family_id: string;
          event_id?: string | null;
          task_id?: string | null;
          remind_at: string;
          message?: string | null;
          sent?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["reminders"]["Insert"]>;
      };
      savings_goals: {
        Row: {
          id: string;
          family_id: string;
          title: string;
          target_amount: number;
          color: SavingsColor;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          family_id: string;
          title: string;
          target_amount: number;
          color?: SavingsColor;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["savings_goals"]["Insert"]>;
      };
      savings_entries: {
        Row: {
          id: string;
          goal_id: string;
          amount: number;
          contributor_id: string | null;
          note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          goal_id: string;
          amount: number;
          contributor_id?: string | null;
          note?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["savings_entries"]["Insert"]>;
      };
      notifications: {
        Row: {
          id: string;
          family_id: string;
          profile_id: string | null;
          title: string;
          body: string;
          read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          family_id: string;
          profile_id?: string | null;
          title: string;
          body: string;
          read?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["notifications"]["Insert"]>;
      };
      user_preferences: {
        Row: {
          profile_id: string;
          reduced_motion_override: boolean | null;
          calendar_filters: Json;
          has_onboarded: boolean;
          updated_at: string;
        };
        Insert: {
          profile_id: string;
          reduced_motion_override?: boolean | null;
          calendar_filters?: Json;
          has_onboarded?: boolean;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["user_preferences"]["Insert"]>;
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_family_member: { Args: { target_family_id: string }; Returns: boolean };
      is_family_owner: { Args: { target_family_id: string }; Returns: boolean };
      seed_default_categories: { Args: { target_family_id: string }; Returns: undefined };
    };
    Enums: Record<string, never>;
  };
}
