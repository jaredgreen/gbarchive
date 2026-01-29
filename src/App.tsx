import { useState, useEffect } from 'react'
import './App.css'

interface Video {
  title: string
  link: string
  pubDate: string
  description: string
  thumbnail: string
  videoUrl: string
  guid: string
}

function App() {
  const [videos, setVideos] = useState<Video[]>([])
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)

  useEffect(() => {
    fetchVideos(currentPage)
  }, [currentPage])

  const fetchVideos = async (page: number) => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        q: 'collection:"giant-bomb-archive"',
        'fl[]': 'identifier',
        rows: '50',
        page: page.toString(),
        output: 'rss',
        save: 'yes'
      })

      const response = await fetch(`/api/search?${params.toString()}`)

      if (!response.ok) {
        throw new Error('Failed to fetch RSS feed')
      }

      const xmlText = await response.text()
      const parser = new DOMParser()
      const xmlDoc = parser.parseFromString(xmlText, 'text/xml')

      const items = xmlDoc.querySelectorAll('item')
      const parsedVideos: Video[] = []

      items.forEach((item) => {
        const title = item.querySelector('title')?.textContent || 'Untitled'
        const link = item.querySelector('link')?.textContent || ''
        const pubDate = item.querySelector('pubDate')?.textContent || ''
        const description = item.querySelector('description')?.textContent || ''
        const guid = item.querySelector('guid')?.textContent || ''

        const thumbnail = item.querySelector('thumbnail')?.getAttribute('url') ||
                         item.getElementsByTagName('media\\:thumbnail')[0]?.getAttribute('url') ||
                         item.getElementsByTagNameNS('http://search.yahoo.com/mrss/', 'thumbnail')[0]?.getAttribute('url') || ''

        const videoContent = item.querySelector('content')?.getAttribute('url') ||
                            item.getElementsByTagName('media\\:content')[0]?.getAttribute('url') ||
                            item.getElementsByTagNameNS('http://search.yahoo.com/mrss/', 'content')[0]?.getAttribute('url') ||
                            item.querySelector('enclosure')?.getAttribute('url') || ''

        if (title && link) {
          parsedVideos.push({
            title,
            link,
            pubDate,
            description,
            thumbnail,
            videoUrl: videoContent,
            guid
          })
        }
      })

      setVideos(parsedVideos)
      setHasMore(parsedVideos.length >= 50)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const goToNextPage = () => {
    setCurrentPage(prev => prev + 1)
    setSelectedVideo(null)
    window.scrollTo(0, 0)
  }

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1)
      setSelectedVideo(null)
      window.scrollTo(0, 0)
    }
  }

  const goToPage = (page: number) => {
    setCurrentPage(page)
    setSelectedVideo(null)
    window.scrollTo(0, 0)
  }

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    } catch {
      return dateString
    }
  }

  if (loading) {
    return (
      <div className="app">
        <div className="loading">Loading Giant Bomb Archive...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="app">
        <div className="error">
          <h2>Error</h2>
          <p>{error}</p>
          <button onClick={fetchVideos}>Retry</button>
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      <header className="header">
        <h1>Giant Bomb Archive</h1>
        <p>{videos.length} videos on page {currentPage}</p>
      </header>

      {selectedVideo ? (
        <div className="video-player-container">
          <button className="back-button" onClick={() => setSelectedVideo(null)}>
            &larr; Back to List
          </button>
          <div className="video-player">
            <h2>{selectedVideo.title}</h2>
            <p className="video-date">{formatDate(selectedVideo.pubDate)}</p>
            {selectedVideo.videoUrl ? (
              <video controls autoPlay className="video-element">
                <source src={selectedVideo.videoUrl} type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            ) : (
              <div className="no-video">
                <p>Video file not available</p>
                <a href={selectedVideo.link} target="_blank" rel="noopener noreferrer">
                  View on Archive.org
                </a>
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="video-grid">
            {videos.map((video) => (
              <div
                key={video.guid}
                className="video-card"
                onClick={() => setSelectedVideo(video)}
              >
                {video.thumbnail && (
                  <img
                    src={video.thumbnail}
                    alt={video.title}
                    className="video-thumbnail"
                  />
                )}
                <div className="video-info">
                  <h3 className="video-title">{video.title}</h3>
                  <p className="video-date">{formatDate(video.pubDate)}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="pagination">
            <button
              className="pagination-button"
              onClick={goToPreviousPage}
              disabled={currentPage === 1}
            >
              &larr; Previous
            </button>

            <div className="pagination-info">
              <span className="page-number">Page {currentPage}</span>
              <div className="page-jump">
                <input
                  type="number"
                  min="1"
                  value={currentPage}
                  onChange={(e) => {
                    const page = parseInt(e.target.value)
                    if (page > 0) goToPage(page)
                  }}
                  className="page-input"
                  placeholder="Page"
                />
              </div>
            </div>

            <button
              className="pagination-button"
              onClick={goToNextPage}
              disabled={!hasMore}
            >
              Next &rarr;
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export default App
