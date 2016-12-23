/* global $clamp */
import clamp from 'clamp-js';

function rollup() {
  $(this).find('.excerpt')
         .animate({ top: 0 }, { queue: false, duration: 500 });
}

function rolldown() {
  $(this).find('.excerpt')
         .animate({ top: '175px' }, { queue: false, duration: 500 });
}

function clampExcerpt() {
  clamp(this, {
    clamp: '8',
    truncationChar: '.',
    truncationHTML: '<span class="heart">❤</span>..',
    useNativeClamp: false,
  });
}

export default () => {
  $('.post-card').hover(rollup, rolldown);
  $('.excerpt>p').each(clampExcerpt);
};
