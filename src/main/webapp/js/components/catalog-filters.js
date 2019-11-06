import { html } from 'https://unpkg.com/lit-html@^1.0.0/lit-html.js';
import { component, useContext } from 'https://unpkg.com/haunted@^4.0.0/haunted.js';
import { AllLessonContext, LessonFilteringContext } from "/js/data.js";
import debounce from "/js/helpers/debounce.js";

function getOptionSetsFromLessons(lessons) {
  const categories = new Set();
  const tags = new Set();
  lessons.forEach((l) => {
    categories.add(l.Category);
    (l.Tags || []).forEach((t) => tags.add(t));
  });
  return [Array.from(categories), Array.from(tags)];
}

function CatalogFilters() {
  const allLessonRequest = useContext(AllLessonContext);
  const [filterState, setFilterState] = useContext(LessonFilteringContext);
  const [categories, tags] = allLessonRequest.succeeded
    ? getOptionSetsFromLessons(allLessonRequest.data.lessons)
    : [[], []];

  function setFilter(filterName) {
    return debounce(function() {
      const value = filterName === 'Tags'
        ? filterState.Tags = this.value.split(',').map((t) => t.trim()).filter((s) => s.length > 0)
        : this.value || null;

      filterState[filterName] = value;
      setFilterState(filterState);
    }, 500);
  }

  return html`
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/nlundquist/nre-styles@latest/dist/styles.css" />
    <style>
      :host {
        display: flex;
      }     
      :host > label {
        flex-grow: 1;
      }
      :host > label:not(:first-of-type) {
        margin-left: 30px;
      }
    </style>
    <label>
      <span>Category</span>
      <div>
        <antidote-select
          placeholder="Label"
          .options=${categories} 
          .change=${setFilter('Category')} />
      </div>      
    </label>
  
    <label>
      <span>Tags</span>
      <div>
        <antidote-select
            placeholder="Label, Label"
            multi="true"
            .options=${tags} 
            .change=${setFilter('Tags')} />
      </div>
    </label>
  `;
}

customElements.define('antidote-catalog-filters', component(CatalogFilters));

export default CatalogFilters;