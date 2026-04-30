import React from 'react'
import { useCompany } from '../context/CompanyContext'

export default function CompanyPicker() {
  const { companies, currentId, switchCompany } = useCompany()
  return (
    <select
      value={currentId || ''}
      onChange={e => switchCompany(e.target.value)}
      className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white"
    >
      {companies.map(c => (
        <option key={c.id} value={c.id}>{c.name}</option>
      ))}
    </select>
  )
}
