<template>
  <div class="rating-form q-pa-md">
    <!-- For each prototype -->
    <div v-for="(prototype, protoIndex) in prototypes" :key="prototype.id" class="q-mb-xl">
      <q-card>
        <q-card-section class="bg-primary text-white">
          <div class="text-h6">Ratings for Prototype {{ protoIndex + 1 }}</div>
          <div class="text-subtitle2">{{ prototype.diagnosticClass }} - {{ formatModelType(prototype.model) }}</div>
        </q-card-section>

        <q-card-section>
          <div v-for="(criterion, key) in criteria" :key="`${prototype.id}-${key}`" class="q-mb-xl">
            <div class="text-subtitle1 text-weight-bold q-mb-sm">{{ criterion.label }}</div>
            <div class="text-body2 q-mb-md">{{ criterion.description }}</div>
            
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
        </q-card-section>
      </q-card>
    </div>

    <!-- Comments Section -->
    <q-card class="q-mt-lg">
      <q-card-section class="bg-primary text-white">
        <div class="text-h6">Additional Comments</div>
      </q-card-section>

      <q-card-section>
        <q-input
          v-model="comments"
          type="textarea"
          label="Comments on prototype comparison (e.g., differences or lack thereof between prototypes)"
          outlined
          autogrow
          rows="4"
          @update:model-value="updateComments"
        />
      </q-card-section>
    </q-card>
  </div>
</template>

<script setup>
import { ref, reactive, watch, onMounted } from 'vue'

// Define props
const props = defineProps({
  prototypes: {
    type: Array,
    required: true,
    default: () => []
  }
})

// Define emits
const emit = defineEmits(['update:ratings', 'update:comments'])

const criteria = {
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

// Marker labels for the slider (1-5)
const markerClass = val => {
  return 'text-weight-bold'
}

// Rating labels
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

// Create a nested reactive object to track ratings for each prototype
const prototypeRatings = reactive({})
const comments = ref('')

// Initialize ratings when prototypes change
watch(() => props.prototypes, (newPrototypes) => {
  initializeRatings(newPrototypes)
}, { immediate: true, deep: true })

onMounted(() => {
  initializeRatings(props.prototypes)
})

function initializeRatings(prototypes) {
  prototypes.forEach(prototype => {
    if (!prototypeRatings[prototype.id]) {
      prototypeRatings[prototype.id] = {
        representativeness: 0,
        clarity: 0,
        usefulness: 0,
        distinctiveness: 0
      }
    }
  })
}

const updateRating = (prototypeId) => {
  emit('update:ratings', {...prototypeRatings})
}

const updateComments = () => {
  emit('update:comments', comments.value)
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

const formatModelType = (modelType) => {
  if (modelType === 'baseline') {
    return 'Baseline (Standard Loss)'
  } else if (modelType === 'proposed') {
    return 'Proposed (Contrastive + Sparsity)'
  }
  return modelType
}
</script>

<style scoped>
.rating-form {
  max-width: 800px;
  margin: 0 auto;
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