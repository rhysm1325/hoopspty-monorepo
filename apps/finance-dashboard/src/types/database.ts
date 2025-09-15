// Database types for AUSA Finance Dashboard
// Generated from Supabase schema

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole =
  | 'owner'
  | 'finance'
  | 'operations'
  | 'sales'
  | 'marketing'

export type AuditAction =
  | 'user_login'
  | 'user_logout'
  | 'user_invited'
  | 'user_activated'
  | 'user_deactivated'
  | 'role_changed'
  | 'settings_updated'
  | 'sync_initiated'
  | 'data_exported'
  | 'config_changed'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          first_name: string | null
          last_name: string | null
          role: UserRole
          is_active: boolean
          last_login_at: string | null
          invited_by: string | null
          invited_at: string | null
          email_verified: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          first_name?: string | null
          last_name?: string | null
          role?: UserRole
          is_active?: boolean
          last_login_at?: string | null
          invited_by?: string | null
          invited_at?: string | null
          email_verified?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          first_name?: string | null
          last_name?: string | null
          role?: UserRole
          is_active?: boolean
          last_login_at?: string | null
          invited_by?: string | null
          invited_at?: string | null
          email_verified?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'profiles_id_fkey'
            columns: ['id']
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'profiles_invited_by_fkey'
            columns: ['invited_by']
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      audit_logs: {
        Row: {
          id: string
          user_id: string | null
          action: AuditAction
          details: Json
          ip_address: string | null
          user_agent: string | null
          timestamp: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          action: AuditAction
          details?: Json
          ip_address?: string | null
          user_agent?: string | null
          timestamp?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          action?: AuditAction
          details?: Json
          ip_address?: string | null
          user_agent?: string | null
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: 'audit_logs_user_id_fkey'
            columns: ['user_id']
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      config_mappings: {
        Row: {
          id: string
          key: string
          type: string
          value: Json
          description: string | null
          is_active: boolean
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          key: string
          type: string
          value: Json
          description?: string | null
          is_active?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          key?: string
          type?: string
          value?: Json
          description?: string | null
          is_active?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'config_mappings_created_by_fkey'
            columns: ['created_by']
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      sync_checkpoints: {
        Row: {
          id: string
          entity_type: string
          last_updated_utc: string
          records_processed: number
          has_more_records: boolean
          sync_status: string
          error_message: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          entity_type: string
          last_updated_utc: string
          records_processed?: number
          has_more_records?: boolean
          sync_status?: string
          error_message?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          entity_type?: string
          last_updated_utc?: string
          records_processed?: number
          has_more_records?: boolean
          sync_status?: string
          error_message?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      user_profiles_with_stats: {
        Row: {
          id: string
          email: string
          first_name: string | null
          last_name: string | null
          role: UserRole
          is_active: boolean
          last_login_at: string | null
          invited_by: string | null
          invited_at: string | null
          email_verified: boolean
          created_at: string
          updated_at: string
          total_logins: number
          last_login_from_logs: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'profiles_id_fkey'
            columns: ['id']
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'profiles_invited_by_fkey'
            columns: ['invited_by']
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      user_role: UserRole
      audit_action: AuditAction
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Helper types for database operations
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']
export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']

// Specific table types
export type Profile = Tables<'profiles'>
export type ProfileInsert = TablesInsert<'profiles'>
export type ProfileUpdate = TablesUpdate<'profiles'>

export type AuditLogRow = Tables<'audit_logs'>
export type AuditLogInsert = TablesInsert<'audit_logs'>
export type AuditLogUpdate = TablesUpdate<'audit_logs'>

export type ConfigMapping = Tables<'config_mappings'>
export type ConfigMappingInsert = TablesInsert<'config_mappings'>
export type ConfigMappingUpdate = TablesUpdate<'config_mappings'>

export type SyncCheckpoint = Tables<'sync_checkpoints'>
export type SyncCheckpointInsert = TablesInsert<'sync_checkpoints'>
export type SyncCheckpointUpdate = TablesUpdate<'sync_checkpoints'>

// View types
export type UserProfileWithStats =
  Database['public']['Views']['user_profiles_with_stats']['Row']
