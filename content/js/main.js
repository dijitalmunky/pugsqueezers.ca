import './jquery-global';
import 'bootstrap-sass'; //eslint-disable-line
import initCards from './card';
import initGalleries from './gallery';

$(document).ready(() => {
  initCards();
  initGalleries();
});
