// Database types for AUSA Finance Dashboard
// Auto-generated from database schema - DO NOT EDIT MANUALLY
// Run 'npm run types:generate' to regenerate

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// Enums from database
export type UserRole =
  | 'owner'
  | 'finance'
  | 'operations'
  | 'sales'
  | 'marketing'
export type RevenueStream = 'tours' | 'dr-dish' | 'marketing' | 'other'
export type SyncStatus =
  | 'idle'
  | 'running'
  | 'completed'
  | 'error'
  | 'cancelled'
  | 'partial'
export type ConfigType =
  | 'system'
  | 'revenue_stream'
  | 'account_code'
  | 'item_code'
  | 'contact_id'
  | 'gst_method'
  | 'sync_schedule'
  | 'company_details'
  | 'deferred_revenue'
  | 'cogs_mapping'
  | 'facility_mapping'
  | 'alert_thresholds'
  | 'dashboard_settings'
  | 'export_settings'

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
      // User Management Tables
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
        ]
      }

      // Audit and Security Tables
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
        Relationships: []
      }

      // Configuration Tables
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
        Relationships: []
      }

      business_rules: {
        Row: {
          id: string
          rule_name: string
          rule_type: string
          rule_definition: Json
          is_active: boolean
          applies_to_revenue_stream: RevenueStream | null
          effective_date: string | null
          expiry_date: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          rule_name: string
          rule_type: string
          rule_definition: Json
          is_active?: boolean
          applies_to_revenue_stream?: RevenueStream | null
          effective_date?: string | null
          expiry_date?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          rule_name?: string
          rule_type?: string
          rule_definition?: Json
          is_active?: boolean
          applies_to_revenue_stream?: RevenueStream | null
          effective_date?: string | null
          expiry_date?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }

      // Sync Management Tables
      sync_checkpoints: {
        Row: {
          id: string
          entity_type: string
          last_updated_utc: string
          records_processed: number
          has_more_records: boolean
          sync_status: SyncStatus
          error_message: string | null
          sync_duration_seconds: number | null
          last_sync_started_at: string | null
          last_sync_completed_at: string | null
          last_successful_sync_at: string | null
          total_sync_count: number
          error_count: number
          last_error_at: string | null
          rate_limit_hits: number
          average_sync_duration_seconds: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          entity_type: string
          last_updated_utc: string
          records_processed?: number
          has_more_records?: boolean
          sync_status?: SyncStatus
          error_message?: string | null
          sync_duration_seconds?: number | null
          last_sync_started_at?: string | null
          last_sync_completed_at?: string | null
          last_successful_sync_at?: string | null
          total_sync_count?: number
          error_count?: number
          last_error_at?: string | null
          rate_limit_hits?: number
          average_sync_duration_seconds?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          entity_type?: string
          last_updated_utc?: string
          records_processed?: number
          has_more_records?: boolean
          sync_status?: SyncStatus
          error_message?: string | null
          sync_duration_seconds?: number | null
          last_sync_started_at?: string | null
          last_sync_completed_at?: string | null
          last_successful_sync_at?: string | null
          total_sync_count?: number
          error_count?: number
          last_error_at?: string | null
          rate_limit_hits?: number
          average_sync_duration_seconds?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }

      // Xero Staging Tables
      stg_accounts: {
        Row: {
          id: string
          xero_id: string
          code: string
          name: string
          type: string | null
          tax_type: string | null
          description: string | null
          is_active: boolean
          updated_date_utc: string
          raw_data: Json
          sync_batch_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          xero_id: string
          code: string
          name: string
          type?: string | null
          tax_type?: string | null
          description?: string | null
          is_active?: boolean
          updated_date_utc: string
          raw_data: Json
          sync_batch_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          xero_id?: string
          code?: string
          name?: string
          type?: string | null
          tax_type?: string | null
          description?: string | null
          is_active?: boolean
          updated_date_utc?: string
          raw_data?: Json
          sync_batch_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }

      stg_contacts: {
        Row: {
          id: string
          xero_id: string
          name: string
          contact_number: string | null
          account_number: string | null
          contact_status: string
          is_supplier: boolean
          is_customer: boolean
          email_address: string | null
          phone_numbers: Json
          addresses: Json
          updated_date_utc: string
          raw_data: Json
          sync_batch_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          xero_id: string
          name: string
          contact_number?: string | null
          account_number?: string | null
          contact_status?: string
          is_supplier?: boolean
          is_customer?: boolean
          email_address?: string | null
          phone_numbers?: Json
          addresses?: Json
          updated_date_utc: string
          raw_data: Json
          sync_batch_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          xero_id?: string
          name?: string
          contact_number?: string | null
          account_number?: string | null
          contact_status?: string
          is_supplier?: boolean
          is_customer?: boolean
          email_address?: string | null
          phone_numbers?: Json
          addresses?: Json
          updated_date_utc?: string
          raw_data?: Json
          sync_batch_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }

      stg_invoices: {
        Row: {
          id: string
          xero_id: string
          type: string
          invoice_number: string | null
          reference: string | null
          contact_id: string
          contact_name: string
          date: string
          due_date: string
          status: string
          line_amount_types: string
          sub_total: number
          total_tax: number
          total: number
          amount_due: number
          amount_paid: number
          amount_credited: number
          currency_code: string
          updated_date_utc: string
          raw_data: Json
          sync_batch_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          xero_id: string
          type: string
          invoice_number?: string | null
          reference?: string | null
          contact_id: string
          contact_name: string
          date: string
          due_date: string
          status: string
          line_amount_types?: string
          sub_total?: number
          total_tax?: number
          total: number
          amount_due?: number
          amount_paid?: number
          amount_credited?: number
          currency_code?: string
          updated_date_utc: string
          raw_data: Json
          sync_batch_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          xero_id?: string
          type?: string
          invoice_number?: string | null
          reference?: string | null
          contact_id?: string
          contact_name?: string
          date?: string
          due_date?: string
          status?: string
          line_amount_types?: string
          sub_total?: number
          total_tax?: number
          total?: number
          amount_due?: number
          amount_paid?: number
          amount_credited?: number
          currency_code?: string
          updated_date_utc?: string
          raw_data?: Json
          sync_batch_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }

      // Analytics Dimension Tables
      dim_date: {
        Row: {
          date_key: string
          year: number
          month: number
          day: number
          quarter: number
          day_of_week: number
          day_of_year: number
          week_of_year: number
          fy_year: number
          fy_quarter: number
          fy_month: number
          fy_week: number
          fy_day: number
          is_fy_start: boolean
          is_fy_end: boolean
          is_weekend: boolean
          is_public_holiday: boolean
          date_label: string
          month_label: string
          fy_label: string
          quarter_label: string
          week_label: string
          created_at: string
        }
        Insert: {
          date_key: string
          year: number
          month: number
          day: number
          quarter: number
          day_of_week: number
          day_of_year: number
          week_of_year: number
          fy_year: number
          fy_quarter: number
          fy_month: number
          fy_week: number
          fy_day: number
          is_fy_start?: boolean
          is_fy_end?: boolean
          is_weekend?: boolean
          is_public_holiday?: boolean
          date_label: string
          month_label: string
          fy_label: string
          quarter_label: string
          week_label: string
          created_at?: string
        }
        Update: {
          date_key?: string
          year?: number
          month?: number
          day?: number
          quarter?: number
          day_of_week?: number
          day_of_year?: number
          week_of_year?: number
          fy_year?: number
          fy_quarter?: number
          fy_month?: number
          fy_week?: number
          fy_day?: number
          is_fy_start?: boolean
          is_fy_end?: boolean
          is_weekend?: boolean
          is_public_holiday?: boolean
          date_label?: string
          month_label?: string
          fy_label?: string
          quarter_label?: string
          week_label?: string
          created_at?: string
        }
        Relationships: []
      }

      dim_account: {
        Row: {
          account_key: string
          xero_id: string
          code: string
          name: string
          type: string
          tax_type: string | null
          description: string | null
          is_active: boolean
          revenue_stream: RevenueStream | null
          is_revenue_account: boolean
          is_cogs_account: boolean
          is_expense_account: boolean
          is_asset_account: boolean
          is_liability_account: boolean
          is_equity_account: boolean
          parent_account_code: string | null
          account_level: number
          sort_order: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          account_key?: string
          xero_id: string
          code: string
          name: string
          type: string
          tax_type?: string | null
          description?: string | null
          is_active?: boolean
          revenue_stream?: RevenueStream | null
          is_revenue_account?: boolean
          is_cogs_account?: boolean
          is_expense_account?: boolean
          is_asset_account?: boolean
          is_liability_account?: boolean
          is_equity_account?: boolean
          parent_account_code?: string | null
          account_level?: number
          sort_order?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          account_key?: string
          xero_id?: string
          code?: string
          name?: string
          type?: string
          tax_type?: string | null
          description?: string | null
          is_active?: boolean
          revenue_stream?: RevenueStream | null
          is_revenue_account?: boolean
          is_cogs_account?: boolean
          is_expense_account?: boolean
          is_asset_account?: boolean
          is_liability_account?: boolean
          is_equity_account?: boolean
          parent_account_code?: string | null
          account_level?: number
          sort_order?: number | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }

      // Analytics Fact Tables
      fact_ar_lines: {
        Row: {
          ar_key: string
          date_key: string
          due_date_key: string
          account_key: string
          contact_key: string
          item_key: string | null
          xero_invoice_id: string
          invoice_number: string | null
          xero_line_id: string | null
          line_amount: number
          tax_amount: number
          total_amount: number
          outstanding_amount: number
          quantity: number
          unit_price: number
          revenue_stream: RevenueStream
          customer_segment: string | null
          invoice_status: string
          days_past_due: number
          aging_bucket: string
          tracking_data: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          ar_key?: string
          date_key: string
          due_date_key: string
          account_key: string
          contact_key: string
          item_key?: string | null
          xero_invoice_id: string
          invoice_number?: string | null
          xero_line_id?: string | null
          line_amount?: number
          tax_amount?: number
          total_amount?: number
          outstanding_amount?: number
          quantity?: number
          unit_price?: number
          revenue_stream: RevenueStream
          customer_segment?: string | null
          invoice_status: string
          days_past_due?: number
          aging_bucket?: string
          tracking_data?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          ar_key?: string
          date_key?: string
          due_date_key?: string
          account_key?: string
          contact_key?: string
          item_key?: string | null
          xero_invoice_id?: string
          invoice_number?: string | null
          xero_line_id?: string | null
          line_amount?: number
          tax_amount?: number
          total_amount?: number
          outstanding_amount?: number
          quantity?: number
          unit_price?: number
          revenue_stream?: RevenueStream
          customer_segment?: string | null
          invoice_status?: string
          days_past_due?: number
          aging_bucket?: string
          tracking_data?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'fact_ar_lines_date_key_fkey'
            columns: ['date_key']
            referencedRelation: 'dim_date'
            referencedColumns: ['date_key']
          },
          {
            foreignKeyName: 'fact_ar_lines_account_key_fkey'
            columns: ['account_key']
            referencedRelation: 'dim_account'
            referencedColumns: ['account_key']
          },
        ]
      }
    }

    Views: {
      // Analytics Views
      fact_revenue_by_week: {
        Row: {
          fy_year: number
          fy_week: number
          fy_label: string
          revenue_stream: RevenueStream
          invoice_count: number
          gross_revenue: number
          tax_amount: number
          total_revenue: number
          week_start_date: string
          week_end_date: string
        }
        Relationships: []
      }

      fact_cash_position: {
        Row: {
          bank_account_code: string
          bank_account_name: string
          running_balance: number
          last_transaction_date: string | null
          transaction_count: number
        }
        Relationships: []
      }

      sync_status_dashboard: {
        Row: {
          entity_type: string
          sync_status: SyncStatus
          last_updated_utc: string
          records_processed: number
          last_successful_sync_at: string | null
          total_sync_count: number
          error_count: number
          hours_since_last_sync: number | null
          health_status: string
          success_rate_percent: number
        }
        Relationships: []
      }

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
        Relationships: []
      }
    }

    Functions: {
      get_effective_business_rule: {
        Args: {
          rule_name_param: string
          as_of_date?: string
        }
        Returns: Json
      }
      get_revenue_stream_for_account: {
        Args: {
          account_code_param: string
        }
        Returns: string
      }
      update_sync_checkpoint: {
        Args: {
          entity_type_param: string
          last_updated_utc_param: string
          records_processed_param: number
          status_param: SyncStatus
          error_message_param?: string
        }
        Returns: undefined
      }
      validate_database_integrity: {
        Args: Record<PropertyKey, never>
        Returns: {
          check_name: string
          status: string
          details: string
        }[]
      }
    }

    Enums: {
      user_role: UserRole
      revenue_stream: RevenueStream
      sync_status: SyncStatus
      audit_action: AuditAction
      config_type: ConfigType
    }

    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Helper types for database operations
export type Tables<
  PublicTableNameOrOptions extends
    | keyof Database['public']['Tables']
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions['schema']]['Tables']
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof Database['public']['Tables']
    ? Database['public']['Tables'][PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof Database['public']['Tables']
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions['schema']]['Tables']
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof Database['public']['Tables']
    ? Database['public']['Tables'][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof Database['public']['Tables']
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions['schema']]['Tables']
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof Database['public']['Tables']
    ? Database['public']['Tables'][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

// Specific table types for convenience
export type Profile = Tables<'profiles'>
export type ProfileInsert = TablesInsert<'profiles'>
export type ProfileUpdate = TablesUpdate<'profiles'>

export type AuditLog = Tables<'audit_logs'>
export type AuditLogInsert = TablesInsert<'audit_logs'>

export type ConfigMapping = Tables<'config_mappings'>
export type ConfigMappingInsert = TablesInsert<'config_mappings'>

export type SyncCheckpoint = Tables<'sync_checkpoints'>
export type SyncCheckpointInsert = TablesInsert<'sync_checkpoints'>
export type SyncCheckpointUpdate = TablesUpdate<'sync_checkpoints'>

export type StagingAccount = Tables<'stg_accounts'>
export type StagingContact = Tables<'stg_contacts'>
export type StagingInvoice = Tables<'stg_invoices'>

export type DimAccount = Tables<'dim_account'>
export type FactARLine = Tables<'fact_ar_lines'>

// View types
export type UserProfileWithStats =
  Database['public']['Views']['user_profiles_with_stats']['Row']
export type RevenueByWeek =
  Database['public']['Views']['fact_revenue_by_week']['Row']
export type CashPosition =
  Database['public']['Views']['fact_cash_position']['Row']
export type SyncStatusDashboard =
  Database['public']['Views']['sync_status_dashboard']['Row']

// Function types
export type DatabaseFunctions = Database['public']['Functions']
