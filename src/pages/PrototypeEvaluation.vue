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

    <!-- Debug info -->
    <div class="q-mb-md text-caption">
      Has reviewer: {{ !!currentReviewer }}, 
      Has class: {{ !!currentClass }}, 
      Prototypes length: {{ currentPrototypes.length }}
    </div>

    <!-- Prototype Section -->
    <div v-if="currentClass && currentReviewer">
      <div class="text-h5 q-mb-md">ECG Prototypes</div>
      
      <!-- Integrated Prototype Cards with Ratings -->
      <div class="row q-col-gutter-lg">
        <div 
          v-for="(prototype, index) in currentPrototypes" 
          :key="prototype.id" 
          class="col-12"
        >
          <q-card class="prototype-card q-mb-lg">
            <q-card-section class="bg-primary text-white">
              <div class="text-h6">Prototype {{ index + 1 }}</div>
              <div class="text-subtitle2">{{ prototype.diagnosticClass }}</div>
            </q-card-section>
            
            <!-- Prototype Image Section -->
            <q-card-section>
              <div class="text-subtitle2 q-mb-sm">{{ prototype.description }}</div>
              <div class="ecg-display">
                <q-img 
                  :src="prototype.imageUrl" 
                  alt="ECG Prototype" 
                  :ratio="16/9"
                  spinner-color="primary"
                  spinner-size="82px"
                  fit="contain"
                  class="rounded-borders"
                  @error="handleImageError"
                >
                  <template v-slot:error>
                    <div class="absolute-full flex flex-center bg-grey-3">
                      <div class="text-h6 text-grey-8">Error loading ECG image</div>
                    </div>
                  </template>
                </q-img>
              </div>
            </q-card-section>
            
            <!-- Select Best Button -->
            <q-card-section>
              <q-btn
                :color="isPrototypeSelected(index) ? 'positive' : 'primary'"
                :outline="!isPrototypeSelected(index)"
                :icon="isPrototypeSelected(index) ? 'check_circle' : 'radio_button_unchecked'"
                :label="isPrototypeSelected(index) ? 'Selected as Best Prototype' : 'Select as Best Prototype'"
                @click="toggleBestPrototype(index)"
              />
            </q-card-section>
            
            <!-- Rating Section -->
            <q-separator />
            
            <q-card-section>
              <div class="text-subtitle1 text-weight-bold q-mb-md">Rate this prototype:</div>
              
              <div v-for="(criterion, key) in ratingCriteria" :key="`${prototype.id}-${key}`" class="q-mb-lg">
                <div class="text-subtitle2 q-mb-sm">{{ criterion.label }}</div>
                <div class="text-caption q-mb-md">{{ criterion.description }}</div>
                
                <div class="rating-wrapper q-px-xl q-py-sm">
                  <q-slider
                    v-model="prototypeRatings[prototype.id][key]"
                    :min="1"
                    :max="5"
                    :step="1"
                    label
                    label-always
                    markers
                    marker-labels
                    :marker-labels-class="markerClass"
                    :color="getRatingColor(prototypeRatings[prototype.id][key])"
                    @change="updateRating(prototype.id)"
                    switch-label-side
                    class="q-mt-lg"
                  />
                  
                  <div class="rating-labels-container">
                    <div class="rating-label" v-for="n in 5" :key="n">
                      <div class="label-text">{{ getRatingLabel(n) }}</div>
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- Comments section for individual prototype -->
              <div class="q-mt-lg">
                <div class="text-subtitle2 q-mb-sm">Additional Comments</div>
                <q-input
                  v-model="prototypeComments[prototype.id]"
                  type="textarea"
                  label="Comments about this prototype"
                  outlined
                  autogrow
                  rows="3"
                  @update:model-value="updateComments(prototype.id)"
                />
              </div>
            </q-card-section>
          </q-card>
        </div>
      </div>

      <!-- Submit Section -->
      <div class="row justify-end q-mt-lg q-mb-xl">
        <q-btn
          color="primary"
          label="Submit Evaluation"
          :loading="isLoading"
          :disable="!isFormValid"
          @click="submitEvaluation"
          size="lg"
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

<script setup>
import { ref, computed, onMounted, watch, reactive } from 'vue'
import { useEvaluationStore } from '../stores/evaluation'
import { useQuasar } from 'quasar'

// Initialize the store and Quasar
const store = useEvaluationStore()
const $q = useQuasar()

