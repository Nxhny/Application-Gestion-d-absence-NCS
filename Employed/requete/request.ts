export type RequestStatus = 'enregistré' | 'en traitement' | 'acceptée' | 'refusée'

export interface AbsenceRequest {
  id: string
  user_id: string
  motif: string
  created_at: string
  statut: RequestStatus
}
