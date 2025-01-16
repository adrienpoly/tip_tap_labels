import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { Mark } from '@tiptap/core'
import { TextSelection } from '@tiptap/pm/state'

// Create a custom mark for labels
const LabelMark = Mark.create({
    name: 'label',
    inclusive: false,  // This makes the mark non-inclusive
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

// Initialize labels
const labelsContainer = document.querySelector('.labels-container')
words.forEach(word => {
    const label = document.createElement('div')
    label.className = 'label'
    label.draggable = true
    label.textContent = word
    label.addEventListener('dragstart', handleDragStart)
    label.addEventListener('dragend', handleDragEnd)
    labelsContainer.appendChild(label)
})

// Drag and drop handlers
function handleDragStart(e) {
    e.target.classList.add('dragging')
    e.dataTransfer.setData('text/plain', e.target.textContent)
}

function handleDragEnd(e) {
    e.target.classList.remove('dragging')
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
            const text = event.dataTransfer.getData('text/plain')

            if (text && !moved) {
                const coordinates = view.posAtCoords({
                    left: event.clientX,
                    top: event.clientY,
                })

                if (coordinates) {
                    const { tr } = view.state
                    let insertPos = coordinates.pos

                    // Insert a space before if not at the start
                    if (insertPos > 0) {
                        tr.insertText(' ', insertPos)
                        insertPos += 1
                    }

                    // Insert the label text and mark
                    const labelStart = insertPos
                    tr.insertText(text.trim(), labelStart)  // Ensure no extra spaces in the text
                    tr.addMark(
                        labelStart,
                        labelStart + text.trim().length,
                        view.state.schema.marks.label.create({ text: text.trim() })
                    )

                    // Insert space after and position cursor
                    const spacePos = labelStart + text.trim().length
                    tr.insertText(' ', spacePos)

                    // Set cursor after the space
                    const cursorPos = spacePos + 1
                    const selection = TextSelection.create(tr.doc, cursorPos)
                    tr.setSelection(selection)

                    view.dispatch(tr)
                    view.focus()
                    return true
                }
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
