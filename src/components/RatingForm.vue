<template>
  <div class="rating-form q-pa-md">
    <q-card>
      <q-card-section class="bg-primary text-white">
        <div class="text-h6">Evaluation Criteria</div>
      </q-card-section>

      <q-card-section>
        <div v-for="(criterion, key) in criteria" :key="key" class="q-mb-xl">
          <div class="text-subtitle1 text-weight-bold q-mb-sm">{{ criterion.label }}</div>
          <div class="text-body2 q-mb-md">{{ criterion.description }}</div>
          
          <div class="row items-center">
            <div class="col-12">
              <q-rating
                v-model="ratings[key]"
                :max="5"
                size="2.5em"
                color="primary"
                icon="star_border"
                icon-selected="star"
                @update:model-value="updateRating(key)"
              />
            </div>
          </div>

          <div class="row justify-between text-caption q-mt-xs q-px-sm">
            <span class="text-negative">Poor (1)</span>
            <span class="text-positive">Excellent (5)</span>
          </div>
          
          <q-linear-progress
            v-if="ratings[key] > 0"
            :value="ratings[key] / 5"
            :color="getRatingColor(ratings[key])"
            size="5px"
            class="q-mt-sm"
          />
        </div>
      </q-card-section>
    </q-card>
  </div>
</template>

<script>
import { ref, reactive } from 'vue'

export default {
  name: 'RatingForm',

  emits: ['update:ratings'],

  setup(props, { emit }) {
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

    const ratings = reactive({
      representativeness: 0,
      clarity: 0,
      usefulness: 0,
      distinctiveness: 0
    })

    const updateRating = (criterion) => {
      emit('update:ratings', { ...ratings })
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

    return {
      criteria,
      ratings,
      updateRating,
      getRatingColor
    }
  }
}
</script>

<style scoped>
.rating-form {
  max-width: 800px;
  margin: 0 auto;
}
</style> 