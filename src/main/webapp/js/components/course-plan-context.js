import { html } from 'https://unpkg.com/lit-html@^1.0.0/lit-html.js';
import { lessonId, syringeServiceRoot } from "../helpers/page-state.js";
import { component, useState } from 'https://unpkg.com/haunted@^4.0.0/haunted.js';
import useFetch from '../helpers/use-fetch.js';

customElements.define('antidote-course-plan-context', component(() => {
  const allLessonRequest = useFetch(`${syringeServiceRoot}/exp/lesson`);
  const lessonPrereqRequest = useFetch(`${syringeServiceRoot}/exp/lesson/${lessonId}/prereqs`);
  const [name, setName] = useState(null);
  const [strengths, setStrengths] = useState(null);

  return html`
    <style>
      :host, 
      antidote-all-lesson-context-provider,
      antidote-lesson-prereq-context-provider,
      antidote-course-plan-name-context-provider,
      antidote-lesson-plan-strengths-context-provider {
        display: block;
        height: 100%;
        width: 100%;
      }
    </style>
    <antidote-all-lesson-context-provider .value=${allLessonRequest}>    
    <antidote-lesson-prereq-context-provider .value=${lessonPrereqRequest}>
    <antidote-course-plan-name-context-provider .value=${[name, setName]}>    
    <antidote-course-plan-strengths-context-provider .value=${[strengths, setStrengths]}>
      <slot></slot>
    </antidote-course-plan-strengths-context-provider>
    </antidote-course-plan-name-context-provider>
    </antidote-lesson-prereq-context-provider>
    </antidote-all-lesson-context-provider>
  `
}));