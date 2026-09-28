/* IMT_27 offline question-image pack.  The large pack is downloaded once
   from the public GitHub release and kept in Android private app storage. */
(function () {
  'use strict';
  var ROOT = 'imt27-images/';
  var cache = Object.create(null);

  function plugins() {
    try { return window.Capacitor && window.Capacitor.Plugins; } catch (e) { return null; }
  }
  function nativePack() { var p = plugins(); return p && p.ImagePack; }
  function filesystem() { var p = plugins(); return p && p.Filesystem; }

  window.IMTImagePack = {
    isNative: function () { return !!(nativePack() && filesystem()); },
    status: async function () {
      var p = nativePack();
      var nativeState = (!p || !p.status) ? { installed: false } : await p.status();
      if (nativeState && nativeState.installed) return nativeState;
      /* Repair old installs where the marker was lost: ask the same native
         Filesystem used by the app whether the extracted image tree exists. */
      var fs = filesystem();
      try {
        var listing = await fs.readdir({ path: ROOT + 'testes_exame', directory: 'DATA' });
        if (listing && listing.files && listing.files.length) return { installed: true };
      } catch (e) { }
      try { return { installed: localStorage.getItem('imt27_images_installed') === '1' }; } catch (e2) { return { installed: false }; }
    },
    install: async function (onProgress) {
      var p = nativePack();
      if (!p || !p.downloadAndInstall) throw new Error('O instalador de imagens não está disponível nesta versão.');
      if (p.addListener && onProgress) await p.addListener('progress', onProgress);
      var result = await p.downloadAndInstall();
      try { localStorage.setItem('imt27_images_installed', '1'); } catch (e) { }
      return result;
    },
    imageUrl: async function (relativePath) {
      if (!relativePath) return null;
      if (cache[relativePath]) return cache[relativePath];
      var fs = filesystem();
      if (!fs || !fs.getUri || !window.Capacitor || !window.Capacitor.convertFileSrc) return null;
      try {
        var r = await fs.getUri({ path: ROOT + relativePath, directory: 'DATA' });
        var url = window.Capacitor.convertFileSrc(r.uri);
        cache[relativePath] = url;
        return url;
      } catch (e) { return null; }
    },
    hydrate: async function (scope) {
      if (!this.isNative()) return;
      var status = await this.status();
      if (!status || !status.installed) return;
      var imgs = (scope || document).querySelectorAll('img[data-imt-image]');
      for (var i = 0; i < imgs.length; i++) {
        var image = imgs[i], src = await this.imageUrl(image.getAttribute('data-imt-image'));
        if (src) {
          /* The bundled-image fallback may already have hidden this element
             after its 404.  Restore it before loading the unpacked copy. */
          image.style.display = '';
          var placeholder = image.parentElement && image.parentElement.querySelector('.ex-img-ph');
          if (placeholder) placeholder.style.display = 'none';
          image.src = src;
        }
      }
    }
  };
})();
