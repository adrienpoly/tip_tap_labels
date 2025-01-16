import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { Node } from '@tiptap/core'

// Create a custom node for labels
const LabelNode = Node.create({
    name: 'label',
    group: 'inline',
    inline: true,
    selectable: false,
    draggable: true,
    atom: true,

    addAttributes() {
        return {
            text: {
                default: ''
            }
        }
    },

    parseHTML() {
        return [
            {
                tag: 'span.editor-label'
            }
        ]
    },

    renderHTML({ node }) {
        return ['span', {
            class: 'editor-label',
            draggable: 'true',
        }, node.attrs.text]
    }
})

// Random words for labels
const words = [
    'Happy', 'Sunny', 'Creative', 'Energetic', 'Peaceful',
    'Vibrant', 'Gentle', 'Dynamic', 'Serene', 'Playful'
]

let draggedLabel = null
let draggedEditorLabel = null
let touchStartX = 0
let touchStartY = 0
let touchedLabel = null
let touchClone = null

// Initialize labels
const labelsContainer = document.querySelector('.labels-container')
words.forEach(word => {
    const label = document.createElement('div')
    label.className = 'label'
    label.draggable = true
    label.textContent = word
    label.addEventListener('dragstart', handleDragStart)
    label.addEventListener('dragend', handleDragEnd)
    label.addEventListener('touchstart', handleTouchStart)
    label.addEventListener('touchmove', handleTouchMove)
    label.addEventListener('touchend', handleTouchEnd)
    labelsContainer.appendChild(label)
})

// Create trash zone
const trashZone = document.createElement('div')
trashZone.className = 'trash-zone'
trashZone.innerHTML = '<i class="trash-icon">🗑️</i>'
document.querySelector('.editor-container').appendChild(trashZone)

// Make trash zone a drop target
trashZone.addEventListener('dragover', (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    trashZone.classList.add('trash-hover')
})

trashZone.addEventListener('dragleave', () => {
    trashZone.classList.remove('trash-hover')
})

trashZone.addEventListener('drop', (e) => {
    e.preventDefault()
    trashZone.classList.remove('trash-hover')

    if (draggedEditorLabel) {
        const pos = editor.view.posAtDOM(draggedEditorLabel, 0)
        const node = editor.view.state.doc.nodeAt(pos)
        if (node) {
            const tr = editor.view.state.tr
            tr.delete(pos, pos + node.nodeSize)
            editor.view.dispatch(tr)
        }
    }
    draggedEditorLabel = null
})

function handleDragStart(e) {
    draggedLabel = e.target
    e.target.classList.add('dragging')
}

function handleDragEnd(e) {
    e.target.classList.remove('dragging')
    setTimeout(() => {
        console.log("end");
        draggedLabel = null
        draggedEditorLabel = null
    }, 50)
}

function handleTouchStart(e) {
    const touch = e.touches[0]
    touchStartX = touch.clientX
    touchStartY = touch.clientY
    touchedLabel = e.target

    // Create clone for visual feedback
    touchClone = e.target.cloneNode(true)
    touchClone.id = 'dragging-clone'
    touchClone.style.position = 'fixed'
    touchClone.style.left = touchStartX - e.target.offsetWidth / 2 + 'px'
    touchClone.style.top = touchStartY - e.target.offsetHeight / 2 + 'px'
    touchClone.style.pointerEvents = 'none'
    document.body.appendChild(touchClone)

    e.target.classList.add('dragging')
    e.preventDefault() // Prevent scrolling while dragging
}

function handleTouchMove(e) {
    if (!touchedLabel) return

    const touch = e.touches[0]
    const deltaX = touch.clientX - touchStartX
    const deltaY = touch.clientY - touchStartY

    if (touchClone) {
        touchClone.style.left = touch.clientX - touchedLabel.offsetWidth / 2 + 'px'
        touchClone.style.top = touch.clientY - touchedLabel.offsetHeight / 2 + 'px'
    }

    // Check if over trash zone
    const trashRect = trashZone.getBoundingClientRect()
    if (touch.clientX >= trashRect.left &&
        touch.clientX <= trashRect.right &&
        touch.clientY >= trashRect.top &&
        touch.clientY <= trashRect.bottom) {
        trashZone.classList.add('trash-hover')
    } else {
        trashZone.classList.remove('trash-hover')
    }

    e.preventDefault() // Prevent scrolling while dragging
}

function handleTouchEnd(e) {
    if (!touchedLabel) return

    const touch = e.changedTouches[0]
    const trashRect = trashZone.getBoundingClientRect()

    // Clean up clone
    if (touchClone) {
        touchClone.remove()
        touchClone = null
    }

    // Check if dropped on trash
    if (touch.clientX >= trashRect.left &&
        touch.clientX <= trashRect.right &&
        touch.clientY >= trashRect.top &&
        touch.clientY <= trashRect.bottom) {
        if (draggedEditorLabel) {
            const pos = editor.view.posAtDOM(draggedEditorLabel, 0)
            const node = editor.view.state.doc.nodeAt(pos)
            if (node) {
                const tr = editor.view.state.tr
                tr.delete(pos, pos + node.nodeSize)
                editor.view.dispatch(tr)
            }
        }
    } else {
        // Handle drop in editor
        const editorRect = editor.view.dom.getBoundingClientRect()
        if (touch.clientX >= editorRect.left &&
            touch.clientX <= editorRect.right &&
            touch.clientY >= editorRect.top &&
            touch.clientY <= editorRect.bottom) {

            const coordinates = editor.view.posAtCoords({
                left: touch.clientX,
                top: touch.clientY,
            })

            if (coordinates) {
                if (draggedEditorLabel) {
                    // Moving existing label
                    const oldPos = editor.view.posAtDOM(draggedEditorLabel, 0)
                    const node = editor.view.state.doc.nodeAt(oldPos)
                    if (node) {
                        const tr = editor.view.state.tr
                        tr.delete(oldPos, oldPos + node.nodeSize)
                        tr.insert(coordinates.pos, node.type.create({ text: node.attrs.text }))
                        editor.view.dispatch(tr)
                    }
                } else if (touchedLabel) {
                    // Adding new label from palette
                    editor.commands.insertContentAt(coordinates.pos, {
                        type: 'label',
                        attrs: { text: touchedLabel.textContent }
                    })
                }
            }
        }
    }

    // Clean up
    touchedLabel.classList.remove('dragging')
    touchedLabel = null
    draggedEditorLabel = null
    trashZone.classList.remove('trash-hover')
}

