import { createVNode, render } from "vue"
import GuideComponent from './Guide.vue'

let seed = 0
const createdInstances = new Map()

/**
 * 创建引导组件实例
 * @param {Object} options - 配置选项
 * @param {Array} options.elements - 引导元素数组
 * @param {String} options.color - 遮罩颜色
 * @param {Function} options.onClose - 关闭回调
 * @returns {Object} 引导实例
 */
const Guide = (options) => {
  // 生成唯一ID
  const id = `guide_${++seed}`
  
  // 检查是否已存在相同ID的实例
  if (createdInstances.has(id)) {
    console.warn(`Guide instance with id ${id} already exists`)
    return createdInstances.get(id)
  }

  // 创建容器
  const container = document.createElement('div')
  container.className = 'guide-container'
  document.body.appendChild(container)

  // 关闭方法
  const onClose = () => {
    render(null, container)
    document.body.removeChild(container)
    createdInstances.delete(id)
  }

  const vnode = createVNode(GuideComponent, {
    ...options,
    id,
    onClose
  })

  render(vnode, container)

  // 获取组件实例
  const componentInstance = vnode.component

  const instance = { 
    id, 
    vnode, 
    close: onClose,
    next: () => componentInstance?.exposed?.next?.() ?? false,
    prev: () => componentInstance?.exposed?.prev?.() ?? false,
    goToStep: (index) => componentInstance?.exposed?.goToStep?.(index) ?? false
  }

  createdInstances.set(id, instance)

  return instance
}

/**
 * 关闭所有引导实例
 */
Guide.closeAll = () => {
  createdInstances.forEach(instance => {
    instance.close()
  })
  createdInstances.clear()
}

/**
 * 获取指定ID的引导实例
 * @param {String} id - 实例ID
 * @returns {Object|null} 引导实例
 */
Guide.getInstance = (id) => {
  return createdInstances.get(id) || null
}

export default Guide