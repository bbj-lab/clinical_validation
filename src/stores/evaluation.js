import { defineStore } from 'pinia'
import { Notify } from 'quasar'

export const useEvaluationStore = defineStore('evaluation', {
  state: () => ({
    currentPrototypes: [],
    evaluations: [],
    currentReviewer: null,
    diagnosticClasses: [],
    isLoading: false,
    error: null
  }),

  actions: {
    setCurrentPrototypes(prototypes) {
      this.currentPrototypes = prototypes
    },

    setCurrentReviewer(reviewer) {
      this.currentReviewer = reviewer
    },

    addEvaluation(evaluation) {
      this.evaluations.push({
        ...evaluation,
        timestamp: new Date().toISOString(),
        reviewer: this.currentReviewer,
        id: Date.now().toString()
      })
    },

    async saveEvaluation(evaluation) {
      try {
        this.isLoading = true
        // Simulating API call with a delay
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        this.addEvaluation(evaluation)
        this.error = null
        
        // Show success notification
        Notify.create({
          type: 'positive',
          message: 'Evaluation saved successfully',
          position: 'top',
          timeout: 2000
        })
        
        return true
      } catch (err) {
        this.error = err.message || 'Failed to save evaluation'
        
        // Show error notification
        Notify.create({
          type: 'negative',
          message: this.error,
          position: 'top',
          timeout: 2000
        })
        
        return false
      } finally {
        this.isLoading = false
      }
    },

    setDiagnosticClasses(classes) {
      this.diagnosticClasses = classes
    }
  },

  getters: {
    getEvaluationsByReviewer: (state) => (reviewer) => {
      return state.evaluations.filter(e => e.reviewer === reviewer)
    },

    getEvaluationsByClass: (state) => (diagnosticClass) => {
      return state.evaluations.filter(e => e.diagnosticClass === diagnosticClass)
    },
    
    getEvaluationCount: (state) => {
      return state.evaluations.length
    }
  }
}) 