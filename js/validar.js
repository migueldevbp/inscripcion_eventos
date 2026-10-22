(function (root) {
  var TIPOS = ["Curso", "Taller", "Diplomado", "Webinar", "Conferencia", "Capacitación"];
  var MODALIDADES = [
    { id: "presencial", nombre: "Presencial" },
    { id: "virtual", nombre: "Virtual" },
    { id: "hibrido", nombre: "Híbrido" }
  ];

  function limpio(valor) {
    return String(valor == null ? "" : valor).trim().replace(/\s+/g, " ");
  }

  function texto(valor) {
    return String(valor == null ? "" : valor).replace(/^\s+|\s+$/g, "");
  }

  function soloDigitos(valor) {
    return String(valor == null ? "" : valor).replace(/\D/g, "");
  }

  function correoValido(valor) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(limpio(valor));
  }

  function urlHttp(valor) {
    var s = limpio(valor);
    if (!s || /^drive:[A-Za-z0-9_-]{10,}$/.test(s)) return true;
    try {
      var url = new URL(s);
      return url.protocol === "https:" || url.protocol === "http:";
    } catch (error) {
      return false;
    }
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

  function inscripcion(datos) {
    if (limpio(datos.nombres).length < 2) return "Escribe tus nombres.";
    if (limpio(datos.nombres).length > 80) return "Los nombres son demasiado largos.";
    if (limpio(datos.apellidos).length < 2) return "Escribe tus apellidos.";
    if (limpio(datos.apellidos).length > 80) return "Los apellidos son demasiado largos.";
    if (!/^\d{8,12}$/.test(soloDigitos(datos.dni))) return "El DNI debe tener entre 8 y 12 dígitos.";
    if (!correoValido(datos.correo)) return "Escribe un correo válido.";
    if (limpio(datos.correo).length > 120) return "El correo es demasiado largo.";
    if (datos.categoria !== "profesional" && datos.categoria !== "estudiante") {
      return "Elige si participas como profesional o como estudiante.";
    }
    var telefono = soloDigitos(datos.whatsapp);
    if (telefono.length < 8 || telefono.length > 15) {
      return "Escribe un WhatsApp con código de país. Ejemplo: 51987654321.";
    }
    return "";
  }

  function evento(datos, opciones) {
    opciones = opciones || {};
    if (limpio(datos.titulo).length < 3) return "El título del evento es muy corto.";
    if (limpio(datos.titulo).length > 140) return "El título del evento es demasiado largo.";
    if (limpio(datos.organizacion).length < 2) return "Escribe la organización que realiza el evento.";
    if (limpio(datos.organizacion).length > 140) return "El nombre de la organización es demasiado largo.";
    if (TIPOS.indexOf(datos.tipo) === -1) return "Elige un tipo de evento.";
    if (texto(datos.descripcion).length < 10) return "Cuenta de qué trata el evento (al menos una frase).";
    if (texto(datos.descripcion).length > 4000) return "La descripción es demasiado larga.";
    if (!fechaReal(datos.fecha)) return "Elige una fecha válida.";
    if (limpio(datos.hora) && !/^\d{2}:\d{2}$/.test(limpio(datos.hora))) return "La hora no es válida.";
    if (limpio(datos.lugar).length > 160) return "El lugar es demasiado largo.";
    if (!MODALIDADES.some(function (item) { return item.id === datos.modalidad; })) {
      return "Elige si el evento es presencial, virtual o híbrido.";
    }
    if (!urlHttp(datos.enlace)) return "El enlace del evento debe empezar por http:// o https://.";
    if (!urlHttp(datos.imagen)) return "La imagen debe ser un enlace http:// o https://.";
    if (texto(datos.requisitos).length > 2000) return "Los requisitos son demasiado largos.";
    if (limpio(datos.contacto).length > 120) return "El contacto es demasiado largo.";
    if (limpio(datos.precioProfesional).length > 40 || limpio(datos.precioEstudiante).length > 40) {
      return "El texto de la inversión es demasiado largo.";
    }
    var cupo = limpio(datos.cupo);
    if (cupo && !/^\d+$/.test(cupo)) return "El cupo debe ser un número entero, o quedar vacío si no hay límite.";
    if (cupo && Number(cupo) > 100000) return "El cupo es demasiado alto.";

    var usuario = limpio(datos.organizadorUsuario).toLowerCase();
    var clave = String(datos.organizadorClave || "");
    if (opciones.exigirOrganizador && !usuario) return "Asigna un usuario al organizador de este evento.";
    if (usuario && !/^[a-z0-9._]{3,20}$/.test(usuario)) {
      return "El usuario del organizador usa minúsculas, números, punto o guion bajo, de 3 a 20 caracteres.";
    }
    if (usuario === "admin") return "Ese usuario está reservado para el administrador.";
    if (usuario && limpio(datos.organizadorNombre).length < 2) return "Escribe el nombre del organizador.";
    if (limpio(datos.organizadorNombre).length > 80) return "El nombre del organizador es demasiado largo.";
    if ((opciones.exigirOrganizador || opciones.usuarioNuevo) && usuario && clave.length < 6) {
      return "La clave del organizador debe tener al menos 6 caracteres.";
    }
    if (clave && clave.length < 6) return "La nueva clave debe tener al menos 6 caracteres.";
    if (clave.length > 80) return "La clave es demasiado larga.";
    return "";
  }

  function claveNueva(actual, nueva) {
    if (!String(actual || "")) return "Escribe tu clave actual.";
    if (String(nueva || "").length < 6) return "La nueva clave debe tener al menos 6 caracteres.";
    if (String(nueva || "").length > 80) return "La nueva clave es demasiado larga.";
    return "";
  }

  root.Validar = {
    TIPOS: TIPOS,
    MODALIDADES: MODALIDADES,
    limpio: limpio,
    texto: texto,
    soloDigitos: soloDigitos,
    inscripcion: inscripcion,
    evento: evento,
    claveNueva: claveNueva
  };
})(typeof window !== "undefined" ? window : globalThis);
