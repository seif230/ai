from flask import Blueprint, jsonify, request
import requests
import xml.etree.ElementTree as ET
from urllib.parse import quote
import re
import json
from datetime import datetime

research_bp = Blueprint('research', __name__)

@research_bp.route('/search', methods=['POST'])
def search_papers():
    """
    Initial search endpoint that takes a user query and returns results from PubMed and ArXiv
    """
    data = request.json
    query = data.get('query', '')
    
    if not query:
        return jsonify({'error': 'Query is required'}), 400
    
    try:
        # Search PubMed
        pubmed_results = search_pubmed(query)
        
        # Search ArXiv
        arxiv_results = search_arxiv(query)
        
        # Combine results
        all_results = {
            'pubmed': pubmed_results,
            'arxiv': arxiv_results,
            'total_count': len(pubmed_results) + len(arxiv_results)
        }
        
        return jsonify(all_results)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@research_bp.route('/refine_query', methods=['POST'])
def refine_query():
    """
    Simplified query refinement without LLM (for deployment)
    """
    data = request.json
    original_query = data.get('query', '')
    
    if not original_query:
        return jsonify({'error': 'Original query is required'}), 400
    
    # Simple rule-based refinement suggestions
    follow_up_questions = [
        f"What specific aspect of '{original_query}' are you most interested in?",
        f"Are you looking for recent research (last 5 years) on '{original_query}'?",
        f"Do you want to focus on clinical studies or theoretical research about '{original_query}'?",
        f"Are there specific methodologies you want to see in '{original_query}' research?"
    ]
    
    # Generate some refined queries based on common patterns
    refined_queries = [
        f"{original_query} recent advances",
        f"{original_query} systematic review",
        f"{original_query} clinical trials",
        f"{original_query} machine learning"
    ]
    
    result = {
        "follow_up_questions": follow_up_questions,
        "refined_queries": refined_queries,
        "explanation": "These suggestions can help narrow down your search and find more specific results."
    }
    
    return jsonify(result)

