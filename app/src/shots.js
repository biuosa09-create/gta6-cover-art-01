// Fixed scenes for screenshots: each `?shot=` value sets up one scene and
// sets window.__shotReady once it is painted. `photo` picks the sample
// (samples/<photo>.jpg), `caption` the title, and `layout`, `grade`, `size`
// and `subtitle` override the defaults. ?shot=cover and ?shot=wide show the
// cover alone; ?shot=editor shows the whole app.
export async function runShot(shot, query, api) {
  const photo = query.get('photo') ?? 'pier';
  const caption = query.get('caption') ?? 'Sunset Heist';
  if (query.get('layout')) api.setLayout(query.get('layout'));
  if (query.get('grade')) api.setGrade(query.get('grade'));
  if (query.get('size')) api.setSize(query.get('size'));
  if (query.get('subtitle')) api.setSubtitle(query.get('subtitle'));
  if (query.get('pos')) api.setTitlePos(query.get('pos'));
  await api.loadSample(photo);
  // A second photo, so multi-panel layouts have two photos to show.
  if (photo !== 'boulevard') await api.loadSample('boulevard');
  else await api.loadSample('pier');
  api.setCaption(caption);
  // focus=top pans the first panel down so a face at the top of the photo
  // is not cropped out of a wide panel.
  if (query.get('focus') === 'top') api.setPanelPan(0, 0, 0.22);
  if (shot === 'cover' || shot === 'cover2' || shot === 'wide') {
    document.body.classList.add('shot-cover');
  }
  api.finish();
}
