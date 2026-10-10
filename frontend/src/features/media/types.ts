/* Mirrors App\Http\Resources\MediaResource, IndexMediaRequest and StoreMediaRequest. Media is
   the company's own file store on a private disk: `url` / `download_url` are the authenticated file
   route (the session cookie goes with <img> and links), never a storage path. */

export interface Media {
  id: number
  /** The uploader's file name, sanitised — display only. */
  original_name: string
  /** Detected from the bytes, not the upload's claim. */
  mime_type: string
  extension: string
  /** "PDF", "DOCX" — the typed tile's label. */
  type_label: string
  is_image: boolean
  size_bytes: number
  /** Inline for images and PDF. */
  url: string
  /** Always an attachment. */
  download_url: string
  created_at: string | null
}

/** GET /api/v1/media — 18 tiles a page by default, newest first. */
export interface MediaListParams {
  /** File name contains. */
  search?: string
  page: number
  per_page: number
}

/** MediaService::ALLOWED — what the server accepts (it checks the real content type). */
export const MEDIA_ACCEPT = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
] as const

/** MediaService::MAX_BYTES — 10 MB per file. */
export const MEDIA_MAX_BYTES = 10 * 1024 * 1024

export const MEDIA_PER_PAGE = 18
