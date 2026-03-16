export function getTvRouteUrl() {
  if (typeof window === 'undefined') {
    return '#/tv';
  }

  const url = new URL(window.location.href);
  url.hash = '#/tv';
  return url.toString();
}

export function openTvBrowserWindow() {
  const width = window.screen.availWidth || window.screen.width;
  const height = window.screen.availHeight || window.screen.height;

  return window.open(
    getTvRouteUrl(),
    'TV Mode',
    `width=${width},height=${height},left=0,top=0,toolbar=no,menubar=no,scrollbars=no,status=no`
  );
}
