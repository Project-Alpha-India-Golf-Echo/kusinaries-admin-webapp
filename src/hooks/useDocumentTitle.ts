import { useEffect } from 'react'

export const useDocumentTitle = (title?: string) => {
  useEffect(() => {
    const baseTitle = 'Kusinaries'
    
    if (title) {
      document.title = `${baseTitle} | ${title}`
    } else {
      document.title = baseTitle
    }

    // Cleanup function to reset title when component unmounts
    return () => {
      document.title = baseTitle
    }
  }, [title])
}
