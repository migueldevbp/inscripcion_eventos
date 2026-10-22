/**
 * Portal de capacitaciones — puente entre el sitio y la hoja de cálculo.
 *
 * Antes de ejecutar nada:
 * 1. Cambia CLAVE_INICIAL_ADMIN por una clave tuya de al menos 8 caracteres.
 * 2. En este editor, elige la función inicializar y pulsa Ejecutar. Acepta el permiso.
 *    Para subir fotos, ejecuta también autorizarDrive y acepta el permiso de Drive.
 * 3. Implementar > Nueva implementación > Aplicación web.
 *    Ejecutar como: Yo
 *    Quién tiene acceso: Cualquier persona
 * 4. Copia la URL que termina en /exec y pégala en js/config.js del sitio.
 *
 * La zona horaria se cambia en Proyecto > Configuración del proyecto.
 * Si olvidas la clave del admin, cámbiala aquí y ejecuta restablecerAdmin.
 */

var CLAVE_INICIAL_ADMIN = "CAMBIAR";
var USUARIO_INICIAL_ADMIN = "admin";
var HORAS_SESION = 12;

var HEADERS = {
  Usuarios: ["id", "usuario", "clave_hash", "salt", "rol", "evento_id", "nombre", "activo", "creado_en"],
  Eventos: ["id", "titulo", "organizacion", "tipo", "descripcion", "fecha", "hora", "lugar", "modalidad", "enlace", "cupo", "precio_profesional", "precio_estudiante", "requisitos", "contacto", "imagen", "activo", "creado_en"],
  Inscripciones: ["id", "evento_id", "nombres", "apellidos", "dni", "correo", "categoria", "whatsapp", "pagado", "fecha"],
  Sesiones: ["token", "usuario_id", "expira"]
};

var TIPOS = ["Curso", "Taller", "Diplomado", "Webinar", "Conferencia", "Capacitación"];
var MODALIDADES = ["presencial", "virtual", "hibrido"];

function doGet() {
  return responder({
    ok: true,
    mensaje: "API del portal de capacitaciones. Pega esta URL en js/config.js. Tiene que terminar en /exec."
  });
}

function doPost(e) {
  try {
    var body = {};
    if (e && e.postData && e.postData.contents) body = JSON.parse(e.postData.contents);
    return responder(enrutar(body || {}));
  } catch (error) {
    return responder({ ok: false, error: error.message || String(error) });
  }
}

function enrutar(body) {
  var action = String(body.action || "");
  if (action === "ping") return { ok: true, mensaje: "API lista." };
  if (action === "eventosPublicos") return eventosPublicos();
  if (action === "eventoPublico") return eventoPublico(body);
  if (action === "inscribir") return inscribir(body);
  if (action === "login") return login(body);
  if (action === "salir") return salir(body);
  if (action === "validar") return validar(body);
  if (action === "eventosAdmin") return eventosAdmin(body);
  if (action === "detalleAdmin") return detalleAdmin(body);
  if (action === "guardarEvento") return guardarEvento(body);
  if (action === "activarEvento") return activarEvento(body);
  if (action === "miPanel") return miPanel(body);
  if (action === "marcarPago") return marcarPago(body);
  if (action === "anularInscripcion") return anularInscripcion(body);
  if (action === "cambiarClave") return cambiarClave(body);
  return { ok: false, error: "Acción no reconocida." };
}

