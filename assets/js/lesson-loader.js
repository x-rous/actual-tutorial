import { translate } from './i18n.js';

const LESSON_COUNT = 9;

export function getLessonCount() {
  return LESSON_COUNT;
}

export async function loadLesson(index) {
  const container = document.getElementById('lesson-container');
  if (!container) return null;

  const lessonNumber = String(index + 1).padStart(2, '0');
  const lessonPath = `./assets/lessons/lesson-${lessonNumber}.html`;

  try {
    const response = await fetch(lessonPath);
    if (!response.ok) {
      throw new Error(`Failed to load ${lessonPath} (${response.status})`);
    }

    const lessonHtml = await response.text();
    container.innerHTML = `<div class="page visible" id="p${index}">${lessonHtml}</div>`;
    return container.firstElementChild;
  } catch (error) {
    console.error(error);
    container.innerHTML = `
      <div class="page visible">
        <div class="concept">
          <span class="concept-tag amber">Error</span>
          <h2>${escapeHtml(translate('errors.lessonLoadTitle') || 'Lesson could not be loaded')}</h2>
          <p>${escapeHtml(translate('errors.lessonLoadMessage') || 'Refresh the page or check that the lesson file exists in assets/lessons/.')}</p>
        </div>
      </div>`;
    return container.firstElementChild;
  }
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }[character]));
}
