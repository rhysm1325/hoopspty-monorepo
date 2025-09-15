// AirCall API types

export interface AirCallCall {
  id: number
  direct_link: string
  direction: 'inbound' | 'outbound'
  state: 'initial' | 'answered' | 'hungup' | 'transferred'
  started_at: string
  answered_at: string | null
  ended_at: string | null
  duration: number | null
  raw_digits: string
  user?: {
    id: number
    name: string
    email: string
  }
  number?: {
    id: number
    name: string
    digits: string
  }
  contact?: {
    id: number
    name: string
    email: string
    phone_numbers: Array<{
      id: number
      label: string
      value: string
    }>
  }
}

export interface AirCallWebhookPayload {
  event: string
  resource: string
  data: AirCallCall
  timestamp: string
}
