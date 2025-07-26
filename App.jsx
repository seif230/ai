import { useState } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Separator } from '@/components/ui/separator.jsx'
import { Search, BookOpen, Brain, FileText, ExternalLink, Loader2 } from 'lucide-react'
import './App.css'

function App() {
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState(null)
  const [followUpQuestions, setFollowUpQuestions] = useState(null)
  const [isSearching, setIsSearching] = useState(false)
  const [isRefining, setIsRefining] = useState(false)
  const [selectedPapers, setSelectedPapers] = useState([])
  const [generatedReport, setGeneratedReport] = useState(null)
  const [isGeneratingReport, setIsGeneratingReport] = useState(false)

  const handleSearch = async () => {
    if (!query.trim()) return
    
    setIsSearching(true)
    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      })
      
      if (response.ok) {
        const data = await response.json()
        setSearchResults(data)
        
        // Also get query refinement suggestions
        await handleQueryRefinement()
      } else {
        console.error('Search failed')
      }
    } catch (error) {
      console.error('Error during search:', error)
    } finally {
      setIsSearching(false)
    }
  }

  const handleQueryRefinement = async () => {
    setIsRefining(true)
    try {
      const response = await fetch('/api/refine_query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          query,
          context: searchResults ? `Found ${searchResults.total_count} results` : ''
        }),
      })
      
      if (response.ok) {
        const data = await response.json()
        setFollowUpQuestions(data)
      }
    } catch (error) {
      console.error('Error during query refinement:', error)
    } finally {
      setIsRefining(false)
    }
  }

  const handleRefinedQuery = (refinedQuery) => {
    setQuery(refinedQuery)
    setSearchResults(null)
    setFollowUpQuestions(null)
  }

  const handleGenerateReport = async () => {
    if (selectedPapers.length === 0) {
      alert('Please select at least one paper to generate a report')
      return
    }

    setIsGeneratingReport(true)
    try {
      const response = await fetch('/api/generate_report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          papers: selectedPapers,
          query: query
        }),
      })
      
      if (response.ok) {
        const data = await response.json()
        setGeneratedReport(data)
      } else {
        console.error('Report generation failed')
      }
    } catch (error) {
      console.error('Error during report generation:', error)
    } finally {
      setIsGeneratingReport(false)
    }
  }

  const togglePaperSelection = (paper) => {
    setSelectedPapers(prev => {
      const isSelected = prev.some(p => 
        (p.pmid && p.pmid === paper.pmid) || 
        (p.arxiv_id && p.arxiv_id === paper.arxiv_id)
      )
      
      if (isSelected) {
        return prev.filter(p => 
          !(p.pmid && p.pmid === paper.pmid) && 
          !(p.arxiv_id && p.arxiv_id === paper.arxiv_id)
        )
      } else {
        return [...prev, paper]
      }
    })
  }

  const isPaperSelected = (paper) => {
    return selectedPapers.some(p => 
      (p.pmid && p.pmid === paper.pmid) || 
      (p.arxiv_id && p.arxiv_id === paper.arxiv_id)
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Brain className="h-8 w-8 text-indigo-600 mr-2" />
            <h1 className="text-4xl font-bold text-gray-900">Research Assistant</h1>
          </div>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            AI-powered academic search across PubMed, ArXiv, and more. 
            Get intelligent follow-up questions and comprehensive reports with citations.
          </p>
        </div>

        {/* Search Section */}
        <Card className="mb-8 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Search className="h-5 w-5 mr-2" />
              Search Academic Literature
            </CardTitle>
            <CardDescription>
              Enter your research question or topic to begin exploring the literature
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                placeholder="e.g., machine learning applications in healthcare"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="flex-1"
              />
              <Button 
                onClick={handleSearch} 
                disabled={isSearching || !query.trim()}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                {isSearching ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Search className="h-4 w-4 mr-2" />
                )}
                Search
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Follow-up Questions */}
        {followUpQuestions && (
          <Card className="mb-8 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Brain className="h-5 w-5 mr-2" />
                Refine Your Search
              </CardTitle>
              <CardDescription>
                {followUpQuestions.explanation}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isRefining ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin mr-2" />
                  <span>Generating suggestions...</span>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Follow-up Questions:</h4>
                    <div className="space-y-2">
                      {followUpQuestions.follow_up_questions?.map((question, index) => (
                        <div key={index} className="text-sm text-gray-700 bg-gray-50 p-2 rounded">
                          {question}
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold mb-2">Suggested Refined Queries:</h4>
                    <div className="flex flex-wrap gap-2">
                      {followUpQuestions.refined_queries?.map((refinedQuery, index) => (
                        <Button
                          key={index}
                          variant="outline"
                          size="sm"
                          onClick={() => handleRefinedQuery(refinedQuery)}
                          className="text-xs"
                        >
                          {refinedQuery}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Search Results */}
        {searchResults && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">
                Search Results ({searchResults.total_count} found)
              </h2>
              <Button 
                variant="outline" 
                className="flex items-center"
                onClick={handleGenerateReport}
                disabled={isGeneratingReport || selectedPapers.length === 0}
              >
                {isGeneratingReport ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <FileText className="h-4 w-4 mr-2" />
                )}
                Generate Report ({selectedPapers.length} selected)
              </Button>
            </div>

            {/* PubMed Results */}
            {searchResults.pubmed && searchResults.pubmed.length > 0 && (
              <div>
                <h3 className="text-xl font-semibold mb-4 flex items-center">
                  <BookOpen className="h-5 w-5 mr-2 text-green-600" />
                  PubMed Results ({searchResults.pubmed.length})
                </h3>
                <div className="grid gap-4">
                  {searchResults.pubmed.map((paper, index) => (
                    <Card key={index} className={`hover:shadow-md transition-shadow ${isPaperSelected(paper) ? 'ring-2 ring-indigo-500' : ''}`}>
                      <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-start flex-1">
                            <input
                              type="checkbox"
                              checked={isPaperSelected(paper)}
                              onChange={() => togglePaperSelection(paper)}
                              className="mt-1 mr-3"
                            />
                            <h4 className="font-semibold text-lg text-gray-900 flex-1 mr-4">
                              {paper.title}
                            </h4>
                          </div>
                          <Badge variant="secondary" className="bg-green-100 text-green-800">
                            PubMed
                          </Badge>
                        </div>
                        
                        <div className="text-sm text-gray-600 mb-2">
                          <span className="font-medium">Authors:</span> {paper.authors.join(', ')}
                        </div>
                        
                        <div className="text-sm text-gray-600 mb-3">
                          <span className="font-medium">Journal:</span> {paper.journal} ({paper.year})
                        </div>
                        
                        <p className="text-gray-700 mb-3 line-clamp-3">
                          {paper.abstract}
                        </p>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">PMID: {paper.pmid}</span>
                          <Button variant="outline" size="sm" asChild>
                            <a href={paper.url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-3 w-3 mr-1" />
                              View Paper
                            </a>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* ArXiv Results */}
            {searchResults.arxiv && searchResults.arxiv.length > 0 && (
              <div>
                <Separator className="my-6" />
                <h3 className="text-xl font-semibold mb-4 flex items-center">
                  <BookOpen className="h-5 w-5 mr-2 text-orange-600" />
                  ArXiv Results ({searchResults.arxiv.length})
                </h3>
                <div className="grid gap-4">
                  {searchResults.arxiv.map((paper, index) => (
                    <Card key={index} className={`hover:shadow-md transition-shadow ${isPaperSelected(paper) ? 'ring-2 ring-indigo-500' : ''}`}>
                      <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-start flex-1">
                            <input
                              type="checkbox"
                              checked={isPaperSelected(paper)}
                              onChange={() => togglePaperSelection(paper)}
                              className="mt-1 mr-3"
                            />
                            <h4 className="font-semibold text-lg text-gray-900 flex-1 mr-4">
                              {paper.title}
                            </h4>
                          </div>
                          <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                            ArXiv
                          </Badge>
                        </div>
                        
                        <div className="text-sm text-gray-600 mb-2">
                          <span className="font-medium">Authors:</span> {paper.authors.join(', ')}
                        </div>
                        
                        <div className="text-sm text-gray-600 mb-2">
                          <span className="font-medium">Categories:</span> {paper.categories.join(', ')}
                        </div>
                        
                        <div className="text-sm text-gray-600 mb-3">
                          <span className="font-medium">Published:</span> {paper.year}
                        </div>
                        
                        <p className="text-gray-700 mb-3 line-clamp-3">
                          {paper.abstract}
                        </p>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">ArXiv ID: {paper.arxiv_id}</span>
                          <Button variant="outline" size="sm" asChild>
                            <a href={paper.url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-3 w-3 mr-1" />
                              View Paper
                            </a>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Generated Report */}
        {generatedReport && (
          <Card className="mt-8 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                Research Report
              </CardTitle>
              <CardDescription>
                Generated on {new Date(generatedReport.generated_at).toLocaleString()}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="prose max-w-none">
                <div className="whitespace-pre-wrap text-gray-800 leading-relaxed">
                  {generatedReport.report}
                </div>
              </div>
              
              {generatedReport.citations && generatedReport.citations.length > 0 && (
                <div className="mt-8 pt-6 border-t">
                  <h3 className="text-lg font-semibold mb-4">References</h3>
                  <div className="space-y-2">
                    {generatedReport.citations.map((citation, index) => (
                      <div key={index} className="text-sm text-gray-700">
                        <span className="font-medium">[{citation.id}]</span> {citation.authors.join(', ')} ({citation.year}). 
                        <em>{citation.title}</em>. 
                        {citation.journal && <span>{citation.journal}. </span>}
                        {citation.url && (
                          <a href={citation.url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">
                            {citation.source === 'PubMed' ? `PMID: ${citation.pmid}` : `ArXiv: ${citation.arxiv_id}`}
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {!searchResults && !isSearching && !generatedReport && (
          <Card className="text-center py-12 shadow-lg">
            <CardContent>
              <Search className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Ready to explore academic literature?
              </h3>
              <p className="text-gray-600 mb-4">
                Enter a research question above to get started with AI-powered search and analysis.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                <Badge variant="outline">PubMed</Badge>
                <Badge variant="outline">ArXiv</Badge>
                <Badge variant="outline">AI-Powered</Badge>
                <Badge variant="outline">Citation Analysis</Badge>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

export default App

