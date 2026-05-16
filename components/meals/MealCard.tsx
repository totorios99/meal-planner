'use client'
import { Meal } from '@/types'

interface Props {
  meal: Meal
  onEdit: (meal: Meal) => void
  onDelete: (id: number) => void
}

export function MealCard({ meal, onEdit, onDelete }: Props) {
  return (
    <div className="break-inside-avoid mb-4 rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      {meal.imageUrl && (
        <img src={meal.imageUrl} alt={meal.title} className="w-full h-48 object-cover" />
      )}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 text-lg">{meal.title}</h3>
        {meal.description && (
          <p className="text-gray-500 text-sm mt-1">{meal.description}</p>
        )}
        <div className="flex gap-2 mt-4">
          <button
            onClick={() => onEdit(meal)}
            className="flex-1 py-1.5 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Edit
          </button>
          <button
            onClick={() => onDelete(meal.id)}
            className="flex-1 py-1.5 text-sm rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}
