import { useEffect, useId, useState } from 'react'
import { listExerciseNames } from '../api/sets'
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
  const [names, setNames] = useState([])

  useEffect(() => {
    let current = true
    listExerciseNames().then(
      (list) => {
        if (current) setNames(list)
      },
      () => {}, // suggestions are optional
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
      <legend>Exercises (optional)</legend>
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
                aria-label={`Exercise ${n} name`}
                list={listId}
                value={exercise.name}
                maxLength={60}
                placeholder="e.g. Squat"
                onChange={(event) => update(index, { name: event.target.value })}
                onBlur={() => update(index, { lookup: exercise.name.trim() })}
              />
              <button
                type="button"
                className="link-button"
                aria-label={`Remove exercise ${n}`}
                onClick={() => onChange(exercises.filter((_, i) => i !== index))}
              >
                Remove
              </button>
            </div>
            <LastTime name={exercise.lookup} />

            <ol className="sets">
              {exercise.sets.map((set, setIndex) => {
                const m = setIndex + 1
                return (
                  <li className="set" key={set.key}>
                    <span className="set-label">Set {m}</span>
                    <input
                      type="number"
                      inputMode="numeric"
                      min="1"
                      max="1000"
                      step="1"
                      placeholder="reps"
                      aria-label={`Exercise ${n}, set ${m} reps`}
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
                      aria-label={`Exercise ${n}, set ${m} kg`}
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
                        aria-label={`Remove set ${m} of exercise ${n}`}
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
              aria-label={`Add set to exercise ${n}`}
              onClick={() => update(index, { sets: [...exercise.sets, newSet(exercise.sets.at(-1))] })}
            >
              Add set
            </button>
          </div>
        )
      })}

      <div>
        <button type="button" className="button button-secondary" onClick={() => onChange([...exercises, newExercise()])}>
          Add exercise
        </button>
      </div>
      <p className="hint">Leave kg empty for bodyweight exercises.</p>
    </fieldset>
  )
}
