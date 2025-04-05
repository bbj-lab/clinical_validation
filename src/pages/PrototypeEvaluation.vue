<template>
  <q-page class="prototype-evaluation q-pa-md">
    <div class="text-h4 q-mb-lg">ECG Prototype Evaluation</div>

    <!-- Reviewer and Class Selection -->
    <div class="row q-col-gutter-md q-mb-lg">
      <div class="col-12 col-md-6">
        <q-select
          v-model="currentClass"
          :options="diagnosticClassOptions"
          label="Select Diagnostic Class"
          outlined
          @update:model-value="handleClassChange"
        >
          <template v-slot:option="scope">
            <q-item v-bind="scope.itemProps">
              <q-item-section>
                <q-item-label :class="{ 'text-positive': completedClasses.includes(scope.opt.value) }">
                  {{ scope.opt.label }}
                  <q-icon v-if="completedClasses.includes(scope.opt.value)" name="check_circle" color="positive" size="xs" class="q-ml-sm" />
                </q-item-label>
              </q-item-section>
            </q-item>
          </template>
        </q-select>
      </div>
    </div>

    <!-- Prototype Section -->
    <div v-if="currentClass && currentReviewer" class="row">
      <!-- Side Navigation Menu -->
      <div class="col-md-2 col-sm-3 gt-xs">
        <div class="prototype-nav">
          <q-list bordered separator class="rounded-borders">
            <q-item 
              v-for="(prototype, index) in currentPrototypes" 
              :key="`nav-${prototype.id}`"
              clickable
              v-ripple
              @click="scrollToPrototype(index)"
              :class="{
                'bg-primary text-white': currentPrototypeIndex === index,
                'bg-light-green-1': isPrototypeComplete(index) && currentPrototypeIndex !== index
              }"
            >
              <q-item-section>
                Prototype {{ index + 1 }}
                <q-icon
                  v-if="isPrototypeComplete(index)"
                  name="check_circle"
                  color="positive"
                  size="xs"
                  class="q-ml-sm"
                />
              </q-item-section>
            </q-item>
          </q-list>
        </div>
      </div>
      
      <!-- Integrated Prototype Cards with Ratings -->
      <div class="col-md-9 col-sm-8 col-xs-12 offset-md-1 offset-sm-1">
        <div class="text-h5 q-mb-md">ECG Prototypes</div>
        <div class="row q-col-gutter-lg">
          <div 
            v-for="(prototype, index) in currentPrototypes" 
            :key="prototype.id" 
            class="col-12"
            :ref="el => { if (el) prototypeRefs[index] = el }"
            :id="`prototype-${index}`"
          >
            <q-card class="prototype-card q-mb-lg">
              <q-card-section class="bg-primary text-white">
                <div class="text-h6">Prototype {{ index + 1 }}</div>
                <!-- <div class="text-subtitle2">{{ prototype.diagnosticClass }}</div> -->
              </q-card-section>
              
              <!-- Prototype Image Section -->
              <q-card-section>
                <div class="ecg-display">
                  <q-carousel
                    v-model="currentImageIndex[prototype.id]"
                    :arrows="true"
                    :autoplay="false"
                    :infinite="false"
                    :navigation="false"
                    :transition-prev="slideTransition"
                    :transition-next="slideTransition"
                    control-color="black"
                    @update:model-value="updateImageIndex(prototype.id)"
                  >
                    <q-carousel-slide
                      v-for="(image, imageIndex) in prototype.images"
                      :key="`${prototype.id}-${imageIndex}`"
                      :name="imageIndex"
                    >
                      <div class="ecg-image-wrapper">
                        <img
                          :src="image"
                          alt="ECG Prototype"
                          :class="[
                            'ecg-image',
                            image.includes('extra_segment') ? 'crop-extra-segment' : 
                            image.includes('rhythm_II') ? 'crop-rhythm' : 'crop-default'
                          ]"
                          @error="handleImageError"
                        />
                        <div v-if="imageErrors[image]" class="ecg-image-error">
                          <div class="text-h6 text-grey-8">Error loading ECG image</div>
                        </div>
                      </div>
                    </q-carousel-slide>
                  </q-carousel>
                </div>
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
                
                <!-- Select Best / Bad Prototype Buttons -->
                <div class="row q-col-gutter-md q-mt-lg">
                  <div class="col">
                    <q-btn
                      :color="isPrototypeSelected(index) ? 'positive' : 'primary'"
                      :outline="!isPrototypeSelected(index)"
                      :icon="isPrototypeSelected(index) ? 'check_circle' : 'radio_button_unchecked'"
                      :label="isPrototypeSelected(index) ? 'Selected as Best Prototype' : 'Select as Best Prototype'"
                      @click="toggleBestPrototype(index)"
                    />
                  </div>
                  <div class="col">
                    <q-btn
                      :color="isBadPrototypeSelected(index) ? 'negative' : 'grey'"
                      :outline="!isBadPrototypeSelected(index)"
                      :icon="isBadPrototypeSelected(index) ? 'cancel' : 'radio_button_unchecked'"
                      :label="isBadPrototypeSelected(index) ? 'Marked as Bad Prototype' : 'Mark as Bad Prototype'"
                      @click="toggleBadPrototype(index)"
                    />
                  </div>
                </div>
              </q-card-section>
            </q-card>
          </div>
        </div>
      </div>

      <!-- General Feedback Section -->
      <div class="col-12">
        <div class="row justify-end">
          <div class="col-md-9 col-sm-8 col-xs-12">
            <q-card class="q-mb-lg">
              <q-card-section class="bg-primary text-white">
                <div class="text-h6">General Feedback</div>
              </q-card-section>
              <q-card-section>
                <div class="text-subtitle2 q-mb-sm">Prototype Redundancy</div>
                <div class="text-caption q-mb-md">
                  Did any of the prototypes feel redundant or too similar to each other? Please explain.
                </div>
                <q-input
                  v-model="generalFeedback"
                  type="textarea"
                  label="Comments about prototype redundancy"
                  outlined
                  autogrow
                  rows="4"
                />
              </q-card-section>
            </q-card>
          </div>
        </div>
      </div>

      <!-- Submit Button (Desktop and Mobile) -->
      <div class="row justify-end q-mt-lg q-mb-xl col-12">
        <q-btn
          v-if="!isAllClassesCompleted"
          color="primary"
          :label="isLastClass ? 'Submit All Results' : 'Next Class'"
          :loading="isLoading"
          :disable="!isFormValid"
          @click="handleNextClass"
          size="lg"
          class="q-mb-xl"
        />
        <q-btn
          v-else
          color="positive"
          label="Download Results"
          :loading="isLoading"
          @click="downloadAllResults"
          size="lg"
          class="q-mb-xl"
        />
        
        <!-- Debug Download Button (Remove in Production) -->
        <q-btn
          color="grey"
          label="Debug Download"
          :loading="isLoading"
          @click="downloadAllResults"
          size="lg"
          class="q-mb-xl q-ml-md"
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
          <span class="q-ml-sm">{{ successMessage }}</span>
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
import { useRouter, useRoute } from 'vue-router'

