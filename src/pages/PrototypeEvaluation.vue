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
          <template v-slot:selected>
            <template v-if="currentClass">
              {{ diagnosticClassOptions.find(opt => opt.value === currentClass)?.label || currentClass }}
            </template>
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
                <div class="text-h6">Prototype {{ index + 1 }} <span v-if="diagnosticDescriptions[prototype.diagnosticClass]">({{ prototype.diagnosticClass }}: {{ diagnosticDescriptions[prototype.diagnosticClass] }})</span></div>
              </q-card-section>
              
              <!-- Prototype Image Section -->
              <q-card-section>
                <div class="ecg-display">
                  <q-carousel
                    v-model="currentImageIndex[prototype.id]"
                    :arrows="false"
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
                          @click="openImageDialog(image, prototype, imageIndex)"
                          class="cursor-pointer"
                        />
                        <div v-if="imageErrors[image]" class="ecg-image-error">
                          <div class="text-h6 text-grey-8">Error loading ECG image</div>
                        </div>
                      </div>
                    </q-carousel-slide>
                  </q-carousel>
                  
                  <!-- Custom navigation buttons below the carousel -->
                  <div class="carousel-navigation row justify-center q-mt-sm">
                    <q-btn
                      round
                      flat
                      icon="arrow_back"
                      color="primary"
                      :disable="currentImageIndex[prototype.id] === 0"
                      @click="moveCarousel(prototype.id, -1)"
                    />
                    <div class="carousel-page-indicator q-mx-md">
                      {{ currentImageIndex[prototype.id] + 1 }} / {{ prototype.images.length }}
                    </div>
                    <q-btn
                      round
                      flat
                      icon="arrow_forward"
                      color="primary"
                      :disable="currentImageIndex[prototype.id] === prototype.images.length - 1"
                      @click="moveCarousel(prototype.id, 1)"
                    />
                  </div>
                </div>
              </q-card-section>
              
              <!-- Rating Section -->
              <q-separator />
              
              <q-card-section>
                <div class="text-subtitle1 text-weight-bold q-mb-md">Rate this prototype:</div>
                
                <!-- Accuracy toggle first -->
                <div class="q-mb-lg">
                  <div class="text-subtitle2 q-mb-sm">Accurate</div>
                  <div class="text-caption q-mb-md">Does this prototype portray the diagnostic class correctly?</div>
                  
                  <div class="q-px-md q-py-sm">
                    <q-option-group
                      v-model="prototypeRatings[prototype.id].accuracy"
                      :options="[
                        { label: 'Yes', value: true },
                        { label: 'No', value: false }
                      ]"
                      color="primary"
                      inline
                      @update:model-value="updateRating(prototype.id)"
                    />
                  </div>
                </div>
                
                <!-- Alternate class dropdown (only shown if accuracy is set to false/0) -->
                <div v-if="prototypeRatings[prototype.id].accuracy === false" class="q-mb-lg">
                  <div class="text-subtitle2 q-mb-sm">Suggested Alternative Class <span class="text-negative">*</span></div>
                  <div class="text-caption q-mb-md">What alternative diagnostic class would you suggest for this prototype?</div>
                  
                  <q-select
                    v-model="prototypeAlternateClass[prototype.id]"
                    :options="[{ label: 'N/A - No specific suggestion', value: 'n/a' }, ...diagnosticClassOptions]"
                    outlined
                    emit-value
                    map-options
                    option-label="label"
                    option-value="value"
                    class="q-mb-md"
                    :rules="[val => !!val || 'Please select an alternative class']"
                  />
                </div>
                
                <!-- Rating criteria -->
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
                      :disable="prototypeRatings[prototype.id].accuracy === false && prototypeAlternateClass[prototype.id] === 'n/a'"
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
                      :disable="prototypeRatings[prototype.id].accuracy === false"
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
                  label="List any prototypes that you felt were redundant with each other"
                  hint="Ex: 1-3, 2-4-5"
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
          @click="handleNextClass"
          size="lg"
          class="q-mb-xl"
        />
        <q-btn
          v-else
          color="positive"
          label="Download Complete Results"
          :loading="isLoading"
          @click="downloadAllResults"
          size="lg"
          class="q-mb-xl"
        />
        
        <!-- Progress Download Button -->
        <q-btn
          color="grey-7"
          label="Download Current Progress"
          :loading="isLoading"
          @click="downloadAllResults"
          size="lg"
          class="q-mb-xl q-ml-md"
        >
          <q-tooltip>
            You can download your progress at any time, but please only email the final file when all classes are completed
          </q-tooltip>
        </q-btn>
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

    <!-- Add scroll-to-top button -->
    <q-page-sticky position="bottom-right" :offset="[18, 18]">
      <q-btn
        v-show="showScrollButton"
        fab
        icon="arrow_upward"
        color="primary"
        @click="scrollToTop"
      />
    </q-page-sticky>

    <!-- Image Dialog -->
    <q-dialog v-model="showImageDialog" maximized>
      <q-card class="image-dialog-card">
        <q-card-section class="row items-center">
          <div class="col">
            <div class="text-h6">{{ imageDialogTitle }}</div>
          </div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>
        
        <q-card-section class="q-pt-none image-dialog-content">
          <div class="full-width flex flex-center">
            <img 
              :src="imageDialogImage" 
              alt="ECG Image" 
              :class="[
                'image-dialog-img',
                imageDialogImage.includes('extra_segment') ? 'crop-extra-segment' : 
                imageDialogImage.includes('rhythm_II') ? 'crop-rhythm' : 'crop-default'
              ]"
            />
          </div>
        </q-card-section>
        
        <q-card-section class="q-pt-none">
          <div class="row justify-center q-gutter-md">
            <q-btn 
              icon="arrow_back" 
              color="primary" 
              :disable="currentDialogImageIndex === 0"
              @click="navigateDialogImage(-1)"
              rounded
            />
            <div class="self-center">
              {{ currentDialogImageIndex + 1 }} / {{ dialogImageCount }}
            </div>
            <q-btn 
              icon="arrow_forward" 
              color="primary" 
              :disable="currentDialogImageIndex >= dialogImageCount - 1"
              @click="navigateDialogImage(1)"
              rounded
            />
          </div>
        </q-card-section>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted, watch, reactive, nextTick } from 'vue'
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
              // Images with extra_segment are priority, rhythm_II are NOT priority
              isPriority: imageName.includes('extra_segment') 
            });
          }
        });
        
        // Convert prototype groups to array format
        Object.keys(prototypeGroups).forEach((prototypeName, index) => {
          // Use the original diagnostic class name without formatting
          const model = index % 2 === 0 ? 'baseline' : 'proposed';
          
          // Sort images to prioritize ones with 'extra_segment' or 'rhythm_II' in their names
          prototypeGroups[prototypeName].sort((a, b) => {
            // First prioritize extra_segment images
            if (a.imageName.includes('extra_segment') && !b.imageName.includes('extra_segment')) return -1;
            if (!a.imageName.includes('extra_segment') && b.imageName.includes('extra_segment')) return 1;
            
            // Then deprioritize rhythm_II images (show them last)
            if (a.imageName.includes('rhythm_II') && !b.imageName.includes('rhythm_II')) return 1;
            if (!a.imageName.includes('rhythm_II') && b.imageName.includes('rhythm_II')) return -1;
            
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

// Diagnostic class descriptions
const diagnosticDescriptions = {
  "NDT": "non-diagnostic T abnormalities",
  "NST_": "non-specific ST changes",
  "DIG": "digitalis-effect",
  "LNGQT": "long QT-interval",
  "NORM": "normal ECG",
  "IMI": "inferior myocardial infarction",
  "ASMI": "anteroseptal myocardial infarction",
  "LVH": "left ventricular hypertrophy",
  "LAFB": "left anterior fascicular block",
  "ISC_": "non-specific ischemic",
  "IRBBB": "incomplete right bundle branch block",
  "1AVB": "first degree AV block",
  "IVCD": "non-specific intraventricular conduction disturbance (block)",
  "ISCAL": "ischemic in anterolateral leads",
  "CRBBB": "complete right bundle branch block",
  "CLBBB": "complete left bundle branch block",
  "ILMI": "inferolateral myocardial infarction",
  "LAO/LAE": "left atrial overload/enlargement",
  "AMI": "anterior myocardial infarction",
  "ALMI": "anterolateral myocardial infarction",
  "ISCIN": "ischemic in inferior leads",
  "INJAS": "subendocardial injury in anteroseptal leads",
  "LMI": "lateral myocardial infarction",
  "ISCIL": "ischemic in inferolateral leads",
  "LPFB": "left posterior fascicular block",
  "ISCAS": "ischemic in anteroseptal leads",
  "INJAL": "subendocardial injury in anterolateral leads",
  "ISCLA": "ischemic in lateral leads",
  "RVH": "right ventricular hypertrophy",
  "ANEUR": "ST-T changes compatible with ventricular aneurysm",
  "RAO/RAE": "right atrial overload/enlargement",
  "EL": "electrolytic disturbance or drug (former EDIS)",
  "WPW": "Wolf-Parkinson-White syndrome",
  "ILBBB": "incomplete left bundle branch block",
  "IPLMI": "inferoposterolateral myocardial infarction",
  "ISCAN": "ischemic in anterior leads",
  "IPMI": "inferoposterior myocardial infarction",
  "SEHYP": "septal hypertrophy",
  "INJIN": "subendocardial injury in inferior leads",
  "INJLA": "subendocardial injury in lateral leads",
  "PMI": "posterior myocardial infarction",
  "3AVB": "third degree AV block",
  "INJIL": "subendocardial injury in inferolateral leads",
  "2AVB": "second degree AV block",
  "ABQRS": "abnormal QRS",
  "PVC": "ventricular premature complex",
  "STD_": "non-specific ST depression",
  "VCLVH": "voltage criteria (QRS) for left ventricular hypertrophy",
  "QWAVE": "Q waves present",
  "LOWT": "low amplitude T-waves",
  "NT_": "non-specific T-wave changes",
  "PAC": "atrial premature complex",
  "LPR": "prolonged PR interval",
  "INVT": "inverted T-waves",
  "LVOLT": "low QRS voltages in the frontal and horizontal leads",
  "HVOLT": "high QRS voltage",
  "TAB_": "T-wave abnormality",
  "STE_": "non-specific ST elevation",
  "PRC(S)": "premature complex(es)",
  "SR": "sinus rhythm",
  "AFIB": "atrial fibrillation",
  "STACH": "sinus tachycardia",
  "SARRH": "sinus arrhythmia",
  "SBRAD": "sinus bradycardia",
  "PACE": "normal functioning artificial pacemaker",
  "SVARR": "supraventricular arrhythmia",
  "BIGU": "bigeminal pattern (unknown origin, SV or Ventricular)",
  "AFLT": "atrial flutter",
  "SVTAC": "supraventricular tachycardia",
  "PSVT": "paroxysmal supraventricular tachycardia",
  "TRIGU": "trigeminal pattern (unknown origin, SV or Ventricular)"
}

// Rating criteria
const ratingCriteria = {
  representativeness: {
    label: 'Representativeness',
    description: 'To what extent does the prototype reflect a typical/defining presentation of the target diagnostic class?'
  },
  clarity: {
    label: 'Clarity',
    description: 'Is the signal in the prototype interpretable and clear, or does it contain a lot of noise/artifacts?'
  }
}

const diagnosticClasses = ref(Object.keys(prototypesData.value))
const diagnosticClassOptions = computed(() => {
  return diagnosticClasses.value.map(className => {
    // Find the original diagnostic class name from the first prototype in this class
    const prototypes = prototypesData.value[className] || [];
    let displayName = className;
    let code = '';
    
    if (prototypes.length > 0) {
      // Use the diagnosticClass property from the first prototype
      code = prototypes[0].diagnosticClass;
      // Get the human-readable description if available
      if (diagnosticDescriptions[code]) {
        displayName = `${code}: ${diagnosticDescriptions[code]}`;
      } else {
        displayName = code;
      }
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
        accuracy: null
      }
    }
    
    // Initialize alternate class selections if not already set
    if (!prototypeAlternateClass.value[prototype.id]) {
      prototypeAlternateClass.value[prototype.id] = null;
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
    
    // Restore accuracy settings and alternate class selections if they exist
    if (savedData.alternateClasses) {
      Object.keys(savedData.alternateClasses).forEach(prototypeId => {
        prototypeAlternateClass.value[prototypeId] = savedData.alternateClasses[prototypeId];
      });
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
    
    // Special case: If accuracy is false and alternateClass is n/a, skip clarity and representativeness checks
    if (ratings.accuracy === false && prototypeAlternateClass.value[prototype.id] === 'n/a') {
      return true;
    }
    
    // If accuracy is false, make sure an alternate class is selected
    if (ratings.accuracy === false) {
      // Require a selection for the alternate class
      if (!prototypeAlternateClass.value[prototype.id]) {
        return false;
      }
    }
    
    return ratings && 
      ratings.representativeness > 0 &&
      ratings.clarity > 0 &&
      // Check if accuracy has been explicitly set (is not null)
      ratings.accuracy !== null;
  });
});

const isFormValid = computed(() => {
  // Check if all prototypes have been marked as having inaccurate class (accuracy=false)
  const allPrototypesInaccurate = currentPrototypes.value.length > 0 &&
    currentPrototypes.value.every(prototype => 
      prototypeRatings.value[prototype.id]?.accuracy === false
    );
  
  // If all prototypes are inaccurate, we don't need a best prototype selection
  const bestPrototypeValid = allPrototypesInaccurate || bestPrototypes.value.length === 1;
  
  return currentReviewer.value &&
    currentClass.value &&
    bestPrototypeValid &&
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
  
  // Check if accuracy was set to false
  if (prototypeRatings.value[prototypeId].accuracy === false) {
    // Check if the alternate class is already set to n/a
    if (prototypeAlternateClass.value[prototypeId] === 'n/a') {
      // Clear the representativeness and clarity ratings
      prototypeRatings.value[prototypeId].representativeness = 0;
      prototypeRatings.value[prototypeId].clarity = 0;
      
      // Find the prototype index for auto selecting "bad prototype"
      const prototypeIndex = currentPrototypes.value.findIndex(p => p.id === prototypeId);
      if (prototypeIndex !== -1 && !badPrototypes.value.includes(prototypeIndex)) {
        badPrototypes.value.push(prototypeIndex);
      }
    }
  }
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

// Add scroll-to-top button
const showScrollButton = ref(false)

const scrollToTop = () => {
  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  })
}

// Function to check scroll position and show/hide the button
const checkScrollPosition = () => {
  // Show button when user has scrolled down 300px or more
  showScrollButton.value = window.scrollY > 300
}

// Add event listener for scroll
onMounted(() => {
  // Set default diagnostic class
  if (diagnosticClasses.value.length > 0) {
    currentClass.value = diagnosticClasses.value[0]
  }
  
  // Extract the reviewer code from the URL
  const userCode = route.query.user
  
  // Only accept the specified codes
  const validCodes = ['351612', '165113', '123456']
  
  if (userCode && validCodes.includes(userCode)) {
    // Set current reviewer from URL parameter
    currentReviewer.value = `Reviewer-${userCode}`
    
    // Try to load saved data from localStorage
    const savedKey = `ecg-eval-v2-${currentReviewer.value}`
    try {
      const savedData = localStorage.getItem(savedKey)
      if (savedData) {
        const parsed = JSON.parse(savedData)
        
        // Only restore data if it belongs to the current user
        if (parsed.reviewer === currentReviewer.value) {
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
        } else {
          console.warn('Found saved data but for a different user')
        }
      }
    } catch (err) {
      console.error('Error loading saved data:', err)
    }
  } else {
    // If no valid code is found, show a notification
    $q.notify({
      type: 'negative',
      message: 'Invalid reviewer code. Please use a valid URL with an authorized reviewer code.',
      position: 'top',
      timeout: 5000
    })
  }
  
  // Add scroll event listeners
  window.addEventListener('scroll', updateCurrentPrototype)
  window.addEventListener('scroll', checkScrollPosition)
})

// Clean up the event listeners when component is unmounted
const beforeUnmount = () => {
  window.removeEventListener('scroll', updateCurrentPrototype)
  window.removeEventListener('scroll', checkScrollPosition)
}

// Check if all diagnostic classes have been completed
const checkAllClassesCompleted = () => {
  return completedClasses.value.length >= diagnosticClasses.value.length
}

// Save current state to localStorage
const saveToLocalStorage = () => {
  if (!currentReviewer.value) return
  
  const savedKey = `ecg-eval-v2-${currentReviewer.value}`
  const dataToSave = {
    reviewer: currentReviewer.value,
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

const handleNextClass = async () => {
  // Validate all required fields
  const missingFields = [];
  
  // Check if all prototypes have been rated
  if (!allPrototypesRated.value) {
    missingFields.push("ratings for all prototypes on all criteria");
  }
  
  // Check if any prototypes can be selected as best (accuracy is not false)
  const hasValidPrototypes = currentPrototypes.value.some(prototype => 
    prototypeRatings.value[prototype.id]?.accuracy !== false
  );
  
  // Only check for best prototype selection if there are valid prototypes
  if (hasValidPrototypes && bestPrototypes.value.length === 0) {
    missingFields.push("a best prototype selection");
  }
  
  // If any required fields are missing, show a message and return
  if (missingFields.length > 0) {
    let message = "Please complete the following before proceeding:";
    missingFields.forEach(field => {
      message += `\n• ${field}`;
    });
    
    $q.notify({
      type: 'negative',
      message: message,
      multiLine: true,
      position: 'top',
      timeout: 5000
    });
    return;
  }
  
  // If validation passes, proceed with saving and navigating
  
  // Save current evaluation data
  saveCurrentEvaluation();
  
  // Get the current class display name for the success message
  const currentClassOption = diagnosticClassOptions.value.find(opt => opt.value === currentClass.value);
  const classDisplayName = currentClassOption ? currentClassOption.label : currentClass.value;
  
  // Show success message with the class names
  successMessage.value = `Evaluation completed for ${classDisplayName}`;
  showSuccess.value = true;
  
  // Mark current class as completed if not already in the list
  if (!completedClasses.value.includes(currentClass.value)) {
    completedClasses.value.push(currentClass.value);
  }
  
  // Save to localStorage
  saveToLocalStorage();
  
  // Check if all classes are completed
  isAllClassesCompleted.value = checkAllClassesCompleted();
  
  // If all classes are completed, show appropriate message
  if (isAllClassesCompleted.value) {
    $q.notify({
      type: 'positive',
      message: 'All classes have been evaluated! You can now download your results.',
      position: 'top',
      timeout: 5000
    });
  } else {
    // Reset the general feedback field
    generalFeedback.value = '';
    
    // Move to the next incomplete class
    const nextIncompleteClass = diagnosticClasses.value.find(
      classItem => !completedClasses.value.includes(classItem)
    );
    
    if (nextIncompleteClass) {
      const nextClassOption = diagnosticClassOptions.value.find(
        option => option.value === nextIncompleteClass
      );
      if (nextClassOption) {
        currentClass.value = nextClassOption.value;
        handleClassChange({ value: nextClassOption.value, label: nextClassOption.label });
      }
    }
  }
}

const saveCurrentEvaluation = () => {
  try {
    // Determine bestPrototype value
    let bestPrototypeId = null;
    if (bestPrototypes.value.length > 0) {
      bestPrototypeId = currentPrototypes.value[bestPrototypes.value[0]]?.id;
    }
    
    // Create the evaluation object with all relevant data
    const evaluationData = {
      reviewer: currentReviewer.value,
      diagnosticClass: currentClass.value,
      timestamp: new Date().toISOString(),
      bestPrototype: bestPrototypeId,
      badPrototypes: badPrototypes.value.map(index => currentPrototypes.value[index]?.id).filter(Boolean),
      ratings: JSON.parse(JSON.stringify(prototypeRatings.value)),
      comments: JSON.parse(JSON.stringify(prototypeComments.value)),
      alternateClasses: JSON.parse(JSON.stringify(prototypeAlternateClass.value)),
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
    // Ensure we have a valid reviewer
    if (!currentReviewer.value) {
      throw new Error('No valid reviewer found')
    }
    
    // Ensure the data is up-to-date by saving current evaluation if on a valid class
    if (currentClass.value) {
      saveCurrentEvaluation();
      saveToLocalStorage();
    }
    
    // Prepare the complete results object
    const completeResults = {
      reviewer: currentReviewer.value,
      timestamp: new Date().toISOString(),
      classesEvaluated: completedClasses.value,
      totalClasses: diagnosticClasses.value.length,
      completionStatus: isAllClassesCompleted.value ? 'complete' : 'in-progress',
      evaluations: evaluationResults.value
    }
    
    // Format the filename - include completion status
    const reviewer = currentReviewer.value.replace(/\s+/g, '-').toLowerCase()
    const date = new Date().toISOString().split('T')[0]
    const status = isAllClassesCompleted.value ? 'complete' : 'in-progress'
    const filename = `ecg-evaluation-${status}-${reviewer}-${date}.json`
    
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
    
    // Show appropriate notification based on completion status
    if (isAllClassesCompleted.value) {
      // Complete evaluation notification
      successMessage.value = 'Complete evaluation data downloaded successfully!'
      showSuccess.value = true
      
      $q.notify({
        type: 'positive',
        message: 'Complete evaluation data downloaded! Please email this file to the research team.',
        icon: 'check_circle',
        position: 'top',
        timeout: 5000
      })
    } else {
      // In-progress notification
      successMessage.value = 'Current progress downloaded successfully!'
      showSuccess.value = true
      
      $q.notify({
        type: 'info',
        message: `Progress downloaded (${completedClasses.value.length}/${diagnosticClasses.value.length} classes completed). Please complete all classes before submitting.`,
        icon: 'save',
        position: 'top',
        timeout: 5000
      })
    }
    
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

// Function to move to next/previous image in carousel
const moveCarousel = (prototypeId, direction) => {
  const currentIndex = currentImageIndex.value[prototypeId] || 0;
  const prototype = currentPrototypes.value.find(p => p.id === prototypeId);
  
  if (!prototype) return;
  
  const maxIndex = prototype.images.length - 1;
  let newIndex = currentIndex + direction;
  
  // Ensure the index is within valid bounds
  newIndex = Math.max(0, Math.min(newIndex, maxIndex));
  
  currentImageIndex.value[prototypeId] = newIndex;
}

// Marker labels for the slider (1-5)
const markerClass = 'text-weight-bold'

// Function to check if a prototype is completely rated
const isPrototypeComplete = (index) => {
  if (!currentPrototypes.value[index]) return false
  
  const prototype = currentPrototypes.value[index]
  const ratings = prototypeRatings.value[prototype.id]
  
  // Special case: If accuracy is false and alternateClass is n/a, consider it complete
  if (ratings && 
      ratings.accuracy === false && 
      prototypeAlternateClass.value[prototype.id] === 'n/a') {
    return true;
  }
  
  // Check if all criteria have been rated
  return ratings && 
    ratings.representativeness > 0 &&
    ratings.clarity > 0 &&
    // Check if accuracy has been explicitly set (is not null)
    ratings.accuracy !== null;
}

// Add new reactive state for alternate diagnostic class selections
const prototypeAlternateClass = ref({})

// Image Dialog state variables
const showImageDialog = ref(false)
const imageDialogTitle = ref('')
const imageDialogImage = ref('')
const currentDialogImageIndex = ref(0)
const dialogImageCount = ref(0)
const currentDialogPrototype = ref(null)

const openImageDialog = (image, prototype, imageIndex) => {
  imageDialogTitle.value = `Prototype ${prototype.diagnosticClass}: ${diagnosticDescriptions[prototype.diagnosticClass] || ''}`
  imageDialogImage.value = image
  currentDialogImageIndex.value = imageIndex
  dialogImageCount.value = prototype.images.length
  currentDialogPrototype.value = prototype
  showImageDialog.value = true
}

const navigateDialogImage = (direction) => {
  if (!currentDialogPrototype.value) return
  
  const currentIndex = currentDialogImageIndex.value
  const maxIndex = currentDialogPrototype.value.images.length - 1
  const newIndex = Math.max(0, Math.min(currentIndex + direction, maxIndex))
  
  currentDialogImageIndex.value = newIndex
  imageDialogImage.value = currentDialogPrototype.value.images[newIndex]
}

// Add watch for alternate class changes
watch(prototypeAlternateClass, (newVal, oldVal) => {
  // When a prototype's alternate class changes to 'n/a' and accuracy is false, mark as bad prototype
  Object.keys(newVal).forEach(prototypeId => {
    if (newVal[prototypeId] === 'n/a' && 
        prototypeRatings.value[prototypeId] && 
        prototypeRatings.value[prototypeId].accuracy === false) {
      
      // Find the prototype index
      const prototypeIndex = currentPrototypes.value.findIndex(p => p.id === prototypeId);
      
      // Add to bad prototypes if not already there
      if (prototypeIndex !== -1 && !badPrototypes.value.includes(prototypeIndex)) {
        badPrototypes.value.push(prototypeIndex);
      }
      
      // Clear the representativeness and clarity ratings
      if (prototypeRatings.value[prototypeId]) {
        prototypeRatings.value[prototypeId].representativeness = 0;
        prototypeRatings.value[prototypeId].clarity = 0;
      }
    }
  });
}, { deep: true });
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
  border-radius: 0.25rem;
  height: auto;
}

:deep(.q-carousel__slide) {
  padding: 0.375rem;
}

:deep(.q-carousel__navigation-icon) {
  font-size: 0.625rem;
}

:deep(.q-carousel__navigation .q-btn) {
  margin: 0.25rem 0.25rem 0.5rem;
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
  font-size: 0.875rem;
  font-weight: bold;
}

:deep(.q-slider__marker-labels) {
  margin-top: 0.5rem;
}

:deep(.q-slider__marker-labels-container) {
  font-size: 0.875rem;
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
  font-size: 0.6875rem;
  color: #555;
  max-width: 5.625rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ecg-image-wrapper {
  background-color: #f5f5f5;
  border-radius: 0.25rem;
  padding: 0.375rem;
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
  clip-path: inset(5% 0 0 0); /* Using percentage is already responsive */
}

.crop-rhythm {
  clip-path: inset(10% 0 0 0); /* Using percentage is already responsive */
}

.crop-default {
  clip-path: inset(4% 0 0 0); /* Using percentage is already responsive */
}

.carousel-navigation {
  padding: 0.5rem 0;
  background-color: #f5f5f5;
  border-bottom-left-radius: 0.25rem;
  border-bottom-right-radius: 0.25rem;
}

.carousel-page-indicator {
  display: flex;
  align-items: center;
  font-size: 0.875rem;
  color: #333;
  font-weight: 500;
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

:deep(.text-h6.text-grey-8) {
  font-size: 1.25rem;
}

.image-dialog-card {
  width: 80vw;
  max-width: 800px;
  height: 80vh;
  max-height: 800px;
}

.image-dialog-content {
  padding: 0;
}

.image-dialog-img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.full-width {
  width: 100%;
}

.flex {
  display: flex;
}

.flex-center {
  justify-content: center;
}
</style> 