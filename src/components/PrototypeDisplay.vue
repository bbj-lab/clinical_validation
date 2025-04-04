<template>
  <div class="prototype-display q-pa-md">
    <div class="row q-col-gutter-md">
      <div v-for="(prototype, index) in prototypes" :key="index" class="col-12 col-md-6">
        <q-card class="prototype-card">
          <q-card-section class="bg-primary text-white">
            <div class="text-h6">Prototype {{ index + 1 }}</div>
            <div class="text-subtitle2">{{ prototype.diagnosticClass }}</div>
          </q-card-section>

          <q-card-section>
            <div class="text-subtitle2 q-mb-sm">
              Model Type: <span class="text-weight-bold">{{ formatModelType(prototype.model) }}</span>
            </div>
            <div class="text-caption q-mb-md" v-if="prototype.description">
              {{ prototype.description }}
            </div>
          </q-card-section>

          <q-card-section>
            <!-- ECG visualization -->
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

          <q-card-actions align="right">
            <q-btn
              :color="isSelected(index) ? 'positive' : 'primary'"
              :outline="!isSelected(index)"
              :icon="isSelected(index) ? 'check_circle' : 'radio_button_unchecked'"
              :label="isSelected(index) ? 'Selected' : 'Select as Best'"
              @click="toggleBestPrototype(index)"
              :disable="isSelected(index) && selectedCount === 1"
            />
          </q-card-actions>
        </q-card>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

// Define props
const props = defineProps({
  prototypes: {
    type: Array,
    required: true,
    default: () => []
  }
})

// Define emits
const emit = defineEmits(['update:bestPrototypes'])

const selectedPrototypes = ref(new Set())

const selectedCount = computed(() => selectedPrototypes.value.size)

// Log when props change
console.log('PrototypeDisplay setup with props:', props.prototypes)

// Watch for props changes
watch(() => props.prototypes, (newVal) => {
  console.log('PrototypeDisplay props.prototypes changed:', newVal)
}, { deep: true })

const isSelected = (index) => selectedPrototypes.value.has(index)

const toggleBestPrototype = (index) => {
  if (selectedPrototypes.value.has(index)) {
    selectedPrototypes.value.delete(index)
  } else {
    selectedPrototypes.value.add(index)
  }
  emit('update:bestPrototypes', Array.from(selectedPrototypes.value))
}

const formatModelType = (modelType) => {
  if (modelType === 'baseline') {
    return 'Baseline (Standard Loss)'
  } else if (modelType === 'proposed') {
    return 'Proposed (Contrastive + Sparsity)'
  }
  return modelType
}

const handleImageError = () => {
  console.error('Failed to load ECG image')
}
</script>

<style scoped>
.prototype-card {
  height: 100%;
}

.ecg-display {
  background-color: #f5f5f5;
  border-radius: 4px;
}
</style> 