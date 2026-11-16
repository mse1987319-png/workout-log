import { useEffect, useId, useState } from 'react'
import { listExerciseNames } from '../api/sets'
import { useLanguage } from '../i18n/useLanguage'
import { savedExerciseNames } from '../offline/hints'
import LastTime from './LastTime'

let lastKey = 0
const nextKey = () => `draft-${(lastKey += 1)}`
const newSet = (copyOf) => ({ key: nextKey(), reps: copyOf?.reps ?? '', weight: copyOf?.weight ?? '' })
const newExercise = () => ({ key: nextKey(), name: '', lookup: '', sets: [newSet()] })

/**
 * Exercises and sets of a strength workout. The draft lives in the parent:
 * [{ key, name, lookup, sets: [{ key, reps, weight }] }].
 */
export default function ExercisesEditor({ exercises, onChange }) {
  const listId = useId()
  const { t } = useLanguage()
  const [names, setNames] = useState([])

  useEffect(() => {
    let current = true
    listExerciseNames().then(
      (list) => {
        if (current) setNames(list)
      },
      // Suggestions are optional: if the lookup fails, use the saved progress (maybe none).
      () => {
        if (current) setNames(savedExerciseNames())
      },
    )
    return () => {
      current = false
    }
  }, [])

  const update = (index, change) =>
    onChange(exercises.map((exercise, i) => (i === index ? { ...exercise, ...change } : exercise)))
  const updateSet = (index, setIndex, change) =>
    update(index, {
      sets: exercises[index].sets.map((set, j) => (j === setIndex ? { ...set, ...change } : set)),
    })

  return (
    <fieldset className="field exercises">
      <legend>{t('exercises.legend')}</legend>
      <datalist id={listId}>
        {names.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>

      {exercises.map((exercise, index) => {
        const n = index + 1
        return (
          <div className="exercise" key={exercise.key}>
            <div className="exercise-head">
              <input
                aria-label={t('exercises.nameLabel', { n })}
                list={listId}
                value={exercise.name}
                maxLength={60}
                placeholder={t('common.exercisePlaceholder')}
                onChange={(event) => update(index, { name: event.target.value })}
                onBlur={() => update(index, { lookup: exercise.name.trim() })}
              />
              <button
                type="button"
                className="link-button"
                aria-label={t('exercises.removeLabel', { n })}
                onClick={() => onChange(exercises.filter((_, i) => i !== index))}
              >
                {t('common.remove')}
              </button>
            </div>
            <LastTime name={exercise.lookup} />

            <ol className="sets">
              {exercise.sets.map((set, setIndex) => {
                const m = setIndex + 1
                return (
                  <li className="set" key={set.key}>
                    <span className="set-label">{t('sets.setN', { n: m })}</span>
                    <input
                      type="number"
                      inputMode="numeric"
                      min="1"
                      max="1000"
                      step="1"
                      placeholder={t('exercises.repsPlaceholder')}
                      aria-label={t('exercises.repsLabel', { n, m })}
                      value={set.reps}
                      onChange={(event) => updateSet(index, setIndex, { reps: event.target.value })}
                    />
                    <span aria-hidden="true">×</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      max="1000"
                      step="any"
                      placeholder="kg"
                      aria-label={t('exercises.kgLabel', { n, m })}
                      value={set.weight}
                      onChange={(event) => updateSet(index, setIndex, { weight: event.target.value })}
                    />
                    <span className="unit" aria-hidden="true">
                      kg
                    </span>
                    {exercise.sets.length > 1 && (
                      <button
                        type="button"
                        className="link-button"
                        aria-label={t('exercises.removeSetLabel', { n, m })}
                        onClick={() => update(index, { sets: exercise.sets.filter((_, j) => j !== setIndex) })}
                      >
                        ✕
                      </button>
                    )}
                  </li>
                )
              })}
            </ol>
            <button
              type="button"
              className="button button-secondary button-small"
              aria-label={t('exercises.addSetLabel', { n })}
              onClick={() => update(index, { sets: [...exercise.sets, newSet(exercise.sets.at(-1))] })}
            >
              {t('exercises.addSet')}
            </button>
          </div>
        )
      })}

      <div>
        <button type="button" className="button button-secondary" onClick={() => onChange([...exercises, newExercise()])}>
          {t('exercises.addExercise')}
        </button>
      </div>
      <p className="hint">{t('exercises.bodyweightHint')}</p>
    </fieldset>
  )
}