// Mock data for prototype evaluation
const mockPrototypes = {
  // Sample data for Atrial Fibrillation
  'atrial-fibrillation': [
    {
      id: 'af-baseline-1',
      diagnosticClass: 'Atrial Fibrillation',
      model: 'baseline',
      imageUrl: 'https://storage.googleapis.com/kaggle-competitions/kaggle/33322/pix/ECG000001.png',
      description: 'ECG Prototype A'
    },
    {
      id: 'af-proposed-1',
      diagnosticClass: 'Atrial Fibrillation',
      model: 'proposed',
      imageUrl: 'https://storage.googleapis.com/kaggle-competitions/kaggle/33322/pix/ECG000002.png',
      description: 'ECG Prototype B'
    }
  ],
  
  // Sample data for Myocardial Infarction
  'myocardial-infarction': [
    {
      id: 'mi-baseline-1',
      diagnosticClass: 'Myocardial Infarction',
      model: 'baseline',
      imageUrl: 'https://storage.googleapis.com/kaggle-competitions/kaggle/33322/pix/ECG000003.png',
      description: 'ECG Prototype A'
    },
    {
      id: 'mi-proposed-1',
      diagnosticClass: 'Myocardial Infarction',
      model: 'proposed',
      imageUrl: 'https://storage.googleapis.com/kaggle-competitions/kaggle/33322/pix/ECG000004.png',
      description: 'ECG Prototype B'
    }
  ],
  
  // Sample data for Left Bundle Branch Block
  'lbbb': [
    {
      id: 'lbbb-baseline-1',
      diagnosticClass: 'Left Bundle Branch Block',
      model: 'baseline',
      imageUrl: 'https://storage.googleapis.com/kaggle-competitions/kaggle/33322/pix/ECG000005.png',
      description: 'ECG Prototype A'
    },
    {
      id: 'lbbb-proposed-1',
      diagnosticClass: 'Left Bundle Branch Block',
      model: 'proposed',
      imageUrl: 'https://storage.googleapis.com/kaggle-competitions/kaggle/33322/pix/ECG000006.png',
      description: 'ECG Prototype B'
    }
  ]
};

// State variables
const currentReviewer = ref(null)
const currentClass = ref(null)
const bestPrototypes = ref([])
const prototypeRatings = ref({})
const prototypeComments = ref({})
const showError = ref(false)
const showSuccess = ref(false)

// Make mockPrototypes available as reactive state
const prototypesData = ref(mockPrototypes)

// Rating criteria
const ratingCriteria = {
  representativeness: {
    label: 'Representativeness',
    description: 'To what extent does the prototype reflect a typical/defining presentation of the target diagnostic class?'
  },
  clarity: {
    label: 'Clarity',
    description: 'Is the signal in the prototype interpretable and clear, or does it contain a lot of artifact?'
  },
  usefulness: {
    label: 'Usefulness',
    description: 'Would this prototype help a clinician understand what the model is learning or justify a prediction?'
  },
  distinctiveness: {
    label: 'Distinctiveness',
    description: 'Does the prototype show features specific to its assigned class, rather than patterns often present in other diagnoses?'
  }
}

const reviewerOptions = [
  { label: 'Bashar Ramadan', value: 'Bashar Ramadan' },
  { label: 'Nipun Bhandari', value: 'Nipun Bhandari' }
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
  console.log('Computing currentPrototypes - currentClass:', currentClass.value);
  
  if (!currentClass.value) {
    return [];
  }
  
  const result = prototypesData.value[currentClass.value] || [];
  return result;
})

// Watch for prototype changes to initialize ratings and comments
watch(currentPrototypes, (newPrototypes) => {
  initializePrototypeData(newPrototypes);
}, { immediate: true, deep: true })

function initializePrototypeData(prototypes) {
  prototypes.forEach(prototype => {
    // Initialize ratings if not already set
    if (!prototypeRatings.value[prototype.id]) {
      prototypeRatings.value[prototype.id] = {
        representativeness: 0,
        clarity: 0,
        usefulness: 0,
        distinctiveness: 0
      }
    }
    // Initialize comments if not already set
    if (!prototypeComments.value[prototype.id]) {
      prototypeComments.value[prototype.id] = '';
    }
  });
}

// Check if all prototypes have been rated
const allPrototypesRated = computed(() => {
  if (!currentPrototypes.value.length) return false;
  
  // Check if all prototypes have ratings
  return currentPrototypes.value.every(prototype => {
    if (!prototypeRatings.value[prototype.id]) return false;
    
    // Check if all criteria have been rated for this prototype
    const ratings = prototypeRatings.value[prototype.id];
    return ratings && 
      ratings.representativeness > 0 &&
      ratings.clarity > 0 &&
      ratings.usefulness > 0 &&
      ratings.distinctiveness > 0;
  });
});

const isFormValid = computed(() => {
  return currentReviewer.value &&
    currentClass.value &&
    bestPrototypes.value.length === 1 &&
    allPrototypesRated.value;
})

const isLoading = computed(() => store.isLoading)
const error = computed(() => store.error)

