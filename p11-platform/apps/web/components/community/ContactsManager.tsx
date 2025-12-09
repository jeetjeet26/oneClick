'use client'

import { useState } from 'react'
import { 
  User, 
  Mail, 
  Phone, 
  Briefcase,
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  Loader2,
  CreditCard
} from 'lucide-react'

type Contact = {
  id: string
  property_id: string
  contact_type: 'primary' | 'secondary' | 'billing' | 'emergency'
  name: string
  email: string
  phone: string | null
  role: string | null
  billing_address: Record<string, string> | null
  billing_method: string | null
  special_instructions: string | null
  needs_w9: boolean
  is_primary: boolean
}

type Props = {
  contacts: Contact[]
  propertyId: string
  onUpdate?: () => void
}

const CONTACT_TYPES = [
  { value: 'primary', label: 'Primary', color: 'bg-indigo-100 text-indigo-700' },
  { value: 'secondary', label: 'Secondary', color: 'bg-slate-100 text-slate-700' },
  { value: 'billing', label: 'Billing', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'emergency', label: 'Emergency', color: 'bg-amber-100 text-amber-700' },
]

const BILLING_METHODS = [
  { value: 'ops_merchant', label: 'Ops Merchant' },
  { value: 'nexus', label: 'Nexus' },
  { value: 'ach', label: 'ACH' },
  { value: 'check', label: 'Check' },
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'other', label: 'Other' },
]

export function ContactsManager({ contacts, propertyId, onUpdate }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState<Partial<Contact>>({})

  const resetForm = () => {
    setFormData({})
    setEditingId(null)
    setIsAdding(false)
  }

  const startEdit = (contact: Contact) => {
    setFormData(contact)
    setEditingId(contact.id)
    setIsAdding(false)
  }

  const startAdd = () => {
    setFormData({
      contact_type: 'primary',
      name: '',
      email: '',
      phone: '',
      role: '',
    })
    setIsAdding(true)
    setEditingId(null)
  }

  const handleSave = async () => {
    if (!formData.name?.trim() || !formData.email?.trim()) return

    setIsSaving(true)
    try {
      const endpoint = '/api/community/contacts'
      const method = isAdding ? 'POST' : 'PUT'
      
      const body = isAdding
        ? { propertyId, contact: formData }
        : { contactId: editingId, contact: formData }

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!response.ok) throw new Error('Failed to save')

      resetForm()
      onUpdate?.()
    } catch (error) {
      console.error('Error saving contact:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (contactId: string) => {
    if (!confirm('Are you sure you want to delete this contact?')) return

    try {
      const response = await fetch(`/api/community/contacts?contactId=${contactId}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete')

      onUpdate?.()
    } catch (error) {
      console.error('Error deleting contact:', error)
    }
  }

  const getTypeColor = (type: string) => {
    return CONTACT_TYPES.find(t => t.value === type)?.color || CONTACT_TYPES[0].color
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200">
      <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
        <h3 className="font-semibold text-slate-900 flex items-center gap-2">
          <User className="h-5 w-5 text-slate-400" />
          Key Contacts
        </h3>
        <button
          onClick={startAdd}
          disabled={isAdding || editingId !== null}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          Add Contact
        </button>
      </div>

      <div className="p-6">
        {/* Add/Edit Form */}
        {(isAdding || editingId) && (
          <div className="mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
                <input
                  type="text"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                  placeholder="Full name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
                <input
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                  placeholder="email@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={formData.phone || ''}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                  placeholder="(555) 123-4567"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                <input
                  type="text"
                  value={formData.role || ''}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                  placeholder="Property Manager"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Contact Type</label>
                <select
                  value={formData.contact_type || 'primary'}
                  onChange={(e) => setFormData({ ...formData, contact_type: e.target.value as Contact['contact_type'] })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                >
                  {CONTACT_TYPES.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>
              {formData.contact_type === 'billing' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Billing Method</label>
                  <select
                    value={formData.billing_method || ''}
                    onChange={(e) => setFormData({ ...formData, billing_method: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                  >
                    <option value="">Select method...</option>
                    {BILLING_METHODS.map(method => (
                      <option key={method.value} value={method.value}>{method.label}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={resetForm}
                className="px-3 py-1.5 text-sm text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving || !formData.name?.trim() || !formData.email?.trim()}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save
              </button>
            </div>
          </div>
        )}

        {/* Contacts List */}
        {contacts.length === 0 && !isAdding ? (
          <div className="text-center py-8">
            <User className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">No contacts added yet</p>
            <button
              onClick={startAdd}
              className="mt-3 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
            >
              Add your first contact
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {contacts.map((contact) => (
              <div
                key={contact.id}
                className="flex items-start justify-between p-4 bg-slate-50 rounded-lg"
              >
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 bg-white rounded-lg flex items-center justify-center border border-slate-200">
                    <User className="h-5 w-5 text-slate-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-900">{contact.name}</span>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getTypeColor(contact.contact_type)}`}>
                        {CONTACT_TYPES.find(t => t.value === contact.contact_type)?.label}
                      </span>
                    </div>
                    {contact.role && (
                      <p className="text-sm text-slate-500 flex items-center gap-1 mt-0.5">
                        <Briefcase className="h-3.5 w-3.5" />
                        {contact.role}
                      </p>
                    )}
                    <div className="flex items-center gap-4 mt-2">
                      <a
                        href={`mailto:${contact.email}`}
                        className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                      >
                        <Mail className="h-3.5 w-3.5" />
                        {contact.email}
                      </a>
                      {contact.phone && (
                        <a
                          href={`tel:${contact.phone}`}
                          className="text-sm text-slate-600 hover:text-slate-700 flex items-center gap-1"
                        >
                          <Phone className="h-3.5 w-3.5" />
                          {contact.phone}
                        </a>
                      )}
                    </div>
                    {contact.billing_method && (
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-2">
                        <CreditCard className="h-3.5 w-3.5" />
                        Billing: {BILLING_METHODS.find(m => m.value === contact.billing_method)?.label}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => startEdit(contact)}
                    disabled={isAdding || editingId !== null}
                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-white rounded-lg transition-colors disabled:opacity-50"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(contact.id)}
                    disabled={isAdding || editingId !== null}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-white rounded-lg transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