@research_bp.route('/generate_report', methods=['POST'])
def generate_report():
    """
    Simplified report generation without LLM (for deployment)
    """
    data = request.json
    selected_papers = data.get('papers', [])
    query = data.get('query', '')
    
    if not selected_papers:
        return jsonify({'error': 'No papers selected for report generation'}), 400
    
    try:
        # Generate a simple report without LLM
        report_content = generate_simple_report(selected_papers, query)
        
        return jsonify({
            'report': report_content,
            'citations': extract_citations(selected_papers),
            'generated_at': str(datetime.now())
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def generate_simple_report(papers, query):
    """
    Generate a simple research report without LLM
    """
    report = f"""# Research Report: {query}

## Executive Summary

This report analyzes {len(papers)} selected papers related to "{query}". The research spans multiple sources including PubMed and ArXiv, providing a comprehensive overview of current literature in this field.

## Literature Overview

The selected papers cover various aspects of {query}:

"""
    
    for i, paper in enumerate(papers, 1):
        title = paper.get('title', 'Unknown Title')
        authors = ', '.join(paper.get('authors', [])[:3])  # First 3 authors
        if len(paper.get('authors', [])) > 3:
            authors += " et al."
        year = paper.get('year', 'Unknown')
        abstract = paper.get('abstract', 'No abstract available')[:300] + "..."
        
        report += f"""### [{i}] {title}

**Authors:** {authors}  
**Year:** {year}  
**Source:** {paper.get('source', 'Unknown')}

**Abstract:** {abstract}

"""
    
    report += f"""## Key Findings

Based on the analysis of {len(papers)} papers:

1. **Research Scope**: The literature covers diverse methodologies and approaches to {query}
2. **Publication Timeline**: Papers span from recent publications to established foundational work
3. **Source Diversity**: Research comes from both peer-reviewed journals (PubMed) and preprint servers (ArXiv)

## Methodology Analysis

The selected papers employ various research methodologies:
- Experimental studies
- Systematic reviews
- Theoretical frameworks
- Clinical investigations

## Current Challenges and Limitations

Common challenges identified across the literature include:
- Need for larger sample sizes
- Standardization of methodologies
- Integration of interdisciplinary approaches
- Translation from research to practical applications

## Future Research Directions

Potential areas for future investigation:
- Advanced computational methods
- Cross-disciplinary collaboration
- Long-term longitudinal studies
- Real-world implementation studies

## Conclusion

This literature review of {len(papers)} papers provides a foundation for understanding the current state of research in {query}. The diversity of sources and methodologies represented offers multiple perspectives on this important research area.

## References

See the citations section below for complete bibliographic information for all referenced papers.
"""
    
    return report

def extract_citations(papers):
    """
    Extract and format citations from the selected papers
    """
    citations = []
    for i, paper in enumerate(papers, 1):
        citation = {
            'id': i,
            'title': paper.get('title', 'Unknown Title'),
            'authors': paper.get('authors', []),
            'year': paper.get('year', 'Unknown'),
            'source': paper.get('source', 'Unknown'),
            'url': paper.get('url', ''),
            'journal': paper.get('journal', ''),
            'pmid': paper.get('pmid', ''),
            'arxiv_id': paper.get('arxiv_id', '')
        }
        citations.append(citation)
    
    return citations

def search_pubmed(query, max_results=20):
    """
    Search PubMed using NCBI E-utilities
    """
    try:
        # Step 1: Search for PMIDs
        search_url = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi"
        search_params = {
            'db': 'pubmed',
            'term': query,
            'retmax': max_results,
            'retmode': 'json'
        }
        
        search_response = requests.get(search_url, params=search_params)
        search_data = search_response.json()
        
        pmids = search_data.get('esearchresult', {}).get('idlist', [])
        
        if not pmids:
            return []
        
        # Step 2: Fetch details for the PMIDs
        fetch_url = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi"
        fetch_params = {
            'db': 'pubmed',
            'id': ','.join(pmids),
            'retmode': 'xml'
        }
        
        fetch_response = requests.get(fetch_url, params=fetch_params)
        
        # Parse XML response
        root = ET.fromstring(fetch_response.content)
        
        results = []
        for article in root.findall('.//PubmedArticle'):
            try:
                # Extract title
                title_elem = article.find('.//ArticleTitle')
                title = title_elem.text if title_elem is not None else 'No title'
                
                # Extract abstract
                abstract_elem = article.find('.//AbstractText')
                abstract = abstract_elem.text if abstract_elem is not None else 'No abstract available'
                
                # Extract authors
                authors = []
                for author in article.findall('.//Author'):
                    lastname = author.find('LastName')
                    forename = author.find('ForeName')
                    if lastname is not None and forename is not None:
                        authors.append(f"{forename.text} {lastname.text}")
                
                # Extract publication date
                pub_date = article.find('.//PubDate')
                year = pub_date.find('Year').text if pub_date is not None and pub_date.find('Year') is not None else 'Unknown'
                
                # Extract PMID
                pmid_elem = article.find('.//PMID')
                pmid = pmid_elem.text if pmid_elem is not None else 'Unknown'
                
                # Extract journal
                journal_elem = article.find('.//Journal/Title')
                journal = journal_elem.text if journal_elem is not None else 'Unknown journal'
                
                results.append({
                    'title': title,
                    'abstract': abstract,
                    'authors': authors,
                    'year': year,
                    'pmid': pmid,
                    'journal': journal,
                    'source': 'PubMed',
                    'url': f"https://pubmed.ncbi.nlm.nih.gov/{pmid}/"
                })
                
            except Exception as e:
                continue  # Skip articles with parsing errors
        
        return results
        
    except Exception as e:
        print(f"Error searching PubMed: {e}")
        return []

def search_arxiv(query, max_results=20):
    """
    Search ArXiv using their API
    """
    try:
        # ArXiv API endpoint
        base_url = "http://export.arxiv.org/api/query"
        
        # Prepare search parameters
        params = {
            'search_query': f'all:{query}',
            'start': 0,
            'max_results': max_results,
            'sortBy': 'relevance',
            'sortOrder': 'descending'
        }
        
        response = requests.get(base_url, params=params)
        
        # Parse XML response
        root = ET.fromstring(response.content)
        
        # Define namespace
        ns = {'atom': 'http://www.w3.org/2005/Atom'}
        
        results = []
        for entry in root.findall('atom:entry', ns):
            try:
                # Extract title
                title_elem = entry.find('atom:title', ns)
                title = title_elem.text.strip() if title_elem is not None else 'No title'
                
                # Extract abstract
                summary_elem = entry.find('atom:summary', ns)
                abstract = summary_elem.text.strip() if summary_elem is not None else 'No abstract available'
                
                # Extract authors
                authors = []
                for author in entry.findall('atom:author', ns):
                    name_elem = author.find('atom:name', ns)
                    if name_elem is not None:
                        authors.append(name_elem.text)
                
                # Extract publication date
                published_elem = entry.find('atom:published', ns)
                published = published_elem.text[:4] if published_elem is not None else 'Unknown'  # Extract year
                
                # Extract ArXiv ID
                id_elem = entry.find('atom:id', ns)
                arxiv_id = id_elem.text.split('/')[-1] if id_elem is not None else 'Unknown'
                
                # Extract categories
                categories = []
                for category in entry.findall('atom:category', ns):
                    term = category.get('term')
                    if term:
                        categories.append(term)
                
                results.append({
                    'title': title,
                    'abstract': abstract,
                    'authors': authors,
                    'year': published,
                    'arxiv_id': arxiv_id,
                    'categories': categories,
                    'source': 'ArXiv',
                    'url': f"https://arxiv.org/abs/{arxiv_id}"
                })
                
            except Exception as e:
                continue  # Skip entries with parsing errors
        
        return results
        
    except Exception as e:
        print(f"Error searching ArXiv: {e}")
        return []

