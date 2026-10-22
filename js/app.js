(function () {
  var estado = {
    sesion: null,
    busqueda: "",
    tipo: "Todos",
    filtroPago: "todos",
    buscaInscritos: "",
    rutaClave: "",
    eventos: [],
    listaInscritos: [],
    eventoActual: null
  };
  var renderSeq = 0;

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
    return urlSegura((evento && (evento.imagenUrl || evento.imagen)) || "");
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

  function nombreSitio() {
    return window.APP_CONFIG.NOMBRE_SITIO || "Portal de Capacitaciones";
  }

  function parseRuta() {
    var hash = decodeURIComponent(location.hash || "#/");
    var partes = hash.replace(/^#\/?/, "").split("/").filter(Boolean);
    return {
      nombre: partes[0] || "inicio",
      a: partes[1] || "",
      b: partes[2] || "",
      clave: hash || "#/"
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
    var menu = '<a href="#/"' + (ruta.nombre === "inicio" || ruta.nombre === "evento" ? ' aria-current="page"' : "") + '>Eventos</a>';
    if (sesion) {
      menu += '<span class="quien">' + escapar(sesion.nombre) + "</span>";
      menu += '<a href="' + panelHref + '"' + (ruta.nombre === "admin" || ruta.nombre === "panel" ? ' aria-current="page"' : "") + ">" + panelTexto + "</a>";
      menu += '<a href="#/cuenta"' + (ruta.nombre === "cuenta" ? ' aria-current="page"' : "") + ">Contraseña</a>";
      menu += '<button type="button" class="btn btn-claro" data-accion="salir">Salir</button>';
    } else {
      menu += '<a class="btn btn-claro" href="#/entrar"' + (ruta.nombre === "entrar" ? ' aria-current="page"' : "") + ">Entrar</a>";
    }
    return '' +
      '<a class="saltar" href="#contenido">Saltar al contenido</a>' +
      '<div class="tope"><header class="barra"><div class="ancho barra-inner">' +
      '<a class="marca" href="#/"><span class="marca-signo" aria-hidden="true"><svg viewBox="0 0 32 32" width="22" height="22"><rect x="6" y="8" width="20" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M6 13h20M11 6v5M21 6v5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></span>' + escapar(nombreSitio()) + "</a>" +
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

  function htmlTarjeta(evento) {
    var sello = fechaCorta(evento.fecha);
    var foto = fotoVisible(evento);
    var lleno = evento.cupo && Number(evento.inscritos || 0) >= Number(evento.cupo);
    var cupo = evento.cupo ? (evento.inscritos || 0) + " de " + evento.cupo : (evento.inscritos || 0) + " inscritos";
    return '<a class="tarjeta" href="#/evento/' + escapar(evento.id) + '">' +
      '<div class="portada' + (foto ? "" : " sin-foto") + '"><span>' + escapar(evento.tipo) + "</span>" +
      (foto ? '<img alt="" src="' + escapar(foto) + '" referrerpolicy="no-referrer">' : "") + "</div>" +
      '<div class="cuerpo-tarjeta"><div class="fila-sello"><div><p class="meta">' + escapar(evento.organizacion) + "</p><h2>" + escapar(evento.titulo) + "</h2></div>" +
      '<span class="sello"><span class="sello-mes">' + escapar(sello.mes) + '</span><span class="sello-dia">' + escapar(sello.dia) + "</span></span></div>" +
      '<p class="meta">' + escapar(modalidadNombre(evento.modalidad)) + (evento.lugar ? " · " + escapar(evento.lugar) : "") + "</p>" +
      '<div class="pills"><span class="pill">' + escapar(cupo) + "</span>" +
      (lleno ? '<span class="pill pill-off">Cupo lleno</span>' : "") +
      (esPasado(evento.fecha) ? '<span class="pill pill-aviso">Fecha pasada</span>' : "") +
      "</div></div></a>";
  }

  function htmlGrilla() {
    var lista = filtrarPublicos(estado.eventos);
    if (!estado.eventos.length) {
      return '<div class="vacio"><h2>No hay eventos abiertos</h2><p>Cuando el administrador active uno, aparecerá aquí.</p></div>';
    }
    if (!lista.length) return '<div class="vacio"><h2>Ningún evento coincide</h2><p>Prueba con otra palabra o con otro tipo.</p></div>';
    return lista.map(htmlTarjeta).join("");
  }

  function pintarGrilla() {
    var grilla = document.getElementById("grilla");
    if (grilla) grilla.innerHTML = htmlGrilla();
  }

  async function vistaInicio() {
    estado.eventos = await window.API.eventosPublicos();
    document.title = nombreSitio();
    var proximo = ordenarEventos(estado.eventos).find(function (evento) { return !esPasado(evento.fecha); });
    var tipos = ["Todos"].concat(window.Validar.TIPOS.filter(function (tipo) {
      return estado.eventos.some(function (evento) { return evento.tipo === tipo; });
    }));
    var hero = '<div class="hero-franja"><section class="hero ancho"><div><p class="sobrelinea">Programación abierta</p><h1>Inscríbete a cursos y capacitaciones</h1><p class="lead">Entra a un evento, mira quién lo organiza y deja tus datos. Cada organización ve solo a sus inscritos y marca quién ya pagó.</p></div>' +
      (proximo ? '<a class="proximo" href="#/evento/' + escapar(proximo.id) + '"><span>Próximo evento</span><strong>' + escapar(proximo.titulo) + "</strong><em>" + escapar(proximo.organizacion) + " · " + escapar(formatoFecha(proximo.fecha)) + "</em></a>" : "") +
      "</section></div>";
    var chips = tipos.map(function (tipo) {
      return '<button type="button" class="chip" data-accion="tipo" data-tipo="' + escapar(tipo) + '" aria-pressed="' + (estado.tipo === tipo ? "true" : "false") + '">' + escapar(tipo) + "</button>";
    }).join("");
    var cuerpo = '<div class="herramientas"><input id="buscar-eventos" class="buscador" type="search" placeholder="Buscar por curso, organización o lugar" value="' + escapar(estado.busqueda) + '" aria-label="Buscar eventos"><div class="chips">' + chips + "</div></div>" +
      '<div id="grilla" class="grilla" aria-live="polite">' + htmlGrilla() + "</div>" +
      '<section class="pasos"><article><strong>1. Elige el evento</strong><p>Revisa de qué trata, la fecha y la organización.</p></article><article><strong>2. Registra tus datos</strong><p>Nombre, DNI, correo, categoría y WhatsApp.</p></article><article><strong>3. Espera la confirmación</strong><p>La organización marca el pago y puede escribirte.</p></article></section>';
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
    var lleno = evento.cupo && Number(evento.inscritos || 0) >= Number(evento.cupo);
    var enlace = urlSegura(evento.enlace);
    var quedan = evento.cupo ? Math.max(0, Number(evento.cupo) - Number(evento.inscritos || 0)) : null;
    var datos = [
      ["Organización", escapar(evento.organizacion)],
      ["Fecha", escapar(formatoFecha(evento.fecha) + (evento.hora ? " · " + evento.hora : ""))],
      ["Modalidad", escapar(modalidadNombre(evento.modalidad))],
      ["Lugar", escapar(evento.lugar || "Por confirmar")],
      ["Inversión profesional", escapar(precioVisible(evento.precioProfesional))],
      ["Inversión estudiante", escapar(precioVisible(evento.precioEstudiante))]
    ];
    var ficha = '<a class="volver" href="#/">← Todos los eventos</a><article class="ficha"><div class="prosa">' +
      '<div class="pills"><span class="pill">' + escapar(evento.tipo) + "</span>" +
      (esPasado(evento.fecha) ? '<span class="pill pill-aviso">Fecha pasada</span>' : "") + "</div>" +
      "<h1>" + escapar(evento.titulo) + "</h1><p class=\"meta\">Organiza " + escapar(evento.organizacion) + "</p>" +
      '<div class="datos">' + datos.map(function (par) {
        return '<div class="dato"><span>' + par[0] + "</span>" + par[1] + "</div>";
      }).join("") + "</div>" +
      '<div class="descripcion">' + escapar(evento.descripcion) + "</div>" +
      (evento.requisitos ? "<h2 style=\"margin-top:22px\">Requisitos</h2><div class=\"descripcion\">" + escapar(evento.requisitos) + "</div>" : "") +
      (evento.contacto ? '<p class="meta" style="margin-top:16px">Contacto: ' + htmlContacto(evento.contacto) + "</p>" : "") +
      (enlace ? '<p style="margin-top:12px"><a href="' + escapar(enlace) + '" target="_blank" rel="noopener noreferrer">Abrir enlace del evento</a></p>' : "") +
      '</div><div class="col-form"><div class="tarjeta-form" id="formulario">';

    if (!evento.activo) {
      ficha += "<h2>Inscripciones cerradas</h2><p>Este evento no recibe registros en este momento.</p>";
    } else if (lleno) {
      ficha += "<h2>Cupo completo</h2><p>Ya no quedan lugares. Puedes escribir a la organización si abrieran una vacante.</p>";
    } else {
      ficha += "<h2>Inscribirme</h2><p class=\"nota\">" + (quedan == null ? "Sin límite de cupo." : quedan + " cupos libres.") + "</p>" +
        '<form id="form-inscripcion" method="post" action="#/"><input type="hidden" name="eventoId" value="' + escapar(evento.id) + '">' +
        '<div class="campo" style="margin-top:12px"><span>Nombres</span><input name="nombres" aria-label="Nombres" required maxlength="80" autocomplete="given-name"></div>' +
        '<div class="campo" style="margin-top:10px"><span>Apellidos</span><input name="apellidos" aria-label="Apellidos" required maxlength="80" autocomplete="family-name"></div>' +
        '<div class="campo" style="margin-top:10px"><span>DNI</span><input name="dni" aria-label="DNI" required inputmode="numeric" maxlength="12" autocomplete="off"></div>' +
        '<div class="campo" style="margin-top:10px"><span>Correo</span><input name="correo" aria-label="Correo" type="email" required maxlength="120" autocomplete="email"></div>' +
        '<div class="campo" style="margin-top:10px"><span>Categoría</span><div class="opciones">' +
        '<label class="opcion"><input type="radio" name="categoria" value="profesional"><span>Profesional<small>' + escapar(precioVisible(evento.precioProfesional)) + "</small></span></label>" +
        '<label class="opcion"><input type="radio" name="categoria" value="estudiante"><span>Estudiante<small>' + escapar(precioVisible(evento.precioEstudiante)) + "</small></span></label>" +
        "</div></div>" +
        '<div class="campo" style="margin-top:10px"><span>WhatsApp</span><input name="whatsapp" aria-label="WhatsApp" required inputmode="tel" maxlength="20" placeholder="51987654321" autocomplete="tel"></div>' +
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
    return marco('<div class="bloque login-caja"><h1>Entrar</h1><p class="nota">El administrador crea los eventos. Cada organización entra con el usuario de su evento.</p><form id="form-login" method="post" action="#/entrar"><div class="campo" style="margin-top:12px"><span>Usuario</span><input name="usuario" aria-label="Usuario" required autocomplete="username"></div><div class="campo" style="margin-top:10px"><span>Contraseña</span><input name="clave" aria-label="Contraseña" type="password" required autocomplete="current-password"></div><button class="btn btn-primario" style="margin-top:14px" type="submit">Entrar</button></form></div>');
  }

  async function vistaAdmin() {
    if (!exigirRol("admin")) return vistaEntrar();
    document.title = "Administrar · " + nombreSitio();
    var eventos = ordenarEventos(await window.API.eventosAdmin());
    var filas = eventos.length ? eventos.map(function (evento) {
      return '<article class="fila-evento"><div><div class="pills"><span class="pill ' + (evento.activo ? "pill-ok" : "pill-off") + '">' + (evento.activo ? "Abierto" : "Pausado") + "</span><span class=\"pill\">" + escapar(evento.tipo) + '</span></div><h2>' + escapar(evento.titulo) + "</h2><p class=\"meta\">" + escapar(evento.organizacion) + " · " + escapar(formatoFecha(evento.fecha)) + " · " + (evento.inscritos || 0) + " inscritos · " + (evento.pagados || 0) + " pagaron · " + (evento.organizadorUsuario ? "Usuario " + escapar(evento.organizadorUsuario) : "Sin usuario de organizador") + "</p></div><div class=\"acciones\"><a class=\"btn btn-secundario\" href=\"#/admin/inscritos/" + escapar(evento.id) + "\">Inscritos</a><a class=\"btn btn-secundario\" href=\"#/admin/editar/" + escapar(evento.id) + "\">Editar</a><button type=\"button\" class=\"btn btn-peligro\" data-accion=\"activar\" data-id=\"" + escapar(evento.id) + "\" data-activo=\"" + (evento.activo ? "1" : "0") + "\">" + (evento.activo ? "Desactivar" : "Activar") + "</button></div></article>";
    }).join("") : '<div class="vacio"><h2>Todavía no hay eventos</h2><p>Crea el primero y asigna el usuario de su organizador.</p></div>';
    return marco('<div class="subnav"><a class="btn btn-primario" href="#/admin" aria-current="page">Eventos</a><a class="btn btn-secundario" href="#/admin/nuevo">Nuevo evento</a></div><div class="encabezado-pagina"><h1>Eventos</h1><p>Activa, pausa o abre la lista. Al pausar un evento deja de aparecer en la programación y no acepta inscripciones.</p></div>' + filas);
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
      modalidad: "presencial", enlace: "", cupo: "", precioProfesional: "", precioEstudiante: "",
      requisitos: "", contacto: "", imagen: "", activo: true, organizadorUsuario: "", organizadorNombre: ""
    };
    if (id) {
      var detalle = await window.API.detalleAdmin(id);
      evento = detalle.evento;
    }
    document.title = (id ? "Editar evento" : "Nuevo evento") + " · " + nombreSitio();
    var usuarioNuevo = !evento.organizadorUsuario;
    var usuarioCampo = usuarioNuevo
      ? '<div class="campo"><span>Usuario del organizador</span><input name="organizadorUsuario" aria-label="Usuario del organizador" maxlength="20" autocomplete="off" placeholder="ej. lima.cursos"' + (id ? "" : " required") + "></div>"
      : '<input type="hidden" name="organizadorUsuario" value="' + escapar(evento.organizadorUsuario) + '"><p class="nota">Usuario del organizador: <strong>' + escapar(evento.organizadorUsuario) + "</strong>. La clave solo se cambia si escribes una nueva.</p>";
    return marco('<div class="subnav"><a class="btn btn-secundario" href="#/admin">Eventos</a><a class="btn btn-primario" href="#/admin/nuevo">Nuevo evento</a></div>' +
      '<form id="form-evento" method="post" action="#/admin/nuevo" class="form-pagina" data-nuevo="' + (id ? "0" : "1") + '" data-usuario-nuevo="' + (usuarioNuevo ? "1" : "0") + '">' +
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
      '<div class="campo"><span>Inversión profesional</span><input name="precioProfesional" maxlength="40" placeholder="S/ 80 o Gratuito" value="' + escapar(evento.precioProfesional || "") + '"></div>' +
      '<div class="campo"><span>Inversión estudiante</span><input name="precioEstudiante" maxlength="40" placeholder="S/ 40 o Gratuito" value="' + escapar(evento.precioEstudiante || "") + '"></div>' +
      '<div class="campo campo-ancho"><span>Foto del evento</span><input type="hidden" name="imagen" value="' + escapar(evento.imagen || "") + '"><input name="imagenArchivo" type="file" accept="image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp" aria-label="Foto del evento"><p class="nota">Elige una foto de tu computadora, en JPG o PNG. ' + (fotoVisible(evento) ? "Si no eliges nada, se queda la foto actual." : "Si no eliges nada, el evento queda sin foto.") + '</p><img class="vista-foto" id="vista-foto" alt=""' + (fotoVisible(evento) ? ' src="' + escapar(fotoVisible(evento)) + '"' : " hidden") + "></div>" +
      '<div class="campo campo-ancho"><span>Requisitos</span><textarea name="requisitos" maxlength="2000">' + escapar(evento.requisitos || "") + "</textarea></div>" +
      '<label class="check"><input type="checkbox" name="activo"' + (evento.activo ? " checked" : "") + "> Inscripciones abiertas</label></section>" +
      '<section class="bloque"><h2>Acceso del organizador</h2><p class="nota">Esta persona entra por el botón Entrar y solo ve las inscripciones de este evento. Entrégale el usuario y la clave por un canal aparte: la clave no se vuelve a mostrar.</p>' +
      usuarioCampo +
      '<div class="campo"><span>Nombre del organizador</span><input name="organizadorNombre" aria-label="Nombre del organizador" maxlength="80" value="' + escapar(evento.organizadorNombre || "") + '"></div>' +
      '<div class="campo"><span>' + (usuarioNuevo ? "Clave del organizador" : "Nueva clave (opcional)") + '</span><input name="organizadorClave" aria-label="Clave del organizador" type="password" minlength="6" autocomplete="new-password"></div>' +
      '<div class="acciones-form"><button class="btn btn-primario" type="submit">' + (id ? "Guardar cambios" : "Crear evento") + "</button></div></section></form>");
  }

  function resumen(lista) {
    var pagados = lista.filter(function (item) { return item.pagado; }).length;
    return {
      total: lista.length,
      pagados: pagados,
      pendientes: lista.length - pagados,
      profesionales: lista.filter(function (item) { return item.categoria === "profesional"; }).length,
      estudiantes: lista.filter(function (item) { return item.categoria === "estudiante"; }).length
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

  function htmlFilasInscritos() {
    var lista = listaFiltrada();
    if (!estado.listaInscritos.length) {
      return '<tr><td colspan="8">Todavía no hay inscripciones.</td></tr>';
    }
    if (!lista.length) {
      return '<tr><td colspan="8">No hay inscripciones con ese criterio.</td></tr>';
    }
    return lista.map(function (item) {
      var pago = item.pagado
        ? '<span class="pill pill-ok">Pagó</span>'
        : '<span class="pill pill-aviso">Pendiente</span>';
      return "<tr><td data-label=\"Folio\">" + escapar(item.id) + "</td><td data-label=\"Nombre\">" + escapar(item.nombres + " " + item.apellidos) + "</td><td data-label=\"DNI\">" + escapar(item.dni) + "</td><td data-label=\"Correo\">" + escapar(item.correo) + "</td><td data-label=\"Categoría\">" + (item.categoria === "estudiante" ? "Estudiante" : "Profesional") + "</td><td data-label=\"WhatsApp\">" + escapar(item.whatsapp) + ' · <a href="https://wa.me/' + escapar(item.whatsapp) + '" target="_blank" rel="noopener noreferrer">Escribir</a></td><td data-label=\"Pago\">' + pago + '</td><td data-label="Acciones"><button type="button" class="btn btn-secundario" data-accion="pagado" data-id="' + escapar(item.id) + '" data-pagado="' + (item.pagado ? "1" : "0") + '">' + (item.pagado ? "Marcar pendiente" : "Marcar pagado") + '</button> <button type="button" class="btn btn-peligro" data-accion="anular" data-id="' + escapar(item.id) + '">Anular</button></td></tr>';
    }).join("");
  }

  function pintarCuerpoTabla() {
    var cuerpo = document.getElementById("cuerpo-inscritos");
    if (cuerpo) cuerpo.innerHTML = htmlFilasInscritos();
    document.querySelectorAll("[data-accion='filtro-pago']").forEach(function (boton) {
      boton.setAttribute("aria-pressed", boton.dataset.pago === estado.filtroPago ? "true" : "false");
    });
  }

  function htmlPanelInscritos(evento, lista, volver) {
    estado.listaInscritos = lista;
    estado.eventoActual = evento;
    var cifras = resumen(lista);
    var filtros = [["todos", "Todos"], ["pagados", "Pagaron"], ["pendientes", "Pendientes"]].map(function (par) {
      return '<button type="button" class="chip" data-accion="filtro-pago" data-pago="' + par[0] + '" aria-pressed="' + (estado.filtroPago === par[0] ? "true" : "false") + '">' + par[1] + "</button>";
    }).join("");
    return (volver || "") +
      '<div class="encabezado-pagina"><div class="pills"><span class="pill ' + (evento.activo ? "pill-ok" : "pill-off") + '">' + (evento.activo ? "Inscripciones abiertas" : "Inscripciones pausadas") + '</span></div><h1>' + escapar(evento.titulo) + "</h1><p>" + escapar(evento.organizacion) + " · " + escapar(formatoFecha(evento.fecha)) + (evento.organizadorUsuario ? " · Organizador: " + escapar(evento.organizadorUsuario) : "") + "</p></div>" +
      '<section class="stats"><article class="stat"><span>Inscritos</span><strong>' + cifras.total + '</strong></article><article class="stat"><span>Pagaron</span><strong>' + cifras.pagados + '</strong></article><article class="stat"><span>Pendientes</span><strong>' + cifras.pendientes + '</strong></article><article class="stat"><span>Profesionales / estudiantes</span><strong>' + cifras.profesionales + " / " + cifras.estudiantes + "</strong></article></section>" +
      (!evento.activo && estado.sesion && estado.sesion.rol === "organizador" ? '<p class="nota">El administrador pausó las inscripciones. Igual puedes revisar la lista y actualizar los pagos.</p>' : "") +
      '<div class="barra-lista"><input id="buscar-inscritos" class="buscador" style="max-width:360px" type="search" placeholder="Buscar nombre, DNI o correo" value="' + escapar(estado.buscaInscritos) + '" aria-label="Buscar inscritos"><div class="acciones">' + filtros + '<button type="button" class="btn btn-secundario" data-accion="excel">Descargar Excel</button></div></div>' +
      '<div class="tabla-wrap"><table class="tabla"><thead><tr><th>Folio</th><th>Nombre</th><th>DNI</th><th>Correo</th><th>Categoría</th><th>WhatsApp</th><th>Pago</th><th>Acciones</th></tr></thead><tbody id="cuerpo-inscritos">' + htmlFilasInscritos() + "</tbody></table></div>";
  }

  async function vistaInscritosAdmin(id) {
    if (!exigirRol("admin")) return vistaEntrar();
    var detalle = await window.API.detalleAdmin(id);
    document.title = "Inscritos · " + detalle.evento.titulo;
    return marco(htmlPanelInscritos(detalle.evento, detalle.inscripciones, '<div class="subnav"><a class="btn btn-secundario" href="#/admin">Eventos</a><a class="btn btn-secundario" href="#/admin/editar/' + escapar(id) + '">Editar</a><a class="btn btn-secundario" href="#/evento/' + escapar(id) + '">Ver ficha pública</a></div>'));
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
    return marco(htmlPanelInscritos(panel.evento, panel.inscripciones, ""));
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
  }

  function leerEvento(form) {
    var datos = new FormData(form);
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
      precioProfesional: datos.get("precioProfesional"),
      precioEstudiante: datos.get("precioEstudiante"),
      requisitos: datos.get("requisitos"),
      contacto: datos.get("contacto"),
      imagen: datos.get("imagen"),
      activo: form.activo.checked,
      organizadorUsuario: datos.get("organizadorUsuario"),
      organizadorNombre: datos.get("organizadorNombre"),
      organizadorClave: datos.get("organizadorClave")
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
    var filas = [["Folio", "Nombres", "Apellidos", "DNI", "Correo", "Categoría", "WhatsApp", "Pagado", "Fecha"]];
    estado.listaInscritos.forEach(function (item) {
      filas.push([item.id, item.nombres, item.apellidos, item.dni, item.correo, item.categoria, item.whatsapp, item.pagado ? "SI" : "NO", item.fecha]);
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
        whatsapp: datos.get("whatsapp")
      };
      var mensaje = window.Validar.inscripcion(inscripcion);
      if (mensaje) { ponerError(form, mensaje); return; }
      var boton = form.querySelector('[type="submit"]');
      boton.disabled = true;
      try {
        var creada = await window.API.inscribir(inscripcion);
        form.closest(".tarjeta-form").innerHTML = '<div class="exito"><p class="folio">' + escapar(creada.id) + '</p><h2>Inscripción registrada</h2><p>Guarda ese número. Quedaste en la lista y el pago figura como pendiente hasta que la organización lo confirme. Pueden escribirte al WhatsApp que dejaste.</p><p style="margin-top:14px"><a class="btn btn-secundario" href="#/">Volver a los eventos</a></p></div>';
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
        exigirOrganizador: form.dataset.nuevo === "1",
        usuarioNuevo: form.dataset.usuarioNuevo === "1"
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
        var guardado = await window.API.guardarEvento(entrada);
        if (!window.API.esDemo && entrada.imagenArchivo && String(guardado.imagen || "").indexOf("drive:") !== 0 && String(guardado.imagen || "").indexOf("http") !== 0) {
          avisar("El evento se guardó, pero la foto no. Falta publicar de nuevo la aplicación web de Google.", "mal");
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
    if (evento.target.id === "buscar-eventos") {
      estado.busqueda = evento.target.value;
      pintarGrilla();
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