function responder(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function inicializar() {
  exigirClaveInicial();
  var ss = libro();
  var orden = ["Usuarios", "Eventos", "Inscripciones", "Sesiones"];
  for (var i = 0; i < orden.length; i++) prepararHoja(ss, orden[i]);
  var leeme = ss.getSheetByName("LEEME");
  if (!leeme) {
    leeme = ss.insertSheet("LEEME");
    var lineas = [
      "Portal de capacitaciones",
      "Este archivo es la base del sitio. No borres las hojas ni la primera fila de cada una.",
      "Puedes mirar Inscripciones aquí. Los pagos se marcan desde el panel web, para no desalinear las filas.",
      "No compartas este archivo con el público. El sitio lee los datos por el script, sin abrir la hoja.",
      "La hoja Usuarios guarda las claves cifradas. No las edites a mano.",
      "Si olvidas la clave del administrador, cambia CLAVE_INICIAL_ADMIN en Apps Script y ejecuta restablecerAdmin."
    ];
    for (var l = 0; l < lineas.length; l++) leeme.getRange(l + 1, 1).setValue(lineas[l]);
    leeme.setColumnWidth(1, 720);
  }
  ss.setActiveSheet(leeme);
  ss.moveActiveSheet(1);
  quitarHojaVacia(ss);
  var usuarios = leerObjetos("Usuarios");
  var existe = false;
  for (var u = 0; u < usuarios.length; u++) {
    if (String(usuarios[u].usuario).toLowerCase() === USUARIO_INICIAL_ADMIN) existe = true;
  }
  if (!existe) {
    crearUsuario({
      usuario: USUARIO_INICIAL_ADMIN,
      clave: CLAVE_INICIAL_ADMIN,
      rol: "admin",
      eventoId: "",
      nombre: "Administrador"
    });
    Logger.log("Listo. Entra al sitio con el usuario " + USUARIO_INICIAL_ADMIN + " y la clave que escribiste en CLAVE_INICIAL_ADMIN. Cámbiala al entrar.");
  } else {
    Logger.log("La hoja ya estaba preparada. El usuario admin no se modificó.");
  }
}

function restablecerAdmin() {
  exigirClaveInicial();
  var sh = hoja("Usuarios");
  var usuarios = leerObjetos("Usuarios");
  var fila = -1;
  for (var i = 0; i < usuarios.length; i++) {
    if (String(usuarios[i].usuario).toLowerCase() === USUARIO_INICIAL_ADMIN) {
      fila = filaPorId(sh, usuarios[i].id);
      break;
    }
  }
  if (fila < 0) {
    crearUsuario({
      usuario: USUARIO_INICIAL_ADMIN,
      clave: CLAVE_INICIAL_ADMIN,
      rol: "admin",
      eventoId: "",
      nombre: "Administrador"
    });
  } else {
    var salt = Utilities.getUuid();
    sh.getRange(fila, columna("Usuarios", "clave_hash")).setValue(hashClave(CLAVE_INICIAL_ADMIN, salt));
    sh.getRange(fila, columna("Usuarios", "salt")).setValue(salt);
    sh.getRange(fila, columna("Usuarios", "activo")).setValue("SI");
  }
  Logger.log("Clave del administrador actualizada. Usuario: " + USUARIO_INICIAL_ADMIN);
}

function exigirClaveInicial() {
  if (!CLAVE_INICIAL_ADMIN || CLAVE_INICIAL_ADMIN === "CAMBIAR" || String(CLAVE_INICIAL_ADMIN).length < 8) {
    throw new Error("Abre Codigo.gs y cambia CLAVE_INICIAL_ADMIN por una clave de al menos 8 caracteres. Luego ejecuta otra vez.");
  }
}

function prepararHoja(ss, nombre) {
  var sh = ss.getSheetByName(nombre);
  if (!sh) sh = ss.insertSheet(nombre);
  var headers = HEADERS[nombre];
  if (sh.getLastRow() === 0) sh.appendRow(headers);
  sh.setFrozenRows(1);
  sh.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#0e2a4a").setFontColor("#ffffff");
  sh.getRange(1, 1, sh.getMaxRows(), headers.length).setNumberFormat("@");
  return sh;
}

function quitarHojaVacia(ss) {
  var nombres = ["Hoja 1", "Sheet1"];
  for (var i = 0; i < nombres.length; i++) {
    var sh = ss.getSheetByName(nombres[i]);
    if (sh && ss.getSheets().length > 1 && sh.getLastRow() === 0) ss.deleteSheet(sh);
  }
}

function libro() {
  var ss = SpreadsheetApp.getActive();
  if (!ss) throw new Error("Crea el script desde la hoja: Extensiones > Apps Script.");
  return ss;
}

function hoja(nombre) {
  var sh = libro().getSheetByName(nombre);
  if (!sh) throw new Error('Falta la hoja "' + nombre + '". En Apps Script ejecuta inicializar.');
  return sh;
}

function columna(nombreHoja, campo) {
  return HEADERS[nombreHoja].indexOf(campo) + 1;
}

function leerObjetos(nombre) {
  var sh = hoja(nombre);
  var headers = HEADERS[nombre];
  var last = sh.getLastRow();
  if (last < 2) return [];
  var values = sh.getRange(2, 1, last - 1, headers.length).getValues();
  var out = [];
  for (var r = 0; r < values.length; r++) {
    if (values[r][0] === "" || values[r][0] == null) continue;
    var obj = {};
    for (var c = 0; c < headers.length; c++) obj[headers[c]] = values[r][c];
    out.push(obj);
  }
  return out;
}

function filaPorId(sh, id) {
  var last = sh.getLastRow();
  if (last < 2) return -1;
  var ids = sh.getRange(2, 1, last - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === String(id)) return i + 2;
  }
  return -1;
}

function agregarFila(sh, headers, obj) {
  var row = [];
  for (var i = 0; i < headers.length; i++) row.push(obj[headers[i]] == null ? "" : obj[headers[i]]);
  sh.appendRow(row);
}

function conBloqueo(fn) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) {
    return { ok: false, error: "Hay muchas personas usando el sistema a la vez. Intenta de nuevo en unos segundos." };
  }
  try {
    return fn();
  } finally {
    lock.releaseLock();
  }
}

function tz() {
  return Session.getScriptTimeZone() || "America/Lima";
}

function ahoraTexto() {
  return Utilities.formatDate(new Date(), tz(), "yyyy-MM-dd HH:mm:ss");
}

function esFecha(valor) {
  return Object.prototype.toString.call(valor) === "[object Date]" && !isNaN(valor.getTime());
}

function sinMarca(valor) {
  var s = String(valor == null ? "" : valor);
  if (s.charAt(0) === "'") s = s.slice(1);
  return s;
}

function comoFecha(valor) {
  if (esFecha(valor)) return Utilities.formatDate(valor, tz(), "yyyy-MM-dd");
  var coincidencia = sinMarca(valor).match(/(\d{4}-\d{2}-\d{2})/);
  return coincidencia ? coincidencia[1] : "";
}

function comoHora(valor) {
  if (esFecha(valor)) return Utilities.formatDate(valor, tz(), "HH:mm");
  var coincidencia = sinMarca(valor).match(/(\d{2}:\d{2})/);
  return coincidencia ? coincidencia[1] : "";
}

function comoFechaHora(valor) {
  if (esFecha(valor)) return Utilities.formatDate(valor, tz(), "yyyy-MM-dd HH:mm:ss");
  return sinMarca(valor).replace(/^\s+|\s+$/g, "");
}

