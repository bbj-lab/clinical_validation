import { defineStore } from 'pinia'
import { Notify } from 'quasar'
import { ref, computed } from 'vue'

// Define the store using the setup syntax
export const useEvaluationStore = defineStore('evaluation', () => {
  // State
  const currentPrototypes = ref([])
  const evaluations = ref([])
  const currentReviewer = ref(null)
  const diagnosticClasses = ref([])
  const isLoading = ref(false)
  const error = ref(null)

  // Actions
  function setCurrentPrototypes(prototypes) {
    currentPrototypes.value = prototypes
  }

  function setCurrentReviewer(reviewer) {
    currentReviewer.value = reviewer
  }

  function addEvaluation(evaluation) {
    evaluations.value.push({
      ...evaluation,
      timestamp: new Date().toISOString(),
      reviewer: currentReviewer.value,
      id: Date.now().toString()
    })
  }

  async function saveEvaluation(evaluation) {
    try {
      isLoading.value = true
      // Simulating API call with a delay
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Log the evaluation data for debugging
      console.log('Saving evaluation:', evaluation)
      
      // Validate the data before saving
      if (!evaluation.diagnosticClass) {
        throw new Error('Missing diagnostic class')
      }
      
      if (!evaluation.bestPrototypes || evaluation.bestPrototypes.length !== 1) {
        throw new Error('Please select exactly one prototype as the best')
      }
      
      // Check if all prototypes have been rated
      const allPrototypesRated = evaluation.prototypes.every(prototype => {
        const ratings = evaluation.prototypeRatings[prototype.id]
        return ratings && 
          ratings.representativeness > 0 &&
          ratings.clarity > 0 &&
          ratings.usefulness > 0 &&
          ratings.distinctiveness > 0
      })
      
      if (!allPrototypesRated) {
        throw new Error('Please rate all prototypes on all criteria')
      }
      
      addEvaluation(evaluation)
      error.value = null
      
      // Show success notification
      Notify.create({
        type: 'positive',
        message: 'Evaluation saved successfully',
        position: 'top',
        timeout: 2000
      })
      
      return true
    } catch (err) {
      error.value = err.message || 'Failed to save evaluation'
      
      // Show error notification
      Notify.create({
        type: 'negative',
        message: error.value,
        position: 'top',
        timeout: 2000
      })
      
      return false
    } finally {
      isLoading.value = false
    }
  }

  function setDiagnosticClasses(classes) {
    diagnosticClasses.value = classes
  }

  // Getters
  const getEvaluationsByReviewer = computed(() => {
    return (reviewer) => evaluations.value.filter(e => e.reviewer === reviewer)
  })

  const getEvaluationsByClass = computed(() => {
    return (diagnosticClass) => evaluations.value.filter(e => e.diagnosticClass === diagnosticClass)
  })
  
  const getEvaluationCount = computed(() => evaluations.value.length)

  // Return state, actions, and getters
  return {
    // State
    currentPrototypes,
    evaluations,
    currentReviewer,
    diagnosticClasses,
    isLoading,
    error,
    
    // Actions
    setCurrentPrototypes,
    setCurrentReviewer,
    addEvaluation,
    saveEvaluation,
    setDiagnosticClasses,
    
    // Getters
    getEvaluationsByReviewer,
    getEvaluationsByClass,
    getEvaluationCount
  }
}) 