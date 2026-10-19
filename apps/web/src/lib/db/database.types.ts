
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "boats": {
                  Row: {
                    "created_at": string,"id": string,"name": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"name": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"name"?: string
                  }
                  Relationships: [
                    
                  ]
                },"documents": {
                  Row: {
                    "added_by": string | null,"boat_id": string,"content_type": string | null,"created_at": string,"filename": string | null,"id": string,"received_at": string,"size_bytes": number | null,"source": Database["public"]['Enums']["document_source"],"storage_path": string,"type": Database["public"]['Enums']["document_type"]
                  }
                  ComputedFields: never
                  Insert: {
                    "added_by"?: string | null,"boat_id": string,"content_type"?: string | null,"created_at"?: string,"filename"?: string | null,"id"?: string,"received_at"?: string,"size_bytes"?: number | null,"source": Database["public"]['Enums']["document_source"],"storage_path": string,"type"?: Database["public"]['Enums']["document_type"]
                  }
                  Update: {
                    "added_by"?: string | null,"boat_id"?: string,"content_type"?: string | null,"created_at"?: string,"filename"?: string | null,"id"?: string,"received_at"?: string,"size_bytes"?: number | null,"source"?: Database["public"]['Enums']["document_source"],"storage_path"?: string,"type"?: Database["public"]['Enums']["document_type"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "documents_added_by_fkey"
      columns: ["added_by"]
isOneToOne: false
      referencedRelation: "people"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "documents_boat_id_fkey"
      columns: ["boat_id"]
isOneToOne: false
      referencedRelation: "boats"
      referencedColumns: ["id"]
    }
                  ]
                },"expenses": {
                  Row: {
                    "amount_cents": number,"boat_id": string,"created_at": string,"currency": string,"description": string,"document_id": string | null,"id": string,"notes": string | null,"paid_by": string,"spent_on": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount_cents": number,"boat_id": string,"created_at"?: string,"currency": string,"description": string,"document_id"?: string | null,"id"?: string,"notes"?: string | null,"paid_by": string,"spent_on": string
                  }
                  Update: {
                    "amount_cents"?: number,"boat_id"?: string,"created_at"?: string,"currency"?: string,"description"?: string,"document_id"?: string | null,"id"?: string,"notes"?: string | null,"paid_by"?: string,"spent_on"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "expenses_boat_id_fkey"
      columns: ["boat_id"]
isOneToOne: false
      referencedRelation: "boats"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "expenses_document_id_boat_id_fkey"
      columns: ["document_id","boat_id"]
isOneToOne: false
      referencedRelation: "documents"
      referencedColumns: ["id","boat_id"]
    },{
      foreignKeyName: "expenses_paid_by_fkey"
      columns: ["paid_by"]
isOneToOne: false
      referencedRelation: "people"
      referencedColumns: ["id"]
    }
                  ]
                },"maintenance_items": {
                  Row: {
                    "boat_id": string,"created_at": string,"document_id": string | null,"every_engine_hours": number | null,"every_months": number | null,"id": string,"last_done_engine_hours": number | null,"last_done_on": string,"notes": string | null,"title": string
                  }
                  ComputedFields: never
                  Insert: {
                    "boat_id": string,"created_at"?: string,"document_id"?: string | null,"every_engine_hours"?: number | null,"every_months"?: number | null,"id"?: string,"last_done_engine_hours"?: number | null,"last_done_on": string,"notes"?: string | null,"title": string
                  }
                  Update: {
                    "boat_id"?: string,"created_at"?: string,"document_id"?: string | null,"every_engine_hours"?: number | null,"every_months"?: number | null,"id"?: string,"last_done_engine_hours"?: number | null,"last_done_on"?: string,"notes"?: string | null,"title"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "maintenance_items_boat_id_fkey"
      columns: ["boat_id"]
isOneToOne: false
      referencedRelation: "boats"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "maintenance_items_document_id_boat_id_fkey"
      columns: ["document_id","boat_id"]
isOneToOne: false
      referencedRelation: "documents"
      referencedColumns: ["id","boat_id"]
    }
                  ]
                },"memberships": {
                  Row: {
                    "boat_id": string,"created_at": string,"ownership_share": number,"person_id": string,"role": Database["public"]['Enums']["membership_role"]
                  }
                  ComputedFields: never
                  Insert: {
                    "boat_id": string,"created_at"?: string,"ownership_share"?: number,"person_id": string,"role": Database["public"]['Enums']["membership_role"]
                  }
                  Update: {
                    "boat_id"?: string,"created_at"?: string,"ownership_share"?: number,"person_id"?: string,"role"?: Database["public"]['Enums']["membership_role"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "memberships_boat_id_fkey"
      columns: ["boat_id"]
isOneToOne: false
      referencedRelation: "boats"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "memberships_person_id_fkey"
      columns: ["person_id"]
isOneToOne: false
      referencedRelation: "people"
      referencedColumns: ["id"]
    }
                  ]
                },"people": {
                  Row: {
                    "auth_subject": string | null,"created_at": string,"display_name": string | null,"email": string | null,"id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "auth_subject"?: string | null,"created_at"?: string,"display_name"?: string | null,"email"?: string | null,"id"?: string
                  }
                  Update: {
                    "auth_subject"?: string | null,"created_at"?: string,"display_name"?: string | null,"email"?: string | null,"id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"renewals": {
                  Row: {
                    "boat_id": string,"created_at": string,"document_id": string | null,"expires_on": string,"id": string,"kind": Database["public"]['Enums']["renewal_kind"],"notes": string | null,"reference": string | null,"title": string
                  }
                  ComputedFields: never
                  Insert: {
                    "boat_id": string,"created_at"?: string,"document_id"?: string | null,"expires_on": string,"id"?: string,"kind": Database["public"]['Enums']["renewal_kind"],"notes"?: string | null,"reference"?: string | null,"title": string
                  }
                  Update: {
                    "boat_id"?: string,"created_at"?: string,"document_id"?: string | null,"expires_on"?: string,"id"?: string,"kind"?: Database["public"]['Enums']["renewal_kind"],"notes"?: string | null,"reference"?: string | null,"title"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "renewals_boat_id_fkey"
      columns: ["boat_id"]
isOneToOne: false
      referencedRelation: "boats"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "renewals_document_id_boat_id_fkey"
      columns: ["document_id","boat_id"]
isOneToOne: false
      referencedRelation: "documents"
      referencedColumns: ["id","boat_id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "boat_id_from_storage_path":
{ Args: { "path": string }; Returns: string
                           },
"can_read_boat":
{ Args: { "boat": string }; Returns: boolean
                           },
"can_write_boat":
{ Args: { "boat": string }; Returns: boolean
                           },
"current_person_id":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"my_role_on":
{ Args: { "boat": string }; Returns: Database["public"]['Enums']["membership_role"]
                           },
"shares_boat_with":
{ Args: { "person": string }; Returns: boolean
                           }
          }
          Enums: {
            "document_source": "email"|"upload","document_type": "unsorted"|"email"|"invoice"|"receipt"|"insurance"|"registration"|"manual"|"contract"|"survey"|"other","membership_role": "owner"|"co_owner"|"crew"|"read_only","renewal_kind": "insurance"|"registration"|"licence"|"other"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "document_source": ["email", "upload"],"document_type": ["unsorted", "email", "invoice", "receipt", "insurance", "registration", "manual", "contract", "survey", "other"],"membership_role": ["owner", "co_owner", "crew", "read_only"],"renewal_kind": ["insurance", "registration", "licence", "other"]
          }
        }
} as const