function esSi(valor) {
  return valor === true || valor === "SI" || valor === "TRUE" || valor === "true" || valor === "VERDADERO";
}

function limpio(valor) {
  return String(valor == null ? "" : valor).replace(/^\s+|\s+$/g, "").replace(/\s+/g, " ");
}

function texto(valor) {
  return String(valor == null ? "" : valor).replace(/^\s+|\s+$/g, "");
}

function soloDigitos(valor) {
  return String(valor == null ? "" : valor).replace(/\D/g, "");
}

function textoCelda(valor) {
  var s = texto(valor);
  if (!s) return "";
  if (/^[=+\-@]/.test(s)) return "'" + s;
  return s;
}

function forzarTexto(valor) {
  var s = textoCelda(valor);
  if (s && s.charAt(0) !== "'" && /^[0-9]/.test(s)) return "'" + s;
  return s;
}

function hashClave(clave, salt) {
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, salt + "|" + clave, Utilities.Charset.UTF_8);
  var hex = "";
  for (var i = 0; i < bytes.length; i++) {
    var v = bytes[i] < 0 ? bytes[i] + 256 : bytes[i];
    var h = v.toString(16);
    hex += h.length === 1 ? "0" + h : h;
  }
  return hex;
}

function nuevoId(prefijo) {
  return prefijo + "-" + Utilities.getUuid().replace(/-/g, "").slice(0, 8);
}

function esDrive(valor) {
  return /^drive:[A-Za-z0-9_-]{10,}$/.test(limpio(valor));
}

function urlHttp(valor) {
  var s = limpio(valor);
  if (!s || esDrive(s)) return true;
  return /^https?:\/\/\S+$/i.test(s);
}

function imagenGuardada(valor) {
  var s = limpio(sinMarca(valor));
  if (esDrive(s) || /^https?:\/\/\S+$/i.test(s)) return s;
  return "";
}

function imagenVisible(valor) {
  var s = imagenGuardada(valor);
  if (!s || s.indexOf("drive:") !== 0) return s;
  try {
    var bytes = DriveApp.getFileById(s.substring(6)).getBlob().getBytes();
    if (!bytes || bytes.length < 32 || bytes.length > 1800000) return "";
    return "data:image/jpeg;base64," + Utilities.base64Encode(bytes);
  } catch (error) {
    return "";
  }
}

function urlPublica(valor) {
  var s = limpio(valor);
  if (/^https?:\/\/\S+$/i.test(s)) return s;
  return "";
}

function fechaReal(valor) {
  var coincidencia = /^(\d{4})-(\d{2})-(\d{2})$/.exec(limpio(valor));
  if (!coincidencia) return false;
  var anio = Number(coincidencia[1]);
  var mes = Number(coincidencia[2]);
  var dia = Number(coincidencia[3]);
  var fecha = new Date(anio, mes - 1, dia);
  return fecha.getFullYear() === anio && fecha.getMonth() === mes - 1 && fecha.getDate() === dia;
}

function normalizarEvento(row) {
  var cupo = row.cupo;
  if (cupo === "" || cupo == null) cupo = null;
  else cupo = Number(sinMarca(cupo));
  if (isNaN(cupo)) cupo = null;
  return {
    id: String(row.id),
    titulo: sinMarca(row.titulo).replace(/^\s+|\s+$/g, ""),
    organizacion: sinMarca(row.organizacion).replace(/^\s+|\s+$/g, ""),
    tipo: sinMarca(row.tipo),
    descripcion: sinMarca(row.descripcion).replace(/^\s+|\s+$/g, ""),
    fecha: comoFecha(row.fecha),
    hora: comoHora(row.hora),
    lugar: sinMarca(row.lugar).replace(/^\s+|\s+$/g, ""),
    modalidad: sinMarca(row.modalidad),
    enlace: urlPublica(row.enlace),
    cupo: cupo,
    precioProfesional: sinMarca(row.precio_profesional).replace(/^\s+|\s+$/g, ""),
    precioEstudiante: sinMarca(row.precio_estudiante).replace(/^\s+|\s+$/g, ""),
    requisitos: sinMarca(row.requisitos).replace(/^\s+|\s+$/g, ""),
    contacto: sinMarca(row.contacto).replace(/^\s+|\s+$/g, ""),
    imagen: imagenGuardada(row.imagen),
    activo: esSi(row.activo),
    creadoEn: comoFechaHora(row.creado_en)
  };
}

function normalizarUsuario(row) {
  return {
    id: String(row.id),
    usuario: String(row.usuario || "").toLowerCase(),
    rol: String(row.rol || ""),
    eventoId: String(row.evento_id || ""),
    nombre: sinMarca(row.nombre).replace(/^\s+|\s+$/g, ""),
    activo: esSi(row.activo),
    salt: String(row.salt || ""),
    claveHash: String(row.clave_hash || "")
  };
}

function jsonInscripcion(row) {
  return {
    id: String(row.id),
    eventoId: String(row.evento_id),
    nombres: sinMarca(row.nombres).replace(/^\s+|\s+$/g, ""),
    apellidos: sinMarca(row.apellidos).replace(/^\s+|\s+$/g, ""),
    dni: soloDigitos(sinMarca(row.dni)),
    correo: sinMarca(row.correo).replace(/^\s+|\s+$/g, "").toLowerCase(),
    categoria: String(row.categoria || ""),
    whatsapp: soloDigitos(sinMarca(row.whatsapp)),
    pagado: esSi(row.pagado),
    fecha: comoFechaHora(row.fecha)
  };
}

