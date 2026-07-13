'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Icon } from '@/components/Icon'

// history.back() so the browser restores the cookbook scroll position;
// pushing /meals would create a fresh entry that always lands at the top.
export function BackLink() {
  const router = useRouter()

  function goBack(e: React.MouseEvent) {
    e.preventDefault()
    if (window.history.length > 1) router.back()
    else router.push('/meals')
  }

  return (
    <Link href="/meals" className="recipe-back" onClick={goBack}>
      <Icon name="chev-left" size={15} /> Cookbook
    </Link>
  )
}