// Initialize the store and Quasar
const store = useEvaluationStore()
const $q = useQuasar()

// Get router and route instances
const router = useRouter()
const route = useRoute()

// Import the image map data
import imageMapData from '../assets/imageDirMap.generated.json'

// Function to convert image data from imageDirMap to prototypes structure
function processImageMapData() {
  const processedData = {};
  
  // Iterate through the main categories (e.g., 1D_rhythm_category1, 2D_global_category4)
  Object.keys(imageMapData).forEach(mainCategory => {
    const categoryData = imageMapData[mainCategory];
    
    // Iterate through the sub-categories (e.g., prototype_ecgs_cat1_static_constants_tune1_proj)
    Object.keys(categoryData).forEach(subCategory => {
      const classesData = categoryData[subCategory];
      
      // Iterate through the diagnostic classes (e.g., 1AVB, 2AVB, etc.)
      Object.keys(classesData).forEach(diagnosticClass => {
        // Skip empty classes
        if (!classesData[diagnosticClass] || classesData[diagnosticClass].length === 0) {
          return;
        }
        
        // Create slug from diagnostic class for use as key
        const classSlug = diagnosticClass.toLowerCase().replace(/[\s()_]/g, '-');
        
        if (!processedData[classSlug]) {
          processedData[classSlug] = [];
        }
        
        // Group images by prototype name
        const prototypeGroups = {};
        
        // Process each image in the diagnostic class
        classesData[diagnosticClass].forEach(imageName => {
          // Extract prototype name from the image name
          // Example: "Prototype_16_ECG_rhythm_II.png" -> "Prototype_16"
          const prototypeMatch = imageName.match(/^(Prototype_\d+)/);
          if (prototypeMatch) {
            const prototypeName = prototypeMatch[1];
            
            if (!prototypeGroups[prototypeName]) {
              prototypeGroups[prototypeName] = [];
            }
            
            // Construct the full image URL using the Cloudflare R2 bucket
            const imageUrl = `https://pub-c422172c6c414e1c825fefb55538d69e.r2.dev/${mainCategory}/${subCategory}/${diagnosticClass}/${imageName}`;
            prototypeGroups[prototypeName].push({
              url: imageUrl,
              imageName: imageName,
              isPriority: imageName.includes('extra_segment') || imageName.includes('rhythm_II')
            });
          }
        });
        
        // Convert prototype groups to array format
        Object.keys(prototypeGroups).forEach((prototypeName, index) => {
          // Use the original diagnostic class name without formatting
          const model = index % 2 === 0 ? 'baseline' : 'proposed';
          
          // Sort images to prioritize ones with 'extra_segment' or 'rhythm_II' in their names
          prototypeGroups[prototypeName].sort((a, b) => {
            if (a.isPriority && !b.isPriority) return -1;
            if (!a.isPriority && b.isPriority) return 1;
            return 0;
          });
          
          // Extract just the URLs for the final structure
          const sortedImageUrls = prototypeGroups[prototypeName].map(img => img.url);
          
          processedData[classSlug].push({
            id: `${classSlug}-${prototypeName.toLowerCase()}`,
            diagnosticClass: diagnosticClass,
            model,
            images: sortedImageUrls,
            description: `${prototypeName.replace('_', ' ')}`
          });
        });
      });
    });
  });
  
  return processedData;
}