function conteos() {
  var map = {};
  var filas = leerObjetos("Inscripciones");
  for (var i = 0; i < filas.length; i++) {
    var id = String(filas[i].evento_id);
    if (!map[id]) map[id] = { inscritos: 0, pagados: 0 };
    map[id].inscritos++;
    if (esSi(filas[i].pagado)) map[id].pagados++;
  }
  return map;
}

function organizadorDe(eventoId) {
  var usuarios = leerObjetos("Usuarios");
  var respaldo = null;
  for (var i = 0; i < usuarios.length; i++) {
    if (String(usuarios[i].rol) === "organizador" && String(usuarios[i].evento_id) === String(eventoId)) {
      if (esSi(usuarios[i].activo)) return usuarios[i];
      respaldo = usuarios[i];
    }
  }
  return respaldo;
}

function jsonEvento(evento, extra) {
  extra = extra || {};
  var data = {
    id: evento.id,
    titulo: evento.titulo,
    organizacion: evento.organizacion,
    tipo: evento.tipo,
    descripcion: evento.descripcion,
    fecha: evento.fecha,
    hora: evento.hora,
    lugar: evento.lugar,
    modalidad: evento.modalidad,
    enlace: evento.enlace,
    cupo: evento.cupo,
    precioProfesional: evento.precioProfesional,
    precioEstudiante: evento.precioEstudiante,
    requisitos: evento.requisitos,
    contacto: evento.contacto,
    imagen: evento.imagen,
    imagenUrl: imagenVisible(evento.imagen),
    activo: evento.activo,
    inscritos: extra.inscritos || 0
  };
  if (extra.admin) {
    data.pagados = extra.pagados || 0;
    data.organizadorUsuario = extra.organizadorUsuario || "";
    data.organizadorNombre = extra.organizadorNombre || "";
  }
  return data;
}

function extraDe(evento, mapa, admin) {
  var conteo = mapa[evento.id] || { inscritos: 0, pagados: 0 };
  var extra = { inscritos: conteo.inscritos, pagados: conteo.pagados, admin: admin };
  if (admin) {
    var org = organizadorDe(evento.id);
    extra.organizadorUsuario = org ? String(org.usuario || "") : "";
    extra.organizadorNombre = org ? sinMarca(org.nombre) : "";
  }
  return extra;
}

function eventosPublicos() {
  var mapa = conteos();
  var eventos = leerObjetos("Eventos");
  var lista = [];
  for (var i = 0; i < eventos.length; i++) {
    var evento = normalizarEvento(eventos[i]);
    if (!evento.activo) continue;
    lista.push(jsonEvento(evento, extraDe(evento, mapa, false)));
  }
  return { ok: true, eventos: lista };
}

function eventoPublico(body) {
  var filas = leerObjetos("Eventos");
  for (var i = 0; i < filas.length; i++) {
    if (String(filas[i].id) === String(body.id || "")) {
      var evento = normalizarEvento(filas[i]);
      return { ok: true, evento: jsonEvento(evento, extraDe(evento, conteos(), false)) };
    }
  }
  return { ok: false, error: "No encontramos ese evento." };
}

function inscribir(body) {
  var mensaje = validarInscripcion(body);
  if (mensaje) return { ok: false, error: mensaje };
  return conBloqueo(function () {
    var filas = leerObjetos("Eventos");
    var crudo = null;
    for (var i = 0; i < filas.length; i++) {
      if (String(filas[i].id) === String(body.eventoId || "")) crudo = filas[i];
    }
    if (!crudo) return { ok: false, error: "No encontramos ese evento." };
    var evento = normalizarEvento(crudo);
    if (!evento.activo) return { ok: false, error: "Este evento no recibe inscripciones." };
    var dni = soloDigitos(body.dni);
    var inscripciones = leerObjetos("Inscripciones");
    var ocupados = 0;
    for (var j = 0; j < inscripciones.length; j++) {
      if (String(inscripciones[j].evento_id) !== evento.id) continue;
      ocupados++;
      if (soloDigitos(sinMarca(inscripciones[j].dni)) === dni) {
        return { ok: false, error: "Este DNI ya está inscrito en el evento." };
      }
    }
    if (evento.cupo && ocupados >= evento.cupo) return { ok: false, error: "El cupo de este evento ya se completó." };
    var folio = siguienteFolio();
    var row = {
      id: folio,
      evento_id: evento.id,
      nombres: textoCelda(limpio(body.nombres)),
      apellidos: textoCelda(limpio(body.apellidos)),
      dni: forzarTexto(dni),
      correo: textoCelda(limpio(body.correo).toLowerCase()),
      categoria: body.categoria,
      whatsapp: forzarTexto(soloDigitos(body.whatsapp)),
      pagado: "NO",
      fecha: forzarTexto(ahoraTexto())
    };
    agregarFila(hoja("Inscripciones"), HEADERS.Inscripciones, row);
    return { ok: true, inscripcion: jsonInscripcion(row) };
  });
}

function siguienteFolio() {
  var props = PropertiesService.getScriptProperties();
  var n = Number(props.getProperty("folio") || "0") + 1;
  props.setProperty("folio", String(n));
  var s = String(n);
  while (s.length < 4) s = "0" + s;
  return "INS-" + s;
}

function jsonSesion(usuario, token) {
  return {
    token: token,
    usuario: usuario.usuario,
    nombre: usuario.nombre,
    rol: usuario.rol,
    eventoId: usuario.eventoId || ""
  };
}

