"use client"

import { useState } from "react"
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertCircle, Search, Loader, MapPin, Image as ImageIcon } from 'lucide-react'

interface Visit {
  id: string
  loan_id: string
  agent_id: string
  visit_date: string
  latitude: number
  longitude: number
  location_address: string
  status: string
  customer_name?: string
  visit_status?: string
  comments?: string | null
  agent?: {
    full_name: string
    phone_number: string
  }
}

export default function AllVisitsPage() {
  const [searchType, setSearchType] = useState<'loan_id' | 'agent'>('loan_id')
  const [searchQuery, setSearchQuery] = useState('')
  const [visits, setVisits] = useState<Visit[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searched, setSearched] = useState(false)
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null)
  const [visitPhotos, setVisitPhotos] = useState<any[]>([])
  const [photosLoading, setPhotosLoading] = useState(false)

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSearched(true)

    try {
      if (!searchQuery.trim()) {
        throw new Error('Please enter a search query')
      }

      const response = await fetch('/api/visits/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: searchType,
          query: searchQuery.trim(),
        }),
      })

      const body = await response.json()

      if (!response.ok) {
        throw new Error(body.error || 'Search failed')
      }

      setVisits(body.visits || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed')
      setVisits([])
    } finally {
      setLoading(false)
    }
  }

  const handleViewPhotos = async (visitId: string) => {
    setPhotosLoading(true)
    try {
      const response = await fetch(`/api/visits/photos?visitId=${visitId}`)
      const body = await response.json()

      if (!response.ok) {
        throw new Error(body.error || 'Failed to load photos')
      }

      setVisitPhotos(body.photos || [])
    } catch (err) {
      setError('Failed to load photos')
    } finally {
      setPhotosLoading(false)
    }
  }

  const handleViewDetails = (visit: Visit) => {
    setSelectedVisit(visit)
    handleViewPhotos(visit.id)
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">All Visits</h1>
        <p className="text-gray-600 mt-2">Search and view loan collection visits</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-2">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Search Form */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Search Visits</CardTitle>
          <CardDescription>Find visits by loan ID or agent information</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="space-y-2">
              <Label>Search By</Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value="loan_id"
                    checked={searchType === 'loan_id'}
                    onChange={(e) => setSearchType(e.target.value as 'loan_id')}
                    className="cursor-pointer"
                  />
                  <span>Loan ID</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value="agent"
                    checked={searchType === 'agent'}
                    onChange={(e) => setSearchType(e.target.value as 'agent')}
                    className="cursor-pointer"
                  />
                  <span>Agent (Name or Phone)</span>
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="search">Search Query</Label>
              <div className="flex gap-2">
                <Input
                  id="search"
                  type="text"
                  placeholder={searchType === 'loan_id' ? '123456789012345678901' : 'Agent name or phone number'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <Button type="submit" disabled={loading}>
                  <Search className="w-4 h-4 mr-2" />
                  {loading ? 'Searching...' : 'Search'}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Results */}
      {searched && (
        <>
          {visits.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-gray-600">
                No visits found. Try a different search query.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Results ({visits.length})</h2>
              <div className="grid gap-4">
                {visits.map((visit) => (
                  <Card key={visit.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="pt-6">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                        <div>
                          <p className="text-sm text-gray-600">Loan ID</p>
                          <p className="text-lg font-semibold">{visit.loan_id}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Agent</p>
                          <p className="text-lg font-semibold">{visit.agent?.full_name || 'Unknown'}</p>
                          <p className="text-sm text-gray-500">{visit.agent?.phone_number}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Visit Date</p>
                          <p className="text-lg font-semibold">{new Date(visit.visit_date).toLocaleDateString()}</p>
                          <p className="text-sm text-gray-500">{new Date(visit.visit_date).toLocaleTimeString()}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Status</p>
                          <p className="text-lg font-semibold capitalize text-green-600">{visit.status}</p>
                        </div>
                      </div>

                      {/* Location Info */}
                      <div className="border-t pt-4 mb-4">
                        <div className="flex items-start gap-2 text-sm">
                          <MapPin className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-gray-600">Location</p>
                            <p className="font-mono text-xs text-gray-500">
                              {visit.latitude.toFixed(6)}, {visit.longitude.toFixed(6)}
                            </p>
                            <p className="text-gray-700 break-words">{visit.location_address}</p>
                          </div>
                        </div>
                      </div>

                      {/* View Details Button */}
                      <Button
                        onClick={() => handleViewDetails(visit)}
                        variant="outline"
                        className="w-full"
                      >
                        <ImageIcon className="w-4 h-4 mr-2" />
                        View Details & Photos
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Details Modal */}
      {selectedVisit && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <CardHeader className="sticky top-0 bg-white border-b">
              <CardTitle>Visit Details - Loan {selectedVisit.loan_id}</CardTitle>
              <button
                onClick={() => setSelectedVisit(null)}
                className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              {/* Visit Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Agent</p>
                  <p className="font-semibold">{selectedVisit.agent?.full_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Phone</p>
                  <p className="font-semibold">{selectedVisit.agent?.phone_number}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Visit Date</p>
                  <p className="font-semibold">{new Date(selectedVisit.visit_date).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <p className="font-semibold capitalize text-green-600">{selectedVisit.status}</p>
                </div>
              </div>

              {/* Location */}
              <div>
                <p className="text-sm text-gray-600 mb-2">Location</p>
                <p className="text-sm font-mono text-gray-600">
                  {selectedVisit.latitude.toFixed(6)}, {selectedVisit.longitude.toFixed(6)}
                </p>
                <p className="text-sm text-gray-700 break-words mt-1">{selectedVisit.location_address}</p>
              </div>

              {/* Visit details & comments */}
              <div className="space-y-2">
                {selectedVisit.customer_name && (
                  <div>
                    <p className="text-sm text-gray-600">Person Visited</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {selectedVisit.customer_name}
                    </p>
                  </div>
                )}
                {selectedVisit.visit_status && (
                  <div>
                    <p className="text-sm text-gray-600">Visit Status</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {selectedVisit.visit_status}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-600 mb-1">Agent Comments</p>
                  <p className="text-sm text-gray-800 whitespace-pre-wrap">
                    {selectedVisit.comments && selectedVisit.comments.trim().length > 0
                      ? selectedVisit.comments
                      : 'No comments provided.'}
                  </p>
                </div>
              </div>

              {/* Photos */}
              <div>
                <p className="text-sm text-gray-600 mb-3 font-semibold">Photos</p>
                {photosLoading ? (
                  <div className="flex justify-center py-4">
                    <Loader className="w-6 h-6 animate-spin" />
                  </div>
                ) : visitPhotos.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2">
                    {visitPhotos.map((photo) => (
                      <a
                        key={photo.id}
                        href={photo.photo_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block"
                      >
                        <img
                          src={photo.photo_url}
                          alt="Visit photo"
                          className="w-full h-32 object-cover rounded-lg hover:opacity-80 transition-opacity"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          {(photo.photo_size_bytes / 1024).toFixed(0)} KB
                        </p>
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No photos found</p>
                )}
              </div>

              <Button onClick={() => setSelectedVisit(null)} className="w-full">
                Close
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
