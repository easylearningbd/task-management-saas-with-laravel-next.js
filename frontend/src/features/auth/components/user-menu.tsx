'use client'

import { ChevronDown, LogOut } from 'lucide-react'
import { DropdownMenu } from 'radix-ui'
import { useTranslations } from 'next-intl'
import { Avatar } from '@/components/ui/avatar'
import { Spinner } from '@/components/ui/spinner'
import { toast } from '@/components/ui/toast'
import { useLogout } from '@/features/auth/api'
import type { User } from '@/features/auth/types'
import { LOGIN } from '@/lib/routes'

/* The top bar's user button (avatar, name, email, chevron) opening a design-system
   DropdownMenu. Profile Settings joins Logout when the profile module lands (PRD §2.3). */
export function UserMenu({ user }: { user: User }) {
  const t = useTranslations('auth.logout')
  const tShell = useTranslations('shell')
  const tRoles = useTranslations('roles')
  const logout = useLogout()
  const busy = logout.isPending || logout.isSuccess

  const onLogout = (event: Event) => {
    event.preventDefault() // keep the menu open so the spinner is visible
    if (busy) return
    logout.mutate(undefined, {
      // Full navigation, not router.replace: drops every bit of client state and the
      // router cache, so Back cannot resurface a signed-in page.
      onSuccess: () => window.location.replace(LOGIN[user.role]),
      onError: () => toast.error(t('failed'), t('failedDescription')),
    })
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        aria-label={tShell('userMenu')}
        className="flex items-center gap-2.5 rounded-lg p-0.5 pr-1 transition-colors hover:bg-accent focus-visible:border focus-visible:border-ring focus-visible:shadow-focus focus-visible:outline-none"
      >
        <Avatar name={user.name} seed={user.id} src={user.avatar} />
        <span className="hidden text-left md:block">
          <span className="block text-title-row leading-tight">{user.name}</span>
          <span className="block text-body-sm leading-tight text-muted-foreground">{user.email}</span>
        </span>
        <ChevronDown className="size-icon shrink-0 text-muted-foreground" aria-hidden="true" />
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={4}
          className="z-50 w-58 rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-lg"
        >
          <DropdownMenu.Label className="px-2 pt-2 pb-1">
            <span className="block truncate text-title-row">{user.name}</span>
            <span className="block truncate text-body-sm text-muted-foreground">{user.email}</span>
            <span className="mt-0.5 block text-caption text-muted-foreground">{tRoles(user.role)}</span>
          </DropdownMenu.Label>
          <DropdownMenu.Separator className="-mx-1 my-1 h-px bg-border" />
          <DropdownMenu.Item
            onSelect={onLogout}
            disabled={busy}
            className="flex h-8.5 cursor-default items-center gap-2.5 rounded-md px-2 text-body outline-none select-none focus:bg-accent data-disabled:cursor-not-allowed data-disabled:opacity-disabled"
          >
            {busy ? <Spinner /> : <LogOut className="size-icon" aria-hidden="true" />}
            {t('action')}
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