// State variables
const currentReviewer = ref(null)
const currentClass = ref(null)
const bestPrototypes = ref([])
const badPrototypes = ref([])
const prototypeRatings = ref({})
const prototypeComments = ref({})
const generalFeedback = ref('')
const showError = ref(false)
const showSuccess = ref(false)
const imageErrors = ref({})

// Process image map data and make it available as reactive state
const prototypesData = ref(processImageMapData())

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


const diagnosticClasses = ref(Object.keys(prototypesData.value))
const diagnosticClassOptions = computed(() => {
  return diagnosticClasses.value.map(className => {
    // Use the original name from the slug (no additional formatting)
    // Find the original diagnostic class name from the first prototype in this class
    const prototypes = prototypesData.value[className] || [];
    let displayName = className;
    
    if (prototypes.length > 0) {
      // Use the diagnosticClass property from the first prototype
      displayName = prototypes[0].diagnosticClass;
    }
    
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
    // Initialize carousel index if not already set
    if (currentImageIndex.value[prototype.id] === undefined) {
      currentImageIndex.value[prototype.id] = 0;
    }
  });
  
  // Check if we have saved data for this class and restore bad prototypes
  if (currentClass.value && evaluationResults.value[currentClass.value]) {
    const savedData = evaluationResults.value[currentClass.value];
    
    // Restore bad prototypes if they exist
    if (savedData.badPrototypes && savedData.badPrototypes.length > 0) {
      // Convert saved prototype IDs back to indices
      const prototypeIdToIndex = {};
      currentPrototypes.value.forEach((prototype, index) => {
        prototypeIdToIndex[prototype.id] = index;
      });
      
      // Set bad prototypes based on saved IDs
      badPrototypes.value = savedData.badPrototypes
        .map(id => prototypeIdToIndex[id])
        .filter(index => index !== undefined);
    }
  }
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
  badPrototypes.value = []; // Reset bad prototypes too
  
  // Reset general feedback
  generalFeedback.value = '';
  
  // Check if we have saved data for this class and restore it
  if (evaluationResults.value[currentClass.value]) {
    const savedData = evaluationResults.value[currentClass.value];
    
    // Restore general feedback if it exists
    if (savedData.generalFeedback) {
      generalFeedback.value = savedData.generalFeedback;
    }
    
    // Restore best prototype if it exists
    if (savedData.bestPrototype) {
      // Convert saved prototype ID back to index
      const prototypeIdToIndex = {};
      currentPrototypes.value.forEach((prototype, index) => {
        prototypeIdToIndex[prototype.id] = index;
      });
      
      const bestIndex = prototypeIdToIndex[savedData.bestPrototype];
      if (bestIndex !== undefined) {
        bestPrototypes.value = [bestIndex];
      }
    }
    
    // Restore ratings if they exist
    if (savedData.ratings) {
      Object.keys(savedData.ratings).forEach(prototypeId => {
        prototypeRatings.value[prototypeId] = savedData.ratings[prototypeId];
      });
    }
    
    // Restore comments if they exist
    if (savedData.comments) {
      Object.keys(savedData.comments).forEach(prototypeId => {
        prototypeComments.value[prototypeId] = savedData.comments[prototypeId];
      });
    }
  }
}

const isPrototypeSelected = (index) => {
  return bestPrototypes.value.includes(index);
}

const isBadPrototypeSelected = (index) => {
  return badPrototypes.value.includes(index);
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

const toggleBadPrototype = (index) => {
  if (badPrototypes.value.includes(index)) {
    // If already selected, deselect it
    badPrototypes.value = badPrototypes.value.filter(i => i !== index);
  } else {
    // Add to bad prototypes (can select multiple)
    badPrototypes.value.push(index);
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

const handleImageError = (event) => {
  console.error('Failed to load ECG image', event.target.src)
  imageErrors.value[event.target.src] = true
}

// New variables for the "Next Class" flow
const completedClasses = ref([])
const evaluationResults = ref({})
const isAllClassesCompleted = ref(false)
const isLastClass = computed(() => {
  // Check if we're on the last incomplete class
  const uncompletedClasses = diagnosticClasses.value.filter(
    classItem => !completedClasses.value.includes(classItem)
  )
  return uncompletedClasses.length <= 1 && currentClass.value === uncompletedClasses[0]
})
const successMessage = ref('')

// Load saved state from localStorage
onMounted(() => {
  // Set default diagnostic class
  if (diagnosticClasses.value.length > 0) {
    currentClass.value = diagnosticClasses.value[0]
  }
  
  // Extract the reviewer code from the URL
  const userCode = route.query.user
  
  if (userCode && /^\d{6}$/.test(userCode)) {
    // Set current reviewer from URL parameter
    currentReviewer.value = `Reviewer-${userCode}`
    
    // Try to load saved data from localStorage
    const savedKey = `ecg-eval-${currentReviewer.value}`
    try {
      const savedData = localStorage.getItem(savedKey)
      if (savedData) {
        const parsed = JSON.parse(savedData)
        evaluationResults.value = parsed.evaluations || {}
        completedClasses.value = parsed.completedClasses || []
        
        // Check if all classes are completed
        isAllClassesCompleted.value = checkAllClassesCompleted()
        
        // If we have at least one completed class, show a notification
        if (completedClasses.value.length > 0) {
          $q.notify({
            type: 'positive',
            message: `Loaded your saved progress (${completedClasses.value.length} classes completed)`,
            position: 'top',
            timeout: 3000
          })
          
          // Set current class to first incomplete class
          const firstIncompleteClass = diagnosticClasses.value.find(
            classItem => !completedClasses.value.includes(classItem)
          )
          if (firstIncompleteClass) {
            currentClass.value = firstIncompleteClass
          }
        }
      }
    } catch (err) {
      console.error('Error loading saved data:', err)
    }
  } else {
    // If no valid code is found, show a notification
    $q.notify({
      type: 'warning',
      message: 'No valid reviewer code provided. Please use a valid URL with a 6-digit reviewer code.',
      position: 'top',
      timeout: 5000
    })
  }
  
  // Add scroll event listener to track current prototype
  window.addEventListener('scroll', updateCurrentPrototype)
})

// Check if all diagnostic classes have been completed
const checkAllClassesCompleted = () => {
  return completedClasses.value.length >= diagnosticClasses.value.length
}

// Save current state to localStorage
const saveToLocalStorage = () => {
  if (!currentReviewer.value) return
  
  const savedKey = `ecg-eval-${currentReviewer.value}`
  const dataToSave = {
    evaluations: evaluationResults.value,
    completedClasses: completedClasses.value,
    lastUpdated: new Date().toISOString()
  }
  
  try {
    localStorage.setItem(savedKey, JSON.stringify(dataToSave))
  } catch (err) {
    console.error('Error saving to localStorage:', err)
    $q.notify({
      type: 'negative',
      message: 'Could not save progress locally. Your browser storage might be full.',
      position: 'top',
      timeout: 5000
    })
  }
}

const handleNextClass = () => {
  // Save current evaluation data
  saveCurrentEvaluation()
  
  // Show success message
  successMessage.value = 'Evaluation saved successfully!'
  showSuccess.value = true
  
  // Mark current class as completed if not already in the list
  if (!completedClasses.value.includes(currentClass.value)) {
    completedClasses.value.push(currentClass.value)
  }
  
  // Save to localStorage
  saveToLocalStorage()
  
  // Check if all classes are completed
  isAllClassesCompleted.value = checkAllClassesCompleted()
  
  // If all classes are completed, show appropriate message
  if (isAllClassesCompleted.value) {
    $q.notify({
      type: 'positive',
      message: 'All classes have been evaluated! You can now download your results.',
      position: 'top',
      timeout: 5000
    })
  } else {
    // Reset the general feedback field
    generalFeedback.value = ''
    
    // Move to the next incomplete class
    const nextIncompleteClass = diagnosticClasses.value.find(
      classItem => !completedClasses.value.includes(classItem)
    )
    
    if (nextIncompleteClass) {
      // Wait a bit before changing the class to allow the success dialog to be seen
      setTimeout(() => {
        // Find the option object for the next class
        const nextClassOption = diagnosticClassOptions.value.find(
          option => option.value === nextIncompleteClass
        )
        if (nextClassOption) {
          currentClass.value = nextClassOption.value
          handleClassChange({ value: nextClassOption.value, label: nextClassOption.label })
        }
      }, 1000)
    }
  }
}

const saveCurrentEvaluation = () => {
  try {
    // Create the evaluation object with all relevant data
    const evaluationData = {
      reviewer: currentReviewer.value,
      diagnosticClass: currentClass.value,
      timestamp: new Date().toISOString(),
      bestPrototype: currentPrototypes.value[bestPrototypes.value[0]]?.id,
      badPrototypes: badPrototypes.value.map(index => currentPrototypes.value[index]?.id).filter(Boolean),
      ratings: JSON.parse(JSON.stringify(prototypeRatings.value)),
      comments: JSON.parse(JSON.stringify(prototypeComments.value)),
      generalFeedback: generalFeedback.value,
      prototypes: currentPrototypes.value.map(prototype => ({
        id: prototype.id,
        diagnosticClass: prototype.diagnosticClass,
        model: prototype.model,
        description: prototype.description,
        imageCount: prototype.images.length
      }))
    }
    
    // Store in the global evaluationResults object
    evaluationResults.value[currentClass.value] = evaluationData
    
    return true
  } catch (e) {
    console.error('Failed to save evaluation:', e)
    $q.notify({
      type: 'negative',
      message: 'Could not save evaluation data. Please try again.',
      position: 'top',
      timeout: 5000
    })
    
    return false
  }
}

const downloadAllResults = () => {
  try {
    // Prepare the complete results object
    const completeResults = {
      reviewer: currentReviewer.value,
      timestamp: new Date().toISOString(),
      classesEvaluated: completedClasses.value,
      totalClasses: diagnosticClasses.value.length,
      evaluations: evaluationResults.value
    }
    
    // Format the filename
    const reviewer = currentReviewer.value.replace(/\s+/g, '-').toLowerCase()
    const date = new Date().toISOString().split('T')[0]
    const filename = `ecg-evaluation-all-classes-${reviewer}-${date}.json`
    
    // Create JSON string with proper formatting
    const jsonString = JSON.stringify(completeResults, null, 2)
    
    // Create and use the download link
    const blob = new Blob([jsonString], { type: 'application/json' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    
    // Set up and trigger download
    a.style.display = 'none'
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    
    // Clean up
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
    
    // Show success notification
    successMessage.value = 'All evaluation data downloaded successfully!'
    showSuccess.value = true
    
    $q.notify({
      type: 'positive',
      message: 'Evaluation data downloaded successfully!',
      icon: 'cloud_download',
      position: 'top',
      timeout: 3000
    })
    
    return true
  } catch (e) {
    console.error('Download failed:', e)
    
    $q.notify({
      type: 'negative',
      message: 'Could not generate evaluation file. Please try again.',
      icon: 'error',
      position: 'top',
      timeout: 5000
    })
    
    showError.value = true
    return false
  }
}

// Replace the original submit function with our new workflow
const submitEvaluation = handleNextClass

// Store refs to prototype cards for scrolling
const prototypeRefs = ref([])
const currentPrototypeIndex = ref(0)

// Method to scroll to a prototype
const scrollToPrototype = (index) => {
  const element = prototypeRefs.value[index]
  if (element) {
    currentPrototypeIndex.value = index
    
    // Calculate header offset (50px for the header)
    const headerOffset = 50
    
    // Get the element's position relative to the viewport
    const elementPosition = element.getBoundingClientRect().top
    
    // Calculate the absolute position and adjust for header
    const offsetPosition = window.pageYOffset + elementPosition - headerOffset
    
    // Scroll to the adjusted position
    window.scrollTo({
      top: offsetPosition,
      behavior: 'smooth'
    })
  }
}

// Clean up the event listener when component is unmounted
const beforeUnmount = () => {
  window.removeEventListener('scroll', updateCurrentPrototype)
}

// Update the active prototype based on scroll position
const updateCurrentPrototype = () => {
  if (prototypeRefs.value.length === 0) return
  
  // Find the prototype closest to the top of the viewport
  const scrollPosition = window.scrollY + 100 // Add offset to improve accuracy
  
  for (let i = 0; i < prototypeRefs.value.length; i++) {
    const element = prototypeRefs.value[i]
    const elementPosition = element.getBoundingClientRect().top + window.scrollY
    
    if (scrollPosition >= elementPosition) {
      currentPrototypeIndex.value = i
    }
  }
}

// State variables for image handling
const currentImageIndex = ref({})
const slideTransition = ref('fade')

const updateImageIndex = (prototypeId) => {
  console.log('Updated image index for prototype:', prototypeId, currentImageIndex.value[prototypeId]);
}

// Marker labels for the slider (1-5)
const markerClass = () => 'text-weight-bold'

// Function to check if a prototype is completely rated
const isPrototypeComplete = (index) => {
  if (!currentPrototypes.value[index]) return false
  
  const prototype = currentPrototypes.value[index]
  const ratings = prototypeRatings.value[prototype.id]
  
  // Check if all criteria have been rated
  return ratings && 
    ratings.representativeness > 0 &&
    ratings.clarity > 0 &&
    ratings.usefulness > 0 &&
    ratings.distinctiveness > 0
}
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

/* Carousel styling */
:deep(.q-carousel) {
  background-color: #f5f5f5;
  border-radius: 4px;
  height: auto;
}

:deep(.q-carousel__slide) {
  padding: 6px;
}

:deep(.q-carousel__navigation-icon) {
  font-size: 10px;
}

:deep(.q-carousel__navigation .q-btn) {
  margin: 4px 4px 8px;
}

.prototype-nav {
  position: sticky;
  top: 70px; /* Adjusted to account for header (50px) + some padding (20px) */
  z-index: 1;
  margin-top: 45px; /* Added to align with the first prototype after the heading */
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

.ecg-image-wrapper {
  background-color: #f5f5f5;
  border-radius: 4px;
  padding: 6px;
  text-align: center;
  overflow: hidden;
  position: relative;
  aspect-ratio: 16/9;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
}

.ecg-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  width: 100%;
}

.crop-extra-segment {
  clip-path: inset(5% 0 0 0); /* Crop top 8% for extra_segment images */
}

.crop-rhythm {
  clip-path: inset(10% 0 0 0); /* Crop top 10% for rhythm_II images */
}

.crop-default {
  clip-path: inset(4% 0 0 0); /* Crop top 9% for all other images */
}

.ecg-image-error {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f5f5f5;
}
</style> 