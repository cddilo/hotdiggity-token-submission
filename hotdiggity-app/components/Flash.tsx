// Shows ?error= / ?success= messages that server actions redirect back with.
export default async function Flash({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = (await searchParams) ?? {}
  const error = typeof sp.error === 'string' ? sp.error : ''
  const success = typeof sp.success === 'string' ? sp.success : ''
  return (
    <>
      {error && <div className="alert error" role="alert">{error}</div>}
      {success && <div className="alert success" role="status">{success}</div>}
    </>
  )
}
