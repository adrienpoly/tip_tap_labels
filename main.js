import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { Mark } from '@tiptap/core'
import { TextSelection } from '@tiptap/pm/state'

// Create a custom mark for labels
const LabelMark = Mark.create({
    name: 'label',
    inclusive: false,
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
    renderHTML({ HTMLAttributes }) {
        return ['span', { class: 'editor-label', ...HTMLAttributes }, 0]
    }
})

// Random words for labels
const words = [
    'Happy', 'Sunny', 'Creative', 'Energetic', 'Peaceful',
    'Vibrant', 'Gentle', 'Dynamic', 'Serene', 'Playful'
]

let draggedLabel = null
let touchTimeout = null

// Initialize labels
const labelsContainer = document.querySelector('.labels-container')
words.forEach(word => {
    const label = document.createElement('div')
    label.className = 'label'
    label.draggable = true
    label.textContent = word

    // Mouse events
    label.addEventListener('dragstart', handleDragStart)
    label.addEventListener('dragend', handleDragEnd)

    // Touch events
    label.addEventListener('touchstart', handleTouchStart)
    label.addEventListener('touchmove', handleTouchMove)
    label.addEventListener('touchend', handleTouchEnd)

    labelsContainer.appendChild(label)
})

// Mouse event handlers
function handleDragStart(e) {
    draggedLabel = e.target
    e.target.classList.add('dragging')
    e.dataTransfer.setData('text/plain', e.target.textContent)
}

function handleDragEnd(e) {
    draggedLabel = null
    e.target.classList.remove('dragging')
}

// Touch event handlers
function handleTouchStart(e) {
    const touch = e.touches[0]
    draggedLabel = e.target
    e.target.classList.add('dragging')

    // Create a clone for visual feedback
    const clone = e.target.cloneNode(true)
    clone.id = 'dragging-clone'
    clone.style.position = 'fixed'
    clone.style.left = touch.clientX - 50 + 'px'
    clone.style.top = touch.clientY - 25 + 'px'
    clone.style.opacity = '0.8'
    clone.style.pointerEvents = 'none'
    document.body.appendChild(clone)
}

function handleTouchMove(e) {
    e.preventDefault() // Prevent scrolling while dragging
    if (draggedLabel) {
        const touch = e.touches[0]
        const clone = document.getElementById('dragging-clone')
        if (clone) {
            clone.style.left = touch.clientX - 50 + 'px'
            clone.style.top = touch.clientY - 25 + 'px'
        }
    }
}

function handleTouchEnd(e) {
    if (!draggedLabel) return

    const clone = document.getElementById('dragging-clone')
    if (clone) {
        clone.remove()
    }

    const touch = e.changedTouches[0]
    const editor = document.querySelector('.editor-container')
    const editorRect = editor.getBoundingClientRect()

    // Check if touch ended over editor
    if (touch.clientX >= editorRect.left &&
        touch.clientX <= editorRect.right &&
        touch.clientY >= editorRect.top &&
        touch.clientY <= editorRect.bottom) {

        insertLabelAtPosition(draggedLabel.textContent, touch.clientX, touch.clientY)
    }

    draggedLabel.classList.remove('dragging')
    draggedLabel = null
}

// Helper function to insert label
function insertLabelAtPosition(text, x, y) {
    const coordinates = editor.view.posAtCoords({
        left: x,
        top: y,
    })

    if (coordinates) {
        const { tr } = editor.view.state
        let insertPos = coordinates.pos

        // Insert a space before if not at the start
        if (insertPos > 0) {
            tr.insertText(' ', insertPos)
            insertPos += 1
        }

        // Insert the label text and mark
        const labelStart = insertPos
        tr.insertText(text.trim(), labelStart)
        tr.addMark(
            labelStart,
            labelStart + text.trim().length,
            editor.view.state.schema.marks.label.create({ text: text.trim() })
        )

        // Add space after and position cursor
        const spacePos = labelStart + text.trim().length
        tr.insertText(' ', spacePos)

        // Set cursor after the space
        const cursorPos = spacePos + 1
        const selection = TextSelection.create(tr.doc, cursorPos)
        tr.setSelection(selection)

        editor.view.dispatch(tr)
        editor.view.focus()
    }
}

// Initialize Tiptap editor
const editor = new Editor({
    element: document.querySelector('#editor'),
    extensions: [
        StarterKit,
        LabelMark
    ],
    content: '<p></p>',
    editorProps: {
        handleDrop: (view, event, slice, moved) => {
            event.preventDefault()
            if (!moved && draggedLabel) {
                insertLabelAtPosition(draggedLabel.textContent, event.clientX, event.clientY)
                return true
            }
            return false
        }
    }
})

// Make the editor container a drop target
const editorContainer = document.querySelector('.editor-container')
editorContainer.addEventListener('dragover', (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
})

// Handle label editing
editor.on('click', ({ editor, event }) => {
    const labelElement = event.target.closest('.editor-label')
    if (labelElement) {
        event.preventDefault()
        const text = window.prompt('Edit label:', labelElement.textContent.trim())
        if (text !== null) {
            const pos = editor.view.posAtDOM(labelElement, 0)
            const endPos = pos + labelElement.textContent.length
            editor.chain()
                .focus()
                .insertContentAt({ from: pos, to: endPos }, text.trim())
                .setTextSelection(endPos + 1)
                .run()
        }
    }
})
