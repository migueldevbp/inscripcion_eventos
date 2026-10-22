// Único archivo del sitio que debes editar para conectarlo.
// Pega aquí la URL de la aplicación web de Apps Script (termina en /exec).
// Déjala vacía para recorrer el sistema con datos de prueba en este navegador.
window.APP_CONFIG = {
  SCRIPT_URL: "https://script.google.com/macros/s/AKfycbw768WvYcmLk2Gi4ZZ67gZOUbyQtFP5qIEWYoZvsompvIZSMYJGAMhFMrK4HQNkM51R/exec",
  NOMBRE_SITIO: "Portal de Capacitaciones",
  BAJADA: "Cursos, talleres y capacitaciones con inscripción en línea."
};

window.scriptConfigurado = function () {
  var url = String(window.APP_CONFIG.SCRIPT_URL || "").trim();
  return /^https:\/\/script\.google\.com\/(?:a\/macros\/[^/]+\/s|macros\/s)\/[A-Za-z0-9_-]+\/exec\/?$/.test(url);
};

window.urlEnModoDev = function () {
  var url = String(window.APP_CONFIG.SCRIPT_URL || "").trim();
  return /\/dev\/?$/.test(url);
};
