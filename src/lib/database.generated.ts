export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      activity_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string | null
          employee_id: string | null
          id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string | null
          employee_id?: string | null
          id?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string | null
          employee_id?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      annual_reviews: {
        Row: {
          completed_at: string | null
          conducted_by: string | null
          created_at: string | null
          employee_id: string
          goals_next_year: string | null
          id: string
          is_overridden: boolean | null
          rating: number | null
          rating_label: string | null
          review_year: number
          scheduled_at: string | null
          status: string
          summary: string | null
        }
        Insert: {
          completed_at?: string | null
          conducted_by?: string | null
          created_at?: string | null
          employee_id: string
          goals_next_year?: string | null
          id?: string
          is_overridden?: boolean | null
          rating?: number | null
          rating_label?: string | null
          review_year: number
          scheduled_at?: string | null
          status?: string
          summary?: string | null
        }
        Update: {
          completed_at?: string | null
          conducted_by?: string | null
          created_at?: string | null
          employee_id?: string
          goals_next_year?: string | null
          id?: string
          is_overridden?: boolean | null
          rating?: number | null
          rating_label?: string | null
          review_year?: number
          scheduled_at?: string | null
          status?: string
          summary?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "annual_reviews_conducted_by_fkey"
            columns: ["conducted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "annual_reviews_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      certifications: {
        Row: {
          added_by: string | null
          completion_date: string | null
          course_name: string
          created_at: string | null
          employee_id: string | null
          id: string
          proof_name: string | null
          proof_path: string | null
          proof_size: number | null
          status: string
          updated_at: string | null
        }
        Insert: {
          added_by?: string | null
          completion_date?: string | null
          course_name: string
          created_at?: string | null
          employee_id?: string | null
          id?: string
          proof_name?: string | null
          proof_path?: string | null
          proof_size?: number | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          added_by?: string | null
          completion_date?: string | null
          course_name?: string
          created_at?: string | null
          employee_id?: string | null
          id?: string
          proof_name?: string | null
          proof_path?: string | null
          proof_size?: number | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "certifications_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certifications_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      checkins: {
        Row: {
          business_dev_involvement: string | null
          checkin_date: string
          conducted_by: string | null
          contribution_to_growth: string | null
          created_at: string | null
          decision: string | null
          employee_id: string | null
          id: string
          motivation_level: string | null
          notes: string | null
          pillar_focus: string | null
          pillar_reflection: string | null
          updated_at: string | null
        }
        Insert: {
          business_dev_involvement?: string | null
          checkin_date: string
          conducted_by?: string | null
          contribution_to_growth?: string | null
          created_at?: string | null
          decision?: string | null
          employee_id?: string | null
          id?: string
          motivation_level?: string | null
          notes?: string | null
          pillar_focus?: string | null
          pillar_reflection?: string | null
          updated_at?: string | null
        }
        Update: {
          business_dev_involvement?: string | null
          checkin_date?: string
          conducted_by?: string | null
          contribution_to_growth?: string | null
          created_at?: string | null
          decision?: string | null
          employee_id?: string | null
          id?: string
          motivation_level?: string | null
          notes?: string | null
          pillar_focus?: string | null
          pillar_reflection?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "checkins_conducted_by_fkey"
            columns: ["conducted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkins_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          active: boolean
          code: string
          created_at: string
          id: string
          name: string
          type: string
        }
        Insert: {
          active?: boolean
          code?: string
          created_at?: string
          id?: string
          name: string
          type?: string
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          id?: string
          name?: string
          type?: string
        }
        Relationships: []
      }
      company_settings: {
        Row: {
          id: string
          setting_key: string
          setting_value: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          setting_key: string
          setting_value?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          setting_key?: string
          setting_value?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      company_types: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      contacts: {
        Row: {
          created_at: string | null
          department: string | null
          email: string | null
          id: string
          is_primary: boolean
          name: string
          phone: string | null
          role: string
        }
        Insert: {
          created_at?: string | null
          department?: string | null
          email?: string | null
          id?: string
          is_primary?: boolean
          name: string
          phone?: string | null
          role?: string
        }
        Update: {
          created_at?: string | null
          department?: string | null
          email?: string | null
          id?: string
          is_primary?: boolean
          name?: string
          phone?: string | null
          role?: string
        }
        Relationships: []
      }
      departments: {
        Row: {
          created_at: string | null
          id: string
          name: string
          type: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          type?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          type?: string | null
        }
        Relationships: []
      }
      development_plans: {
        Row: {
          created_at: string | null
          created_by: string | null
          employee_id: string | null
          goal_title: string
          id: string
          notes: string | null
          progress_pct: number | null
          status: string
          target_date: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          employee_id?: string | null
          goal_title: string
          id?: string
          notes?: string | null
          progress_pct?: number | null
          status?: string
          target_date?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          employee_id?: string | null
          goal_title?: string
          id?: string
          notes?: string | null
          progress_pct?: number | null
          status?: string
          target_date?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "development_plans_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "development_plans_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          acknowledged_at: string | null
          category: string
          created_at: string | null
          description: string | null
          employee_id: string | null
          file_path: string | null
          file_size_bytes: number | null
          file_url: string | null
          id: string
          mime_type: string | null
          name: string
          requires_acknowledgment: boolean | null
          section: string | null
          size_label: string | null
          type: string
          uploaded_by: string | null
          visible_to_employee: boolean
        }
        Insert: {
          acknowledged_at?: string | null
          category?: string
          created_at?: string | null
          description?: string | null
          employee_id?: string | null
          file_path?: string | null
          file_size_bytes?: number | null
          file_url?: string | null
          id?: string
          mime_type?: string | null
          name: string
          requires_acknowledgment?: boolean | null
          section?: string | null
          size_label?: string | null
          type?: string
          uploaded_by?: string | null
          visible_to_employee?: boolean
        }
        Update: {
          acknowledged_at?: string | null
          category?: string
          created_at?: string | null
          description?: string | null
          employee_id?: string | null
          file_path?: string | null
          file_size_bytes?: number | null
          file_url?: string | null
          id?: string
          mime_type?: string | null
          name?: string
          requires_acknowledgment?: boolean | null
          section?: string | null
          size_label?: string | null
          type?: string
          uploaded_by?: string | null
          visible_to_employee?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "documents_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_notes: {
        Row: {
          author_id: string
          body: string
          created_at: string | null
          employee_id: string
          id: string
          pinned: boolean
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string | null
          employee_id: string
          id?: string
          pinned?: boolean
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string | null
          employee_id?: string
          id?: string
          pinned?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "employee_notes_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_notes_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          access_role: string | null
          applicant_phase: string | null
          applicant_source: string | null
          applicant_stage: string | null
          archived: boolean
          avatar_url: string | null
          bio: string | null
          birthday_day: number | null
          birthday_month: number | null
          company_id: string | null
          created_at: string | null
          current_level: string | null
          current_status: string | null
          department: string
          email: string
          employment_type: string | null
          hiring_manager_id: string | null
          id: string
          lifecycle_status: string
          manager: string
          manager_id: string | null
          manager_user_id: string | null
          name: string
          next_level: string | null
          onboarding_completed_at: string | null
          pathway: string | null
          pathway_id: string | null
          phone: string | null
          pillar_focus: string | null
          position_applied_for: string | null
          progress: number
          readiness_level: string | null
          resume_url: string | null
          role: string
          start_date: string
          status: string
          team_id: string | null
          user_id: string | null
        }
        Insert: {
          access_role?: string | null
          applicant_phase?: string | null
          applicant_source?: string | null
          applicant_stage?: string | null
          archived?: boolean
          avatar_url?: string | null
          bio?: string | null
          birthday_day?: number | null
          birthday_month?: number | null
          company_id?: string | null
          created_at?: string | null
          current_level?: string | null
          current_status?: string | null
          department?: string
          email: string
          employment_type?: string | null
          hiring_manager_id?: string | null
          id?: string
          lifecycle_status?: string
          manager?: string
          manager_id?: string | null
          manager_user_id?: string | null
          name: string
          next_level?: string | null
          onboarding_completed_at?: string | null
          pathway?: string | null
          pathway_id?: string | null
          phone?: string | null
          pillar_focus?: string | null
          position_applied_for?: string | null
          progress?: number
          readiness_level?: string | null
          resume_url?: string | null
          role?: string
          start_date?: string
          status?: string
          team_id?: string | null
          user_id?: string | null
        }
        Update: {
          access_role?: string | null
          applicant_phase?: string | null
          applicant_source?: string | null
          applicant_stage?: string | null
          archived?: boolean
          avatar_url?: string | null
          bio?: string | null
          birthday_day?: number | null
          birthday_month?: number | null
          company_id?: string | null
          created_at?: string | null
          current_level?: string | null
          current_status?: string | null
          department?: string
          email?: string
          employment_type?: string | null
          hiring_manager_id?: string | null
          id?: string
          lifecycle_status?: string
          manager?: string
          manager_id?: string | null
          manager_user_id?: string | null
          name?: string
          next_level?: string | null
          onboarding_completed_at?: string | null
          pathway?: string | null
          pathway_id?: string | null
          phone?: string | null
          pillar_focus?: string | null
          position_applied_for?: string | null
          progress?: number
          readiness_level?: string | null
          resume_url?: string | null
          role?: string
          start_date?: string
          status?: string
          team_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_hiring_manager_id_fkey"
            columns: ["hiring_manager_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_manager_user_id_fkey"
            columns: ["manager_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_pathway_id_fkey"
            columns: ["pathway_id"]
            isOneToOne: false
            referencedRelation: "pathways"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_announcements: {
        Row: {
          active: boolean | null
          created_at: string | null
          created_by: string | null
          department_id: string | null
          employee_id: string | null
          end_date: string
          id: string
          message: string
          start_date: string
          title: string
          type: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          created_by?: string | null
          department_id?: string | null
          employee_id?: string | null
          end_date: string
          id?: string
          message?: string
          start_date: string
          title?: string
          type?: string
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          created_by?: string | null
          department_id?: string | null
          employee_id?: string | null
          end_date?: string
          id?: string
          message?: string
          start_date?: string
          title?: string
          type?: string
        }
        Relationships: []
      }
      job_titles: {
        Row: {
          active: boolean
          category: string
          created_at: string | null
          id: string
          title: string
        }
        Insert: {
          active?: boolean
          category?: string
          created_at?: string | null
          id?: string
          title: string
        }
        Update: {
          active?: boolean
          category?: string
          created_at?: string | null
          id?: string
          title?: string
        }
        Relationships: []
      }
      onboarding_tasks: {
        Row: {
          archived: boolean | null
          assigned_by: string | null
          assigned_by_name: string | null
          assigned_by_role: string | null
          category: string
          completed_at: string | null
          completed_by: string | null
          created_at: string | null
          description: string | null
          document_name: string | null
          document_url: string | null
          due_date: string | null
          employee_id: string
          id: string
          notes: string | null
          priority: string
          required: boolean
          status: string
          task_phase: string
          title: string
          triage: string
        }
        Insert: {
          archived?: boolean | null
          assigned_by?: string | null
          assigned_by_name?: string | null
          assigned_by_role?: string | null
          category?: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          description?: string | null
          document_name?: string | null
          document_url?: string | null
          due_date?: string | null
          employee_id: string
          id?: string
          notes?: string | null
          priority?: string
          required?: boolean
          status?: string
          task_phase?: string
          title: string
          triage?: string
        }
        Update: {
          archived?: boolean | null
          assigned_by?: string | null
          assigned_by_name?: string | null
          assigned_by_role?: string | null
          category?: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          description?: string | null
          document_name?: string | null
          document_url?: string | null
          due_date?: string | null
          employee_id?: string
          id?: string
          notes?: string | null
          priority?: string
          required?: boolean
          status?: string
          task_phase?: string
          title?: string
          triage?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_tasks_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_tasks_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_templates: {
        Row: {
          created_at: string | null
          department: string
          description: string | null
          id: string
          name: string
          used_count: number
        }
        Insert: {
          created_at?: string | null
          department?: string
          description?: string | null
          id?: string
          name: string
          used_count?: number
        }
        Update: {
          created_at?: string | null
          department?: string
          description?: string | null
          id?: string
          name?: string
          used_count?: number
        }
        Relationships: []
      }
      pathways: {
        Row: {
          active: boolean | null
          id: string
          name: string
        }
        Insert: {
          active?: boolean | null
          id?: string
          name: string
        }
        Update: {
          active?: boolean | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      quarterly_checkins: {
        Row: {
          completed_at: string | null
          conducted_by: string | null
          created_at: string | null
          employee_id: string
          id: string
          is_overridden: boolean | null
          notes: string | null
          quarter: string
          rating: string | null
          scheduled_at: string
          status: string
          year: number
        }
        Insert: {
          completed_at?: string | null
          conducted_by?: string | null
          created_at?: string | null
          employee_id: string
          id?: string
          is_overridden?: boolean | null
          notes?: string | null
          quarter: string
          rating?: string | null
          scheduled_at: string
          status?: string
          year: number
        }
        Update: {
          completed_at?: string | null
          conducted_by?: string | null
          created_at?: string | null
          employee_id?: string
          id?: string
          is_overridden?: boolean | null
          notes?: string | null
          quarter?: string
          rating?: string | null
          scheduled_at?: string
          status?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "quarterly_checkins_conducted_by_fkey"
            columns: ["conducted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quarterly_checkins_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          conducted_by: string | null
          created_at: string | null
          employee_id: string | null
          id: string
          notes: string | null
          pdf_name: string | null
          pdf_path: string | null
          pdf_size: number | null
          review_date: string
          review_type: string
          review_year: number
          sentiment: string | null
          updated_at: string | null
        }
        Insert: {
          conducted_by?: string | null
          created_at?: string | null
          employee_id?: string | null
          id?: string
          notes?: string | null
          pdf_name?: string | null
          pdf_path?: string | null
          pdf_size?: number | null
          review_date: string
          review_type: string
          review_year: number
          sentiment?: string | null
          updated_at?: string | null
        }
        Update: {
          conducted_by?: string | null
          created_at?: string | null
          employee_id?: string | null
          id?: string
          notes?: string | null
          pdf_name?: string | null
          pdf_path?: string | null
          pdf_size?: number | null
          review_date?: string
          review_type?: string
          review_year?: number
          sentiment?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_conducted_by_fkey"
            columns: ["conducted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      schedules: {
        Row: {
          color: string | null
          created_at: string | null
          department: string | null
          employee_id: string | null
          id: string
          location: string | null
          schedule_date: string | null
          time_label: string | null
          title: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          department?: string | null
          employee_id?: string | null
          id?: string
          location?: string | null
          schedule_date?: string | null
          time_label?: string | null
          title: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          department?: string | null
          employee_id?: string | null
          id?: string
          location?: string | null
          schedule_date?: string | null
          time_label?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedules_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      setup_tokens: {
        Row: {
          created_at: string | null
          email: string
          employee_id: string
          expires_at: string
          id: string
          token: string
          used: boolean
        }
        Insert: {
          created_at?: string | null
          email: string
          employee_id: string
          expires_at?: string
          id?: string
          token?: string
          used?: boolean
        }
        Update: {
          created_at?: string | null
          email?: string
          employee_id?: string
          expires_at?: string
          id?: string
          token?: string
          used?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "setup_tokens_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      task_comments: {
        Row: {
          author_id: string
          body: string
          created_at: string | null
          id: string
          task_id: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string | null
          id?: string
          task_id: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string | null
          id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "onboarding_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string | null
          department: string | null
          id: string
          manager_id: string | null
          name: string
        }
        Insert: {
          created_at?: string | null
          department?: string | null
          id?: string
          manager_id?: string | null
          name: string
        }
        Update: {
          created_at?: string | null
          department?: string | null
          id?: string
          manager_id?: string | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_department_fkey"
            columns: ["department"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["name"]
          },
          {
            foreignKeyName: "teams_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      template_tasks: {
        Row: {
          category: string
          created_at: string | null
          days_from_start: number
          id: string
          required: boolean
          template_id: string
          title: string
        }
        Insert: {
          category?: string
          created_at?: string | null
          days_from_start?: number
          id?: string
          required?: boolean
          template_id: string
          title: string
        }
        Update: {
          category?: string
          created_at?: string | null
          days_from_start?: number
          id?: string
          required?: boolean
          template_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_tasks_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "onboarding_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string | null
          email: string
          employee_id: string | null
          id: string
          role: string
        }
        Insert: {
          created_at?: string | null
          email: string
          employee_id?: string | null
          id: string
          role?: string
        }
        Update: {
          created_at?: string | null
          email?: string
          employee_id?: string | null
          id?: string
          role?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      activate_account: {
        Args: {
          p_email: string
          p_employee_id: string
          p_token_id: string
          p_user_id: string
        }
        Returns: Json
      }
      get_user_role: { Args: { user_id: string }; Returns: string }
      recalculate_employee_progress: {
        Args: { emp_id: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
