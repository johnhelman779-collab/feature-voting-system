import {
  type QueryClient,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'

import { apiClient, getApiErrorDetail } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { FeatureCard } from './FeatureCard'
import type {
  FeatureListItem,
  FeatureSort,
  PaginatedFeatureList,
} from './featureTypes'
import './FeatureList.css'

export type { FeatureListItem, FeatureSort, PaginatedFeatureList } from './featureTypes'

type FeatureDetail = {
  id: number
  title: string
  description: string
  created_at: string
  status: string
  vote_count: number
  has_voted: boolean
  submitted_by_name: string | null
}

const PAGE_SIZE = 10

function orderingParam(sort: FeatureSort): string {
  return sort === 'top' ? '-vote_count,-created_at' : '-created_at'
}

/** Matches DRF list ordering `-vote_count,-created_at` for in-cache reorder after votes. */
function compareTopOrder(a: FeatureListItem, b: FeatureListItem): number {
  if (b.vote_count !== a.vote_count) {
    return b.vote_count - a.vote_count
  }
  return b.created_at.localeCompare(a.created_at)
}

function applyVotePatchToFeaturesCache(
  queryClient: QueryClient,
  mapRow: (row: FeatureListItem) => FeatureListItem,
) {
  const entries = queryClient.getQueriesData<PaginatedFeatureList>({
    queryKey: ['features'],
  })
  for (const [queryKey, old] of entries) {
    if (old?.results == null) continue
    const listSort = queryKey[1] as FeatureSort
    if (listSort !== 'top' && listSort !== 'newest') continue
    const results = old.results.map((row) => mapRow(row))
    const nextResults =
      listSort === 'top' ? [...results].sort(compareTopOrder) : results
    queryClient.setQueryData(queryKey, { ...old, results: nextResults })
  }
}

async function fetchFeatures(
  sort: FeatureSort,
  page: number,
): Promise<PaginatedFeatureList> {
  const { data } = await apiClient.get<PaginatedFeatureList>('features/', {
    params: { ordering: orderingParam(sort), page },
  })
  return data
}

export function FeatureList() {
  const { user, isInitializing: authInitializing } = useAuth()
  const isGuest = !authInitializing && user == null

  const [sort, setSort] = useState<FeatureSort>('top')
  const [page, setPage] = useState(1)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [voteError, setVoteError] = useState<string | null>(null)
  const queryClient = useQueryClient()

  useEffect(() => {
    setPage(1)
  }, [sort])

  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ['features', sort, page],
    queryFn: () => fetchFeatures(sort, page),
  })

  const createMutation = useMutation({
    mutationFn: async (payload: { title: string; description: string }) => {
      const { data: body } = await apiClient.post<FeatureDetail>(
        'features/',
        payload,
      )
      return body
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['features'] })
      setTitle('')
      setDescription('')
      setSubmitError(null)
    },
    onError: (err) => {
      setSubmitError(getApiErrorDetail(err))
    },
  })

  const voteMutation = useMutation({
    mutationFn: async (featureId: number) => {
      const { data: body } = await apiClient.post<FeatureDetail>(
        `features/${featureId}/vote/`,
      )
      return body
    },
    onMutate: (featureId) => {
      setVoteError(null)
      const previousEntries = queryClient.getQueriesData<PaginatedFeatureList>({
        queryKey: ['features'],
      })
      applyVotePatchToFeaturesCache(queryClient, (f) =>
        f.id === featureId
          ? { ...f, vote_count: f.vote_count + 1, has_voted: true }
          : f,
      )
      void queryClient.cancelQueries({ queryKey: ['features'] })
      return { previousEntries }
    },
    onError: (err, _featureId, context) => {
      context?.previousEntries.forEach(([queryKey, cached]) => {
        queryClient.setQueryData(queryKey, cached)
      })
      setVoteError(getApiErrorDetail(err))
    },
    onSuccess: (body, featureId) => {
      applyVotePatchToFeaturesCache(queryClient, (f) =>
        f.id === featureId
          ? {
              ...f,
              vote_count: body.vote_count,
              title: body.title,
              description: body.description,
              has_voted: body.has_voted,
              created_at: body.created_at,
              status: body.status,
              submitted_by_name: body.submitted_by_name,
            }
          : f,
      )
      // TOP order is global; refetch so pages and neighbors match the server.
      void queryClient.invalidateQueries({ queryKey: ['features', 'top'] })
    },
  })

  const votingId =
    voteMutation.isPending && voteMutation.variables != null
      ? voteMutation.variables
      : null

  function handleCreateSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmedTitle = title.trim()
    const trimmedDescription = description.trim()
    if (!trimmedTitle || !trimmedDescription) {
      setSubmitError('Title and description are required.')
      return
    }
    setSubmitError(null)
    createMutation.mutate({
      title: trimmedTitle,
      description: trimmedDescription,
    })
  }

  const totalPages =
    data != null && data.count > 0
      ? Math.max(1, Math.ceil(data.count / PAGE_SIZE))
      : 1

  return (
    <section className="feature-list" aria-labelledby="feature-list-heading">
      <div className="feature-list__toolbar">
        <h1 id="feature-list-heading" className="feature-list__title">
          Feature requests
        </h1>
        <div
          className="feature-list__toggle"
          role="group"
          aria-label="Sort features"
        >
          <button
            type="button"
            className={
              sort === 'top'
                ? 'feature-list__toggle-btn feature-list__toggle-btn--active'
                : 'feature-list__toggle-btn'
            }
            onClick={() => setSort('top')}
            aria-pressed={sort === 'top'}
          >
            Top
          </button>
          <button
            type="button"
            className={
              sort === 'newest'
                ? 'feature-list__toggle-btn feature-list__toggle-btn--active'
                : 'feature-list__toggle-btn'
            }
            onClick={() => setSort('newest')}
            aria-pressed={sort === 'newest'}
          >
            Newest
          </button>
        </div>
      </div>

      {isGuest ? (
        <div className="feature-list__guest-hint" role="note">
          Log in to suggest or upvote features.{' '}
          <Link to="/login">Log in</Link>
        </div>
      ) : null}

      {!isGuest ? (
        <form
          className="feature-submit"
          onSubmit={handleCreateSubmit}
          aria-labelledby="feature-submit-heading"
        >
          <h2 id="feature-submit-heading" className="feature-submit__heading">
            Submit a feature
          </h2>
          <div className="feature-submit__fields">
            <label className="feature-submit__label">
              <span className="feature-submit__label-text">Title</span>
              <input
                className="feature-submit__input"
                name="title"
                type="text"
                autoComplete="off"
                maxLength={200}
                value={title}
                onChange={(ev) => setTitle(ev.target.value)}
                disabled={createMutation.isPending}
                aria-invalid={submitError != null && !title.trim()}
              />
            </label>
            <label className="feature-submit__label">
              <span className="feature-submit__label-text">Description</span>
              <textarea
                className="feature-submit__textarea"
                name="description"
                rows={4}
                value={description}
                onChange={(ev) => setDescription(ev.target.value)}
                disabled={createMutation.isPending}
                aria-invalid={submitError != null && !description.trim()}
              />
            </label>
          </div>
          {submitError ? (
            <p className="feature-submit__error" role="alert">
              {submitError}
            </p>
          ) : null}
          <button
            type="submit"
            className="feature-submit__button"
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? 'Submitting…' : 'Submit feature'}
          </button>
        </form>
      ) : null}

      {voteError && !isGuest ? (
        <div
          className="feature-list__vote-error"
          role="alert"
        >
          {voteError}
        </div>
      ) : null}

      {isPending ? (
        <p className="feature-list__state">Loading features…</p>
      ) : null}

      {isError ? (
        <div className="feature-list__state feature-list__state--error">
          <p>Could not load features.</p>
          <p className="feature-list__error-detail">
            {getApiErrorDetail(error)}
          </p>
          <button type="button" onClick={() => void refetch()}>
            Retry
          </button>
        </div>
      ) : null}

      {!isPending && !isError && data?.count === 0 ? (
        <p className="feature-list__state">No feature requests yet.</p>
      ) : null}

      {data && data.results.length > 0 ? (
        <>
          <ul className="feature-list__grid">
            {data.results.map((feature) => (
              <li key={feature.id}>
                <FeatureCard
                  feature={feature}
                  isGuest={isGuest}
                  isVoting={votingId === feature.id}
                  onVote={(id) => voteMutation.mutate(id)}
                />
              </li>
            ))}
          </ul>
          {data.next != null || data.previous != null ? (
            <nav
              className="feature-list__pager"
              aria-label="Feature list pages"
            >
              <button
                type="button"
                className="feature-list__pager-btn"
                disabled={data.previous == null}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </button>
              <span className="feature-list__pager-meta">
                Page {page} of {totalPages}
                <span className="feature-list__pager-count">
                  {' '}
                  ({data.count} total)
                </span>
              </span>
              <button
                type="button"
                className="feature-list__pager-btn"
                disabled={data.next == null}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </nav>
          ) : null}
        </>
      ) : null}
    </section>
  )
}