const handleReviewerChange = (reviewer) => {
  store.setCurrentReviewer(reviewer)
}

const handleClassChange = (className) => {
  // Set the current class (this should trigger the computed property)
  // className is an object with label and value properties
  currentClass.value = className.value;
  
  // Reset the form
  bestPrototypes.value = [];
}

const isPrototypeSelected = (index) => {
  return bestPrototypes.value.includes(index);
}

const toggleBestPrototype = (index) => {
  if (bestPrototypes.value.includes(index)) {
    // If already selected, deselect it
    bestPrototypes.value = [];
  } else {
    // If selecting a new one, clear any existing selection first
    bestPrototypes.value = [index];
  }
}

const updateRating = (prototypeId) => {
  console.log('Updated rating for prototype:', prototypeId, prototypeRatings.value[prototypeId]);
}

const updateComments = (prototypeId) => {
  console.log('Updated comments for prototype:', prototypeId, prototypeComments.value[prototypeId]);
}

const getRatingLabel = (rating) => {
  const labels = {
    1: 'Strongly Disagree',
    2: 'Disagree',
    3: 'Neutral',
    4: 'Agree',
    5: 'Strongly Agree'
  }
  return labels[rating] || ''
}

const getRatingColor = (rating) => {
  const colors = {
    1: 'negative',
    2: 'deep-orange',
    3: 'amber',
    4: 'light-green',
    5: 'positive'
  }
  return colors[rating] || 'grey'
}

const handleImageError = () => {
  console.error('Failed to load ECG image')
}

const submitEvaluation = () => {
  try {
    // 1. Create the evaluation object with all relevant data
    const evaluationData = {
      reviewer: currentReviewer.value,
      diagnosticClass: currentClass.value,
      timestamp: new Date().toISOString(),
      bestPrototype: currentPrototypes.value[bestPrototypes.value[0]]?.id,
      ratings: prototypeRatings.value,
      comments: prototypeComments.value,
      prototypes: currentPrototypes.value.map(prototype => ({
        id: prototype.id,
        diagnosticClass: prototype.diagnosticClass,
        model: prototype.model,
        description: prototype.description
      }))
    };
    
    // 2. Format the filename
    const reviewer = currentReviewer.value.replace(/\s+/g, '-').toLowerCase();
    const date = new Date().toISOString().split('T')[0];
    const filename = `ecg-evaluation-${reviewer}-${currentClass.value}-${date}.json`;
    
    // 3. Create JSON string with proper formatting
    const jsonString = JSON.stringify(evaluationData, null, 2);
    
    // 4. Create and use the download link
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    
    // 5. Set up and trigger download
    a.style.display = 'none';
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    
    // 6. Clean up
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    
    // 7. Show success notification
    $q.notify({
      type: 'positive',
      message: 'Evaluation data downloaded successfully!',
      icon: 'cloud_download',
      position: 'top',
      timeout: 3000
    });
    
    // 8. Reset the form state
    showSuccess.value = true;
    bestPrototypes.value = [];
    
  } catch (e) {
    // Simple error handling with console output and notification
    console.error('Download failed:', e);
    
    $q.notify({
      type: 'negative',
      message: 'Could not generate evaluation file. Please try again.',
      icon: 'error',
      position: 'top',
      timeout: 5000
    });
    
    showError.value = true;
  }
};

// Marker labels for the slider (1-5)
const markerClass = val => {
  return 'text-weight-bold'
}

onMounted(() => {
  // Set default diagnostic class
  if (diagnosticClasses.value.length > 0) {
    currentClass.value = diagnosticClasses.value[0]
  }
})
</script>

<style scoped>
.prototype-evaluation {
  max-width: 1200px;
  margin: 0 auto;
}

.prototype-card {
  transition: all 0.3s ease;
}

.ecg-display {
  background-color: #f5f5f5;
  border-radius: 4px;
}

.rating-wrapper {
  position: relative;
  padding-bottom: 30px;
}

/* Slider specific styles */
:deep(.q-slider__pin-value) {
  font-size: 14px;
  font-weight: bold;
}

:deep(.q-slider__marker-labels) {
  margin-top: 8px;
}

:deep(.q-slider__marker-labels-container) {
  font-size: 14px;
}

:deep(.q-slider__track-container) {
  cursor: pointer;
}

:deep(.q-slider__thumb-container) {
  cursor: pointer;
}

/* Label alignment styles */
.rating-labels-container {
  display: flex;
  justify-content: space-between;
  position: absolute;
  width: 100%;
  left: 0;
  bottom: 0;
  pointer-events: none;
}

.rating-label {
  position: relative;
  width: calc(100% / 5);
  display: flex;
  justify-content: center;
}

.label-text {
  text-align: center;
  font-size: 11px;
  color: #555;
  max-width: 90px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style> 