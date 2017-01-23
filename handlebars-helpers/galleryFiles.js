const path = require('path');
const fs = require('fs');
const Handlebars = require('handlebars'); // eslint-disable-line import/no-extraneous-dependencies

const picFiles = new RegExp('\\.(jpg|jpeg|gif|bmp|png|svg)$', 'i');

module.exports = (gallery, options) => {
  let data = null;
  let dir = path.join('content', 'images', 'galleries');

  if (!gallery) {
    throw new Error('"gallery" must be specified.');
  }

  if (options.data) {
    data = Handlebars.createFrame(options.data);
  }

  dir = path.join(dir, gallery);

  const files = fs.readdirSync(dir)
                  .filter(file => picFiles.test(file));

  let out = '';
  files.forEach((file, idx) => {
    if (data) {
      data.index = idx;
    }
    out += options.fn(path.join('/images', 'galleries', gallery, file), { data });
  });

  return out;
};
