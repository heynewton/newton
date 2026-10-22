
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
                    "created_at": string,"deleting_since": string | null,"email_alias": string,"id": string,"name": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"deleting_since"?: string | null,"email_alias": string,"id"?: string,"name": string
                  }
                  Update: {
                    "created_at"?: string,"deleting_since"?: string | null,"email_alias"?: string,"id"?: string,"name"?: string
                  }
                  Relationships: [
                    
                  ]
                },"boat_procedures": {
                  Row: {
                    "boat_id": string,"content": string,"created_at": string,"id": string,"title": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "boat_id": string,"content": string,"created_at"?: string,"id"?: string,"title": string,"updated_at"?: string
                  }
                  Update: {
                    "boat_id"?: string,"content"?: string,"created_at"?: string,"id"?: string,"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "boat_procedures_boat_id_fkey"
      columns: ["boat_id"]
isOneToOne: false
      referencedRelation: "boats"
      referencedColumns: ["id"]
    }
                  ]
                },"document_chunks": {
                  Row: {
                    "boat_id": string,"chunk_index": number,"content": string,"created_at": string,"document_id": string,"embedding": string,"embedding_model": string,"id": string,"page": number
                  }
                  ComputedFields: never
                  Insert: {
                    "boat_id": string,"chunk_index": number,"content": string,"created_at"?: string,"document_id": string,"embedding": string,"embedding_model": string,"id"?: string,"page": number
                  }
                  Update: {
                    "boat_id"?: string,"chunk_index"?: number,"content"?: string,"created_at"?: string,"document_id"?: string,"embedding"?: string,"embedding_model"?: string,"id"?: string,"page"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "document_chunks_boat_id_fkey"
      columns: ["boat_id"]
isOneToOne: false
      referencedRelation: "boats"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "document_chunks_document_id_boat_id_fkey"
      columns: ["document_id","boat_id"]
isOneToOne: false
      referencedRelation: "documents"
      referencedColumns: ["id","boat_id"]
    }
                  ]
                },"procedure_chunks": {
                  Row: {
                    "boat_id": string,"chunk_index": number,"content": string,"created_at": string,"embedding": string,"embedding_model": string,"id": string,"procedure_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "boat_id": string,"chunk_index": number,"content": string,"created_at"?: string,"embedding": string,"embedding_model": string,"id"?: string,"procedure_id": string
                  }
                  Update: {
                    "boat_id"?: string,"chunk_index"?: number,"content"?: string,"created_at"?: string,"embedding"?: string,"embedding_model"?: string,"id"?: string,"procedure_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "procedure_chunks_boat_id_fkey"
      columns: ["boat_id"]
isOneToOne: false
      referencedRelation: "boats"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "procedure_chunks_procedure_id_boat_id_fkey"
      columns: ["procedure_id","boat_id"]
isOneToOne: false
      referencedRelation: "boat_procedures"
      referencedColumns: ["id","boat_id"]
    }
                  ]
                },"document_filings": {
                  Row: {
                    "attempts": number,"boat_id": string,"confidence": string | null,"created_at": string,"document_id": string,"document_type": Database["public"]['Enums']["document_type"] | null,"flags": NonNullable<Json>,"id": string,"last_error": string | null,"model": string | null,"proposal": Json | null,"status": Database["public"]['Enums']["filing_status"],"summary": string | null,"updated_at": string,"vendor": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "attempts"?: number,"boat_id": string,"confidence"?: string | null,"created_at"?: string,"document_id": string,"document_type"?: Database["public"]['Enums']["document_type"] | null,"flags"?: NonNullable<Json>,"id"?: string,"last_error"?: string | null,"model"?: string | null,"proposal"?: Json | null,"status": Database["public"]['Enums']["filing_status"],"summary"?: string | null,"updated_at"?: string,"vendor"?: string | null
                  }
                  Update: {
                    "attempts"?: number,"boat_id"?: string,"confidence"?: string | null,"created_at"?: string,"document_id"?: string,"document_type"?: Database["public"]['Enums']["document_type"] | null,"flags"?: NonNullable<Json>,"id"?: string,"last_error"?: string | null,"model"?: string | null,"proposal"?: Json | null,"status"?: Database["public"]['Enums']["filing_status"],"summary"?: string | null,"updated_at"?: string,"vendor"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "document_filings_boat_id_fkey"
      columns: ["boat_id"]
isOneToOne: false
      referencedRelation: "boats"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "document_filings_document_id_boat_id_fkey"
      columns: ["document_id","boat_id"]
isOneToOne: false
      referencedRelation: "documents"
      referencedColumns: ["id","boat_id"]
    }
                  ]
                },"documents": {
                  Row: {
                    "added_by": string | null,"boat_id": string,"content_type": string | null,"created_at": string,"filename": string | null,"id": string,"inbound_email_id": string | null,"received_at": string,"size_bytes": number | null,"source": Database["public"]['Enums']["document_source"],"storage_path": string,"type": Database["public"]['Enums']["document_type"]
                  }
                  ComputedFields: never
                  Insert: {
                    "added_by"?: string | null,"boat_id": string,"content_type"?: string | null,"created_at"?: string,"filename"?: string | null,"id"?: string,"inbound_email_id"?: string | null,"received_at"?: string,"size_bytes"?: number | null,"source": Database["public"]['Enums']["document_source"],"storage_path": string,"type"?: Database["public"]['Enums']["document_type"]
                  }
                  Update: {
                    "added_by"?: string | null,"boat_id"?: string,"content_type"?: string | null,"created_at"?: string,"filename"?: string | null,"id"?: string,"inbound_email_id"?: string | null,"received_at"?: string,"size_bytes"?: number | null,"source"?: Database["public"]['Enums']["document_source"],"storage_path"?: string,"type"?: Database["public"]['Enums']["document_type"]
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
    },{
      foreignKeyName: "documents_inbound_email_id_fkey"
      columns: ["inbound_email_id"]
isOneToOne: false
      referencedRelation: "inbound_emails"
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
                },"inbound_emails": {
                  Row: {
                    "attachment_count": number,"boat_id": string,"completed_at": string | null,"created_at": string,"from_address": string,"from_name": string | null,"id": string,"message_id": string | null,"provider": string,"provider_email_id": string,"received_at": string,"sender_person_id": string | null,"status": Database["public"]['Enums']["inbound_email_status"],"subject": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "attachment_count"?: number,"boat_id": string,"completed_at"?: string | null,"created_at"?: string,"from_address": string,"from_name"?: string | null,"id"?: string,"message_id"?: string | null,"provider"?: string,"provider_email_id": string,"received_at": string,"sender_person_id"?: string | null,"status": Database["public"]['Enums']["inbound_email_status"],"subject"?: string | null
                  }
                  Update: {
                    "attachment_count"?: number,"boat_id"?: string,"completed_at"?: string | null,"created_at"?: string,"from_address"?: string,"from_name"?: string | null,"id"?: string,"message_id"?: string | null,"provider"?: string,"provider_email_id"?: string,"received_at"?: string,"sender_person_id"?: string | null,"status"?: Database["public"]['Enums']["inbound_email_status"],"subject"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "inbound_emails_boat_id_fkey"
      columns: ["boat_id"]
isOneToOne: false
      referencedRelation: "boats"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "inbound_emails_sender_person_id_fkey"
      columns: ["sender_person_id"]
isOneToOne: false
      referencedRelation: "people"
      referencedColumns: ["id"]
    }
                  ]
                },"invitations": {
                  Row: {
                    "boat_id": string,"created_at": string,"email": string,"id": string,"invited_by": string | null,"role": Database["public"]['Enums']["membership_role"]
                  }
                  ComputedFields: never
                  Insert: {
                    "boat_id": string,"created_at"?: string,"email": string,"id"?: string,"invited_by"?: string | null,"role": Database["public"]['Enums']["membership_role"]
                  }
                  Update: {
                    "boat_id"?: string,"created_at"?: string,"email"?: string,"id"?: string,"invited_by"?: string | null,"role"?: Database["public"]['Enums']["membership_role"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "invitations_boat_id_fkey"
      columns: ["boat_id"]
isOneToOne: false
      referencedRelation: "boats"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "invitations_invited_by_fkey"
      columns: ["invited_by"]
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
                },"reminders_sent": {
                  Row: {
                    "boat_id": string,"due_at_engine_hours": number | null,"due_on": string | null,"id": string,"item_id": string,"item_type": Database["public"]['Enums']["reminder_item_type"],"person_id": string,"sent_at": string,"status": Database["public"]['Enums']["reminder_status"]
                  }
                  ComputedFields: never
                  Insert: {
                    "boat_id": string,"due_at_engine_hours"?: number | null,"due_on"?: string | null,"id"?: string,"item_id": string,"item_type": Database["public"]['Enums']["reminder_item_type"],"person_id": string,"sent_at"?: string,"status": Database["public"]['Enums']["reminder_status"]
                  }
                  Update: {
                    "boat_id"?: string,"due_at_engine_hours"?: number | null,"due_on"?: string | null,"id"?: string,"item_id"?: string,"item_type"?: Database["public"]['Enums']["reminder_item_type"],"person_id"?: string,"sent_at"?: string,"status"?: Database["public"]['Enums']["reminder_status"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "reminders_sent_boat_id_fkey"
      columns: ["boat_id"]
isOneToOne: false
      referencedRelation: "boats"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reminders_sent_person_id_fkey"
      columns: ["person_id"]
isOneToOne: false
      referencedRelation: "people"
      referencedColumns: ["id"]
    }
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
                },"sender_addresses": {
                  Row: {
                    "address": string,"created_at": string,"id": string,"person_id": string,"verified_at": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "address": string,"created_at"?: string,"id"?: string,"person_id": string,"verified_at"?: string | null
                  }
                  Update: {
                    "address"?: string,"created_at"?: string,"id"?: string,"person_id"?: string,"verified_at"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "sender_addresses_person_id_fkey"
      columns: ["person_id"]
isOneToOne: false
      referencedRelation: "people"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "assert_boat_owner":
{ Args: { "boat": string }; Returns: undefined
                           },
"begin_boat_deletion":
{ Args: { "boat": string }; Returns: string[]
                           },
"boat_id_from_storage_path":
{ Args: { "path": string }; Returns: string
                           },
"can_read_boat":
{ Args: { "boat": string }; Returns: boolean
                           },
"can_write_boat":
{ Args: { "boat": string }; Returns: boolean
                           },
"create_boat":
{ Args: { "boat_name": string }; Returns: string
                           },
"current_person_id":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"delete_boat":
{ Args: { "boat": string }; Returns: Json
                           },
"documents_to_file":
{ Args: { "max_attempts": number,"max_rows": number }; Returns: {
              "added_by": string | null,
"boat_id": string,
"content_type": string | null,
"created_at": string,
"filename": string | null,
"id": string,
"inbound_email_id": string | null,
"received_at": string,
"size_bytes": number | null,
"source": Database["public"]['Enums']["document_source"],
"storage_path": string,
"type": Database["public"]['Enums']["document_type"]
            }[]
                          SetofOptions: {
        from: "*"
        to: "documents"
        isOneToOne: false
        isSetofReturn: true
      } },
"invite_to_boat":
{ Args: { "boat": string,"invitee_email": string,"invitee_role": Database["public"]['Enums']["membership_role"] }; Returns: string
                           },
"match_inbound_email":
{ Args: { "alias": string,"sender": string }; Returns: {
              "boat_id": string,"person_id": string
            }[]
                           },
"my_role_on":
{ Args: { "boat": string }; Returns: Database["public"]['Enums']["membership_role"]
                           },
"new_email_alias":
{ Args: { "boat_name": string }; Returns: string
                           },
"record_document_filing_failure":
{ Args: { "document_id": string,"error": string,"model": string }; Returns: undefined
                           },
"save_boat_procedure":
{ Args: { "chunks_to_store": Json,"procedure_content": string,"procedure_title": string,"target_boat_id": string,"target_procedure_id": string | null }; Returns: string
                           },
"save_document_filing":
{ Args: { "confidence": string,"document_id": string,"document_type": Database["public"]['Enums']["document_type"],"flags": Json,"model": string,"proposal": Json,"records": Json,"status": Database["public"]['Enums']["filing_status"],"summary": string,"vendor": string }; Returns: {
              "already_filed": boolean,"filing_id": string
            }[]
                           },
"search_document_chunks":
{ Args: { "match_count"?: number,"model": string,"only_boat_id"?: string,"query_embedding": string }; Returns: {
              "boat_id": string,"chunk_id": string,"content": string,"document_id": string | null,"document_received_at": string | null,"filename": string | null,"indexed_at": string,"page": number | null,"procedure_id": string | null,"procedure_title": string | null,"procedure_updated_at": string | null,"similarity": number,"source_type": string
            }[]
                           },
"shares_boat_with":
{ Args: { "person": string }; Returns: boolean
                           }
          }
          Enums: {
            "document_source": "email"|"upload","document_type": "unsorted"|"email"|"invoice"|"receipt"|"insurance"|"registration"|"manual"|"contract"|"survey"|"other","filing_status": "filed"|"needs_review"|"failed","inbound_email_status": "filed"|"held","membership_role": "owner"|"co_owner"|"crew"|"read_only","reminder_item_type": "renewal"|"maintenance","reminder_status": "due_soon"|"overdue","renewal_kind": "insurance"|"registration"|"licence"|"other"
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
            "document_source": ["email", "upload"],"document_type": ["unsorted", "email", "invoice", "receipt", "insurance", "registration", "manual", "contract", "survey", "other"],"filing_status": ["filed", "needs_review", "failed"],"inbound_email_status": ["filed", "held"],"membership_role": ["owner", "co_owner", "crew", "read_only"],"reminder_item_type": ["renewal", "maintenance"],"reminder_status": ["due_soon", "overdue"],"renewal_kind": ["insurance", "registration", "licence", "other"]
          }
        }
} as const
