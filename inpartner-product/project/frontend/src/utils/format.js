export const formatNumber = (num) => new Intl.NumberFormat('id-ID').format(num || 0)

export const formatRupiah = (num) => `Rp ${formatNumber(num)}`

export const formatDate = (iso, opts = { day: 'numeric', month: 'short', year: 'numeric' }) => {
  if (!iso) return '-'
  return new Date(iso).toLocaleDateString('id-ID', opts)
}

export const yearOf = (iso) => (iso ? new Date(iso).getFullYear() : '')

export const timeAgo = (iso) => {
  if (!iso) return ''
  const diff = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60) return 'baru saja'
  if (diff < 3600) return `${Math.floor(diff / 60)} mnt`
  if (diff < 86400) return `${Math.floor(diff / 3600)} jam`
  if (diff < 86400 * 30) return `${Math.floor(diff / 86400)} hari`
  if (diff < 86400 * 365) return `${Math.floor(diff / (86400 * 30))} bln`
  return `${Math.floor(diff / (86400 * 365))} thn`
}

export const initials = (name = '') =>
  name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('') || '?'
