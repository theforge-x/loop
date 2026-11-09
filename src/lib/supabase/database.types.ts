
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
            "announcements": {
                  Row: {
                    "content": string,"created_at": string,"id": string,"is_published": boolean,"publish_at": string,"title": string,"updated_at": string,"wedding_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "content": string,"created_at"?: string,"id"?: string,"is_published"?: boolean,"publish_at"?: string,"title": string,"updated_at"?: string,"wedding_id": string
                  }
                  Update: {
                    "content"?: string,"created_at"?: string,"id"?: string,"is_published"?: boolean,"publish_at"?: string,"title"?: string,"updated_at"?: string,"wedding_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "announcements_wedding_id_fkey"
      columns: ["wedding_id"]
isOneToOne: false
      referencedRelation: "weddings"
      referencedColumns: ["id"]
    }
                  ]
                },"audit_logs": {
                  Row: {
                    "action": string,"actor_id": string | null,"created_at": string,"entity_id": string | null,"entity_type": string,"id": string,"metadata": NonNullable<Json>,"wedding_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"actor_id"?: string | null,"created_at"?: string,"entity_id"?: string | null,"entity_type": string,"id"?: string,"metadata"?: NonNullable<Json>,"wedding_id": string
                  }
                  Update: {
                    "action"?: string,"actor_id"?: string | null,"created_at"?: string,"entity_id"?: string | null,"entity_type"?: string,"id"?: string,"metadata"?: NonNullable<Json>,"wedding_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "audit_logs_actor_id_fkey"
      columns: ["actor_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "audit_logs_wedding_id_fkey"
      columns: ["wedding_id"]
isOneToOne: false
      referencedRelation: "weddings"
      referencedColumns: ["id"]
    }
                  ]
                },"check_ins": {
                  Row: {
                    "attendee_id": string,"checked_in_at": string,"coordinator_id": string | null,"created_at": string,"event_id": string,"id": string,"updated_at": string,"wedding_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "attendee_id": string,"checked_in_at"?: string,"coordinator_id"?: string | null,"created_at"?: string,"event_id": string,"id"?: string,"updated_at"?: string,"wedding_id": string
                  }
                  Update: {
                    "attendee_id"?: string,"checked_in_at"?: string,"coordinator_id"?: string | null,"created_at"?: string,"event_id"?: string,"id"?: string,"updated_at"?: string,"wedding_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "check_ins_coordinator_id_fkey"
      columns: ["coordinator_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "check_ins_wedding_id_event_id_attendee_id_fkey"
      columns: ["wedding_id","event_id","attendee_id"]
isOneToOne: true
      referencedRelation: "event_attendance"
      referencedColumns: ["wedding_id","event_id","attendee_id"]
    },{
      foreignKeyName: "check_ins_wedding_id_fkey"
      columns: ["wedding_id"]
isOneToOne: false
      referencedRelation: "weddings"
      referencedColumns: ["id"]
    }
                  ]
                },"content_drafts": {
                  Row: {
                    "created_at": string,"id": string,"module": string,"payload": NonNullable<Json>,"record_id": string,"updated_at": string,"wedding_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"module": string,"payload": NonNullable<Json>,"record_id"?: string,"updated_at"?: string,"wedding_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"module"?: string,"payload"?: NonNullable<Json>,"record_id"?: string,"updated_at"?: string,"wedding_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "content_drafts_wedding_id_fkey"
      columns: ["wedding_id"]
isOneToOne: false
      referencedRelation: "weddings"
      referencedColumns: ["id"]
    }
                  ]
                },"contributions": {
                  Row: {
                    "amount_minor": number,"contributor_name": string | null,"created_at": string,"currency": string,"email": string | null,"id": string,"message": string | null,"provider": string,"provider_transaction_id": string | null,"reference": string,"status": Database["public"]['Enums']["contribution_status"],"updated_at": string,"verified_at": string | null,"wedding_id": string,"wishlist_item_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "amount_minor": number,"contributor_name"?: string | null,"created_at"?: string,"currency"?: string,"email"?: string | null,"id"?: string,"message"?: string | null,"provider"?: string,"provider_transaction_id"?: string | null,"reference": string,"status"?: Database["public"]['Enums']["contribution_status"],"updated_at"?: string,"verified_at"?: string | null,"wedding_id": string,"wishlist_item_id"?: string | null
                  }
                  Update: {
                    "amount_minor"?: number,"contributor_name"?: string | null,"created_at"?: string,"currency"?: string,"email"?: string | null,"id"?: string,"message"?: string | null,"provider"?: string,"provider_transaction_id"?: string | null,"reference"?: string,"status"?: Database["public"]['Enums']["contribution_status"],"updated_at"?: string,"verified_at"?: string | null,"wedding_id"?: string,"wishlist_item_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "contributions_wedding_id_fkey"
      columns: ["wedding_id"]
isOneToOne: false
      referencedRelation: "weddings"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "contributions_wedding_id_wishlist_item_id_fkey"
      columns: ["wedding_id","wishlist_item_id"]
isOneToOne: false
      referencedRelation: "wishlist_items"
      referencedColumns: ["wedding_id","id"]
    }
                  ]
                },"email_suppressions": {
                  Row: {
                    "created_at": string,"email": string,"reason": string,"wedding_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"email": string,"reason": string,"wedding_id": string
                  }
                  Update: {
                    "created_at"?: string,"email"?: string,"reason"?: string,"wedding_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "email_suppressions_wedding_id_fkey"
      columns: ["wedding_id"]
isOneToOne: false
      referencedRelation: "weddings"
      referencedColumns: ["id"]
    }
                  ]
                },"email_webhook_events": {
                  Row: {
                    "created_at": string,"event_type": string,"id": string,"notification_id": string,"occurred_at": string,"wedding_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"event_type": string,"id": string,"notification_id": string,"occurred_at": string,"wedding_id": string
                  }
                  Update: {
                    "created_at"?: string,"event_type"?: string,"id"?: string,"notification_id"?: string,"occurred_at"?: string,"wedding_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "email_webhook_events_notification_id_fkey"
      columns: ["notification_id"]
isOneToOne: false
      referencedRelation: "notifications"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "email_webhook_events_wedding_id_fkey"
      columns: ["wedding_id"]
isOneToOne: false
      referencedRelation: "weddings"
      referencedColumns: ["id"]
    }
                  ]
                },"event_attendance": {
                  Row: {
                    "attendee_id": string,"created_at": string,"event_id": string,"id": string,"rsvp_id": string,"updated_at": string,"wedding_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "attendee_id": string,"created_at"?: string,"event_id": string,"id"?: string,"rsvp_id": string,"updated_at"?: string,"wedding_id": string
                  }
                  Update: {
                    "attendee_id"?: string,"created_at"?: string,"event_id"?: string,"id"?: string,"rsvp_id"?: string,"updated_at"?: string,"wedding_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "event_attendance_wedding_id_event_id_fkey"
      columns: ["wedding_id","event_id"]
isOneToOne: false
      referencedRelation: "events"
      referencedColumns: ["wedding_id","id"]
    },{
      foreignKeyName: "event_attendance_wedding_id_fkey"
      columns: ["wedding_id"]
isOneToOne: false
      referencedRelation: "weddings"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "event_attendance_wedding_id_rsvp_id_attendee_id_fkey"
      columns: ["wedding_id","rsvp_id","attendee_id"]
isOneToOne: false
      referencedRelation: "rsvp_attendees"
      referencedColumns: ["wedding_id","rsvp_id","id"]
    }
                  ]
                },"events": {
                  Row: {
                    "address": string | null,"created_at": string,"description": string | null,"dress_code": string | null,"ends_at": string | null,"id": string,"is_private": boolean,"is_published": boolean,"map_url": string | null,"sort_order": number,"starts_at": string,"title": string,"updated_at": string,"venue_name": string | null,"wedding_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "address"?: string | null,"created_at"?: string,"description"?: string | null,"dress_code"?: string | null,"ends_at"?: string | null,"id"?: string,"is_private"?: boolean,"is_published"?: boolean,"map_url"?: string | null,"sort_order"?: number,"starts_at": string,"title": string,"updated_at"?: string,"venue_name"?: string | null,"wedding_id": string
                  }
                  Update: {
                    "address"?: string | null,"created_at"?: string,"description"?: string | null,"dress_code"?: string | null,"ends_at"?: string | null,"id"?: string,"is_private"?: boolean,"is_published"?: boolean,"map_url"?: string | null,"sort_order"?: number,"starts_at"?: string,"title"?: string,"updated_at"?: string,"venue_name"?: string | null,"wedding_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "events_wedding_id_fkey"
      columns: ["wedding_id"]
isOneToOne: false
      referencedRelation: "weddings"
      referencedColumns: ["id"]
    }
                  ]
                },"faqs": {
                  Row: {
                    "answer": string,"created_at": string,"id": string,"is_published": boolean,"question": string,"sort_order": number,"updated_at": string,"wedding_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "answer": string,"created_at"?: string,"id"?: string,"is_published"?: boolean,"question": string,"sort_order"?: number,"updated_at"?: string,"wedding_id": string
                  }
                  Update: {
                    "answer"?: string,"created_at"?: string,"id"?: string,"is_published"?: boolean,"question"?: string,"sort_order"?: number,"updated_at"?: string,"wedding_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "faqs_wedding_id_fkey"
      columns: ["wedding_id"]
isOneToOne: false
      referencedRelation: "weddings"
      referencedColumns: ["id"]
    }
                  ]
                },"gallery_albums": {
                  Row: {
                    "created_at": string,"description": string | null,"id": string,"is_published": boolean,"sort_order": number,"title": string,"updated_at": string,"wedding_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"description"?: string | null,"id"?: string,"is_published"?: boolean,"sort_order"?: number,"title": string,"updated_at"?: string,"wedding_id": string
                  }
                  Update: {
                    "created_at"?: string,"description"?: string | null,"id"?: string,"is_published"?: boolean,"sort_order"?: number,"title"?: string,"updated_at"?: string,"wedding_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "gallery_albums_wedding_id_fkey"
      columns: ["wedding_id"]
isOneToOne: false
      referencedRelation: "weddings"
      referencedColumns: ["id"]
    }
                  ]
                },"gallery_images": {
                  Row: {
                    "album_id": string,"alt_text": string,"caption": string | null,"created_at": string,"id": string,"image_path": string,"is_published": boolean,"sort_order": number,"updated_at": string,"wedding_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "album_id": string,"alt_text": string,"caption"?: string | null,"created_at"?: string,"id"?: string,"image_path": string,"is_published"?: boolean,"sort_order"?: number,"updated_at"?: string,"wedding_id": string
                  }
                  Update: {
                    "album_id"?: string,"alt_text"?: string,"caption"?: string | null,"created_at"?: string,"id"?: string,"image_path"?: string,"is_published"?: boolean,"sort_order"?: number,"updated_at"?: string,"wedding_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "gallery_images_wedding_id_album_id_fkey"
      columns: ["wedding_id","album_id"]
isOneToOne: false
      referencedRelation: "gallery_albums"
      referencedColumns: ["wedding_id","id"]
    },{
      foreignKeyName: "gallery_images_wedding_id_fkey"
      columns: ["wedding_id"]
isOneToOne: false
      referencedRelation: "weddings"
      referencedColumns: ["id"]
    }
                  ]
                },"gift_reservations": {
                  Row: {
                    "cancellation_token_hash": string,"created_at": string,"email": string | null,"expires_at": string | null,"fulfilled_at": string | null,"id": string,"message": string | null,"name": string | null,"quantity": number,"reveal_identity": boolean,"status": Database["public"]['Enums']["reservation_status"],"updated_at": string,"wedding_id": string,"wishlist_item_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "cancellation_token_hash": string,"created_at"?: string,"email"?: string | null,"expires_at"?: string | null,"fulfilled_at"?: string | null,"id"?: string,"message"?: string | null,"name"?: string | null,"quantity": number,"reveal_identity"?: boolean,"status"?: Database["public"]['Enums']["reservation_status"],"updated_at"?: string,"wedding_id": string,"wishlist_item_id": string
                  }
                  Update: {
                    "cancellation_token_hash"?: string,"created_at"?: string,"email"?: string | null,"expires_at"?: string | null,"fulfilled_at"?: string | null,"id"?: string,"message"?: string | null,"name"?: string | null,"quantity"?: number,"reveal_identity"?: boolean,"status"?: Database["public"]['Enums']["reservation_status"],"updated_at"?: string,"wedding_id"?: string,"wishlist_item_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "gift_reservations_wedding_id_fkey"
      columns: ["wedding_id"]
isOneToOne: false
      referencedRelation: "weddings"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "gift_reservations_wedding_id_wishlist_item_id_fkey"
      columns: ["wedding_id","wishlist_item_id"]
isOneToOne: false
      referencedRelation: "wishlist_items"
      referencedColumns: ["wedding_id","id"]
    }
                  ]
                },"guestbook_messages": {
                  Row: {
                    "created_at": string,"id": string,"message": string,"moderated_at": string | null,"moderated_by": string | null,"moderation_status": string,"name": string,"updated_at": string,"wedding_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"message": string,"moderated_at"?: string | null,"moderated_by"?: string | null,"moderation_status"?: string,"name": string,"updated_at"?: string,"wedding_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"message"?: string,"moderated_at"?: string | null,"moderated_by"?: string | null,"moderation_status"?: string,"name"?: string,"updated_at"?: string,"wedding_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "guestbook_messages_moderated_by_fkey"
      columns: ["moderated_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "guestbook_messages_wedding_id_fkey"
      columns: ["wedding_id"]
isOneToOne: false
      referencedRelation: "weddings"
      referencedColumns: ["id"]
    }
                  ]
                },"guests": {
                  Row: {
                    "created_at": string,"email": string | null,"id": string,"invitation_group_id": string,"is_primary": boolean,"name": string,"phone": string | null,"updated_at": string,"wedding_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"email"?: string | null,"id"?: string,"invitation_group_id": string,"is_primary"?: boolean,"name": string,"phone"?: string | null,"updated_at"?: string,"wedding_id": string
                  }
                  Update: {
                    "created_at"?: string,"email"?: string | null,"id"?: string,"invitation_group_id"?: string,"is_primary"?: boolean,"name"?: string,"phone"?: string | null,"updated_at"?: string,"wedding_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "guests_wedding_id_fkey"
      columns: ["wedding_id"]
isOneToOne: false
      referencedRelation: "weddings"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "guests_wedding_id_invitation_group_id_fkey"
      columns: ["wedding_id","invitation_group_id"]
isOneToOne: false
      referencedRelation: "invitation_groups"
      referencedColumns: ["wedding_id","id"]
    }
                  ]
                },"invitation_group_events": {
                  Row: {
                    "created_at": string,"event_id": string,"id": string,"invitation_group_id": string,"updated_at": string,"wedding_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"event_id": string,"id"?: string,"invitation_group_id": string,"updated_at"?: string,"wedding_id": string
                  }
                  Update: {
                    "created_at"?: string,"event_id"?: string,"id"?: string,"invitation_group_id"?: string,"updated_at"?: string,"wedding_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "invitation_group_events_wedding_id_event_id_fkey"
      columns: ["wedding_id","event_id"]
isOneToOne: false
      referencedRelation: "events"
      referencedColumns: ["wedding_id","id"]
    },{
      foreignKeyName: "invitation_group_events_wedding_id_fkey"
      columns: ["wedding_id"]
isOneToOne: false
      referencedRelation: "weddings"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "invitation_group_events_wedding_id_invitation_group_id_fkey"
      columns: ["wedding_id","invitation_group_id"]
isOneToOne: false
      referencedRelation: "invitation_groups"
      referencedColumns: ["wedding_id","id"]
    }
                  ]
                },"invitation_groups": {
                  Row: {
                    "contact_email": string | null,"created_at": string,"delivery_status": string,"guest_allowance": number,"id": string,"name": string,"token_expires_at": string | null,"token_hash": string | null,"token_revoked_at": string | null,"updated_at": string,"wedding_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "contact_email"?: string | null,"created_at"?: string,"delivery_status"?: string,"guest_allowance"?: number,"id"?: string,"name": string,"token_expires_at"?: string | null,"token_hash"?: string | null,"token_revoked_at"?: string | null,"updated_at"?: string,"wedding_id": string
                  }
                  Update: {
                    "contact_email"?: string | null,"created_at"?: string,"delivery_status"?: string,"guest_allowance"?: number,"id"?: string,"name"?: string,"token_expires_at"?: string | null,"token_hash"?: string | null,"token_revoked_at"?: string | null,"updated_at"?: string,"wedding_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "invitation_groups_wedding_id_fkey"
      columns: ["wedding_id"]
isOneToOne: false
      referencedRelation: "weddings"
      referencedColumns: ["id"]
    }
                  ]
                },"media_assets": {
                  Row: {
                    "bucket_id": string,"created_at": string,"id": string,"is_published": boolean,"mime_type": string,"object_path": string,"size_bytes": number,"updated_at": string,"wedding_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "bucket_id"?: string,"created_at"?: string,"id"?: string,"is_published"?: boolean,"mime_type": string,"object_path": string,"size_bytes": number,"updated_at"?: string,"wedding_id": string
                  }
                  Update: {
                    "bucket_id"?: string,"created_at"?: string,"id"?: string,"is_published"?: boolean,"mime_type"?: string,"object_path"?: string,"size_bytes"?: number,"updated_at"?: string,"wedding_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "media_assets_wedding_id_fkey"
      columns: ["wedding_id"]
isOneToOne: false
      referencedRelation: "weddings"
      referencedColumns: ["id"]
    }
                  ]
                },"notifications": {
                  Row: {
                    "attempts": number,"created_at": string,"deduplication_key": string | null,"delivery_status": string,"delivery_updated_at": string | null,"id": string,"last_error": string | null,"lease_expires_at": string | null,"lease_token": string | null,"next_attempt_at": string,"notification_type": string,"payload": NonNullable<Json>,"provider_message_id": string | null,"recipient_email": string,"sent_at": string | null,"status": string,"updated_at": string,"wedding_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "attempts"?: number,"created_at"?: string,"deduplication_key"?: string | null,"delivery_status"?: string,"delivery_updated_at"?: string | null,"id"?: string,"last_error"?: string | null,"lease_expires_at"?: string | null,"lease_token"?: string | null,"next_attempt_at"?: string,"notification_type": string,"payload"?: NonNullable<Json>,"provider_message_id"?: string | null,"recipient_email": string,"sent_at"?: string | null,"status"?: string,"updated_at"?: string,"wedding_id": string
                  }
                  Update: {
                    "attempts"?: number,"created_at"?: string,"deduplication_key"?: string | null,"delivery_status"?: string,"delivery_updated_at"?: string | null,"id"?: string,"last_error"?: string | null,"lease_expires_at"?: string | null,"lease_token"?: string | null,"next_attempt_at"?: string,"notification_type"?: string,"payload"?: NonNullable<Json>,"provider_message_id"?: string | null,"recipient_email"?: string,"sent_at"?: string | null,"status"?: string,"updated_at"?: string,"wedding_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "notifications_wedding_id_fkey"
      columns: ["wedding_id"]
isOneToOne: false
      referencedRelation: "weddings"
      referencedColumns: ["id"]
    }
                  ]
                },"payment_webhook_events": {
                  Row: {
                    "contribution_id": string,"created_at": string,"id": string,"payment_reference": string,"processed_at": string,"processing_status": string,"provider": string,"provider_event_id": string,"updated_at": string,"wedding_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "contribution_id": string,"created_at"?: string,"id"?: string,"payment_reference": string,"processed_at"?: string,"processing_status"?: string,"provider": string,"provider_event_id": string,"updated_at"?: string,"wedding_id": string
                  }
                  Update: {
                    "contribution_id"?: string,"created_at"?: string,"id"?: string,"payment_reference"?: string,"processed_at"?: string,"processing_status"?: string,"provider"?: string,"provider_event_id"?: string,"updated_at"?: string,"wedding_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "payment_webhook_events_wedding_id_contribution_id_payment__fkey"
      columns: ["wedding_id","contribution_id","payment_reference"]
isOneToOne: false
      referencedRelation: "contributions"
      referencedColumns: ["wedding_id","id","reference"]
    },{
      foreignKeyName: "payment_webhook_events_wedding_id_fkey"
      columns: ["wedding_id"]
isOneToOne: false
      referencedRelation: "weddings"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "avatar_url": string | null,"created_at": string,"display_name": string,"id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "avatar_url"?: string | null,"created_at"?: string,"display_name"?: string,"id": string,"updated_at"?: string
                  }
                  Update: {
                    "avatar_url"?: string | null,"created_at"?: string,"display_name"?: string,"id"?: string,"updated_at"?: string
                  }
                  Relationships: [

                  ]
                },"rsvp_attendees": {
                  Row: {
                    "attendee_type": string,"created_at": string,"guest_id": string | null,"guest_name": string,"id": string,"invitation_group_id": string,"is_primary": boolean,"rsvp_id": string,"updated_at": string,"wedding_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "attendee_type"?: string,"created_at"?: string,"guest_id"?: string | null,"guest_name": string,"id"?: string,"invitation_group_id": string,"is_primary"?: boolean,"rsvp_id": string,"updated_at"?: string,"wedding_id": string
                  }
                  Update: {
                    "attendee_type"?: string,"created_at"?: string,"guest_id"?: string | null,"guest_name"?: string,"id"?: string,"invitation_group_id"?: string,"is_primary"?: boolean,"rsvp_id"?: string,"updated_at"?: string,"wedding_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "rsvp_attendees_wedding_id_fkey"
      columns: ["wedding_id"]
isOneToOne: false
      referencedRelation: "weddings"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "rsvp_attendees_wedding_id_invitation_group_id_guest_id_fkey"
      columns: ["wedding_id","invitation_group_id","guest_id"]
isOneToOne: false
      referencedRelation: "guests"
      referencedColumns: ["wedding_id","invitation_group_id","id"]
    },{
      foreignKeyName: "rsvp_attendees_wedding_id_invitation_group_id_rsvp_id_fkey"
      columns: ["wedding_id","invitation_group_id","rsvp_id"]
isOneToOne: false
      referencedRelation: "rsvps"
      referencedColumns: ["wedding_id","invitation_group_id","id"]
    }
                  ]
                },"rsvps": {
                  Row: {
                    "accessibility_requirements": string | null,"created_at": string,"dietary_requirements": string | null,"id": string,"invitation_group_id": string,"message": string | null,"responded_at": string,"status": Database["public"]['Enums']["rsvp_status"],"updated_at": string,"wedding_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "accessibility_requirements"?: string | null,"created_at"?: string,"dietary_requirements"?: string | null,"id"?: string,"invitation_group_id": string,"message"?: string | null,"responded_at"?: string,"status": Database["public"]['Enums']["rsvp_status"],"updated_at"?: string,"wedding_id": string
                  }
                  Update: {
                    "accessibility_requirements"?: string | null,"created_at"?: string,"dietary_requirements"?: string | null,"id"?: string,"invitation_group_id"?: string,"message"?: string | null,"responded_at"?: string,"status"?: Database["public"]['Enums']["rsvp_status"],"updated_at"?: string,"wedding_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "rsvps_wedding_id_fkey"
      columns: ["wedding_id"]
isOneToOne: false
      referencedRelation: "weddings"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "rsvps_wedding_id_invitation_group_id_fkey"
      columns: ["wedding_id","invitation_group_id"]
isOneToOne: true
      referencedRelation: "invitation_groups"
      referencedColumns: ["wedding_id","id"]
    }
                  ]
                },"seat_assignments": {
                  Row: {
                    "attendee_id": string,"created_at": string,"id": string,"seating_table_id": string,"updated_at": string,"wedding_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "attendee_id": string,"created_at"?: string,"id"?: string,"seating_table_id": string,"updated_at"?: string,"wedding_id": string
                  }
                  Update: {
                    "attendee_id"?: string,"created_at"?: string,"id"?: string,"seating_table_id"?: string,"updated_at"?: string,"wedding_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "seat_assignments_wedding_id_attendee_id_fkey"
      columns: ["wedding_id","attendee_id"]
isOneToOne: true
      referencedRelation: "rsvp_attendees"
      referencedColumns: ["wedding_id","id"]
    },{
      foreignKeyName: "seat_assignments_wedding_id_fkey"
      columns: ["wedding_id"]
isOneToOne: false
      referencedRelation: "weddings"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "seat_assignments_wedding_id_seating_table_id_fkey"
      columns: ["wedding_id","seating_table_id"]
isOneToOne: false
      referencedRelation: "seating_tables"
      referencedColumns: ["wedding_id","id"]
    }
                  ]
                },"seating_tables": {
                  Row: {
                    "capacity": number,"created_at": string,"id": string,"name": string,"updated_at": string,"wedding_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "capacity": number,"created_at"?: string,"id"?: string,"name": string,"updated_at"?: string,"wedding_id": string
                  }
                  Update: {
                    "capacity"?: number,"created_at"?: string,"id"?: string,"name"?: string,"updated_at"?: string,"wedding_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "seating_tables_wedding_id_fkey"
      columns: ["wedding_id"]
isOneToOne: false
      referencedRelation: "weddings"
      referencedColumns: ["id"]
    }
                  ]
                },"site_settings": {
                  Row: {
                    "content": NonNullable<Json>,"created_at": string,"id": string,"is_published": boolean,"theme": NonNullable<Json>,"updated_at": string,"wedding_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "content"?: NonNullable<Json>,"created_at"?: string,"id"?: string,"is_published"?: boolean,"theme"?: NonNullable<Json>,"updated_at"?: string,"wedding_id": string
                  }
                  Update: {
                    "content"?: NonNullable<Json>,"created_at"?: string,"id"?: string,"is_published"?: boolean,"theme"?: NonNullable<Json>,"updated_at"?: string,"wedding_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "site_settings_wedding_id_fkey"
      columns: ["wedding_id"]
isOneToOne: false
      referencedRelation: "weddings"
      referencedColumns: ["id"]
    }
                  ]
                },"story_sections": {
                  Row: {
                    "content": string | null,"created_at": string,"id": string,"image_path": string | null,"is_published": boolean,"section_type": string,"sort_order": number,"title": string,"updated_at": string,"wedding_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "content"?: string | null,"created_at"?: string,"id"?: string,"image_path"?: string | null,"is_published"?: boolean,"section_type"?: string,"sort_order"?: number,"title": string,"updated_at"?: string,"wedding_id": string
                  }
                  Update: {
                    "content"?: string | null,"created_at"?: string,"id"?: string,"image_path"?: string | null,"is_published"?: boolean,"section_type"?: string,"sort_order"?: number,"title"?: string,"updated_at"?: string,"wedding_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "story_sections_wedding_id_fkey"
      columns: ["wedding_id"]
isOneToOne: false
      referencedRelation: "weddings"
      referencedColumns: ["id"]
    }
                  ]
                },"travel_information": {
                  Row: {
                    "content": string,"created_at": string,"id": string,"information_type": string,"is_published": boolean,"link_url": string | null,"sort_order": number,"title": string,"updated_at": string,"wedding_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "content": string,"created_at"?: string,"id"?: string,"information_type"?: string,"is_published"?: boolean,"link_url"?: string | null,"sort_order"?: number,"title": string,"updated_at"?: string,"wedding_id": string
                  }
                  Update: {
                    "content"?: string,"created_at"?: string,"id"?: string,"information_type"?: string,"is_published"?: boolean,"link_url"?: string | null,"sort_order"?: number,"title"?: string,"updated_at"?: string,"wedding_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "travel_information_wedding_id_fkey"
      columns: ["wedding_id"]
isOneToOne: false
      referencedRelation: "weddings"
      referencedColumns: ["id"]
    }
                  ]
                },"wedding_members": {
                  Row: {
                    "created_at": string,"id": string,"profile_id": string,"role": Database["public"]['Enums']["member_role"],"updated_at": string,"wedding_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"profile_id": string,"role"?: Database["public"]['Enums']["member_role"],"updated_at"?: string,"wedding_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"profile_id"?: string,"role"?: Database["public"]['Enums']["member_role"],"updated_at"?: string,"wedding_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "wedding_members_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "wedding_members_wedding_id_fkey"
      columns: ["wedding_id"]
isOneToOne: false
      referencedRelation: "weddings"
      referencedColumns: ["id"]
    }
                  ]
                },"weddings": {
                  Row: {
                    "created_at": string,"created_by": string | null,"id": string,"is_published": boolean,"partner_one_name": string,"partner_two_name": string,"slug": string,"timezone": string,"title": string,"updated_at": string,"wedding_date": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"id"?: string,"is_published"?: boolean,"partner_one_name": string,"partner_two_name": string,"slug": string,"timezone"?: string,"title": string,"updated_at"?: string,"wedding_date"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"id"?: string,"is_published"?: boolean,"partner_one_name"?: string,"partner_two_name"?: string,"slug"?: string,"timezone"?: string,"title"?: string,"updated_at"?: string,"wedding_date"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "weddings_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"wishlist_categories": {
                  Row: {
                    "created_at": string,"description": string | null,"id": string,"is_published": boolean,"sort_order": number,"title": string,"updated_at": string,"wedding_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"description"?: string | null,"id"?: string,"is_published"?: boolean,"sort_order"?: number,"title": string,"updated_at"?: string,"wedding_id": string
                  }
                  Update: {
                    "created_at"?: string,"description"?: string | null,"id"?: string,"is_published"?: boolean,"sort_order"?: number,"title"?: string,"updated_at"?: string,"wedding_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "wishlist_categories_wedding_id_fkey"
      columns: ["wedding_id"]
isOneToOne: false
      referencedRelation: "weddings"
      referencedColumns: ["id"]
    }
                  ]
                },"wishlist_items": {
                  Row: {
                    "category_id": string | null,"created_at": string,"currency": string,"description": string | null,"external_url": string | null,"id": string,"image_path": string | null,"is_active": boolean,"is_published": boolean,"price_minor": number | null,"quantity_required": number,"sort_order": number,"title": string,"updated_at": string,"wedding_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "category_id"?: string | null,"created_at"?: string,"currency"?: string,"description"?: string | null,"external_url"?: string | null,"id"?: string,"image_path"?: string | null,"is_active"?: boolean,"is_published"?: boolean,"price_minor"?: number | null,"quantity_required"?: number,"sort_order"?: number,"title": string,"updated_at"?: string,"wedding_id": string
                  }
                  Update: {
                    "category_id"?: string | null,"created_at"?: string,"currency"?: string,"description"?: string | null,"external_url"?: string | null,"id"?: string,"image_path"?: string | null,"is_active"?: boolean,"is_published"?: boolean,"price_minor"?: number | null,"quantity_required"?: number,"sort_order"?: number,"title"?: string,"updated_at"?: string,"wedding_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "wishlist_items_wedding_id_category_id_fkey"
      columns: ["wedding_id","category_id"]
isOneToOne: false
      referencedRelation: "wishlist_categories"
      referencedColumns: ["wedding_id","id"]
    },{
      foreignKeyName: "wishlist_items_wedding_id_fkey"
      columns: ["wedding_id"]
isOneToOne: false
      referencedRelation: "weddings"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "apply_email_event":
{ Args: { "p_event_id": string,"p_event_type": string,"p_occurred_at": string,"p_provider_id": string }; Returns: boolean
                           },
"apply_verified_payment":
{ Args: { "p_amount_minor": number,"p_currency": string,"p_event_id": string,"p_reference": string,"p_transaction_id": string }; Returns: boolean
                           },
"assign_seat":
{ Args: { "p_attendee_id": string,"p_table_id": string,"p_wedding_id": string }; Returns: string
                           },
"cancel_gift_reservation":
{ Args: { "p_token": string }; Returns: undefined
                           },
"check_in_attendee":
{ Args: { "p_attendee_id": string,"p_event_id": string,"p_wedding_id": string }; Returns: string
                           },
"claim_notification":
{ Args: { "p_force"?: boolean,"p_id": string }; Returns: {
              "attempts": number,
"created_at": string,
"deduplication_key": string | null,
"delivery_status": string,
"delivery_updated_at": string | null,
"id": string,
"last_error": string | null,
"lease_expires_at": string | null,
"lease_token": string | null,
"next_attempt_at": string,
"notification_type": string,
"payload": NonNullable<Json>,
"provider_message_id": string | null,
"recipient_email": string,
"sent_at": string | null,
"status": string,
"updated_at": string,
"wedding_id": string
            }[]
                          SetofOptions: {
        from: "*"
        to: "notifications"
        isOneToOne: false
        isSetofReturn: true
      } },
"consume_rate_limit":
{ Args: { "p_key_hash": string,"p_limit": number,"p_window_seconds": number }; Returns: boolean
                           },
"create_wedding":
{ Args: { "p_partner_one": string,"p_partner_two": string,"p_slug": string,"p_title": string }; Returns: string
                           },
"get_invitation":
{ Args: { "p_token": string }; Returns: Json
                           },
"gift_availability":
{ Args: { "p_wedding_id": string }; Returns: {
              "item_id": string,"quantity_remaining": number,"quantity_required": number,"quantity_reserved": number
            }[]
                           },
"guest_overview":
{ Args: { "p_wedding_id": string }; Returns: Json
                           },
"has_wedding_role":
{ Args: { "p_roles"?: (Database["public"]['Enums']["member_role"])[],"p_wedding_id": string }; Returns: boolean
                           },
"import_guests":
{ Args: { "p_rows": Json,"p_wedding_id": string }; Returns: Json
                           },
"is_published_wedding":
{ Args: { "p_wedding_id": string }; Returns: boolean
                           },
"issue_invitation":
{ Args: { "p_expires_at": string,"p_group_id": string,"p_wedding_id": string }; Returns: string
                           },
"lookup_checkin":
{ Args: { "p_token": string,"p_wedding_id": string }; Returns: Json
                           },
"prune_request_limits":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"publish_content":
{ Args: { "p_draft_id": string,"p_publish"?: boolean,"p_wedding_id": string }; Returns: string
                           },
"publish_website":
{ Args: { "p_wedding_id": string }; Returns: undefined
                           },
"queue_communication":
{ Args: { "p_groups": (string)[],"p_kind": string,"p_record_id": string,"p_wedding_id": string }; Returns: number
                           },
"queue_invitation":
{ Args: { "p_group_id": string,"p_wedding_id": string }; Returns: string
                           },
"record_rsvp":
{ Args: { "p_accessibility"?: string,"p_attendees": Json,"p_dietary"?: string,"p_event_ids"?: (string)[],"p_group_id": string,"p_message"?: string,"p_status": Database["public"]['Enums']["rsvp_status"],"p_wedding_id": string }; Returns: string
                           },
"registry_inventory":
{ Args: { "p_wedding_id": string }; Returns: {
              "item_id": string,"quantity_remaining": number,"quantity_reserved": number
            }[]
                           },
"reserve_gift":
{ Args: { "p_email"?: string,"p_item_id": string,"p_message"?: string,"p_name"?: string,"p_quantity": number,"p_reveal_identity"?: boolean,"p_wedding_id": string }; Returns: Json
                           },
"revoke_invitation":
{ Args: { "p_group_id": string,"p_wedding_id": string }; Returns: undefined
                           },
"set_reservation_status":
{ Args: { "p_reservation_id": string,"p_status": Database["public"]['Enums']["reservation_status"],"p_wedding_id": string }; Returns: undefined
                           },
"shares_wedding":
{ Args: { "p_profile_id": string }; Returns: boolean
                           },
"storage_wedding_id":
{ Args: { "p_path": string }; Returns: string
                           },
"submit_rsvp":
{ Args: { "p_accessibility"?: string,"p_attendees": Json,"p_dietary"?: string,"p_event_ids"?: (string)[],"p_message"?: string,"p_status": Database["public"]['Enums']["rsvp_status"],"p_token": string }; Returns: string
                           },
"unassign_seat":
{ Args: { "p_attendee_id": string,"p_wedding_id": string }; Returns: undefined
                           }
          }
          Enums: {
            "contribution_status": "pending"|"successful"|"failed","member_role": "owner"|"admin"|"coordinator"|"viewer","reservation_status": "reserved"|"fulfilled"|"cancelled","rsvp_status": "attending"|"declined"
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
            "contribution_status": ["pending", "successful", "failed"],"member_role": ["owner", "admin", "coordinator", "viewer"],"reservation_status": ["reserved", "fulfilled", "cancelled"],"rsvp_status": ["attending", "declined"]
          }
        }
} as const
