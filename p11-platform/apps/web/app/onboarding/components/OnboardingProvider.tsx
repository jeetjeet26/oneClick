'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { 
  OnboardingContextType, 
  OnboardingFormData, 
  OnboardingStep, 
  OrganizationData,
  CommunityData,
  ContactData,
  IntegrationData,
  IntegrationPlatform,
  UploadedDocument,
  STEPS_ORDER
} from '../types'

const initialFormData: OnboardingFormData = {
  organization: {
    name: '',
    type: '',
    legalName: ''
  },
  community: {
    name: '',
    type: '',
    address: { street: '', city: '', state: '', zip: '' },
    websiteUrl: '',
    additionalUrls: [],
    unitCount: '',
    yearBuilt: '',
    amenities: []
  },
  contacts: [],
  integrations: [],
  documents: [],
  websiteScrapeResult: undefined
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined)

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [step, setStep] = useState<OnboardingStep>('organization')
  const [formData, setFormData] = useState<OnboardingFormData>(initialFormData)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updateFormData = useCallback(<K extends keyof OnboardingFormData>(
    section: K, 
    data: OnboardingFormData[K]
  ) => {
    setFormData(prev => ({ ...prev, [section]: data }))
  }, [])

  const updateOrganization = useCallback((data: Partial<OrganizationData>) => {
    setFormData(prev => ({
      ...prev,
      organization: { ...prev.organization, ...data }
    }))
  }, [])

  const updateCommunity = useCallback((data: Partial<CommunityData>) => {
    setFormData(prev => ({
      ...prev,
      community: { ...prev.community, ...data }
    }))
  }, [])

  const addContact = useCallback((contact: ContactData) => {
    setFormData(prev => ({
      ...prev,
      contacts: [...prev.contacts, contact]
    }))
  }, [])

  const updateContact = useCallback((id: string, data: Partial<ContactData>) => {
    setFormData(prev => ({
      ...prev,
      contacts: prev.contacts.map(c => c.id === id ? { ...c, ...data } : c)
    }))
  }, [])

  const removeContact = useCallback((id: string) => {
    setFormData(prev => ({
      ...prev,
      contacts: prev.contacts.filter(c => c.id !== id)
    }))
  }, [])

  const updateIntegration = useCallback((platform: IntegrationPlatform, data: Partial<IntegrationData>) => {
    setFormData(prev => {
      const existing = prev.integrations.find(i => i.platform === platform)
      if (existing) {
        return {
          ...prev,
          integrations: prev.integrations.map(i => 
            i.platform === platform ? { ...i, ...data } : i
          )
        }
      } else {
        return {
          ...prev,
          integrations: [...prev.integrations, {
            platform,
            status: 'pending',
            accountId: '',
            accountName: '',
            notes: '',
            ...data
          }]
        }
      }
    })
  }, [])

  const addDocument = useCallback((doc: UploadedDocument) => {
    setFormData(prev => ({
      ...prev,
      documents: [...prev.documents, doc]
    }))
  }, [])

  const updateDocument = useCallback((id: string, data: Partial<UploadedDocument>) => {
    setFormData(prev => ({
      ...prev,
      documents: prev.documents.map(d => d.id === id ? { ...d, ...data } : d)
    }))
  }, [])

  const removeDocument = useCallback((id: string) => {
    setFormData(prev => ({
      ...prev,
      documents: prev.documents.filter(d => d.id !== id)
    }))
  }, [])

  const canProceed = useCallback(() => {
    switch (step) {
      case 'organization':
        return formData.organization.name.trim().length > 0
      case 'community':
        return formData.community.name.trim().length > 0
      case 'contacts':
        // At least one primary contact required
        return formData.contacts.some(c => c.type === 'primary' && c.name && c.email)
      case 'integrations':
        // Integrations are optional, can always proceed
        return true
      case 'knowledge':
        // Documents are optional, can always proceed
        return true
      case 'review':
        return true
      default:
        return true
    }
  }, [step, formData])

  const goToNextStep = useCallback(() => {
    const currentIndex = STEPS_ORDER.indexOf(step)
    if (currentIndex < STEPS_ORDER.length - 1) {
      setStep(STEPS_ORDER[currentIndex + 1])
    }
  }, [step])

  const goToPreviousStep = useCallback(() => {
    const currentIndex = STEPS_ORDER.indexOf(step)
    if (currentIndex > 0) {
      setStep(STEPS_ORDER[currentIndex - 1])
    }
  }, [step])

  const value: OnboardingContextType = {
    step,
    setStep,
    formData,
    updateFormData,
    updateOrganization,
    updateCommunity,
    addContact,
    updateContact,
    removeContact,
    updateIntegration,
    addDocument,
    updateDocument,
    removeDocument,
    isLoading,
    setIsLoading,
    error,
    setError,
    canProceed,
    goToNextStep,
    goToPreviousStep
  }

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  )
}

export function useOnboarding() {
  const context = useContext(OnboardingContext)
  if (context === undefined) {
    throw new Error('useOnboarding must be used within an OnboardingProvider')
  }
  return context
}

