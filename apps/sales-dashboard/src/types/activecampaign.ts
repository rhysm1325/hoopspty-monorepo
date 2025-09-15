// ActiveCampaign API types

export interface ActiveCampaignContact {
  id: string
  email: string
  firstName: string
  lastName: string
  phone: string
  fieldValues: Array<{
    field: string
    value: string
  }>
}

export interface ActiveCampaignDeal {
  id: string
  title: string
  value: number
  currency: string
  stage: string
  status: 'open' | 'won' | 'lost'
  contact: string
  account?: string
  created_timestamp: string
  updated_timestamp: string
}

export interface ActiveCampaignOpportunity {
  id: string
  contact_id: string
  deal_id?: string
  source: string
  value: number
  status: 'qualified' | 'unqualified' | 'converted'
  created_at: string
  updated_at: string
}
