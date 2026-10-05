'use client'

import * as React from 'react'
import { CircleAlert, Lock, User } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { SectionNav, type SectionNavItem } from '@/components/ui/section-nav'
import { useProfile } from '@/features/profile/api'
import { PasswordForm } from '@/features/profile/components/password-form'
import { ProfileCardSkeleton } from '@/features/profile/components/profile-skeleton'
import { ProfileForm } from '@/features/profile/components/profile-form'

const SECTIONS = ['profile', 'password'] as const
type SectionId = (typeof SECTIONS)[number]

/** Height of the sticky top bar (`topbar-height`, 64px) plus breathing room (16px). */
const SPY_OFFSET = 80

/**
 * Scroll-spy: the current section is the last one whose top has scrolled past the top bar;
 * once a scrollable page is scrolled to the very bottom it is the last section (which may
 * never reach the top).
 */
function useActiveSection(): [SectionId, (id: SectionId) => void] {
  const [active, setActive] = React.useState<SectionId>('profile')

  React.useEffect(() => {
    let frame = 0
    const update = () => {
      frame = 0
      // Only a page that can scroll, and has been scrolled, can be "at the bottom" — when the
      // whole page fits on screen, the first section stays current (as in the screenshot).
      const scrollHeight = document.documentElement.scrollHeight
      const scrollable = scrollHeight > window.innerHeight + 2
      const atBottom = scrollable && window.scrollY > 0 && window.innerHeight + window.scrollY >= scrollHeight - 2
      if (atBottom) return setActive(SECTIONS[SECTIONS.length - 1])
      let current: SectionId = SECTIONS[0]
      for (const id of SECTIONS) {
        const top = document.getElementById(id)?.getBoundingClientRect().top
        if (top !== undefined && top - SPY_OFFSET <= 1) current = id
      }
      setActive(current)
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  return [active, setActive]
}

/* The two-column body of Profile Settings: a narrow left nav card (section navigation, not
   tabs — both cards stay visible) and the two independent forms. Columns stack below `lg`. */
export function ProfileSettings() {
  const t = useTranslations('profile')
  const profile = useProfile()
  const [active, setActive] = useActiveSection()

  const items: SectionNavItem[] = [
    { id: 'profile', label: t('nav.profile'), icon: User },
    { id: 'password', label: t('nav.password'), icon: Lock },
  ]

  const onNavigate = (id: string, event: React.MouseEvent<HTMLAnchorElement>) => {
    const target = document.getElementById(id)
    if (!target) return
    event.preventDefault()
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' })
    window.history.replaceState(null, '', `#${id}`)
    setActive(id as SectionId)
    // Move focus to the section so keyboard and screen-reader users land there too.
    target.focus({ preventScroll: true })
  }

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
      <Card className="p-3 lg:sticky lg:top-20 lg:w-64 lg:shrink-0">
        <SectionNav items={items} activeId={active} label={t('sectionsLabel')} onNavigate={onNavigate} />
      </Card>

      {/* 64px between the cards as in the screenshot; 24px once the columns stack. */}
      <div className="flex min-w-0 flex-1 flex-col gap-6 lg:gap-16">
        {profile.isPending ? (
          <ProfileCardSkeleton />
        ) : profile.isError ? (
          <EmptyState
            framed
            tone="danger"
            icon={CircleAlert}
            title={t('loadError.title')}
            description={t('loadError.description')}
            action={
              <Button variant="outline" loading={profile.isRefetching} onClick={() => void profile.refetch()}>
                {t('loadError.retry')}
              </Button>
            }
          />
        ) : (
          <ProfileForm profile={profile.data} />
        )}

        <PasswordForm email={profile.data?.email ?? ''} />
      </div>
    </div>
  )
}
