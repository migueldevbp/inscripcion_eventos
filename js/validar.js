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
    if (/^data:application\/pdf;base64,[A-Za-z0-9+/=]+$/.test(s)) return true;
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

  function revisarTarifas(lista) {
    var origen = lista || [];
    var utiles = [];
    for (var i = 0; i < origen.length; i++) {
      var nombre = limpio(origen[i] && origen[i].nombre);
      var precio = limpio(origen[i] && origen[i].precio);
      if (!nombre && !precio) continue;
      utiles.push({ nombre: nombre, precio: precio });
    }
    if (!utiles.length) return "Agrega al menos una tarifa.";
    if (utiles.length > 5) return "Puedes agregar hasta 5 tarifas.";
    var vistos = {};
    for (var j = 0; j < utiles.length; j++) {
      if (utiles[j].nombre.length < 2) return "Cada tarifa necesita un nombre.";
      if (utiles[j].nombre.length > 40 || utiles[j].precio.length > 40) return "El nombre o el precio de una tarifa es demasiado largo.";
      var clave = utiles[j].nombre.toLowerCase();
      if (vistos[clave]) return "Hay dos tarifas con el mismo nombre.";
      vistos[clave] = true;
    }
    return "";
  }

  function revisarOrganizadores(lista, opciones) {
    opciones = opciones || {};
    var origen = lista || [];
    var utiles = [];
    var vistos = {};
    for (var i = 0; i < origen.length; i++) {
      var usuario = limpio(origen[i] && origen[i].usuario).toLowerCase();
      var nombre = limpio(origen[i] && origen[i].nombre);
      var clave = String((origen[i] && origen[i].clave) || "");
      if (!usuario && !nombre && !clave) continue;
      utiles.push({
        usuario: usuario,
        nombre: nombre,
        clave: clave,
        existente: Boolean(origen[i] && origen[i].existente)
      });
    }
    if (!utiles.length) return "Agrega al menos un organizador.";
    if (utiles.length > 10) return "Puedes agregar hasta 10 organizadores.";
    for (var j = 0; j < utiles.length; j++) {
      if (!/^[a-z0-9._]{3,20}$/.test(utiles[j].usuario)) {
        return "El usuario del organizador usa minúsculas, números, punto o guion bajo, de 3 a 20 caracteres.";
      }
      if (utiles[j].usuario === "admin") return "Ese usuario está reservado para el administrador.";
      if (utiles[j].nombre.length < 2 || utiles[j].nombre.length > 80) return "Escribe el nombre de cada organizador.";
      if (vistos[utiles[j].usuario]) return "Hay dos organizadores con el mismo usuario.";
      vistos[utiles[j].usuario] = true;
      if ((!utiles[j].existente || opciones.exigirOrganizador) && utiles[j].clave.length < 6) {
        return "La clave de " + utiles[j].usuario + " debe tener al menos 6 caracteres.";
      }
      if (utiles[j].clave && utiles[j].clave.length < 6) {
        return "La nueva clave de " + utiles[j].usuario + " debe tener al menos 6 caracteres.";
      }
      if (utiles[j].clave.length > 80) return "La clave de " + utiles[j].usuario + " es demasiado larga.";
    }
    return "";
  }

  function inscripcion(datos) {
    if (limpio(datos.nombres).length < 2) return "Escribe tus nombres.";
    if (limpio(datos.nombres).length > 80) return "Los nombres son demasiado largos.";
    if (limpio(datos.apellidos).length < 2) return "Escribe tus apellidos.";
    if (limpio(datos.apellidos).length > 80) return "Los apellidos son demasiado largos.";
    if (!/^\d{8}$/.test(soloDigitos(datos.dni))) return "El DNI debe tener 8 números.";
    if (!correoValido(datos.correo)) return "Escribe un correo real, con arroba (@). Ahí llegará tu certificado.";
    if (limpio(datos.correo).length > 120) return "El correo es demasiado largo.";
    if (limpio(datos.categoria).length < 2 || limpio(datos.categoria).length > 40) return "Elige una tarifa.";
    var telefono = soloDigitos(datos.whatsapp);
    if (!/^\d{9}$/.test(telefono)) return "El WhatsApp debe tener 9 números, sin el código de país.";
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
    if (!urlHttp(datos.brochure)) return "El brochure debe ser un PDF subido o un enlace http:// o https://.";
    var errorTarifas = revisarTarifas(datos.tarifas);
    if (errorTarifas) return errorTarifas;
    if (texto(datos.requisitos).length > 2000) return "Los requisitos son demasiado largos.";
    if (limpio(datos.contacto).length > 120) return "El contacto es demasiado largo.";
    var cupo = limpio(datos.cupo);
    if (cupo && !/^\d+$/.test(cupo)) return "El cupo debe ser un número entero, o quedar vacío si no hay límite.";
    if (cupo && Number(cupo) > 100000) return "El cupo es demasiado alto.";
    var orgs = datos.organizadores;
    if ((!orgs || !orgs.length) && limpio(datos.organizadorUsuario)) {
      orgs = [{
        usuario: datos.organizadorUsuario,
        nombre: datos.organizadorNombre,
        clave: datos.organizadorClave || "",
        existente: !(opciones.exigirOrganizador || opciones.usuarioNuevo)
      }];
    }
    return revisarOrganizadores(orgs, opciones);
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
