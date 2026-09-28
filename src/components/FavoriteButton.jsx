import { doc, updateDoc } from 'firebase/firestore'
import { db } from '../firebase'

function toggleFavorite(uid, niggun) {
  return updateDoc(doc(db, 'users', uid, 'niggunim', niggun.id), { favorite: !niggun.favorite })
}

export default function FavoriteButton({ uid, niggun, className = '' }) {
  const on = !!niggun.favorite
  return (
    <button type="button" className={`fav-btn ${on ? 'on' : ''} ${className}`}
      aria-pressed={on} aria-label={on ? 'הסר ממועדפים' : 'הוסף למועדפים'} title={on ? 'הסר ממועדפים' : 'הוסף למועדפים'}
      onClick={e => { e.stopPropagation(); toggleFavorite(uid, niggun).catch(() => {}) }}
      onKeyDown={e => e.stopPropagation()}>
      {on ? '★' : '☆'}
    </button>
  )
}
