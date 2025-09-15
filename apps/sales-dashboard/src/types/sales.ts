// Sales dashboard specific types

export type BusinessArm = 'gameball' | 'ausa_hoops'

export type CallType = 'sales' | 'customer_service'

export interface SalesCall {
  id: string
  aircall_id: string
  phone_number: string
  business_arm: BusinessArm
  call_type: CallType
  duration: number
  started_at: Date
  ended_at: Date
  rep_id?: string
  outcome?: string
  created_at: Date
  updated_at: Date
}

export interface SalesRep {
  id: string
  name: string
  email: string
  business_arms: BusinessArm[]
  is_active: boolean
  created_at: Date
  updated_at: Date
}

export interface CallMetrics {
  total_calls: number
  sales_calls: number
  customer_service_calls: number
  conversion_rate: number
  average_duration: number
  revenue_attributed: number
}
