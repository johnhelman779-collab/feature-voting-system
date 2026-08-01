export type FeatureSort = 'top' | 'newest'

export type FeatureListItem = {
  id: number
  title: string
  description: string
  vote_count: number
  has_voted: boolean
  created_at: string
  status: string
  submitted_by_name: string | null
}

/** DRF `PageNumberPagination` shape for `GET /api/features/` */
export type PaginatedFeatureList = {
  count: number
  next: string | null
  previous: string | null
  results: FeatureListItem[]
}
