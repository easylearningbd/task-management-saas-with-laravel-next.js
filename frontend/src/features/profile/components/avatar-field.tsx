'use client'

import * as React from 'react'
import { Camera } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Avatar } from '@/components/ui/avatar'
import { FieldMessage } from '@/components/ui/field'
import { FileButton } from '@/components/ui/file-button'
import { toast } from '@/components/ui/toast'
import { useUpdateAvatar } from '@/features/profile/api'
import { AVATAR_ACCEPT, createAvatarSchema } from '@/features/profile/schema'
import type { Profile } from '@/features/profile/types'
import { toApiError } from '@/lib/api-error'

/* The avatar row of "Profile Information": an 80px avatar, then the outline "Change Avatar"
   button with a Camera glyph over a `caption` hint. Independent of the Save button — a picked
   file is checked client-side (type + size, same limits as the API), previewed instantly,
   then uploaded on its own. The preview reverts if the upload fails. */
export function AvatarField({ profile }: { profile: Profile }) {
  const t = useTranslations('profile.info')
  const tValidation = useTranslations('profile.validation')
  const upload = useUpdateAvatar()
  const schema = React.useMemo(() => createAvatarSchema(tValidation), [tValidation])

  const [preview, setPreview] = React.useState<string | null>(null)
  const [progress, setProgress] = React.useState(0)
  const [error, setError] = React.useState<string | null>(null)
  const hintId = React.useId()

  // Free the object URL whenever the preview changes or the field unmounts.
  React.useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview)
  }, [preview])

  const onSelect = (file: File) => {
    const checked = schema.safeParse(file)
    if (!checked.success) {
      setError(checked.error.issues[0]?.message ?? null)
      return
    }

    setError(null)
    setProgress(0)
    setPreview(URL.createObjectURL(file))

    upload.mutate(
      { file, onProgress: setProgress },
      {
        onSuccess: () => {
          setPreview(null) // the stored image (profile.avatar) takes over
          toast.success(t('avatarUpdated'))
        },
        onError: (failure) => {
          setPreview(null) // revert to the previous avatar
          const apiError = toApiError(failure)
          const message = apiError.fieldErrors.avatar ?? apiError.message
          setError(message)
          toast.error(t('avatarFailed'), message)
        },
      },
    )
  }

  return (
    // Wraps on very narrow screens (80px avatar + 24px gap + button > a 360px phone's card width).
    <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-4">
      <Avatar size="lg" name={profile.name} seed={profile.id} src={preview ?? profile.avatar} />
      <div className="min-w-0">
        <FileButton
          accept={AVATAR_ACCEPT}
          onSelect={onSelect}
          loading={upload.isPending}
          aria-describedby={hintId}
        >
          {upload.isPending ? null : <Camera className="size-icon" aria-hidden="true" />}
          {upload.isPending ? t('uploading', { percent: progress }) : t('changeAvatar')}
        </FileButton>
        <FieldMessage id={hintId} error={Boolean(error)} className="mt-2">
          {error ?? t('avatarHint')}
        </FieldMessage>
      </div>
    </div>
  )
}