function login(body) {
  var usuario = limpio(body.usuario).toLowerCase();
  var clave = String(body.clave || "");
  if (!usuario || !clave) return { ok: false, error: "Escribe usuario y clave." };
  if (usuario.length > 40 || clave.length > 80) return { ok: false, error: "Usuario o clave incorrectos." };
  verificarIntentos(usuario);
  var lista = leerObjetos("Usuarios");
  var encontrado = null;
  for (var i = 0; i < lista.length; i++) {
    if (String(lista[i].usuario).toLowerCase() === usuario) encontrado = lista[i];
  }
  var valido = encontrado && esSi(encontrado.activo) && hashClave(clave, String(encontrado.salt)) === String(encontrado.clave_hash);
  if (!valido) {
    registrarFallo(usuario);
    return { ok: false, error: "Usuario o clave incorrectos." };
  }
  limpiarFallos(usuario);
  return conBloqueo(function () {
    var token = Utilities.getUuid().replace(/-/g, "") + Utilities.getUuid().replace(/-/g, "");
    var sh = hoja("Sesiones");
    limpiarSesiones(sh);
    agregarFila(sh, HEADERS.Sesiones, {
      token: token,
      usuario_id: String(encontrado.id),
      expira: String(Date.now() + HORAS_SESION * 60 * 60 * 1000)
    });
    var cuenta = normalizarUsuario(encontrado);
    return {
      ok: true,
      sesion: {
        token: token,
        usuario: cuenta.usuario,
        nombre: cuenta.nombre,
        rol: cuenta.rol,
        eventoId: cuenta.eventoId || ""
      }
    };
  });
}

function salir(body) {
  if (!body.token) return { ok: true };
  return conBloqueo(function () {
    var sh = hoja("Sesiones");
    var last = sh.getLastRow();
    if (last < 2) return { ok: true };
    var values = sh.getRange(2, 1, last - 1, 1).getValues();
    for (var i = values.length - 1; i >= 0; i--) {
      if (String(values[i][0]) === String(body.token)) sh.deleteRow(i + 2);
    }
    return { ok: true };
  });
}

function validar(body) {
  var usuario = usuarioDeToken(body.token);
  if (!usuario) return { ok: false, error: "Sesión expirada. Vuelve a entrar." };
  return {
    ok: true,
    sesion: {
      usuario: usuario.usuario,
      nombre: usuario.nombre,
      rol: usuario.rol,
      eventoId: usuario.eventoId || ""
    }
  };
}

function usuarioDeToken(token) {
  if (!token) return null;
  token = String(token);
  if (token.length < 20 || token.length > 120) return null;
  var sesiones = leerObjetos("Sesiones");
  var usuarioId = "";
  for (var i = 0; i < sesiones.length; i++) {
    if (String(sesiones[i].token) !== token) continue;
    if (Number(sesiones[i].expira) < Date.now()) return null;
    usuarioId = String(sesiones[i].usuario_id);
    break;
  }
  if (!usuarioId) return null;
  var usuarios = leerObjetos("Usuarios");
  for (var j = 0; j < usuarios.length; j++) {
    if (String(usuarios[j].id) === usuarioId && esSi(usuarios[j].activo)) return normalizarUsuario(usuarios[j]);
  }
  return null;
}

function exigir(body, roles) {
  var usuario = usuarioDeToken(body.token);
  if (!usuario) throw new Error("Sesión expirada. Vuelve a entrar.");
  if (roles.indexOf(usuario.rol) === -1) throw new Error("No tienes permiso para esto.");
  return usuario;
}

function limpiarSesiones(sh) {
  var last = sh.getLastRow();
  if (last < 2) return;
  var values = sh.getRange(2, 1, last - 1, 3).getValues();
  for (var i = values.length - 1; i >= 0; i--) {
    if (Number(values[i][2]) < Date.now()) sh.deleteRow(i + 2);
  }
}

function verificarIntentos(usuario) {
  var data = leerIntentos(usuario);
  if (!data.t || Date.now() - Number(data.t) > 15 * 60 * 1000) return;
  if (Number(data.n) >= 8) throw new Error("Demasiados intentos. Espera 15 minutos.");
}

function registrarFallo(usuario) {
  var data = leerIntentos(usuario);
  var ahoraMs = Date.now();
  if (!data.t || ahoraMs - Number(data.t) > 15 * 60 * 1000) data = { n: 0, t: ahoraMs };
  data.n = Number(data.n || 0) + 1;
  data.t = data.t || ahoraMs;
  PropertiesService.getScriptProperties().setProperty("fail_" + usuario, JSON.stringify(data));
}

function leerIntentos(usuario) {
  var raw = PropertiesService.getScriptProperties().getProperty("fail_" + usuario);
  if (!raw) return {};
  try { return JSON.parse(raw); } catch (error) { return {}; }
}

function limpiarFallos(usuario) {
  PropertiesService.getScriptProperties().deleteProperty("fail_" + usuario);
}

function eventosAdmin(body) {
  exigir(body, ["admin"]);
  var mapa = conteos();
  var filas = leerObjetos("Eventos");
  var lista = [];
  for (var i = 0; i < filas.length; i++) {
    var evento = normalizarEvento(filas[i]);
    lista.push(jsonEvento(evento, extraDe(evento, mapa, true)));
  }
  return { ok: true, eventos: lista };
}

