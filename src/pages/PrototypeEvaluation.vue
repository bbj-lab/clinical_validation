<template>
  <q-page class="prototype-evaluation q-pa-md">
    <div class="text-h4 q-mb-lg">ECG Prototype Evaluation</div>

    <!-- Reviewer and Class Selection -->
    <div class="row q-col-gutter-md q-mb-lg">
      <div class="col-12 col-md-6">
        <q-select
          v-model="currentReviewer"
          :options="reviewerOptions"
          label="Select Reviewer"
          outlined
          @update:model-value="handleReviewerChange"
        />
      </div>
      <div class="col-12 col-md-6">
        <q-select
          v-model="currentClass"
          :options="diagnosticClassOptions"
          label="Select Diagnostic Class"
          outlined
          @update:model-value="handleClassChange"
        />
      </div>
    </div>

    <div v-if="currentClass && currentReviewer">
      <!-- Prototype Display Section -->
      <div class="q-mb-xl">
        <div class="text-h5 q-mb-md">Prototype Comparison</div>
        <prototype-display
          :prototypes="currentPrototypes"
          @update:bestPrototypes="handleBestPrototypesUpdate"
          @update:noSignificantDifference="handleNoSignificantDifferenceUpdate"
        />
      </div>

      <!-- Rating Form Section -->
      <div class="q-mb-xl">
        <div class="text-h5 q-mb-md">Prototype Ratings</div>
        <rating-form
          @update:ratings="handleRatingsUpdate"
        />
      </div>

      <!-- Submit Section -->
      <div class="row justify-end q-mt-lg">
        <q-btn
          color="primary"
          label="Submit Evaluation"
          :loading="isLoading"
          :disable="!isFormValid"
          @click="submitEvaluation"
        />
      </div>
    </div>

    <div v-else class="text-center q-pa-xl">
      <div class="text-h6 q-mb-md text-grey-7">Please select both a reviewer and diagnostic class to begin evaluation</div>
    </div>

    <!-- Success Dialog -->
    <q-dialog v-model="showSuccess">
      <q-card>
        <q-card-section class="row items-center">
          <q-avatar icon="check_circle" color="positive" text-color="white" />
          <span class="q-ml-sm">Evaluation submitted successfully!</span>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Continue" color="primary" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Loading & Error Handling -->
    <q-inner-loading :showing="isLoading">
      <q-spinner-dots size="50px" color="primary" />
    </q-inner-loading>

    <q-dialog v-model="showError" persistent>
      <q-card>
        <q-card-section class="row items-center">
          <q-avatar icon="error" color="negative" text-color="white" />
          <span class="q-ml-sm">{{ error }}</span>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Dismiss" color="primary" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { useEvaluationStore } from '../stores/evaluation'
import PrototypeDisplay from '../components/PrototypeDisplay.vue'
import RatingForm from '../components/RatingForm.vue'

// Mock data for prototype evaluation
const mockPrototypes = {
  // Sample data for Atrial Fibrillation
  'atrial-fibrillation': [
    {
      id: 'af-baseline-1',
      diagnosticClass: 'Atrial Fibrillation',
      model: 'baseline',
      imageUrl: 'https://storage.googleapis.com/kaggle-competitions/kaggle/33322/pix/ECG000001.png',
      description: 'Baseline model prototype'
    },
    {
      id: 'af-proposed-1',
      diagnosticClass: 'Atrial Fibrillation',
      model: 'proposed',
      imageUrl: 'https://storage.googleapis.com/kaggle-competitions/kaggle/33322/pix/ECG000002.png',
      description: 'Proposed model prototype'
    }
  ],
  
  // Sample data for Myocardial Infarction
  'myocardial-infarction': [
    {
      id: 'mi-baseline-1',
      diagnosticClass: 'Myocardial Infarction',
      model: 'baseline',
      imageUrl: 'https://storage.googleapis.com/kaggle-competitions/kaggle/33322/pix/ECG000003.png',
      description: 'Baseline model prototype'
    },
    {
      id: 'mi-proposed-1',
      diagnosticClass: 'Myocardial Infarction',
      model: 'proposed',
      imageUrl: 'https://storage.googleapis.com/kaggle-competitions/kaggle/33322/pix/ECG000004.png',
      description: 'Proposed model prototype'
    }
  ],
  
  // Sample data for Left Bundle Branch Block
  'lbbb': [
    {
      id: 'lbbb-baseline-1',
      diagnosticClass: 'Left Bundle Branch Block',
      model: 'baseline',
      imageUrl: 'https://storage.googleapis.com/kaggle-competitions/kaggle/33322/pix/ECG000005.png',
      description: 'Baseline model prototype'
    },
    {
      id: 'lbbb-proposed-1',
      diagnosticClass: 'Left Bundle Branch Block',
      model: 'proposed',
      imageUrl: 'https://storage.googleapis.com/kaggle-competitions/kaggle/33322/pix/ECG000006.png',
      description: 'Proposed model prototype'
    }
  ]
};

