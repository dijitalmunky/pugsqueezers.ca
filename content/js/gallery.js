import 'jquery-colorbox';

export default () => {
  $('.gallery').colorbox({
    rel: 'gallery',
    maxHeight: '90%',
    maxWidth: '90%',
  });
};
