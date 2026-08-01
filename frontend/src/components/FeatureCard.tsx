import { formatDistanceToNowStrict } from 'date-fns'
import { ArrowBigUp } from 'lucide-react'
import { Link } from 'react-router-dom'

import type { FeatureListItem } from './featureTypes'

function relativeSubmittedAt(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return formatDistanceToNowStrict(d, { addSuffix: true })
}

export type FeatureCardProps = {
  feature: FeatureListItem
  isGuest: boolean
  isVoting: boolean
  onVote: (featureId: number) => void
}

export function FeatureCard({
  feature,
  isGuest,
  isVoting,
  onVote,
}: FeatureCardProps) {
  const {
    id,
    title,
    description,
    vote_count,
    has_voted,
    created_at,
    submitted_by_name,
  } = feature

  const authorLine =
    submitted_by_name != null && submitted_by_name.trim() !== ''
      ? `Submitted by ${submitted_by_name}`
      : 'Submitted by unknown user'

  const relativeTime = relativeSubmittedAt(created_at)

  const voteLocked = has_voted || isVoting

  const voteShellClass = has_voted
    ? 'border-indigo-600 bg-indigo-50 text-indigo-600 ring-2 ring-indigo-500/25 dark:border-indigo-500 dark:bg-indigo-950/60 dark:text-indigo-300 dark:ring-indigo-400/30'
    : 'border-[var(--border)] bg-[var(--code-bg)] text-[var(--text-h)]'

  const iconClass = has_voted
    ? 'text-indigo-600 dark:text-indigo-300'
    : 'text-[var(--text)]'

  const voteShell =
    'flex min-h-[5.5rem] w-full flex-col items-center justify-center gap-1 rounded-lg border px-2 py-2.5 text-center transition'

  const voteControl = isGuest ? (
    <Link
      to="/login"
      className={`${voteShell} ${voteShellClass} hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]`}
      aria-label="Log in to vote"
      title="Log in to vote"
    >
      <ArrowBigUp className={`size-7 shrink-0 ${iconClass}`} strokeWidth={1.75} />
      <span className="text-lg font-semibold tabular-nums leading-none">
        {vote_count}
      </span>
      <span className="max-w-[4.5rem] text-[0.65rem] font-medium leading-tight text-[var(--text)]">
        Log in to vote
      </span>
    </Link>
  ) : (
    <button
      type="button"
      disabled={voteLocked}
      onClick={() => {
        if (voteLocked) return
        onVote(id)
      }}
      className={`${voteShell} ${voteShellClass} ${
        has_voted
          ? 'cursor-default opacity-[0.92] select-none'
          : 'enabled:hover:border-[var(--accent)] enabled:hover:bg-[var(--social-bg)]'
      } ${
        isVoting && !has_voted ? 'cursor-wait opacity-70' : ''
      } focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] disabled:cursor-not-allowed`}
      aria-label={
        has_voted ? 'You voted for this feature' : `Upvote, ${vote_count} votes`
      }
      aria-pressed={has_voted}
    >
      <ArrowBigUp className={`size-7 shrink-0 ${iconClass}`} strokeWidth={1.75} />
      <span className="text-lg font-semibold tabular-nums leading-none">
        {vote_count}
      </span>
      <span
        className={`text-[0.65rem] font-semibold uppercase tracking-wide ${
          has_voted
            ? 'text-indigo-600/85 dark:text-indigo-300/85'
            : 'text-[var(--text)]'
        }`}
      >
        {has_voted ? 'Voted' : 'Vote'}
      </span>
    </button>
  )

  return (
    <article
      className="flex w-full max-w-full min-w-0 gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg)] p-3 shadow-[var(--shadow)] sm:gap-4 sm:p-4 max-sm:rounded-lg"
      aria-busy={isVoting}
    >
      <div className="flex w-[4.75rem] shrink-0 flex-col">{voteControl}</div>

      <div className="min-w-0 flex-1">
        <h2 className="text-lg font-bold leading-snug tracking-tight text-[var(--text-h)]">
          {title}
        </h2>
        <p className="mt-1.5 line-clamp-3 text-sm leading-relaxed text-[var(--text)]">
          {description}
        </p>
        <section
          className="mt-3 border-t border-[var(--border)] pt-3"
          aria-label="Meta"
        >
          <h3 className="mb-2 text-[0.65rem] font-semibold uppercase tracking-wider text-[var(--text)]">
            Meta
          </h3>
          <div className="flex flex-col gap-1 text-xs leading-snug text-[var(--text)]">
            <p className="text-[var(--text-h)]">{authorLine}</p>
            {relativeTime ? (
              <p className="tabular-nums text-[var(--text)]">{relativeTime}</p>
            ) : null}
          </div>
        </section>
      </div>
    </article>
  )
}