export default {
  name: 'PrototypeEvaluation',

  components: {
    PrototypeDisplay,
    RatingForm
  },

  setup() {
    const store = useEvaluationStore()
    const currentReviewer = ref(null)
    const currentClass = ref(null)
    const bestPrototypes = ref([])
    const noSignificantDifference = ref(false)
    const ratings = ref({})
    const showError = ref(false)
    const showSuccess = ref(false)

    const reviewerOptions = [
      { label: 'Internist', value: 'internist' },
      { label: 'Cardiologist', value: 'cardiologist' }
    ]

    const diagnosticClasses = ref(Object.keys(mockPrototypes))
    const diagnosticClassOptions = computed(() => {
      return diagnosticClasses.value.map(className => {
        // Format the class name for display
        const displayName = className
          .split('-')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ')
        
        return {
          label: displayName,
          value: className
        }
      })
    })

    const currentPrototypes = computed(() => {
      if (!currentClass.value) return []
      return mockPrototypes[currentClass.value] || []
    })

    const isFormValid = computed(() => {
      return currentReviewer.value &&
        currentClass.value &&
        (bestPrototypes.value.length > 0 || noSignificantDifference.value) &&
        Object.keys(ratings.value).length === 4 &&
        Object.values(ratings.value).every(rating => rating > 0)
    })

    const handleReviewerChange = (reviewer) => {
      store.setCurrentReviewer(reviewer)
    }

    const handleClassChange = (className) => {
      // Load prototypes for the selected class
      store.setCurrentPrototypes(mockPrototypes[className] || [])
      
      // Reset the form
      bestPrototypes.value = []
      noSignificantDifference.value = false
      ratings.value = {}
    }

    const handleBestPrototypesUpdate = (selected) => {
      bestPrototypes.value = selected
      if (selected.length > 0) {
        noSignificantDifference.value = false
      }
    }

    const handleNoSignificantDifferenceUpdate = (value) => {
      noSignificantDifference.value = value
      if (value) {
        bestPrototypes.value = []
      }
    }

    const handleRatingsUpdate = (newRatings) => {
      ratings.value = newRatings
    }

    const submitEvaluation = async () => {
      const evaluation = {
        prototypes: currentPrototypes.value,
        bestPrototypes: bestPrototypes.value,
        noSignificantDifference: noSignificantDifference.value,
        ratings: ratings.value,
        diagnosticClass: currentClass.value
      }

      try {
        await store.saveEvaluation(evaluation)
        // Show success message
        showSuccess.value = true
        // Reset form
        bestPrototypes.value = []
        noSignificantDifference.value = false
        ratings.value = {}
      } catch (error) {
        showError.value = true
      }
    }

    onMounted(() => {
      // Set default diagnostic class
      if (diagnosticClasses.value.length > 0) {
        currentClass.value = diagnosticClasses.value[0]
        store.setCurrentPrototypes(mockPrototypes[currentClass.value])
      }
    })

    return {
      currentReviewer,
      reviewerOptions,
      currentClass,
      diagnosticClassOptions,
      currentPrototypes,
      isLoading: computed(() => store.isLoading),
      error: computed(() => store.error),
      showError,
      showSuccess,
      isFormValid,
      handleReviewerChange,
      handleClassChange,
      handleBestPrototypesUpdate,
      handleNoSignificantDifferenceUpdate,
      handleRatingsUpdate,
      submitEvaluation
    }
  }
}
</script>

<style scoped>
.prototype-evaluation {
  max-width: 1200px;
  margin: 0 auto;
}
</style> 