function detalleAdmin(body) {
  exigir(body, ["admin"]);
  var evento = buscarEvento(body.id);
  if (!evento) return { ok: false, error: "No encontramos ese evento." };
  return {
    ok: true,
    evento: jsonEvento(evento, extraDe(evento, conteos(), true)),
    inscripciones: inscripcionesDe(evento.id)
  };
}

function miPanel(body) {
  var usuario = exigir(body, ["organizador"]);
  if (!usuario.eventoId) return { ok: true, evento: null, inscripciones: [] };
  var evento = buscarEvento(usuario.eventoId);
  if (!evento) return { ok: true, evento: null, inscripciones: [] };
  return {
    ok: true,
    evento: jsonEvento(evento, extraDe(evento, conteos(), true)),
    inscripciones: inscripcionesDe(evento.id)
  };
}

function inscripcionesDe(eventoId) {
  var filas = leerObjetos("Inscripciones");
  var lista = [];
  for (var i = 0; i < filas.length; i++) {
    if (String(filas[i].evento_id) === String(eventoId)) lista.push(jsonInscripcion(filas[i]));
  }
  lista.sort(function (a, b) { return String(b.fecha).localeCompare(String(a.fecha)); });
  return lista;
}

function buscarEvento(id) {
  var filas = leerObjetos("Eventos");
  for (var i = 0; i < filas.length; i++) {
    if (String(filas[i].id) === String(id)) return normalizarEvento(filas[i]);
  }
  return null;
}

function activarEvento(body) {
  exigir(body, ["admin"]);
  return conBloqueo(function () {
    var sh = hoja("Eventos");
    var fila = filaPorId(sh, body.id);
    if (fila < 0) return { ok: false, error: "No encontramos ese evento." };
    sh.getRange(fila, columna("Eventos", "activo")).setValue(body.activo ? "SI" : "NO");
    var evento = buscarEvento(body.id);
    return { ok: true, evento: jsonEvento(evento, extraDe(evento, conteos(), true)) };
  });
}

function marcarPago(body) {
  var usuario = exigir(body, ["admin", "organizador"]);
  return conBloqueo(function () {
    var sh = hoja("Inscripciones");
    var filas = leerObjetos("Inscripciones");
    var crudo = null;
    for (var i = 0; i < filas.length; i++) {
      if (String(filas[i].id) === String(body.id)) crudo = filas[i];
    }
    if (!crudo) return { ok: false, error: "No encontramos esa inscripción." };
    if (usuario.rol === "organizador" && String(crudo.evento_id) !== String(usuario.eventoId)) {
      return { ok: false, error: "No puedes modificar inscripciones de otro evento." };
    }
    var fila = filaPorId(sh, body.id);
    sh.getRange(fila, columna("Inscripciones", "pagado")).setValue(body.pagado ? "SI" : "NO");
    crudo.pagado = body.pagado ? "SI" : "NO";
    return { ok: true, inscripcion: jsonInscripcion(crudo) };
  });
}

function anularInscripcion(body) {
  var usuario = exigir(body, ["admin", "organizador"]);
  return conBloqueo(function () {
    var sh = hoja("Inscripciones");
    var filas = leerObjetos("Inscripciones");
    var crudo = null;
    for (var i = 0; i < filas.length; i++) {
      if (String(filas[i].id) === String(body.id)) crudo = filas[i];
    }
    if (!crudo) return { ok: false, error: "No encontramos esa inscripción." };
    if (usuario.rol === "organizador" && String(crudo.evento_id) !== String(usuario.eventoId)) {
      return { ok: false, error: "No puedes modificar inscripciones de otro evento." };
    }
    var fila = filaPorId(sh, body.id);
    if (fila > 0) sh.deleteRow(fila);
    return { ok: true };
  });
}

function cambiarClave(body) {
  var usuario = exigir(body, ["admin", "organizador"]);
  var actual = String(body.actual || "");
  var nueva = String(body.nueva || "");
  if (!actual) return { ok: false, error: "Escribe tu clave actual." };
  if (nueva.length < 6) return { ok: false, error: "La nueva clave debe tener al menos 6 caracteres." };
  if (nueva.length > 80) return { ok: false, error: "La nueva clave es demasiado larga." };
  if (hashClave(actual, usuario.salt) !== usuario.claveHash) return { ok: false, error: "La clave actual no coincide." };
  return conBloqueo(function () {
    var sh = hoja("Usuarios");
    var fila = filaPorId(sh, usuario.id);
    if (fila < 0) return { ok: false, error: "No encontramos el usuario." };
    var salt = Utilities.getUuid();
    sh.getRange(fila, columna("Usuarios", "salt")).setValue(salt);
    sh.getRange(fila, columna("Usuarios", "clave_hash")).setValue(hashClave(nueva, salt));
    return { ok: true };
  });
}

function autorizarDrive() {
  var carpeta = carpetaImagenes();
  Logger.log(carpeta.getName());
}

function carpetaImagenes() {
  var nombre = "Imagenes portal capacitaciones";
  try {
    var existentes = DriveApp.getFoldersByName(nombre);
    if (existentes.hasNext()) return existentes.next();
    return DriveApp.createFolder(nombre);
  } catch (error) {
    var mensaje = String(error && error.message ? error.message : error);
    if (/permis|authoriz|autoriz/i.test(mensaje)) {
      throw new Error("Falta permiso de Drive. En Apps Script ejecuta autorizarDrive, acepta el permiso y publica una nueva versión de la aplicación web.");
    }
    throw error;
  }
}

