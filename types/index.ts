export interface Plant {
  id: string
  name: string
  location: string
  description: string
  clientId: string
  clientName: string
  status: string
  systems: System[]
  createdAt: string
}

export interface System {
  id: string
  name: string
  type: string
  description: string
  plantId: string
  parameters: Parameter[]
  status: string
}

export interface Parameter {
  id: string
  name: string
  unit: string
  value: number
  minValue: number
  maxValue: number
  systemId: string
}

export interface Report {
  id: string
  title: string
  plantId: string
  plantName: string
  systemId: string
  systemName: string
  status: string
  createdAt: string
  data: any
}

export interface User {
  id: string
  name: string
  email: string
  role: string
} 