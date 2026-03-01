<template>
  <div class="overlay" @click.stop>
    <div
      v-for="item in blockTypes"
      ref="blockRefs"
      class="block"
      :class="item"
      :key="`block_${id}_${item}`"
      :style="[blockStyles[item], { backgroundColor: overlayColor }]"
    ></div>
  </div>
</template>

<script setup>
import { 
  ref, 
  reactive, 
  onMounted, 
  nextTick, 
  onBeforeUnmount, 
  computed,
  watch
} from 'vue'
import { debounce } from '../../utils'

const props = defineProps({
  id: {
    type: [Number, String],
    default: 1
  },
  elements: {
    type: Array,
    default: () => [],
    validator: (value) => {
      return Array.isArray(value) && value.every(item => 
        typeof item === 'string' || (item && typeof item === 'object')
      )
    }
  },
  color: {
    type: String,
    default: 'rgba(0, 0, 0, 0.6)'
  },
  animationDuration: {
    type: Number,
    default: 500
  },
  zIndex: {
    type: Number,
    default: 9998
  }
})

const emit = defineEmits(['step-change', 'close'])

const step = ref(0)
const blockTypes = ['top', 'right', 'bottom', 'left']
const blockStyles = reactive({})
const blockRefs = ref([])
const currentAnimations = reactive({})

// 计算属性
const overlayColor = computed(() => props.color)
const currentElement = computed(() => {
  if (props.elements.length === 0) return null
  return props.elements[step.value]
})
const totalSteps = computed(() => props.elements.length)
const isFirstStep = computed(() => step.value === 0)
const isLastStep = computed(() => step.value === props.elements.length - 1)

// 暴露给外部的方法
const next = () => {
  if (step.value < props.elements.length - 1) {
    step.value++
    emit('step-change', step.value)
    updateRect()
    return true
  }
  return false
}

const prev = () => {
  if (step.value > 0) {
    step.value--
    emit('step-change', step.value)
    updateRect()
    return true
  }
  return false
}

const goToStep = (index) => {
  if (index >= 0 && index < props.elements.length) {
    step.value = index
    emit('step-change', step.value)
    updateRect()
    return true
  }
  return false
}

// 暴露方法给父组件
defineExpose({
  next,
  prev,
  goToStep,
  currentStep: step,
  totalSteps,
  isFirstStep,
  isLastStep
})

/**
 * 创建动画效果
 */
const createAnimation = (type, targetStyle) => {
  // 停止当前动画
  if (currentAnimations[type]) {
    currentAnimations[type].cancel()
  }

  const blockIndex = blockTypes.indexOf(type)
  const blockEl = blockRefs.value[blockIndex]
  
  if (!blockEl) return null

  const animation = blockEl.animate([
    {
      ...blockStyles[type],
      easing: 'ease-out'
    },
    {
      ...targetStyle,
      easing: 'ease-out'
    }
  ], {
    duration: props.animationDuration,
    easing: 'ease-out',
    fill: 'forwards'
  })

  currentAnimations[type] = animation
  
  return animation
}

/**
 * 计算遮罩块的样式
 */
const calculateBlockStyle = (type, rect, windowSize) => {
  const { width, height, top, left } = rect
  const { innerWidth, innerHeight } = windowSize

  switch(type) {
    case 'top':
      return {
        top: '0',
        left: '0',
        width: `${innerWidth}px`,
        height: `${top}px`
      }
    case 'right':
      const rightLeft = left + width
      return {
        top: `${top}px`,
        left: `${rightLeft}px`,
        width: `${innerWidth - rightLeft}px`,
        height: `${height}px`
      }
    case 'bottom':
      const bottomTop = top + height
      return {
        top: `${bottomTop}px`,
        left: '0',
        width: `${innerWidth}px`,
        height: `${innerHeight - bottomTop}px`
      }
    case 'left':
      return {
        top: `${top}px`,
        left: '0',
        width: `${left}px`,
        height: `${height}px`
      }
    default:
      return {}
  }
}

/**
 * 更新遮罩位置
 */
const updateRect = debounce(async () => {
  await nextTick()

  if (!currentElement.value) {
    // 如果没有元素，隐藏所有遮罩块
    blockTypes.forEach(type => {
      blockStyles[type] = { display: 'none' }
    })
    return
  }

  let target
  if (typeof currentElement.value === 'string') {
    target = document.getElementById(currentElement.value)
  } else if (currentElement.value && currentElement.value.$el) {
    target = currentElement.value.$el
  } else if (currentElement.value instanceof Element) {
    target = currentElement.value
  }

  if (!target) {
    console.warn(`Guide: Target element not found for step ${step.value}`)
    return
  }

  const rect = target.getBoundingClientRect()
  const windowSize = {
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight
  }

  blockTypes.forEach(type => {
    const style = calculateBlockStyle(type, rect, windowSize)
    
    // 创建动画
    createAnimation(type, style)
    
    // 更新样式
    blockStyles[type] = style
  })
}, 10)

/**
 * 监听步骤变化
 */
watch(step, () => {
  updateRect()
})

/**
 * 监听窗口大小变化
 */
const handleResize = debounce(() => {
  updateRect()
}, 100)

onMounted(() => {
  updateRect()
  window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  
  // 清理所有动画
  Object.values(currentAnimations).forEach(animation => {
    if (animation) animation.cancel()
  })
})
</script>

<style lang="less" scoped>
.overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: v-bind(zIndex);
  pointer-events: none;

  .block {
    position: absolute;
    display: block;
    border: none;
    box-sizing: border-box;
    pointer-events: auto;
    transition: background-color 0.3s ease;
  }
}
</style>