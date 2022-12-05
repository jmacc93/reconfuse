
export const settingChanges = new EventTarget

export const settings = {
  "controller-frame-resize-max-initial-height": {
    section: "Controller Frame",
    longName: "Max initial height for controller frame after toggling resize",
    templateName: "integer"
  },
  
  "custom-substitutions": {
    section: "General",
    longName: "Custom substitutions",
    placeholder: "Put custom substitutions here\nOne substitution per line\nEach line should look like: key: value\nWhere key is transformed into value immediately upon typing",
    templateName: "textarea"
  }
}

export function getSetting(name) {
  let setting = localStorage.getItem(`setting-${name}`)
  return setting ?? undefined // null -> undefined
}

