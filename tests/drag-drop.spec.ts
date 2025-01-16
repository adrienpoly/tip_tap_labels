import { test, expect } from '@playwright/test';

test.describe('Label Drag and Drop Editor', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display initial labels', async ({ page }) => {
    const labels = await page.locator('.labels-container .label').all();
    expect(labels).toHaveLength(10);
  });

  test('should drag label from palette to editor', async ({ page }) => {
    // Get the first label from the palette
    const label = await page.locator('.labels-container .label').first();
    const labelText = await label.textContent();
    const editor = await page.locator('.editor-container .ProseMirror');

    // Perform drag and drop
    await label.dragTo(editor);

    // Verify label appears in editor
    const editorLabel = await page.locator('.editor-label').first();
    expect(await editorLabel.textContent()).toBe(labelText);
  });

  test('should move label within editor', async ({ page }) => {
    // First add a label to the editor
    const label = await page.locator('.labels-container .label').first();
    const editor = await page.locator('.editor-container .ProseMirror');
    await label.dragTo(editor);

    // Add another label
    const secondLabel = await page.locator('.labels-container .label').nth(1);
    await secondLabel.dragTo(editor);

    // Get the first editor label
    const editorLabel = await page.locator('.editor-label').first();
    const labelText = await editorLabel.textContent();

    // Move it after the second label
    const secondEditorLabel = await page.locator('.editor-label').nth(1);
    await editorLabel.dragTo(secondEditorLabel);

    // Verify the order has changed
    const labels = await page.locator('.editor-label').all();
    expect(await labels[1].textContent()).toBe(labelText);
  });

  test('should delete label when dragged to trash', async ({ page }) => {
    // First add a label to the editor
    const label = await page.locator('.labels-container .label').first();
    const editor = await page.locator('.editor-container .ProseMirror');
    await label.dragTo(editor);

    // Get the editor label and drag it to trash
    const editorLabel = await page.locator('.editor-label').first();
    const trash = await page.locator('.trash-zone');
    await editorLabel.dragTo(trash);

    // Verify label is removed
    const remainingLabels = await page.locator('.editor-label').all();
    expect(remainingLabels).toHaveLength(0);
  });

  // test('should show visual feedback when dragging over trash', async ({ page }) => {
  //   // First add a label to the editor
  //   const label = await page.locator('.labels-container .label').first();
  //   const editor = await page.locator('.editor-container .ProseMirror');
  //   const labelText = await label.textContent();
  //   await label.dragTo(editor);

  //   // ensure teh editor has the text of the label
  //   const editorText = await editor.textContent();
  //   expect(editorText).toBe(labelText);

  //   // Get the editor label and trash zone
  //   const editorLabel = await page.locator('.editor-label').first();
  //   const trash = await page.locator('.trash-zone');

  //   // Get element positions
  //   const labelBox = await editorLabel.boundingBox();
  //   const trashBox = await trash.boundingBox();
  //   if (!labelBox || !trashBox) throw new Error('Could not get element positions');

  //   // Start drag from center of the label
  //   await page.mouse.move(
  //     labelBox.x + labelBox.width / 2,
  //     labelBox.y + labelBox.height / 2
  //   );
  //   await page.mouse.down();

  //   // Move to center of trash zone
  //   await page.mouse.move(
  //     trashBox.x + trashBox.width / 2,
  //     trashBox.y + trashBox.height / 2,
  //     { steps: 10 } // Move in small steps to trigger hover
  //   );

  //   // Wait for the class to be added
  //   // await expect(trash).toHaveClass(/trash-hover/, { timeout: 1000 });

  //   // Move back to editor
  //   const editorBox = await editor.boundingBox();
  //   if (!editorBox) throw new Error('Could not get editor position');

  //   await page.mouse.move(
  //     editorBox.x + editorBox.width / 2,
  //     editorBox.y + editorBox.height / 2,
  //     { steps: 10 }
  //   );

  //   // Verify hover state is removed
  //   await expect(trash).not.toHaveClass(/trash-hover/, { timeout: 1000 });

  //   // Release mouse
  //   await page.mouse.up();

  //   // Verify the editor is empty
  //   expect(await editor.textContent()).toBe('');
  // });

  test('should maintain proper structure between labels', async ({ page }) => {
    // Add two labels to the editor
    const firstLabel = await page.locator('.labels-container .label').first();
    const secondLabel = await page.locator('.labels-container .label').nth(1);
    const editor = await page.locator('.editor-container .ProseMirror');

    await firstLabel.dragTo(editor);
    await secondLabel.dragTo(editor);

    // Get the editor content
    const content = await editor.innerHTML();

    // Verify the structure matches Tiptap's format
    expect(content).toMatch(/<span class="editor-label".*?<\/span><img class="ProseMirror-separator"/);

    // Verify labels are in separate paragraphs
    const labels = await page.locator('.editor-label').all();
    expect(labels).toHaveLength(2);

    // Get the parent paragraphs
    const firstParent = await labels[0].evaluate(node => node.parentElement?.tagName);
    const secondParent = await labels[1].evaluate(node => node.parentElement?.tagName);

    expect(firstParent).toBe('P');
    expect(secondParent).toBe('P');
  });
});