function publicarImagen(datos) {
  var crudo = String(datos || "").replace(/\s/g, "");
  var coma = crudo.indexOf(",");
  if (coma !== -1) crudo = crudo.substring(coma + 1);
  if (crudo.indexOf("/9j/") !== 0) throw new Error("La foto debe ser JPG, PNG o WEBP.");
  if (crudo.length < 100 || crudo.length > 1800000) throw new Error("La foto es demasiado pesada. Elige una más liviana.");
  var bytes = Utilities.base64Decode(crudo);
  var archivo = carpetaImagenes().createFile(Utilities.newBlob(bytes, "image/jpeg", "evento-" + Utilities.getUuid() + ".jpg"));
  return "drive:" + archivo.getId();
}

function guardarEvento(body) {
  exigir(body, ["admin"]);
  return conBloqueo(function () {
    var esNuevo = !body.id;
    var actual = esNuevo ? null : buscarEvento(body.id);
    if (!esNuevo && !actual) return { ok: false, error: "No encontramos ese evento." };
    var error = validarEvento(body, {
      exigirOrganizador: esNuevo,
      usuarioNuevo: !actual || !organizadorDe(actual.id)
    });
    if (error) return { ok: false, error: error };
    var entrada = normalizarEntradaEvento(body);
    var orgActual = actual ? organizadorDe(actual.id) : null;
    if (entrada.organizadorUsuario) {
      var usuarios = leerObjetos("Usuarios");
      var ocupado = null;
      for (var i = 0; i < usuarios.length; i++) {
        if (String(usuarios[i].usuario).toLowerCase() === entrada.organizadorUsuario) ocupado = usuarios[i];
      }
      if (ocupado && String(ocupado.rol) === "admin") return { ok: false, error: "Ese usuario está reservado para el administrador." };
      if (ocupado && String(ocupado.evento_id || "") && (!actual || String(ocupado.evento_id) !== actual.id)) {
        return { ok: false, error: "Ese usuario ya pertenece a otro evento." };
      }
      if (orgActual && String(orgActual.usuario).toLowerCase() !== entrada.organizadorUsuario) {
        return { ok: false, error: "Este evento ya tiene el usuario " + orgActual.usuario + ". Puedes cambiarle la clave, no el usuario." };
      }
    }
    if (body.imagenArchivo) entrada.imagen = publicarImagen(body.imagenArchivo);
    var id = esNuevo ? nuevoId("EVT") : actual.id;
    var fila = {
      id: id,
      titulo: textoCelda(entrada.titulo),
      organizacion: textoCelda(entrada.organizacion),
      tipo: entrada.tipo,
      descripcion: textoCelda(entrada.descripcion),
      fecha: forzarTexto(entrada.fecha),
      hora: entrada.hora ? forzarTexto(entrada.hora) : "",
      lugar: textoCelda(entrada.lugar),
      modalidad: entrada.modalidad,
      enlace: textoCelda(entrada.enlace),
      cupo: entrada.cupo == null ? "" : String(entrada.cupo),
      precio_profesional: textoCelda(entrada.precioProfesional),
      precio_estudiante: textoCelda(entrada.precioEstudiante),
      requisitos: textoCelda(entrada.requisitos),
      contacto: textoCelda(entrada.contacto),
      imagen: textoCelda(entrada.imagen),
      activo: entrada.activo ? "SI" : "NO",
      creado_en: esNuevo ? ahoraTexto() : forzarTexto(actual.creadoEn)
    };
    var sh = hoja("Eventos");
    if (esNuevo) agregarFila(sh, HEADERS.Eventos, fila);
    else {
      var nFila = filaPorId(sh, id);
      var row = [];
      for (var c = 0; c < HEADERS.Eventos.length; c++) row.push(fila[HEADERS.Eventos[c]] == null ? "" : fila[HEADERS.Eventos[c]]);
      sh.getRange(nFila, 1, 1, HEADERS.Eventos.length).setValues([row]);
    }
    if (entrada.organizadorUsuario) guardarOrganizador(entrada, id);
    SpreadsheetApp.flush();
    var guardado = buscarEvento(id);
    return { ok: true, evento: jsonEvento(guardado, extraDe(guardado, conteos(), true)) };
  });
}

function guardarOrganizador(entrada, eventoId) {
  var sh = hoja("Usuarios");
  var usuarios = leerObjetos("Usuarios");
  var ocupado = null;
  for (var i = 0; i < usuarios.length; i++) {
    if (String(usuarios[i].usuario).toLowerCase() === entrada.organizadorUsuario) ocupado = usuarios[i];
  }
  if (!ocupado) {
    crearUsuario({
      usuario: entrada.organizadorUsuario,
      clave: entrada.organizadorClave,
      rol: "organizador",
      eventoId: eventoId,
      nombre: entrada.organizadorNombre
    });
    return;
  }
  var fila = filaPorId(sh, ocupado.id);
  sh.getRange(fila, columna("Usuarios", "nombre")).setValue(textoCelda(entrada.organizadorNombre));
  sh.getRange(fila, columna("Usuarios", "evento_id")).setValue(eventoId);
  sh.getRange(fila, columna("Usuarios", "activo")).setValue("SI");
  if (entrada.organizadorClave) {
    var salt = Utilities.getUuid();
    sh.getRange(fila, columna("Usuarios", "salt")).setValue(salt);
    sh.getRange(fila, columna("Usuarios", "clave_hash")).setValue(hashClave(entrada.organizadorClave, salt));
  }
}

