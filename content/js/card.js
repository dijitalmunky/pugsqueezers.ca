function rollup(e) {
  $(this).find('.excerpt')
         .hoverFlow(e.type, { top: '0px' }, 'slow');
}

function rolldown(e) {
  $(this).find('.excerpt')
         .hoverFlow(e.type, { top: '175px' }, 'slow');
}

function clampExcerpt() {
  $clamp(this, {
    clamp: '8',
    truncationChar: '.',
    truncationHTML: '<span class="heart">❤</span>..',
    useNativeClamp: false,
  });
}

$('.post-card').hover(rollup, rolldown);
$('.excerpt>p').each(clampExcerpt);
