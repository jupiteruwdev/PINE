import _ from 'lodash'

export default function isEmptyDeep(value: any): boolean {
  if (_.isEmpty(value)) return true

  if (_.isPlainObject(value)) {
    let hasValue = false

    for (const key in value) {
      if (!value.hasOwnProperty(key)) continue
      hasValue = hasValue || !isEmptyDeep(value[key])
    }

    return !hasValue
  }
  else if (_.isArray(value)) {
    const l = value.length
    let hasValue = false

    for (let i = 0; i < l; i++) {
      hasValue = hasValue || !isEmptyDeep(value[i])
    }

    return !hasValue
  }

  return false
}