function crearUsuario(datos) {
  var salt = Utilities.getUuid();
  agregarFila(hoja("Usuarios"), HEADERS.Usuarios, {
    id: nuevoId("USR"),
    usuario: String(datos.usuario).toLowerCase(),
    clave_hash: hashClave(datos.clave, salt),
    salt: salt,
    rol: datos.rol,
    evento_id: datos.eventoId || "",
    nombre: textoCelda(datos.nombre),
    activo: "SI",
    creado_en: ahoraTexto()
  });
}

function normalizarEntradaEvento(body) {
  var cupo = limpio(body.cupo);
  return {
    titulo: limpio(body.titulo),
    organizacion: limpio(body.organizacion),
    tipo: body.tipo,
    descripcion: texto(body.descripcion),
    fecha: limpio(body.fecha),
    hora: limpio(body.hora),
    lugar: limpio(body.lugar),
    modalidad: body.modalidad,
    enlace: limpio(body.enlace),
    cupo: cupo ? Number(cupo) : null,
    precioProfesional: limpio(body.precioProfesional),
    precioEstudiante: limpio(body.precioEstudiante),
    requisitos: texto(body.requisitos),
    contacto: limpio(body.contacto),
    imagen: limpio(body.imagen),
    activo: Boolean(body.activo),
    organizadorUsuario: limpio(body.organizadorUsuario).toLowerCase(),
    organizadorNombre: limpio(body.organizadorNombre),
    organizadorClave: String(body.organizadorClave || "")
  };
}

function validarInscripcion(datos) {
  if (limpio(datos.nombres).length < 2) return "Escribe tus nombres.";
  if (limpio(datos.nombres).length > 80) return "Los nombres son demasiado largos.";
  if (limpio(datos.apellidos).length < 2) return "Escribe tus apellidos.";
  if (limpio(datos.apellidos).length > 80) return "Los apellidos son demasiado largos.";
  if (!/^\d{8,12}$/.test(soloDigitos(datos.dni))) return "El DNI debe tener entre 8 y 12 dígitos.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(limpio(datos.correo)) || limpio(datos.correo).length > 120) return "Escribe un correo válido.";
  if (datos.categoria !== "profesional" && datos.categoria !== "estudiante") return "Elige si participas como profesional o como estudiante.";
  var telefono = soloDigitos(datos.whatsapp);
  if (telefono.length < 8 || telefono.length > 15) return "Escribe un WhatsApp con código de país. Ejemplo: 51987654321.";
  return "";
}

function validarEvento(datos, opciones) {
  opciones = opciones || {};
  if (limpio(datos.titulo).length < 3 || limpio(datos.titulo).length > 140) return "Revisa el título del evento.";
  if (limpio(datos.organizacion).length < 2 || limpio(datos.organizacion).length > 140) return "Escribe la organización que realiza el evento.";
  if (TIPOS.indexOf(datos.tipo) === -1) return "Elige un tipo de evento.";
  if (texto(datos.descripcion).length < 10 || texto(datos.descripcion).length > 4000) return "Cuenta de qué trata el evento (al menos una frase).";
  if (!fechaReal(datos.fecha)) return "Elige una fecha válida.";
  if (limpio(datos.hora) && !/^\d{2}:\d{2}$/.test(limpio(datos.hora))) return "La hora no es válida.";
  if (limpio(datos.lugar).length > 160) return "El lugar es demasiado largo.";
  if (MODALIDADES.indexOf(datos.modalidad) === -1) return "Elige si el evento es presencial, virtual o híbrido.";
  if (!urlHttp(datos.enlace)) return "El enlace del evento debe empezar por http:// o https://.";
  if (!urlHttp(datos.imagen)) return "La imagen debe ser un enlace http:// o https://.";
  if (texto(datos.requisitos).length > 2000) return "Los requisitos son demasiado largos.";
  if (limpio(datos.contacto).length > 120) return "El contacto es demasiado largo.";
  if (limpio(datos.precioProfesional).length > 40 || limpio(datos.precioEstudiante).length > 40) return "El texto de la inversión es demasiado largo.";
  var cupo = limpio(datos.cupo);
  if (cupo && !/^\d+$/.test(cupo)) return "El cupo debe ser un número entero, o quedar vacío si no hay límite.";
  if (cupo && Number(cupo) > 100000) return "El cupo es demasiado alto.";
  var usuario = limpio(datos.organizadorUsuario).toLowerCase();
  var clave = String(datos.organizadorClave || "");
  if (opciones.exigirOrganizador && !usuario) return "Asigna un usuario al organizador de este evento.";
  if (usuario && !/^[a-z0-9._]{3,20}$/.test(usuario)) return "El usuario del organizador usa minúsculas, números, punto o guion bajo, de 3 a 20 caracteres.";
  if (usuario === "admin") return "Ese usuario está reservado para el administrador.";
  if (usuario && limpio(datos.organizadorNombre).length < 2) return "Escribe el nombre del organizador.";
  if (limpio(datos.organizadorNombre).length > 80) return "El nombre del organizador es demasiado largo.";
  if ((opciones.exigirOrganizador || opciones.usuarioNuevo) && usuario && clave.length < 6) return "La clave del organizador debe tener al menos 6 caracteres.";
  if (clave && clave.length < 6) return "La nueva clave debe tener al menos 6 caracteres.";
  if (clave.length > 80) return "La clave es demasiado larga.";
  return "";
}
