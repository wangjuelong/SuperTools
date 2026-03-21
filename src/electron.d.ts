interface Note {
  id: string
  title: string
  content: string
  tags: string[]
  pinned: boolean
  deleted?: boolean
  createdAt: number
  updatedAt: number
}

interface Window {
  electronAPI: {
    platform: string
    notes: {
      list:   ()           => Promise<Note[]>
      save:   (note: Note) => Promise<boolean>
      delete: (id: string) => Promise<boolean>
    }
  }
}
