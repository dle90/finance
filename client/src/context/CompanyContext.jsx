import React, { createContext, useContext, useEffect, useState } from 'react'
import { getCompanies } from '../api'

const CompanyContext = createContext(null)

export function CompanyProvider({ children }) {
  const [companies, setCompanies] = useState([])
  const [currentId, setCurrentId] = useState(() => localStorage.getItem('finance_company') || null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    getCompanies()
      .then(list => {
        if (cancelled) return
        setCompanies(list)
        setCurrentId(prev => {
          if (prev && list.some(c => c.id === prev)) return prev
          const next = list[0]?.id || null
          if (next) localStorage.setItem('finance_company', next)
          return next
        })
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false))
    return () => { cancelled = true }
  }, [])

  const switchCompany = (id) => {
    setCurrentId(id)
    if (id) localStorage.setItem('finance_company', id)
  }

  const current = companies.find(c => c.id === currentId) || null
  return (
    <CompanyContext.Provider value={{ companies, current, currentId, switchCompany, loading }}>
      {children}
    </CompanyContext.Provider>
  )
}

export const useCompany = () => useContext(CompanyContext)