// Initialize Tiptap editor
const editor = new Editor({
    element: document.querySelector('#editor'),
    extensions: [
        StarterKit.configure({
            history: true,
        }),
        LabelNode.configure({
            HTMLAttributes: {
                class: 'editor-label',
                draggable: 'true',
            }
        }),
    ],
    content: '<p></p>',
    editorProps: {
        handleDrop: (view, event, slice, moved) => {
            event.preventDefault()
            const trashRect = trashZone.getBoundingClientRect()

            console.log(trashRect, event.clientX, event.clientY);
            // Check if dropped on trash
            if (event.clientX >= trashRect.left &&
                event.clientX <= trashRect.right &&
                event.clientY >= trashRect.top &&
                event.clientY <= trashRect.bottom) {
                try {
                    if (draggedEditorLabel) {
                        const tr = view.state.tr
                        const pos = view.posAtDOM(draggedEditorLabel, 0)
                        const node = view.state.doc.nodeAt(pos)

                        if (node) {
                            tr.delete(pos, pos + node.nodeSize)
                            view.dispatch(tr)
                        }
                        draggedEditorLabel = null
                    }
                    return true
                } catch (error) {
                    console.error('Error during trash:', error)
                    return false
                }
            }

            const coordinates = view.posAtCoords({
                left: event.clientX,
                top: event.clientY,
            })

            if (!coordinates) return false

            if (draggedEditorLabel) {
                try {
                    // Moving existing label
                    const oldPos = view.posAtDOM(draggedEditorLabel, 0)

                    // Validate position
                    if (oldPos < 0 || oldPos >= view.state.doc.content.size) {
                        return false
                    }

                    const node = view.state.doc.nodeAt(oldPos)
                    if (!node) {
                        return false
                    }

                    const tr = view.state.tr

                    // Get the $pos to check the context
                    const $pos = tr.doc.resolve(coordinates.pos)
                    let targetPos = coordinates.pos

                    // Validate target position
                    if (targetPos < 0) {
                        targetPos = 0
                    } else if (targetPos > tr.doc.content.size) {
                        targetPos = tr.doc.content.size
                    }

                    // If we're at the end of a block, move back one position
                    if ($pos.nodeAfter === null && $pos.node().type.name === 'paragraph') {
                        targetPos = Math.max(0, targetPos - 1)
                    }

                    // Delete old label only if position is valid
                    if (oldPos + node.nodeSize <= view.state.doc.content.size) {
                        tr.delete(oldPos, oldPos + node.nodeSize)
                    }

                    // Insert at new position
                    tr.insert(targetPos, node.type.create({ text: node.attrs.text }))

                    view.dispatch(tr)
                } catch (error) {
                    console.error('Error during label move:', error)
                    return false
                }
            } else if (draggedLabel) {
                try {
                    // Adding new label from palette
                    const $pos = view.state.doc.resolve(coordinates.pos)
                    let targetPos = coordinates.pos

                    // Validate target position
                    if (targetPos < 0) {
                        targetPos = 0
                    } else if (targetPos > view.state.doc.content.size) {
                        targetPos = view.state.doc.content.size
                    }

                    // If we're at the end of a block, move back one position
                    if ($pos.nodeAfter === null && $pos.node().type.name === 'paragraph') {
                        targetPos = Math.max(0, targetPos - 1)
                    }

                    editor.commands.insertContentAt(targetPos, {
                        type: 'label',
                        attrs: { text: draggedLabel.textContent }
                    })
                } catch (error) {
                    console.error('Error during label insert:', error)
                    return false
                }
            }

            return true
        }
    }
})

// Make the editor container a drop target
const editorContainer = document.querySelector('.editor-container')
editorContainer.addEventListener('dragover', (e) => {
    e.preventDefault()
})

// Add event delegation for editor labels
editorContainer.addEventListener('dragstart', (e) => {
    const labelElement = e.target.closest('.editor-label')
    if (labelElement) {
        console.log('Editor label drag start:', labelElement)
        draggedEditorLabel = labelElement
        labelElement.classList.add('dragging')
    }
})

editorContainer.addEventListener('dragend', (e) => {
    const labelElement = e.target.closest('.editor-label')
    if (labelElement) {
        labelElement.classList.remove('dragging')
        // Use a timeout to ensure the drop handler runs first
        setTimeout(() => {
            draggedEditorLabel = null
        }, 50)
    }
})

// Add touch events to editor labels
editorContainer.addEventListener('touchstart', (e) => {
    const labelElement = e.target.closest('.editor-label')
    if (labelElement) {
        draggedEditorLabel = labelElement
        handleTouchStart.call(labelElement, e)
    }
})

editorContainer.addEventListener('touchmove', (e) => {
    if (draggedEditorLabel) {
        handleTouchMove.call(draggedEditorLabel, e)
    }
})

editorContainer.addEventListener('touchend', (e) => {
    if (draggedEditorLabel) {
        handleTouchEnd.call(draggedEditorLabel, e)
    }
})
