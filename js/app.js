(function () {
  var estado = {
    sesion: null,
    busqueda: "",
    tipo: "Todos",
    filtroPago: "todos",
    buscaInscritos: "",
    vistaInscritos: "mios",
    rutaClave: "",
    eventos: [],
    listaInscritos: [],
    listaTodas: [],
    eventoActual: null,
    refOrganizador: "",
    fotos: {}
  };
  var renderSeq = 0;
  var busquedaTimer = 0;

  function iconoSvg(nombre) {
    var s = ' fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"';
    var icons = {
      marca: '<svg class="ico" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M4 8.2L12 4l8 4.2v7.1L12 20l-8-4.7V8.2z"' + s + '/><path d="M12 12l8-4.2M12 12v8M12 12L4 7.8"' + s + '/><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none"/></svg>',
      buscar: '<svg class="ico" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><circle cx="11" cy="11" r="6.5"' + s + '/><path d="M20 20l-3.2-3.2"' + s + "/></svg>",
      diploma: '<svg class="ico" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M4 7.2A2.2 2.2 0 016.2 5h11.6A2.2 2.2 0 0120 7.2v6.1A2.2 2.2 0 0117.8 15.5H6.2A2.2 2.2 0 014 13.3V7.2z"' + s + '/><path d="M8 9h8M8 12h5"' + s + '/><path d="M15.4 15.2l1.2 5.1 1.7-1.15 1.7 1.15 1.2-5.1"' + s + "/></svg>",
      calendario: '<svg class="ico" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15" rx="2.5"' + s + '/><path d="M3.5 10h17M8 3.8v3.2M16 3.8v3.2"' + s + '/><circle cx="12" cy="15.2" r="1.35" fill="currentColor" stroke="none"/></svg>',
      eventos: '<svg class="ico" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M5 8h14v11a2 2 0 01-2 2H7a2 2 0 01-2-2V8z"' + s + '/><path d="M5 10h14M9 4.5v4M15 4.5v4"' + s + "/></svg>",
      entrar: '<svg class="ico" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M10 4H7a2 2 0 00-2 2v12a2 2 0 002 2h3"' + s + '/><path d="M14 8l4 4-4 4M10 12h8"' + s + "/></svg>",
      lista: '<svg class="ico" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M9 7h11M9 12h11M9 17h11"' + s + '/><circle cx="5" cy="7" r="1.2" fill="currentColor" stroke="none"/><circle cx="5" cy="12" r="1.2" fill="currentColor" stroke="none"/><circle cx="5" cy="17" r="1.2" fill="currentColor" stroke="none"/></svg>',
      usuario: '<svg class="ico" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><circle cx="12" cy="8" r="3.4"' + s + '/><path d="M5.2 19c1.7-3.1 4-4.4 6.8-4.4s5.1 1.3 6.8 4.4"' + s + "/></svg>",
      check: '<svg class="ico" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><circle cx="12" cy="12" r="8.5"' + s + '/><path d="M8.2 12.2l2.5 2.5 5.1-5.2"' + s + "/></svg>",
      flecha: '<svg class="ico" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"' + s + "/></svg>"
    };
    return icons[nombre] || "";
  }

  function escapar(valor) {
    return String(valor == null ? "" : valor)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function urlSegura(valor) {
    var textoUrl = String(valor || "");
    if (/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(textoUrl) && textoUrl.length < 2000000) return textoUrl;
    try {
      var url = new URL(textoUrl);
      if (url.protocol === "https:" || url.protocol === "http:") return url.href;
    } catch (error) { /* enlace descartado */ }
    return "";
  }

  function fotoVisible(evento) {
    if (!evento) return "";
    if (estado.fotos[evento.id]) return urlSegura(estado.fotos[evento.id]);
    return urlSegura(evento.imagenUrl || (String(evento.imagen || "").indexOf("data:image/") === 0 ? evento.imagen : "") || "");
  }

  function prepararPdf(archivo) {
    return new Promise(function (resolve, reject) {
      if ((archivo.type || "") !== "application/pdf" && !/\.pdf$/i.test(archivo.name || "")) {
        reject(new Error("El brochure debe ser un PDF."));
        return;
      }
      if (archivo.size > 5 * 1024 * 1024) {
        reject(new Error("El PDF pesa más de 5 MB. Elige uno más liviano."));
        return;
      }
      var lector = new FileReader();
      lector.onerror = function () { reject(new Error("No se pudo leer el PDF.")); };
      lector.onload = function () {
        var base64 = String(lector.result || "").split(",")[1] || "";
        if (base64.indexOf("JVBERi") !== 0 || base64.length < 100 || base64.length > 7000000) {
          reject(new Error("No se pudo usar ese PDF. Prueba con otro archivo."));
          return;
        }
        resolve(base64);
      };
      lector.readAsDataURL(archivo);
    });
  }

  function nombreBrochure(titulo) {
    var limpio = String(titulo || "brochure").replace(/[^\w\sáéíóúñÁÉÍÓÚÑ-]+/g, "").trim().replace(/\s+/g, "-");
    return (limpio || "brochure").slice(0, 60) + ".pdf";
  }

  function prepararImagen(archivo) {
    return new Promise(function (resolve, reject) {
      if (!/^image\/(jpeg|png|webp|gif)$/.test(archivo.type || "")) {
        reject(new Error("La foto debe ser JPG, PNG o WEBP."));
        return;
      }
      if (archivo.size > 8 * 1024 * 1024) {
        reject(new Error("Esa foto pesa más de 8 MB. Elige una más liviana."));
        return;
      }
      var lector = new FileReader();
      lector.onerror = function () { reject(new Error("No se pudo leer la foto.")); };
      lector.onload = function () {
        var img = new Image();
        img.onload = function () {
          var maximo = 1400;
          var ancho = img.width;
          var alto = img.height;
          if (ancho > maximo || alto > maximo) {
            if (ancho >= alto) {
              alto = Math.round(alto * maximo / ancho);
              ancho = maximo;
            } else {
              ancho = Math.round(ancho * maximo / alto);
              alto = maximo;
            }
          }
          var lienzo = document.createElement("canvas");
          lienzo.width = Math.max(1, ancho);
          lienzo.height = Math.max(1, alto);
          lienzo.getContext("2d").drawImage(img, 0, 0, lienzo.width, lienzo.height);
          var calidad = 0.82;
          var base64 = "";
          for (var intento = 0; intento < 3; intento++) {
            base64 = (lienzo.toDataURL("image/jpeg", calidad).split(",")[1] || "");
            if (base64.length <= 1500000) break;
            calidad -= 0.18;
          }
          if (base64.indexOf("/9j/") !== 0 || base64.length > 1800000) {
            reject(new Error("La foto sigue siendo muy pesada. Prueba con otra."));
            return;
          }
          resolve(base64);
        };
        img.onerror = function () { reject(new Error("No se pudo abrir esa foto. Usa JPG o PNG.")); };
        img.src = lector.result;
      };
      lector.readAsDataURL(archivo);
    });
  }

  function partesFecha(iso) {
    var coincidencia = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ""));
    if (!coincidencia) return null;
    var anio = Number(coincidencia[1]);
    var mes = Number(coincidencia[2]);
    var dia = Number(coincidencia[3]);
    var fecha = new Date(anio, mes - 1, dia);
    if (fecha.getFullYear() !== anio || fecha.getMonth() !== mes - 1 || fecha.getDate() !== dia) return null;
    return fecha;
  }

  function formatoFecha(iso) {
    var fecha = partesFecha(iso);
    if (!fecha) return "Fecha por confirmar";
    return fecha.toLocaleDateString("es-PE", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  }

  function fechaCorta(iso) {
    var fecha = partesFecha(iso);
    if (!fecha) return { dia: "—", mes: "FECHA" };
    var mes = fecha.toLocaleDateString("es-PE", { month: "short" }).replace(".", "").toUpperCase();
    return { dia: String(fecha.getDate()), mes: mes };
  }

  function esPasado(iso) {
    var fecha = partesFecha(iso);
    if (!fecha) return false;
    fecha.setHours(23, 59, 59, 999);
    return fecha < new Date();
  }

  function formatoCuando(stamp) {
    var partes = String(stamp || "").split(" ");
    var bonita = formatoFecha(partes[0]);
    return partes[1] ? bonita + " · " + partes[1].slice(0, 5) : bonita;
  }

  function modalidadNombre(id) {
    var item = window.Validar.MODALIDADES.find(function (modo) { return modo.id === id; });
    return item ? item.nombre : id || "";
  }

  function precioVisible(valor) {
    var texto = String(valor || "").trim();
    if (!texto || texto === "0" || /^gratis|^gratuito/i.test(texto)) return "Gratuito";
    return texto;
  }

  function tarifasDe(evento) {
    if (evento && evento.tarifas && evento.tarifas.length) return evento.tarifas.slice(0, 5);
    var lista = [];
    if (evento && evento.precioProfesional) lista.push({ nombre: "Profesional", precio: evento.precioProfesional });
    if (evento && evento.precioEstudiante) lista.push({ nombre: "Estudiante", precio: evento.precioEstudiante });
    return lista;
  }

  function nombreCategoria(valor) {
    if (valor === "estudiante") return "Estudiante";
    if (valor === "profesional") return "Profesional";
    return String(valor || "");
  }

  function precioDeTarifa(evento, categoria) {
    var nombre = nombreCategoria(categoria) || String(categoria || "");
    var tarifas = tarifasDe(evento);
    var i;
    for (i = 0; i < tarifas.length; i++) {
      var etiqueta = String(tarifas[i].nombre || "");
      if (etiqueta.toLowerCase() === nombre.toLowerCase() || etiqueta.toLowerCase() === String(categoria || "").toLowerCase()) {
        return tarifas[i].precio || "";
      }
    }
    if (categoria === "profesional" || /^profesional$/i.test(nombre)) return (evento && evento.precioProfesional) || "";
    if (categoria === "estudiante" || /^estudiante$/i.test(nombre)) return (evento && evento.precioEstudiante) || "";
    return "";
  }

  function muestraConteo(evento) {
    return !evento || evento.mostrarInscritos !== false;
  }

  function htmlFilaTarifa(tarifa) {
    return '<div class="fila-tarifa"><label class="campo"><span>Nombre</span><input name="tarifaNombre" maxlength="40" value="' + escapar(tarifa.nombre || "") + '" placeholder="Ej. Profesional"></label><label class="campo"><span>Precio</span><input name="tarifaPrecio" maxlength="40" value="' + escapar(tarifa.precio || "") + '" placeholder="S/ 80 o Gratuito"></label><button type="button" class="btn btn-peligro" data-accion="quitar-tarifa">Quitar</button></div>';
  }

  function organizadoresDe(evento) {
    if (evento && evento.organizadores && evento.organizadores.length) return evento.organizadores.slice(0, 10);
    if (evento && evento.organizadorUsuario) {
      return [{ usuario: evento.organizadorUsuario, nombre: evento.organizadorNombre || "", existente: true }];
    }
    return [];
  }

  function htmlFilaOrganizador(org) {
    var existente = !!org.existente || !!org.id;
    var usuarioCampo = existente
      ? '<input type="hidden" name="orgUsuario" value="' + escapar(org.usuario || "") + '"><p class="nota" style="margin:0">Usuario: <strong>' + escapar(org.usuario || "") + "</strong></p>"
      : '<label class="campo"><span>Usuario</span><input name="orgUsuario" maxlength="20" autocomplete="off" placeholder="ej. metrica1" value="' + escapar(org.usuario || "") + '"></label>';
    return '<div class="fila-org" data-existente="' + (existente ? "1" : "0") + '">' +
      usuarioCampo +
      '<label class="campo"><span>Nombre</span><input name="orgNombre" maxlength="80" value="' + escapar(org.nombre || "") + '" placeholder="Nombre completo"></label>' +
      '<label class="campo"><span>WhatsApp</span><input name="orgWhatsapp" inputmode="numeric" maxlength="9" pattern="[0-9]{9}" placeholder="987654321" value="' + escapar(org.whatsapp || "") + '"></label>' +
      '<label class="campo"><span>' + (existente ? "Nueva clave (opcional)" : "Clave") + '</span><input name="orgClave" type="password" minlength="6" autocomplete="new-password" placeholder="' + (existente ? "Sin cambio" : "Mínimo 6") + '"></label>' +
      '<button type="button" class="btn btn-peligro" data-accion="quitar-org">Quitar</button></div>';
  }

  function mensajeWhatsappPago(datos) {
    var info = datos || {};
    var cat = nombreCategoria(info.categoria) || String(info.categoria || "").trim() || "la categoría elegida";
    var precio = String(info.precio || "").trim();
    var catLinea = cat + (precio ? " (" + precioVisible(precio) + ")" : "");
    var lineas = [
      "Hola, me inscribí desde el Portal de Capacitaciones.",
      "",
      "Evento: " + String(info.titulo || "este evento")
    ];
    if (info.organizacion) lineas.push("Organización: " + String(info.organizacion));
    if (info.fecha) lineas.push("Fecha del evento: " + formatoFecha(info.fecha));
    lineas.push("Categoría de pago: " + catLinea);
    if (info.folio) lineas.push("Folio de inscripción: " + String(info.folio));
    if (info.nombres || info.apellidos) {
      lineas.push("Nombre: " + [info.nombres, info.apellidos].filter(Boolean).join(" ").trim());
    }
    if (info.dni) lineas.push("DNI: " + String(info.dni));
    if (info.correo) lineas.push("Correo: " + String(info.correo));
    if (info.whatsapp) lineas.push("Mi WhatsApp: " + String(info.whatsapp));
    lineas.push("", "Quisiera coordinar el pago de esa categoría. Gracias.");
    return lineas.join("\n");
  }

  function enlaceWaOrganizador(whatsapp, mensaje) {
    var digitos = String(whatsapp || "").replace(/\D/g, "");
    if (digitos.length === 9) digitos = "51" + digitos;
    if (digitos.length < 11) return "";
    return "https://wa.me/" + digitos + "?text=" + encodeURIComponent(mensaje || "");
  }

  function ordenarOrgsPago(orgs, refUsuario) {
    var lista = (orgs || []).slice();
    if (!refUsuario) return lista;
    var ref = String(refUsuario).toLowerCase();
    lista.sort(function (a, b) {
      var aRef = String(a.usuario || "").toLowerCase() === ref ? 0 : 1;
      var bRef = String(b.usuario || "").toLowerCase() === ref ? 0 : 1;
      return aRef - bRef;
    });
    return lista;
  }

  function cerrarModalPago(fondo) {
    if (!fondo || !fondo.parentNode) return;
    document.body.classList.remove("modal-abierto");
    document.removeEventListener("keydown", fondo._teclaPago);
    fondo.remove();
    ir("#/");
  }

  function mostrarModalPago(opciones) {
    var datos = opciones || {};
    var orgs = ordenarOrgsPago(datos.organizadores || [], datos.refOrganizador).filter(function (item) {
      return item.whatsapp;
    });
    var mensaje = mensajeWhatsappPago(datos.mensaje || {});
    var catLabel = nombreCategoria(datos.mensaje && datos.mensaje.categoria) || (datos.mensaje && datos.mensaje.categoria) || "";
    var precioLabel = datos.mensaje && datos.mensaje.precio ? precioVisible(datos.mensaje.precio) : "";
    var tituloModal = orgs.length === 1 ? "Organizador para el pago" : (orgs.length ? "Elige a quién escribir" : "Inscripción registrada");
    var listaHtml = orgs.length
      ? orgs.map(function (org) {
          var href = enlaceWaOrganizador(org.whatsapp, mensaje);
          return '<div class="org-chip">' +
            "<div><strong>" + escapar(org.nombre || org.usuario) + "</strong>" +
            '<span class="org-tel">' + escapar(org.whatsapp) + "</span></div>" +
            (href ? '<a class="btn btn-wa" href="' + escapar(href) + '" target="_blank" rel="noopener noreferrer">WhatsApp</a>' : "") +
            "</div>";
        }).join("")
      : '<p class="nota">Este evento aún no tiene WhatsApp de organizador cargado. Guarda tu folio y contacta a la organización por otros medios.</p>';

    var fondo = document.createElement("div");
    fondo.className = "modal-fondo modal-pago-fondo";
    fondo.innerHTML =
      '<div class="modal modal-pago" role="dialog" aria-modal="true" aria-labelledby="titulo-modal-pago">' +
      (datos.folio ? '<p class="folio">' + escapar(datos.folio) + "</p>" : "") +
      '<h2 id="titulo-modal-pago">' + escapar(tituloModal) + "</h2>" +
      '<p class="nota">Escríbeles por WhatsApp para coordinar el pago. El mensaje ya identifica el evento y tu categoría.</p>' +
      '<div class="resumen-pago">' +
      "<p><strong>Evento</strong> " + escapar(datos.mensaje && datos.mensaje.titulo || "") + "</p>" +
      (catLabel ? "<p><strong>Categoría</strong> " + escapar(catLabel) + (precioLabel ? " · " + escapar(precioLabel) : "") + "</p>" : "") +
      "</div>" +
      '<div class="lista-org-contacto">' + listaHtml + "</div>" +
      '<div class="acciones"><button type="button" class="btn btn-primario" data-cerrar-pago>Listo, volver al inicio</button></div>' +
      "</div>";

    function tecla(evento) {
      if (evento.key === "Escape") cerrarModalPago(fondo);
    }
    fondo._teclaPago = tecla;
    document.body.classList.add("modal-abierto");
    document.body.appendChild(fondo);
    document.addEventListener("keydown", tecla);
    var botonCerrar = fondo.querySelector("[data-cerrar-pago]");
    if (botonCerrar) {
      botonCerrar.focus();
      botonCerrar.onclick = function () { cerrarModalPago(fondo); };
    }
    fondo.addEventListener("click", function (evento) {
      if (evento.target === fondo) cerrarModalPago(fondo);
    });
  }

  function enlaceOrganizador(eventoId, usuario) {
    var base = location.href.split("#")[0].split("?")[0];
    return base + "#/evento/" + encodeURIComponent(eventoId) + "?ref=" + encodeURIComponent(usuario);
  }

  function leerRefDeHash() {
    var hash = location.hash || "";
    var q = hash.indexOf("?");
    var texto = q >= 0 ? hash.slice(q + 1) : String(location.search || "").replace(/^\?/, "");
    if (!texto) return "";
    var partes = texto.split("&");
    for (var i = 0; i < partes.length; i++) {
      var par = partes[i].split("=");
      if (decodeURIComponent(par[0] || "") === "ref") return decodeURIComponent(par[1] || "").trim().toLowerCase();
    }
    return "";
  }

  function nombreSitio() {
    return window.APP_CONFIG.NOMBRE_SITIO || "Portal de Capacitaciones";
  }

  function parseRuta() {
    var crudo = location.hash || "#/";
    var sinQuery = crudo.split("?")[0];
    var hash = decodeURIComponent(sinQuery);
    var partes = hash.replace(/^#\/?/, "").split("/").filter(Boolean);
    return {
      nombre: partes[0] || "inicio",
      a: partes[1] || "",
      b: partes[2] || "",
      clave: sinQuery || "#/"
    };
  }

  function ir(hash) {
    if ((location.hash || "#/") === hash) render();
    else location.hash = hash;
  }

  function avisar(mensaje, tipo) {
    var zona = document.getElementById("avisos");
    var item = document.createElement("div");
    item.className = "aviso" + (tipo === "mal" ? " mal" : "");
    item.textContent = mensaje;
    zona.appendChild(item);
    setTimeout(function () { item.remove(); }, 4600);
  }

  function confirmar(mensaje, aceptar) {
    return new Promise(function (resolve) {
      var fondo = document.createElement("div");
      fondo.className = "modal-fondo";
      fondo.innerHTML = '<div class="modal" role="dialog" aria-modal="true"><h2>Confirmar</h2><p></p><div class="acciones"><button type="button" class="btn btn-primario" data-ok></button><button type="button" class="btn btn-secundario" data-no>Cancelar</button></div></div>';
      fondo.querySelector("p").textContent = mensaje;
      fondo.querySelector("[data-ok]").textContent = aceptar || "Confirmar";
      document.body.appendChild(fondo);
      fondo.querySelector("[data-ok]").focus();
      function cerrar(valor) {
        fondo.remove();
        document.removeEventListener("keydown", tecla);
        resolve(valor);
      }
      function tecla(evento) {
        if (evento.key === "Escape") cerrar(false);
      }
      document.addEventListener("keydown", tecla);
      fondo.querySelector("[data-ok]").onclick = function () { cerrar(true); };
      fondo.querySelector("[data-no]").onclick = function () { cerrar(false); };
      fondo.addEventListener("click", function (evento) {
        if (evento.target === fondo) cerrar(false);
      });
    });
  }

  function ponerError(form, mensaje) {
    var caja = form.querySelector(".caja-error");
    if (!caja) {
      caja = document.createElement("div");
      caja.className = "caja-error";
      caja.setAttribute("role", "alert");
      form.prepend(caja);
    }
    caja.textContent = mensaje;
  }

  function htmlAviso() {
    if (window.urlEnModoDev()) {
      return '<div class="ancho aviso-config">La URL del script termina en /dev y solo funciona para ti dentro de Google. Implementa la aplicación web y pega la dirección que termina en /exec.</div>';
    }
    if (window.scriptConfigurado()) return "";
    var url = String(window.APP_CONFIG.SCRIPT_URL || "").trim();
    if (url) {
      return '<div class="ancho aviso-config">La dirección pegada en js/config.js no es una aplicación web de Google. Tiene que empezar por https://script.google.com y terminar en /exec.</div>';
    }
    return '<div class="ancho aviso-demo" role="status">Vista de prueba en este navegador: estos registros todavía no van a Google. Para usar tu hoja, pega la URL del script en js/config.js. Prueba con admin / admin123 o, para un evento, lima.cursos / evento123. <button type="button" data-accion="reset-demo">Reiniciar prueba</button></div>';
  }

  function marco(contenido, hero) {
    var sesion = estado.sesion;
    var ruta = parseRuta();
    var panelHref = sesion && sesion.rol === "admin" ? "#/admin" : "#/panel";
    var panelTexto = sesion && sesion.rol === "admin" ? "Administrar" : "Mis inscritos";
    var menu = '<a class="menu-enlace" href="#/"' + (ruta.nombre === "inicio" || ruta.nombre === "evento" ? ' aria-current="page"' : "") + '>' + iconoSvg("eventos") + "<span>Eventos</span></a>";
    if (sesion) {
      menu += '<span class="quien">' + escapar(sesion.nombre) + "</span>";
      menu += '<a class="menu-enlace" href="' + panelHref + '"' + (ruta.nombre === "admin" || ruta.nombre === "panel" ? ' aria-current="page"' : "") + ">" + iconoSvg("lista") + "<span>" + panelTexto + "</span></a>";
      menu += '<a class="menu-enlace" href="#/cuenta"' + (ruta.nombre === "cuenta" ? ' aria-current="page"' : "") + ">" + iconoSvg("usuario") + "<span>Contraseña</span></a>";
      menu += '<button type="button" class="btn btn-claro" data-accion="salir">Salir</button>';
    } else {
      menu += '<a class="btn btn-claro btn-entrar" href="#/entrar"' + (ruta.nombre === "entrar" ? ' aria-current="page"' : "") + ">" + iconoSvg("entrar") + "<span>Entrar</span></a>";
    }
    return "" +
      '<a class="saltar" href="#contenido">Saltar al contenido</a>' +
      '<div class="tope"><header class="barra"><div class="ancho barra-inner">' +
      '<a class="marca" href="#/"><span class="marca-signo" aria-hidden="true">' + iconoSvg("marca") + '</span><span class="marca-texto">' + escapar(nombreSitio()) + "</span></a>" +
      '<nav class="menu" aria-label="Principal">' + menu + "</nav></div></header>" + htmlAviso() + "</div>" +
      '<main id="contenido" class="principal" tabindex="-1">' + (hero || "") + '<div class="ancho">' + contenido + "</div></main>" +
      '<footer class="pie"><div class="ancho"><strong>' + escapar(nombreSitio()) + "</strong><p>" + escapar(window.APP_CONFIG.BAJADA || "") + " El pago lo confirma la organización de cada evento.</p></div></footer>";
  }

  function ordenarEventos(lista) {
    return lista.slice().sort(function (a, b) {
      var pasadoA = esPasado(a.fecha) ? 1 : 0;
      var pasadoB = esPasado(b.fecha) ? 1 : 0;
      if (pasadoA !== pasadoB) return pasadoA - pasadoB;
      return String(a.fecha).localeCompare(String(b.fecha));
    });
  }

  function filtrarPublicos(lista) {
    var q = estado.busqueda.trim().toLowerCase();
    return ordenarEventos(lista).filter(function (evento) {
      if (estado.tipo !== "Todos" && evento.tipo !== estado.tipo) return false;
      if (!q) return true;
      var blob = [evento.titulo, evento.organizacion, evento.tipo, evento.lugar, evento.descripcion].join(" ").toLowerCase();
      return blob.indexOf(q) !== -1;
    });
  }

  function htmlTarjeta(evento, indice) {
    var sello = fechaCorta(evento.fecha);
    var foto = fotoVisible(evento);
    var esperaFoto = !foto && (evento.tieneImagen || evento.imagen);
    var lleno = evento.cupo && Number(evento.inscritos || 0) >= Number(evento.cupo);
    var cupo = evento.cupo ? (evento.inscritos || 0) + " de " + evento.cupo : (evento.inscritos || 0) + " inscritos";
    var pillConteo = "";
    if (muestraConteo(evento)) pillConteo = '<span class="pill">' + escapar(cupo) + "</span>";
    else if (lleno) pillConteo = '<span class="pill pill-off">Cupo lleno</span>';
    var retardo = Math.min(Number(indice) || 0, 8) * 45;
    return '<a class="tarjeta" href="#/evento/' + escapar(evento.id) + '" style="--i:' + retardo + 'ms">' +
      '<div class="portada' + (foto ? "" : " sin-foto") + (esperaFoto ? " foto-carga" : "") + '"><span class="etiqueta-tipo">' + escapar(evento.tipo) + "</span>" +
      '<img alt="" data-evento-foto="' + escapar(evento.id) + '" src="' + (foto ? escapar(foto) : "") + '" loading="lazy" decoding="async" referrerpolicy="no-referrer"' + (foto ? "" : " hidden") + ">" +
      "</div>" +
      '<div class="cuerpo-tarjeta"><div class="fila-sello"><div><p class="meta">' + escapar(evento.organizacion) + "</p><h2>" + escapar(evento.titulo) + "</h2></div>" +
      '<span class="sello"><span class="sello-mes">' + escapar(sello.mes) + '</span><span class="sello-dia">' + escapar(sello.dia) + "</span></span></div>" +
      '<p class="meta">' + escapar(modalidadNombre(evento.modalidad)) + (evento.lugar ? " · " + escapar(evento.lugar) : "") + "</p>" +
      '<div class="pills">' + pillConteo +
      (lleno && muestraConteo(evento) ? '<span class="pill pill-off">Cupo lleno</span>' : "") +
      (esPasado(evento.fecha) ? '<span class="pill pill-aviso">Fecha pasada</span>' : "") +
      '</div><span class="tarjeta-cta">Ver evento ' + iconoSvg("flecha") + "</span></div></a>";
  }

  function htmlGrilla() {
    var lista = filtrarPublicos(estado.eventos);
    if (!estado.eventos.length) {
      return '<div class="vacio"><h2>No hay eventos abiertos</h2><p>Cuando el administrador active uno, aparecerá aquí.</p></div>';
    }
    if (!lista.length) return '<div class="vacio"><h2>Ningún evento coincide</h2><p>Prueba con otra palabra o con otro tipo.</p></div>';
    return lista.map(function (evento, i) { return htmlTarjeta(evento, i); }).join("");
  }

  function pintarGrilla() {
    var grilla = document.getElementById("grilla");
    if (grilla) grilla.innerHTML = htmlGrilla();
    cargarFotosGrilla();
  }

  async function cargarFotosGrilla() {
    if (!window.API.imagenesPublicas) return;
    var ids = estado.eventos.filter(function (evento) {
      return (evento.tieneImagen || evento.imagen) && !estado.fotos[evento.id] && !evento.imagenUrl;
    }).map(function (evento) { return evento.id; }).slice(0, 24);
    if (!ids.length) return;
    try {
      var imagenes = await window.API.imagenesPublicas(ids);
      Object.keys(imagenes || {}).forEach(function (id) {
        if (!imagenes[id]) return;
        estado.fotos[id] = imagenes[id];
        var evento = estado.eventos.find(function (item) { return item.id === id; });
        if (evento) evento.imagenUrl = imagenes[id];
        var img = document.querySelector('[data-evento-foto="' + id.replace(/"/g, "") + '"]');
        if (img) {
          img.hidden = false;
          img.src = imagenes[id];
          if (img.parentElement) img.parentElement.classList.remove("sin-foto", "foto-carga");
          img.classList.add("foto-lista");
        }
      });
      document.querySelectorAll(".portada.foto-carga").forEach(function (nodo) {
        if (!nodo.querySelector("img[src]:not([src=''])")) nodo.classList.remove("foto-carga");
      });
    } catch (error) { /* la grilla ya se ve sin fotos */ }
  }

  async function vistaInicio() {
    estado.eventos = await window.API.eventosPublicos();
    document.title = nombreSitio();
    var proximo = ordenarEventos(estado.eventos).find(function (evento) { return !esPasado(evento.fecha); });
    var tipos = ["Todos"].concat(window.Validar.TIPOS.filter(function (tipo) {
      return estado.eventos.some(function (evento) { return evento.tipo === tipo; });
    }));
    var hero = '<div class="hero-franja"><div class="hero-fondo" aria-hidden="true"></div><section class="hero ancho"><div class="hero-copy anim-entrar">' +
      '<p class="sobrelinea"><span class="sobrelinea-icono" aria-hidden="true">' + iconoSvg("diploma") + "</span> Programación abierta</p>" +
      "<h1>Inscríbete a cursos y capacitaciones</h1>" +
      '<p class="lead">Elige un evento, deja tus datos y coordina el pago con la organización. Claro, ágil y listo para tu equipo.</p>' +
      '<div class="hero-acciones"><button type="button" class="btn btn-hero" data-accion="ir-grilla">Ver programación</button></div>' +
      "</div>" +
      (proximo
        ? '<a class="proximo anim-entrar anim-delay" href="#/evento/' + escapar(proximo.id) + '">' +
          '<span class="proximo-etiqueta"><span class="proximo-icono" aria-hidden="true">' + iconoSvg("calendario") + "</span> Próximo evento</span>" +
          "<strong>" + escapar(proximo.titulo) + "</strong>" +
          "<em>" + escapar(proximo.organizacion) + " · " + escapar(formatoFecha(proximo.fecha)) + "</em>" +
          '<span class="proximo-cta">Abrir ficha ' + iconoSvg("flecha") + "</span></a>"
        : "") +
      "</section></div>";
    var chips = tipos.map(function (tipo) {
      return '<button type="button" class="chip" data-accion="tipo" data-tipo="' + escapar(tipo) + '" aria-pressed="' + (estado.tipo === tipo ? "true" : "false") + '">' + escapar(tipo) + "</button>";
    }).join("");
    var cuerpo = '<div class="herramientas anim-entrar"><label class="buscador-wrap">' + iconoSvg("buscar") + '<input id="buscar-eventos" class="buscador" type="search" placeholder="Buscar por curso, organización o lugar" value="' + escapar(estado.busqueda) + '" aria-label="Buscar eventos"></label><div class="chips">' + chips + "</div></div>" +
      '<div id="grilla" class="grilla" aria-live="polite">' + htmlGrilla() + "</div>" +
      '<section class="pasos">' +
      '<article class="anim-entrar"><span class="paso-icono" aria-hidden="true">' + iconoSvg("lista") + "</span><strong>1. Elige el evento</strong><p>Revisa de qué trata, la fecha y la organización.</p></article>" +
      '<article class="anim-entrar anim-delay"><span class="paso-icono" aria-hidden="true">' + iconoSvg("usuario") + "</span><strong>2. Registra tus datos</strong><p>Nombre, DNI, correo, categoría y WhatsApp.</p></article>" +
      '<article class="anim-entrar anim-delay-2"><span class="paso-icono" aria-hidden="true">' + iconoSvg("check") + "</span><strong>3. Espera la confirmación</strong><p>La organización marca el pago y puede escribirte.</p></article>" +
      "</section>";
    return marco(cuerpo, hero);
  }

  function htmlContacto(contacto) {
    var texto = String(contacto || "").trim();
    if (!texto) return "";
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(texto)) return '<a href="mailto:' + escapar(texto) + '">' + escapar(texto) + "</a>";
    return escapar(texto);
  }

  async function vistaEvento(id) {
    var evento;
    try {
      evento = await window.API.eventoPublico(id);
    } catch (error) {
      document.title = "Evento no encontrado · " + nombreSitio();
      return marco('<a class="volver" href="#/">← Todos los eventos</a><div class="vacio"><h1>No encontramos ese evento</h1><p>' + escapar(error.message) + "</p></div>");
    }
    document.title = evento.titulo + " · " + nombreSitio();
    estado.eventoVista = evento;
    if (evento.imagenUrl) estado.fotos[evento.id] = evento.imagenUrl;
    var ref = leerRefDeHash();
    if (ref) estado.refOrganizador = ref;
    var lleno = evento.cupo && Number(evento.inscritos || 0) >= Number(evento.cupo);
    var enlace = urlSegura(evento.enlace);
    var quedan = evento.cupo ? Math.max(0, Number(evento.cupo) - Number(evento.inscritos || 0)) : null;
    var tarifas = tarifasDe(evento);
    var orgsPublicos = organizadoresDe(evento);
    var datos = [
      ["Organización", escapar(evento.organizacion)],
      ["Fecha", escapar(formatoFecha(evento.fecha) + (evento.hora ? " · " + evento.hora : ""))],
      ["Modalidad", escapar(modalidadNombre(evento.modalidad))],
      ["Lugar", escapar(evento.lugar || "Por confirmar")]
    ];
    if (orgsPublicos.length) datos.push(["Organizadores", escapar(String(orgsPublicos.length))]);
    tarifas.forEach(function (tarifa) {
      datos.push([tarifa.nombre, escapar(precioVisible(tarifa.precio))]);
    });
    var ficha = '<a class="volver" href="#/">← Todos los eventos</a><article class="ficha"><div class="prosa">' +
      '<div class="pills"><span class="pill">' + escapar(evento.tipo) + "</span>" +
      (esPasado(evento.fecha) ? '<span class="pill pill-aviso">Fecha pasada</span>' : "") + "</div>" +
      "<h1>" + escapar(evento.titulo) + "</h1><p class=\"meta\">Organiza " + escapar(evento.organizacion) + "</p>" +
      '<div class="datos">' + datos.map(function (par) {
        return '<div class="dato"><span>' + par[0] + "</span>" + par[1] + "</div>";
      }).join("") + "</div>" +
      '<div class="descripcion">' + escapar(evento.descripcion) + "</div>" +
      (evento.requisitos ? "<h2 style=\"margin-top:22px\">Requisitos</h2><div class=\"descripcion\">" + escapar(evento.requisitos) + "</div>" : "") +
      (evento.contacto ? '<p class="meta" style="margin-top:16px">Contacto general: ' + htmlContacto(evento.contacto) + "</p>" : "") +
      (enlace ? '<p style="margin-top:12px"><a href="' + escapar(enlace) + '" target="_blank" rel="noopener noreferrer">Abrir enlace del evento</a></p>' : "") +
      (evento.tieneBrochure || evento.brochure ? '<p style="margin-top:12px"><button type="button" class="btn btn-secundario" data-accion="descargar-brochure" data-id="' + escapar(evento.id) + '" data-titulo="' + escapar(evento.titulo) + '">Descargar brochure (PDF)</button></p>' : "") +
      '</div><div class="col-form"><div class="tarjeta-form" id="formulario">';

    if (!evento.activo) {
      ficha += "<h2>Inscripciones cerradas</h2><p>Este evento no recibe registros en este momento.</p>";
    } else if (lleno) {
      ficha += "<h2>Cupo completo</h2><p>Ya no quedan lugares. Puedes escribir a la organización si abrieran una vacante.</p>";
    } else {
      var notaCupo = "Sin límite de cupo.";
      if (quedan != null) notaCupo = muestraConteo(evento) ? quedan + " cupos libres." : "Inscripciones abiertas.";
      ficha += "<h2>Inscribirme</h2><p class=\"nota\">" + notaCupo + (estado.refOrganizador ? " Inscripción vinculada a " + escapar(estado.refOrganizador) + "." : "") + "</p>" +
        '<form id="form-inscripcion" method="post" action="#/"><input type="hidden" name="eventoId" value="' + escapar(evento.id) + '">' +
        '<input type="hidden" name="organizadorUsuario" value="' + escapar(estado.refOrganizador || "") + '">' +
        '<div class="campo" style="margin-top:12px"><span>Nombres</span><input name="nombres" aria-label="Nombres" required maxlength="80" autocomplete="given-name"></div>' +
        '<div class="campo" style="margin-top:10px"><span>Apellidos</span><input name="apellidos" aria-label="Apellidos" required maxlength="80" autocomplete="family-name"></div>' +
        '<div class="campo" style="margin-top:10px"><span>DNI</span><input name="dni" aria-label="DNI" required inputmode="numeric" maxlength="8" pattern="[0-9]{8}" autocomplete="off" placeholder="8 números"></div>' +
        '<div class="campo" style="margin-top:10px"><span>Correo</span><input name="correo" aria-label="Correo" type="email" required maxlength="120" autocomplete="email" placeholder="tunombre@correo.com"><p class="nota">Usa un correo real. Ahí llegará tu certificado.</p></div>' +
        '<div class="campo" style="margin-top:10px"><span>Categoría</span><div class="opciones">' +
        tarifas.map(function (tarifa) {
          return '<label class="opcion"><input type="radio" name="categoria" value="' + escapar(tarifa.nombre) + '"><span>' + escapar(tarifa.nombre) + "<small>" + escapar(precioVisible(tarifa.precio)) + "</small></span></label>";
        }).join("") +
        "</div></div>" +
        '<div class="campo" style="margin-top:10px"><span>WhatsApp</span><input name="whatsapp" aria-label="WhatsApp" required inputmode="numeric" maxlength="9" pattern="[0-9]{9}" placeholder="987654321" autocomplete="tel"></div>' +
        '<button class="btn btn-primario" style="margin-top:14px;width:100%" type="submit">Enviar inscripción</button></form>';
    }
    ficha += "</div></div></article>";
    return marco(ficha);
  }

  function vistaEntrar() {
    document.title = "Entrar · " + nombreSitio();
    if (estado.sesion) {
      ir(estado.sesion.rol === "admin" ? "#/admin" : "#/panel");
      return marco('<p class="cargando">Abriendo tu panel…</p>');
    }
    return marco('<div class="bloque login-caja panel-premium"><h1>Entrar</h1><p class="nota">El administrador crea los eventos. Cada organización entra con el usuario de su evento.</p><form id="form-login" method="post" action="#/entrar"><div class="campo" style="margin-top:12px"><span>Usuario</span><input name="usuario" aria-label="Usuario" required autocomplete="username"></div><div class="campo" style="margin-top:10px"><span>Contraseña</span><input name="clave" aria-label="Contraseña" type="password" required autocomplete="current-password"></div><button class="btn btn-primario" style="margin-top:14px" type="submit">Entrar</button></form></div>');
  }

  async function vistaAdmin() {
    if (!exigirRol("admin")) return vistaEntrar();
    document.title = "Administrar · " + nombreSitio();
    var eventos = ordenarEventos(await window.API.eventosAdmin());
    var filas = eventos.length ? eventos.map(function (evento) {
      var orgs = organizadoresDe(evento);
      var textoOrg = orgs.length
        ? (orgs.length === 1 ? "Usuario " + orgs[0].usuario : orgs.length + " organizadores · " + orgs.map(function (item) { return item.usuario; }).join(", "))
        : "Sin organizadores";
      return '<article class="fila-evento"><div><div class="pills"><span class="pill ' + (evento.activo ? "pill-ok" : "pill-off") + '">' + (evento.activo ? "Abierto" : "Pausado") + "</span><span class=\"pill\">" + escapar(evento.tipo) + '</span></div><h2>' + escapar(evento.titulo) + "</h2><p class=\"meta\">" + escapar(evento.organizacion) + " · " + escapar(formatoFecha(evento.fecha)) + " · " + (evento.inscritos || 0) + " inscritos · " + (evento.pagados || 0) + " pagaron · " + escapar(textoOrg) + "</p></div><div class=\"acciones\"><a class=\"btn btn-secundario\" href=\"#/admin/inscritos/" + escapar(evento.id) + "\">Inscritos</a><a class=\"btn btn-secundario\" href=\"#/admin/editar/" + escapar(evento.id) + "\">Editar</a><button type=\"button\" class=\"btn btn-peligro\" data-accion=\"activar\" data-id=\"" + escapar(evento.id) + "\" data-activo=\"" + (evento.activo ? "1" : "0") + "\">" + (evento.activo ? "Desactivar" : "Activar") + "</button></div></article>";
    }).join("") : '<div class="vacio"><h2>Todavía no hay eventos</h2><p>Crea el primero y asigna el usuario de su organizador.</p></div>';
    return marco('<div class="panel-premium"><div class="subnav"><a class="btn btn-primario" href="#/admin" aria-current="page">Eventos</a><a class="btn btn-secundario" href="#/admin/nuevo">Nuevo evento</a></div><div class="encabezado-pagina"><h1>Eventos</h1><p>Activa, pausa o abre la lista. Al pausar un evento deja de aparecer en la programación y no acepta inscripciones.</p></div>' + filas + "</div>");
  }

  function opcionesSelect(lista, actual, etiqueta) {
    return lista.map(function (item) {
      var id = typeof item === "string" ? item : item.id;
      var nombre = typeof item === "string" ? item : item.nombre;
      return '<option value="' + escapar(id) + '"' + (id === actual ? " selected" : "") + ">" + escapar(etiqueta ? etiqueta(item) : nombre) + "</option>";
    }).join("");
  }

  async function vistaFormEvento(id) {
    if (!exigirRol("admin")) return vistaEntrar();
    var evento = {
      id: "", titulo: "", organizacion: "", tipo: "Curso", descripcion: "", fecha: "", hora: "", lugar: "",
      modalidad: "presencial", enlace: "", cupo: "", tarifas: [{ nombre: "Profesional", precio: "" }, { nombre: "Estudiante", precio: "" }],
      mostrarInscritos: true, requisitos: "", contacto: "", imagen: "", brochure: "", activo: true, organizadores: [{ usuario: "", nombre: "", existente: false }]
    };
    if (id) {
      var detalle = await window.API.detalleAdmin(id);
      evento = detalle.evento;
    }
    var tarifasForm = tarifasDe(evento);
    if (!tarifasForm.length) tarifasForm = [{ nombre: "", precio: "" }];
    var filasTarifa = tarifasForm.map(htmlFilaTarifa).join("");
    var orgsForm = organizadoresDe(evento);
    if (!orgsForm.length) orgsForm = [{ usuario: "", nombre: "", whatsapp: "", existente: false }];
    else orgsForm = orgsForm.map(function (item) {
      return { usuario: item.usuario, nombre: item.nombre || "", whatsapp: item.whatsapp || "", existente: true, id: item.id || "" };
    });
    var filasOrg = orgsForm.map(htmlFilaOrganizador).join("");
    var enlaces = id ? orgsForm.filter(function (item) { return item.usuario; }).map(function (item) {
      return '<div class="enlace-card"><p>Enlace de <strong>' + escapar(item.nombre || item.usuario) + "</strong></p>" +
        '<button type="button" class="btn btn-secundario" data-accion="copiar-enlace" data-enlace="' + escapar(enlaceOrganizador(id, item.usuario)) + '">Copiar enlace</button></div>';
    }).join("") : "";
    document.title = (id ? "Editar evento" : "Nuevo evento") + " · " + nombreSitio();
    return marco('<div class="subnav"><a class="btn btn-secundario" href="#/admin">Eventos</a><a class="btn btn-primario" href="#/admin/nuevo">Nuevo evento</a></div>' +
      '<form id="form-evento" method="post" action="#/admin/nuevo" class="form-pagina panel-premium" data-nuevo="' + (id ? "0" : "1") + '">' +
      '<input type="hidden" name="eventoId" value="' + escapar(evento.id) + '">' +
      '<section class="bloque"><h2>' + (id ? "Editar evento" : "Nuevo evento") + "</h2>" +
      '<div class="campo campo-ancho"><span>Título</span><input name="titulo" aria-label="Título" required maxlength="140" value="' + escapar(evento.titulo) + '"></div>' +
      '<div class="campo"><span>Organización</span><input name="organizacion" aria-label="Organización" required maxlength="140" value="' + escapar(evento.organizacion) + '"></div>' +
      '<div class="campo"><span>Tipo</span><select name="tipo">' + opcionesSelect(window.Validar.TIPOS, evento.tipo) + "</select></div>" +
      '<div class="campo campo-ancho"><span>De qué trata</span><textarea name="descripcion" aria-label="De qué trata" required maxlength="4000">' + escapar(evento.descripcion) + "</textarea></div>" +
      '<div class="campo"><span>Fecha</span><input name="fecha" type="date" required value="' + escapar(evento.fecha) + '"></div>' +
      '<div class="campo"><span>Hora</span><input name="hora" type="time" value="' + escapar(evento.hora || "") + '"></div>' +
      '<div class="campo"><span>Lugar</span><input name="lugar" maxlength="160" value="' + escapar(evento.lugar || "") + '"></div>' +
      '<div class="campo"><span>Modalidad</span><select name="modalidad">' + opcionesSelect(window.Validar.MODALIDADES, evento.modalidad) + "</select></div>" +
      '<div class="campo"><span>Enlace (opcional)</span><input name="enlace" type="url" value="' + escapar(evento.enlace || "") + '"></div>' +
      '<div class="campo"><span>Contacto de la organización</span><input name="contacto" maxlength="120" value="' + escapar(evento.contacto || "") + '"></div>' +
      '<div class="campo"><span>Cupo</span><input name="cupo" inputmode="numeric" placeholder="Vacío = sin límite" value="' + escapar(evento.cupo || "") + '"></div>' +
      '<div class="campo campo-ancho"><span>Tarifas</span><p class="nota">Hasta 5. Cada una se muestra en la ficha y se puede elegir al inscribirse.</p><div id="lista-tarifas">' + filasTarifa + '</div><button type="button" class="btn btn-secundario" data-accion="agregar-tarifa">Agregar tarifa</button></div>' +
      '<div class="campo campo-ancho"><span>Foto del evento</span><input type="hidden" name="imagen" value="' + escapar(evento.imagen || "") + '"><input name="imagenArchivo" type="file" accept="image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp" aria-label="Foto del evento"><p class="nota">Elige una foto de tu computadora, en JPG o PNG. ' + (fotoVisible(evento) ? "Si no eliges nada, se queda la foto actual." : "Si no eliges nada, el evento queda sin foto.") + '</p><img class="vista-foto" id="vista-foto" alt=""' + (fotoVisible(evento) ? ' src="' + escapar(fotoVisible(evento)) + '"' : " hidden") + "></div>" +
      '<div class="campo campo-ancho"><span>Brochure (PDF)</span><input type="hidden" name="brochure" value="' + escapar(evento.brochure || "") + '"><input name="brochureArchivo" type="file" accept="application/pdf,.pdf" aria-label="Brochure PDF"><p class="nota">Opcional. Quienes vean el evento podrán descargarlo. Máximo 5 MB. ' + (evento.brochure || evento.tieneBrochure ? "Si no eliges nada, se queda el brochure actual." : "Si no eliges nada, el evento queda sin brochure.") + "</p>" +
      (evento.brochure || evento.tieneBrochure ? '<label class="check"><input type="checkbox" name="quitarBrochure"> Quitar el brochure actual</label>' : "") +
      "</div>" +
      '<div class="campo campo-ancho"><span>Requisitos</span><textarea name="requisitos" maxlength="2000">' + escapar(evento.requisitos || "") + "</textarea></div>" +
      '<label class="check"><input type="checkbox" name="mostrarInscritos"' + (evento.mostrarInscritos !== false ? " checked" : "") + "> Mostrar cuántos inscritos hay en la página pública</label>" +
      '<label class="check"><input type="checkbox" name="activo"' + (evento.activo ? " checked" : "") + "> Inscripciones abiertas</label></section>" +
      '<section class="bloque"><h2>Organizadores</h2><p class="nota">Puedes crear varios. Cada uno entra con su usuario, ve sus propios inscritos y el total. Entrega a cada uno su enlace personal (botón Copiar). La clave no se vuelve a mostrar.</p>' +
      '<div id="lista-orgs">' + filasOrg + '</div><button type="button" class="btn btn-secundario" data-accion="agregar-org">Agregar organizador</button>' +
      (enlaces ? '<div class="lista-enlaces-org">' + enlaces + "</div>" : "") +
      '<div class="acciones-form"><button class="btn btn-primario" type="submit">' + (id ? "Guardar cambios" : "Crear evento") + "</button></div></section></form>");
  }

  function resumen(lista) {
    var pagados = lista.filter(function (item) { return item.pagado; }).length;
    var conteo = {};
    var orden = [];
    lista.forEach(function (item) {
      var nombre = nombreCategoria(item.categoria) || "Sin tarifa";
      if (!conteo[nombre]) { conteo[nombre] = 0; orden.push(nombre); }
      conteo[nombre]++;
    });
    return {
      total: lista.length,
      pagados: pagados,
      pendientes: lista.length - pagados,
      porTarifa: orden.length ? orden.map(function (nombre) { return nombre + " " + conteo[nombre]; }).join(" · ") : "0"
    };
  }

  function listaFiltrada() {
    var q = estado.buscaInscritos.trim().toLowerCase();
    return estado.listaInscritos.filter(function (item) {
      if (estado.filtroPago === "pagados" && !item.pagado) return false;
      if (estado.filtroPago === "pendientes" && item.pagado) return false;
      if (!q) return true;
      var blob = [item.nombres, item.apellidos, item.dni, item.correo, item.id].join(" ").toLowerCase();
      return blob.indexOf(q) !== -1;
    });
  }

  function htmlFilasInscritos(mostrarOrg) {
    var lista = listaFiltrada();
    var cols = mostrarOrg ? 9 : 8;
    if (!estado.listaInscritos.length) {
      return '<tr><td colspan="' + cols + '">Todavía no hay inscripciones.</td></tr>';
    }
    if (!lista.length) {
      return '<tr><td colspan="' + cols + '">No hay inscripciones con ese criterio.</td></tr>';
    }
    return lista.map(function (item) {
      var pago = item.pagado
        ? '<span class="pill pill-ok">Pagó</span>'
        : '<span class="pill pill-aviso">Pendiente</span>';
      var whatsapp = String(item.whatsapp || "");
      var enlaceWhatsapp = whatsapp.length === 9 ? "51" + whatsapp : whatsapp;
      var org = item.organizadorUsuario || item.organizadorNombre || "Sin atribución";
      return "<tr><td data-label=\"Folio\">" + escapar(item.id) + "</td><td data-label=\"Nombre\">" + escapar(item.nombres + " " + item.apellidos) + "</td><td data-label=\"DNI\">" + escapar(item.dni) + "</td><td data-label=\"Correo\">" + escapar(item.correo) + "</td><td data-label=\"Categoría\">" + escapar(nombreCategoria(item.categoria)) + "</td>" +
        (mostrarOrg ? '<td data-label="Organizador">' + escapar(org) + "</td>" : "") +
        '<td data-label="WhatsApp">' + escapar(item.whatsapp) + ' · <a href="https://wa.me/' + escapar(enlaceWhatsapp) + '" target="_blank" rel="noopener noreferrer">Escribir</a></td><td data-label="Pago">' + pago + '</td><td data-label="Acciones"><button type="button" class="btn btn-secundario" data-accion="pagado" data-id="' + escapar(item.id) + '" data-pagado="' + (item.pagado ? "1" : "0") + '">' + (item.pagado ? "Marcar pendiente" : "Marcar pagado") + '</button> <button type="button" class="btn btn-peligro" data-accion="anular" data-id="' + escapar(item.id) + '">Anular</button></td></tr>';
    }).join("");
  }

  function pintarCuerpoTabla() {
    var cuerpo = document.getElementById("cuerpo-inscritos");
    var mostrarOrg = !!(estado.sesion && estado.sesion.rol === "admin") ||
      (estado.sesion && estado.sesion.rol === "organizador" && estado.vistaInscritos === "todos");
    if (cuerpo) cuerpo.innerHTML = htmlFilasInscritos(mostrarOrg);
    document.querySelectorAll("[data-accion='filtro-pago']").forEach(function (boton) {
      boton.setAttribute("aria-pressed", boton.dataset.pago === estado.filtroPago ? "true" : "false");
    });
  }

  function htmlPanelInscritos(evento, lista, opciones) {
    opciones = opciones || {};
    estado.listaInscritos = lista;
    estado.eventoActual = evento;
    var cifras = resumen(lista);
    var mostrarOrg = !!opciones.mostrarOrg;
    var esOrg = estado.sesion && estado.sesion.rol === "organizador";
    var filtros = [["todos", "Todos"], ["pagados", "Pagaron"], ["pendientes", "Pendientes"]].map(function (par) {
      return '<button type="button" class="chip" data-accion="filtro-pago" data-pago="' + par[0] + '" aria-pressed="' + (estado.filtroPago === par[0] ? "true" : "false") + '">' + par[1] + "</button>";
    }).join("");
    var vistas = "";
    var statsExtra = "";
    var enlaceMio = "";
    if (esOrg && opciones.totales) {
      vistas = '<div class="chips" style="margin:10px 0 0"><button type="button" class="chip" data-accion="vista-inscritos" data-vista="mios" aria-pressed="' + (estado.vistaInscritos === "mios" ? "true" : "false") + '">Mis inscritos</button><button type="button" class="chip" data-accion="vista-inscritos" data-vista="todos" aria-pressed="' + (estado.vistaInscritos === "todos" ? "true" : "false") + '">Total del evento</button></div>';
      statsExtra = '<article class="stat"><span>Total del evento</span><strong>' + (opciones.totales.inscritos || 0) + '</strong></article><article class="stat"><span>Mis inscritos</span><strong>' + (opciones.totales.mios || 0) + "</strong></article>";
      if (estado.sesion.usuario && evento.id) {
        enlaceMio = '<div class="enlace-card">' +
          "<p>Comparte tu enlace para que las nuevas inscripciones cuenten como tuyas.</p>" +
          '<button type="button" class="btn btn-primario" data-accion="copiar-enlace" data-enlace="' + escapar(enlaceOrganizador(evento.id, estado.sesion.usuario)) + '">Copiar mi enlace</button>' +
          "</div>";
      }
      if (Number(opciones.totales.inscritos || 0) > 0 && Number(opciones.totales.mios || 0) === 0) {
        enlaceMio += '<div class="enlace-card enlace-card-aviso">' +
          "<p>Hay personas inscritas que aún no están en tu lista. Puedes sumarlas una sola vez.</p>" +
          '<button type="button" class="btn btn-secundario" data-accion="reclamar-inscritos">Sumar a mi lista</button>' +
          "</div>";
      }
    }
    var cabeceras = "<th>Folio</th><th>Nombre</th><th>DNI</th><th>Correo</th><th>Categoría</th>" +
      (mostrarOrg ? "<th>Organizador</th>" : "") +
      "<th>WhatsApp</th><th>Pago</th><th>Acciones</th>";
    return '<div class="panel-premium">' + (opciones.volver || "") +
      '<div class="encabezado-pagina"><div class="pills"><span class="pill ' + (evento.activo ? "pill-ok" : "pill-off") + '">' + (evento.activo ? "Inscripciones abiertas" : "Inscripciones pausadas") + '</span></div><h1>' + escapar(evento.titulo) + "</h1><p>" + escapar(evento.organizacion) + " · " + escapar(formatoFecha(evento.fecha)) + (esOrg && estado.sesion.usuario ? " · Tú: " + escapar(estado.sesion.usuario) : "") + "</p>" + vistas + "</div>" +
      '<section class="stats">' + (statsExtra || "") + '<article class="stat"><span>' + (esOrg && estado.vistaInscritos === "mios" ? "En esta lista" : "Inscritos") + '</span><strong>' + cifras.total + '</strong></article><article class="stat"><span>Pagaron</span><strong>' + cifras.pagados + '</strong></article><article class="stat"><span>Pendientes</span><strong>' + cifras.pendientes + '</strong></article><article class="stat stat-tarifas"><span>Por tarifa</span><strong>' + escapar(cifras.porTarifa) + "</strong></article></section>" +
      enlaceMio +
      (!evento.activo && esOrg ? '<p class="nota">El administrador pausó las inscripciones. Igual puedes revisar la lista y actualizar los pagos.</p>' : "") +
      '<div class="barra-lista"><input id="buscar-inscritos" class="buscador" style="max-width:360px" type="search" placeholder="Buscar nombre, DNI o correo" value="' + escapar(estado.buscaInscritos) + '" aria-label="Buscar inscritos"><div class="acciones">' + filtros + '<button type="button" class="btn btn-secundario" data-accion="excel">Descargar Excel</button></div></div>' +
      '<div class="tabla-wrap"><table class="tabla"><thead><tr>' + cabeceras + '</tr></thead><tbody id="cuerpo-inscritos">' + htmlFilasInscritos(mostrarOrg) + "</tbody></table></div></div>";
  }

  async function vistaInscritosAdmin(id) {
    if (!exigirRol("admin")) return vistaEntrar();
    var detalle = await window.API.detalleAdmin(id);
    document.title = "Inscritos · " + detalle.evento.titulo;
    return marco(htmlPanelInscritos(detalle.evento, detalle.inscripciones, {
      volver: '<div class="subnav"><a class="btn btn-secundario" href="#/admin">Eventos</a><a class="btn btn-secundario" href="#/admin/editar/' + escapar(id) + '">Editar</a><a class="btn btn-secundario" href="#/evento/' + escapar(id) + '">Ver ficha pública</a></div>',
      mostrarOrg: true
    }));
  }

  async function vistaPanel() {
    if (!estado.sesion) return vistaEntrar();
    if (estado.sesion.rol === "admin") {
      document.title = "Panel · " + nombreSitio();
      return marco('<div class="vacio"><h1>Este panel es de cada organización</h1><p>Tú administras todos los eventos desde la lista general.</p><p style="margin-top:12px"><a class="btn btn-primario" href="#/admin">Ir a eventos</a></p></div>');
    }
    var panel = await window.API.miPanel();
    document.title = "Mis inscritos · " + nombreSitio();
    if (!panel.evento) {
      return marco('<div class="vacio"><h1>Tu usuario no tiene un evento</h1><p>Pide al administrador que te asigne el evento otra vez.</p></div>');
    }
    estado.listaTodas = panel.inscripciones || [];
    var mias = panel.misInscripciones || estado.listaTodas.filter(function (item) {
      return String(item.organizadorUsuario || "").toLowerCase() === String(estado.sesion.usuario || "").toLowerCase();
    });
    var lista = estado.vistaInscritos === "todos" ? estado.listaTodas : mias;
    return marco(htmlPanelInscritos(panel.evento, lista, {
      totales: panel.totales || { inscritos: estado.listaTodas.length, mios: mias.length, pagados: 0 },
      mostrarOrg: estado.vistaInscritos === "todos"
    }));
  }

  function vistaCuenta() {
    if (!estado.sesion) return vistaEntrar();
    document.title = "Contraseña · " + nombreSitio();
    return marco('<div class="bloque login-caja"><h1>Cambiar contraseña</h1><p class="nota">Sesión de ' + escapar(estado.sesion.usuario) + '.</p><form id="form-clave"><div class="campo" style="margin-top:12px"><span>Clave actual</span><input name="actual" type="password" required autocomplete="current-password"></div><div class="campo" style="margin-top:10px"><span>Nueva clave</span><input name="nueva" type="password" required minlength="6" autocomplete="new-password"></div><button class="btn btn-primario" style="margin-top:14px" type="submit">Guardar clave</button></form></div>');
  }

  function exigirRol(rol) {
    return estado.sesion && estado.sesion.rol === rol;
  }

  async function vista(ruta) {
    if (ruta.nombre === "inicio") return vistaInicio();
    if (ruta.nombre === "evento") return vistaEvento(ruta.a);
    if (ruta.nombre === "entrar") return vistaEntrar();
    if (ruta.nombre === "cuenta") return vistaCuenta();
    if (ruta.nombre === "panel") return vistaPanel();
    if (ruta.nombre === "admin" && estado.sesion && estado.sesion.rol !== "admin") {
      avisar("Esa zona es solo del administrador.", "mal");
      ir("#/panel");
      return marco('<p class="cargando">Volviendo a tu panel…</p>');
    }
    if (ruta.nombre === "admin" && ruta.a === "nuevo") return vistaFormEvento("");
    if (ruta.nombre === "admin" && ruta.a === "editar") return vistaFormEvento(ruta.b);
    if (ruta.nombre === "admin" && ruta.a === "inscritos") return vistaInscritosAdmin(ruta.b);
    if (ruta.nombre === "admin") return vistaAdmin();
    document.title = "Página no encontrada · " + nombreSitio();
    return marco('<div class="vacio"><h1>No encontramos esta página</h1><p><a href="#/">Ir a los eventos</a></p></div>');
  }

  async function render() {
    var seq = ++renderSeq;
    var ruta = parseRuta();
    var cambio = ruta.clave !== estado.rutaClave;
    if (cambio) {
      estado.rutaClave = ruta.clave;
      estado.buscaInscritos = "";
      estado.filtroPago = "todos";
      if (ruta.nombre !== "panel") estado.vistaInscritos = "mios";
      if (ruta.nombre !== "evento") estado.refOrganizador = "";
      var app = document.getElementById("app");
      if (app && !app.querySelector(".esqueleto")) {
        app.innerHTML = '<div class="esqueleto ancho" aria-busy="true"><div class="esqueleto-barra"></div><div class="esqueleto-hero"></div><div class="esqueleto-grilla"><span></span><span></span><span></span></div></div>';
      }
    }
    var html;
    try {
      html = await vista(ruta);
    } catch (error) {
      if (/Sesión expirada/.test(error.message)) {
        estado.sesion = null;
        ir("#/entrar");
        avisar(error.message, "mal");
        return;
      }
      html = marco('<div class="caja-error" role="alert"><p>' + escapar(error.message) + '</p></div><p style="margin-top:12px"><a href="#/">Volver a los eventos</a></p>');
    }
    if (seq !== renderSeq) return;
    document.getElementById("app").innerHTML = html;
    if (cambio) {
      window.scrollTo(0, 0);
      var titulo = document.querySelector("#contenido h1");
      if (titulo) {
        titulo.setAttribute("tabindex", "-1");
        titulo.focus();
      }
    }
    if (document.getElementById("grilla")) cargarFotosGrilla();
  }

  function leerTarifas(form) {
    var filas = form.querySelectorAll(".fila-tarifa");
    var lista = [];
    for (var i = 0; i < filas.length && lista.length < 5; i++) {
      lista.push({
        nombre: filas[i].querySelector("[name='tarifaNombre']").value,
        precio: filas[i].querySelector("[name='tarifaPrecio']").value
      });
    }
    return lista.filter(function (item) {
      return String(item.nombre || "").trim() || String(item.precio || "").trim();
    });
  }

  function leerOrganizadores(form) {
    var filas = form.querySelectorAll(".fila-org");
    var lista = [];
    for (var i = 0; i < filas.length && lista.length < 10; i++) {
      lista.push({
        usuario: filas[i].querySelector("[name='orgUsuario']").value,
        nombre: filas[i].querySelector("[name='orgNombre']").value,
        whatsapp: filas[i].querySelector("[name='orgWhatsapp']").value,
        clave: filas[i].querySelector("[name='orgClave']").value,
        existente: filas[i].dataset.existente === "1"
      });
    }
    return lista.filter(function (item) {
      return String(item.usuario || "").trim() || String(item.nombre || "").trim() || String(item.whatsapp || "").trim() || String(item.clave || "").trim();
    });
  }

  function leerEvento(form) {
    var datos = new FormData(form);
    var tarifas = leerTarifas(form);
    var organizadores = leerOrganizadores(form);
    return {
      id: datos.get("eventoId") || "",
      titulo: datos.get("titulo"),
      organizacion: datos.get("organizacion"),
      tipo: datos.get("tipo"),
      descripcion: datos.get("descripcion"),
      fecha: datos.get("fecha"),
      hora: datos.get("hora"),
      lugar: datos.get("lugar"),
      modalidad: datos.get("modalidad"),
      enlace: datos.get("enlace"),
      cupo: datos.get("cupo"),
      precioProfesional: tarifas[0] ? tarifas[0].precio : "",
      precioEstudiante: tarifas[1] ? tarifas[1].precio : "",
      requisitos: datos.get("requisitos"),
      contacto: datos.get("contacto"),
      imagen: datos.get("imagen"),
      brochure: datos.get("brochure"),
      quitarBrochure: !!(form.quitarBrochure && form.quitarBrochure.checked),
      activo: form.activo.checked,
      mostrarInscritos: form.mostrarInscritos.checked,
      tarifas: tarifas,
      organizadores: organizadores,
      organizadorUsuario: organizadores[0] ? organizadores[0].usuario : "",
      organizadorNombre: organizadores[0] ? organizadores[0].nombre : "",
      organizadorClave: organizadores[0] ? organizadores[0].clave : ""
    };
  }

  function celdaExcel(valor) {
    var texto = String(valor == null ? "" : valor)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    return '<Cell><Data ss:Type="String">' + texto + "</Data></Cell>";
  }

  function descargarExcel() {
    var evento = estado.eventoActual;
    if (!evento) return;
    var filas = [["Folio", "Nombres", "Apellidos", "DNI", "Correo", "Categoría", "Organizador", "WhatsApp", "Pagado", "Fecha"]];
    estado.listaInscritos.forEach(function (item) {
      filas.push([item.id, item.nombres, item.apellidos, item.dni, item.correo, nombreCategoria(item.categoria), item.organizadorUsuario || "", item.whatsapp, item.pagado ? "SI" : "NO", item.fecha]);
    });
    var libro = '<?xml version="1.0" encoding="UTF-8"?>' +
      '<?mso-application progid="Excel.Sheet"?>' +
      '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">' +
      '<Worksheet ss:Name="Inscritos"><Table>' +
      filas.map(function (fila) { return "<Row>" + fila.map(celdaExcel).join("") + "</Row>"; }).join("") +
      "</Table></Worksheet></Workbook>";
    var blob = new Blob([libro], { type: "application/vnd.ms-excel" });
    var enlace = document.createElement("a");
    enlace.href = URL.createObjectURL(blob);
    enlace.download = "inscritos-" + evento.id + ".xls";
    enlace.click();
    URL.revokeObjectURL(enlace.href);
  }

  async function onSubmit(evento) {
    var form = evento.target;
    if (!(form instanceof HTMLFormElement)) return;
    evento.preventDefault();
    var formId = form.getAttribute("id");
    if (formId === "form-inscripcion") {
      var datos = new FormData(form);
      var inscripcion = {
        eventoId: datos.get("eventoId"),
        nombres: datos.get("nombres"),
        apellidos: datos.get("apellidos"),
        dni: datos.get("dni"),
        correo: datos.get("correo"),
        categoria: datos.get("categoria") || "",
        whatsapp: datos.get("whatsapp"),
        organizadorUsuario: datos.get("organizadorUsuario") || estado.refOrganizador || ""
      };
      var mensaje = window.Validar.inscripcion(inscripcion);
      if (mensaje) { ponerError(form, mensaje); return; }
      var boton = form.querySelector('[type="submit"]');
      boton.disabled = true;
      try {
        var creada = await window.API.inscribir(inscripcion);
        var eventoOk = estado.eventoVista || { id: inscripcion.eventoId, titulo: "el evento", organizadores: [] };
        var precioCat = precioDeTarifa(eventoOk, inscripcion.categoria);
        avisar("Inscripción registrada. Folio " + creada.id + ".");
        mostrarModalPago({
          folio: creada.id,
          refOrganizador: estado.refOrganizador || "",
          organizadores: organizadoresDe(eventoOk),
          mensaje: {
            titulo: eventoOk.titulo,
            organizacion: eventoOk.organizacion,
            fecha: eventoOk.fecha,
            categoria: inscripcion.categoria,
            precio: precioCat,
            folio: creada.id,
            nombres: inscripcion.nombres,
            apellidos: inscripcion.apellidos,
            dni: inscripcion.dni,
            correo: inscripcion.correo,
            whatsapp: inscripcion.whatsapp
          }
        });
        boton.disabled = false;
      } catch (error) {
        ponerError(form, error.message);
        boton.disabled = false;
      }
      return;
    }
    if (formId === "form-login") {
      evento.preventDefault();
      var botonLogin = form.querySelector('[type="submit"]');
      botonLogin.disabled = true;
      try {
        estado.sesion = await window.API.login(new FormData(form).get("usuario"), new FormData(form).get("clave"));
        avisar("Bienvenido, " + estado.sesion.nombre + ".");
        ir(estado.sesion.rol === "admin" ? "#/admin" : "#/panel");
      } catch (error) {
        ponerError(form, error.message);
        botonLogin.disabled = false;
      }
      return;
    }
    if (formId === "form-evento") {
      var entrada = leerEvento(form);
      var errorEvento = window.Validar.evento(entrada, {
        exigirOrganizador: form.dataset.nuevo === "1"
      });
      if (errorEvento) { ponerError(form, errorEvento); return; }
      var botonEvento = form.querySelector('[type="submit"]');
      var textoBoton = botonEvento.textContent;
      botonEvento.disabled = true;
      try {
        var archivoFoto = form.querySelector('input[name="imagenArchivo"]');
        if (archivoFoto && archivoFoto.files && archivoFoto.files[0]) {
          botonEvento.textContent = "Subiendo foto…";
          entrada.imagenArchivo = await prepararImagen(archivoFoto.files[0]);
        }
        var archivoPdf = form.querySelector('input[name="brochureArchivo"]');
        if (archivoPdf && archivoPdf.files && archivoPdf.files[0]) {
          botonEvento.textContent = "Subiendo brochure…";
          entrada.brochureArchivo = await prepararPdf(archivoPdf.files[0]);
          entrada.quitarBrochure = false;
        }
        var guardado = await window.API.guardarEvento(entrada);
        if (!window.API.esDemo && entrada.imagenArchivo && String(guardado.imagen || "").indexOf("drive:") !== 0 && String(guardado.imagen || "").indexOf("http") !== 0) {
          avisar("El evento se guardó, pero la foto no. Falta publicar de nuevo la aplicación web de Google.", "mal");
        } else if (!window.API.esDemo && entrada.brochureArchivo && !(guardado.tieneBrochure || String(guardado.brochure || "").indexOf("drive:") === 0 || String(guardado.brochure || "").indexOf("http") === 0)) {
          avisar("El evento se guardó, pero el brochure no. Falta publicar de nuevo la aplicación web de Google.", "mal");
        } else {
          avisar(entrada.id ? "Evento actualizado." : "Evento creado. Entrega el usuario y la clave al organizador; la clave no se vuelve a mostrar.");
        }
        ir("#/admin/inscritos/" + guardado.id);
      } catch (error) {
        ponerError(form, error.message);
        botonEvento.disabled = false;
        botonEvento.textContent = textoBoton;
      }
      return;
    }
    if (formId === "form-clave") {
      var campos = new FormData(form);
      var errorClave = window.Validar.claveNueva(campos.get("actual"), campos.get("nueva"));
      if (errorClave) { ponerError(form, errorClave); return; }
      var botonClave = form.querySelector('[type="submit"]');
      botonClave.disabled = true;
      try {
        await window.API.cambiarClave(campos.get("actual"), campos.get("nueva"));
        form.reset();
        avisar("Contraseña actualizada.");
        botonClave.disabled = false;
      } catch (error) {
        ponerError(form, error.message);
        botonClave.disabled = false;
      }
    }
  }

  async function onClick(evento) {
    var boton = evento.target.closest("[data-accion]");
    if (!boton || !document.getElementById("app").contains(boton)) return;
    var accion = boton.dataset.accion;
    if (accion === "ir-grilla") {
      var destino = document.getElementById("grilla") || document.querySelector(".herramientas");
      if (destino) destino.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    if (accion === "agregar-tarifa") {
      var listaTarifas = document.getElementById("lista-tarifas");
      if (!listaTarifas || listaTarifas.querySelectorAll(".fila-tarifa").length >= 5) {
        avisar("Puedes agregar hasta 5 tarifas.", "mal");
        return;
      }
      listaTarifas.insertAdjacentHTML("beforeend", htmlFilaTarifa({ nombre: "", precio: "" }));
      return;
    }
    if (accion === "quitar-tarifa") {
      var grupo = document.getElementById("lista-tarifas");
      var fila = boton.closest(".fila-tarifa");
      if (!grupo || !fila || grupo.querySelectorAll(".fila-tarifa").length <= 1) return;
      fila.remove();
      return;
    }
    if (accion === "agregar-org") {
      var listaOrgs = document.getElementById("lista-orgs");
      if (!listaOrgs || listaOrgs.querySelectorAll(".fila-org").length >= 10) {
        avisar("Puedes agregar hasta 10 organizadores.", "mal");
        return;
      }
      listaOrgs.insertAdjacentHTML("beforeend", htmlFilaOrganizador({ usuario: "", nombre: "", existente: false }));
      return;
    }
    if (accion === "quitar-org") {
      var grupoOrg = document.getElementById("lista-orgs");
      var filaOrg = boton.closest(".fila-org");
      if (!grupoOrg || !filaOrg || grupoOrg.querySelectorAll(".fila-org").length <= 1) {
        avisar("Deja al menos un organizador, o desactívalo quitándolo al guardar si editas.", "mal");
        return;
      }
      filaOrg.remove();
      return;
    }
    if (accion === "vista-inscritos") {
      estado.vistaInscritos = boton.dataset.vista || "mios";
      render();
      return;
    }
    if (accion === "reclamar-inscritos") {
      var seguroReclamo = await confirmar(
        "¿Sumar a tu lista las inscripciones que aún no tienen organizador?",
        "Sumar a mi lista"
      );
      if (!seguroReclamo) return;
      boton.disabled = true;
      try {
        await window.API.reclamarInscritos();
        estado.vistaInscritos = "mios";
        avisar("Listo. Ya aparecen en Mis inscritos.");
        render();
      } catch (error) {
        avisar(error.message, "mal");
        boton.disabled = false;
      }
      return;
    }
    if (accion === "copiar-enlace") {
      var texto = boton.dataset.enlace || "";
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(texto).then(function () { avisar("Enlace copiado. Ya puedes compartirlo."); }).catch(function () {
          window.prompt("Copia este enlace:", texto);
        });
      } else {
        window.prompt("Copia este enlace:", texto);
      }
      return;
    }
    if (accion === "descargar-brochure") {
      boton.disabled = true;
      var textoBtn = boton.textContent;
      boton.textContent = "Preparando…";
      try {
        var pdf = await window.API.brochurePublico(boton.dataset.id);
        if (pdf.url) {
          window.open(pdf.url, "_blank", "noopener,noreferrer");
        } else {
          var binario = atob(pdf.archivo);
          var bytes = new Uint8Array(binario.length);
          for (var i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
          var blob = new Blob([bytes], { type: "application/pdf" });
          var enlacePdf = document.createElement("a");
          enlacePdf.href = URL.createObjectURL(blob);
          enlacePdf.download = pdf.nombre || nombreBrochure(boton.dataset.titulo);
          document.body.appendChild(enlacePdf);
          enlacePdf.click();
          enlacePdf.remove();
          setTimeout(function () { URL.revokeObjectURL(enlacePdf.href); }, 2000);
        }
        avisar("Brochure listo.");
      } catch (error) {
        avisar(error.message || "No se pudo descargar el brochure.", "mal");
      }
      boton.disabled = false;
      boton.textContent = textoBtn;
      return;
    }
    if (accion === "tipo") {
      estado.tipo = boton.dataset.tipo;
      document.querySelectorAll("[data-accion='tipo']").forEach(function (chip) {
        chip.setAttribute("aria-pressed", chip.dataset.tipo === estado.tipo ? "true" : "false");
      });
      pintarGrilla();
      return;
    }
    if (accion === "filtro-pago") {
      estado.filtroPago = boton.dataset.pago;
      pintarCuerpoTabla();
      return;
    }
    if (accion === "excel") {
      descargarExcel();
      return;
    }
    if (accion === "reset-demo") {
      if (window.API.reiniciar) window.API.reiniciar();
      return;
    }
    if (accion === "salir") {
      await window.API.salir();
      estado.sesion = null;
      avisar("Sesión cerrada.");
      ir("#/");
      return;
    }
    if (accion === "activar") {
      var abrir = boton.dataset.activo !== "1";
      var seguro = await confirmar(abrir ? "¿Activar este evento? Volverá a la programación y aceptará inscripciones." : "¿Desactivar este evento? Dejará de verse y no aceptará inscripciones.", abrir ? "Activar" : "Desactivar");
      if (!seguro) return;
      boton.disabled = true;
      try {
        await window.API.activarEvento(boton.dataset.id, abrir);
        avisar(abrir ? "Evento activado." : "Evento desactivado.");
        render();
      } catch (error) {
        avisar(error.message, "mal");
        boton.disabled = false;
      }
      return;
    }
    if (accion === "pagado") {
      var pagado = boton.dataset.pagado !== "1";
      boton.disabled = true;
      try {
        await window.API.marcarPago(boton.dataset.id, pagado);
        avisar(pagado ? "Marcado como pagado." : "Marcado como pendiente.");
        render();
      } catch (error) {
        avisar(error.message, "mal");
        boton.disabled = false;
      }
      return;
    }
    if (accion === "anular") {
      var confirma = await confirmar("¿Anular esta inscripción? La persona desaparece de la lista y, si había cupo, se libera un lugar.", "Anular");
      if (!confirma) return;
      boton.disabled = true;
      try {
        await window.API.anularInscripcion(boton.dataset.id);
        avisar("Inscripción anulada.");
        render();
      } catch (error) {
        avisar(error.message, "mal");
        boton.disabled = false;
      }
    }
  }

  function onInput(evento) {
    var campo = evento.target;
    if (campo && (campo.name === "dni" || campo.name === "whatsapp" || campo.name === "orgWhatsapp")) {
      var maximo = campo.name === "dni" ? 8 : 9;
      var solo = String(campo.value || "").replace(/\D/g, "").slice(0, maximo);
      if (campo.value !== solo) campo.value = solo;
    }
    if (campo.id === "buscar-eventos") {
      estado.busqueda = evento.target.value;
      clearTimeout(busquedaTimer);
      busquedaTimer = setTimeout(pintarGrilla, 120);
    }
    if (evento.target.id === "buscar-inscritos") {
      estado.buscaInscritos = evento.target.value;
      pintarCuerpoTabla();
    }
  }

  async function iniciar() {
    var app = document.getElementById("app");
    app.addEventListener("submit", onSubmit);
    app.addEventListener("click", onClick);
    app.addEventListener("input", onInput);
    app.addEventListener("change", function (evento) {
      var input = evento.target;
      if (!input || input.name !== "imagenArchivo") return;
      var img = document.getElementById("vista-foto");
      if (!img || !input.files) return;
      if (img.dataset.local) URL.revokeObjectURL(img.dataset.local);
      if (!input.files[0]) {
        img.hidden = !img.getAttribute("src");
        return;
      }
      var local = URL.createObjectURL(input.files[0]);
      img.dataset.local = local;
      img.src = local;
      img.hidden = false;
      if (img.parentElement) img.parentElement.classList.remove("sin-foto");
    });
    app.addEventListener("error", function (evento) {
      if (evento.target && evento.target.tagName === "IMG" && evento.target.id !== "vista-foto" && evento.target.parentElement) {
        evento.target.parentElement.classList.add("sin-foto");
      }
    }, true);
    window.addEventListener("hashchange", render);
    estado.sesion = await window.API.restaurar();
    if (!location.hash) location.hash = "#/";
    else render();
  }

  iniciar();
})();
