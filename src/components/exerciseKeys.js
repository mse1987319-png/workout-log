// Keys and starting values for the exercises and sets of the Log workout form.
let lastKey = 0
export const nextKey = () => `draft-${(lastKey += 1)}`
export const newSet = (copyOf) => ({ key: nextKey(), reps: copyOf?.reps ?? '', weight: copyOf?.weight ?? '' })
export const newExercise = () => ({ key: nextKey(), name: '', lookup: '', sets: [newSet()] })

// Exercises read back from the saved draft, each with new keys.
export const withFreshKeys = (exercises) =>
  exercises.map((exercise) => ({
    ...exercise,
    key: nextKey(),
    sets: exercise.sets.map((set) => ({ ...set, key: nextKey() })),
  }))
