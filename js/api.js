(function () {
  var CLAVE_SESION = "portal_sesion";
  var CLAVE_DEMO = "portalCapacitacionesDemoV2";
  var HORAS = 12;

  function leerSesion() {
    try {
      return JSON.parse(sessionStorage.getItem(CLAVE_SESION) || "null");
    } catch (error) {
      return null;
    }
  }

  function guardarSesion(sesion) {
    sessionStorage.setItem(CLAVE_SESION, JSON.stringify(sesion));
  }

  function borrarSesion() {
    sessionStorage.removeItem(CLAVE_SESION);
  }

  function usuarioActual() {
    var sesion = leerSesion();
    if (!sesion) return null;
    return {
      usuario: sesion.usuario,
      nombre: sesion.nombre,
      rol: sesion.rol,
      eventoId: sesion.eventoId || ""
    };
  }

  function crearRemoto() {
    function urlScript() {
      return String(window.APP_CONFIG.SCRIPT_URL || "").trim();
    }

    async function llamar(action, datos) {
      var sesion = leerSesion();
      var payload = Object.assign({ action: action }, datos || {});
      if (sesion && sesion.token) payload.token = sesion.token;
      var respuesta;
      try {
        respuesta = await fetch(urlScript(), {
          method: "POST",
          redirect: "follow",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify(payload)
        });
      } catch (error) {
        throw new Error("No se pudo conectar con Google. Revisa la URL del script y que el acceso sea «Cualquier persona».");
      }
      var texto = await respuesta.text();
      if (!texto || texto.trim().charAt(0) === "<") {
        throw new Error("Google no devolvió datos. Implementa la aplicación web con acceso «Cualquier persona» y usa la URL que termina en /exec.");
      }
      var json;
      try {
        json = JSON.parse(texto);
      } catch (error) {
        throw new Error("La respuesta de Google no se pudo leer. Vuelve a implementar la aplicación web.");
      }
      if (!json.ok) {
        var fallo = new Error(json.error || "No se pudo completar la acción.");
        fallo.esRespuesta = true;
        throw fallo;
      }
      return json;
    }

    return {
      esDemo: false,
      usuarioActual: usuarioActual,
      restaurar: async function () {
        if (!leerSesion()) return null;
        try {
          var json = await llamar("validar");
          guardarSesion(Object.assign({ token: leerSesion().token }, json.sesion));
          return usuarioActual();
        } catch (error) {
          borrarSesion();
          return null;
        }
      },
      eventosPublicos: async function () {
        return (await llamar("eventosPublicos")).eventos;
      },
      eventoPublico: async function (id) {
        return (await llamar("eventoPublico", { id: id })).evento;
      },
      inscribir: async function (datos) {
        var mensaje = window.Validar.inscripcion(datos);
        if (mensaje) throw new Error(mensaje);
        return (await llamar("inscribir", datos)).inscripcion;
      },
      login: async function (usuario, clave) {
        var json = await llamar("login", { usuario: usuario, clave: clave });
        guardarSesion(json.sesion);
        return usuarioActual();
      },
      salir: async function () {
        try { await llamar("salir"); } catch (error) { /* la sesión local se cierra igual */ }
        borrarSesion();
      },
      eventosAdmin: async function () {
        return (await llamar("eventosAdmin")).eventos;
      },
      detalleAdmin: async function (id) {
        return llamar("detalleAdmin", { id: id });
      },
      guardarEvento: async function (datos) {
        return (await llamar("guardarEvento", datos)).evento;
      },
      activarEvento: async function (id, activo) {
        return (await llamar("activarEvento", { id: id, activo: activo })).evento;
      },
      miPanel: async function () {
        return llamar("miPanel");
      },
      marcarPago: async function (id, pagado) {
        return (await llamar("marcarPago", { id: id, pagado: pagado })).inscripcion;
      },
      anularInscripcion: async function (id) {
        await llamar("anularInscripcion", { id: id });
      },
      cambiarClave: async function (actual, nueva) {
        await llamar("cambiarClave", { actual: actual, nueva: nueva });
      }
    };
  }

  function crearDemo() {
    function semilla() {
      return {
        folio: 2,
        usuarios: [
          { id: "USR-admin", usuario: "admin", clave: "admin123", rol: "admin", eventoId: "", nombre: "Administrador", activo: true },
          { id: "USR-lima", usuario: "lima.cursos", clave: "evento123", rol: "organizador", eventoId: "EVT-gestion1", nombre: "María Delgado", activo: true },
          { id: "USR-norte", usuario: "lima.norte", clave: "evento123", rol: "organizador", eventoId: "EVT-gestion1", nombre: "Carlos Núñez", activo: true }
        ],
        eventos: [
          {
            id: "EVT-gestion1",
            titulo: "Formulación de proyectos sociales",
            organizacion: "Centro de Formación Lima",
            tipo: "Curso",
            descripcion: "Aprende a armar un proyecto con diagnóstico, objetivos, presupuesto y cronograma. El curso está pensado para equipos de organizaciones sociales y áreas de responsabilidad social.\n\nIncluye ejercicios con un caso y una plantilla para salir con un borrador.",
            fecha: "2026-11-18",
            hora: "09:00",
            lugar: "Av. Arequipa 1230, Lima",
            modalidad: "presencial",
            enlace: "",
            cupo: 40,
            precioProfesional: "S/ 120",
            precioEstudiante: "S/ 60",
            requisitos: "DNI vigente y una idea de proyecto, aunque esté en borrador.",
            contacto: "cursos@formacionlima.ejemplo",
            imagen: "",
            activo: true,
            creadoEn: "2026-10-01 10:00:00",
            organizadorUsuario: "lima.cursos",
            organizadorNombre: "María Delgado",
            organizadores: [
              { id: "USR-lima", usuario: "lima.cursos", nombre: "María Delgado", activo: true },
              { id: "USR-norte", usuario: "lima.norte", nombre: "Carlos Núñez", activo: true }
            ]
          },
          {
            id: "EVT-auxilios",
            titulo: "Primeros auxilios para docentes",
            organizacion: "Escuela de Salud Comunitaria",
            tipo: "Taller",
            descripcion: "Práctica de respuesta ante desmayos, heridas y emergencias en el aula. No reemplaza una certificación médica: sirve para actuar con calma mientras llega ayuda.\n\nEl enlace de la sesión se envía cuando el pago queda confirmado.",
            fecha: "2026-12-02",
            hora: "15:30",
            lugar: "Sesión virtual",
            modalidad: "virtual",
            enlace: "",
            cupo: 80,
            precioProfesional: "S/ 40",
            precioEstudiante: "Gratuito",
            requisitos: "Conexión estable. Conviene tener la cámara disponible para la práctica.",
            contacto: "aula@saludcomunitaria.ejemplo",
            imagen: "",
            activo: true,
            creadoEn: "2026-10-02 11:00:00",
            organizadorUsuario: "",
            organizadorNombre: ""
          },
          {
            id: "EVT-municipal",
            titulo: "Gestión municipal para regidores",
            organizacion: "Instituto de Gestión Pública",
            tipo: "Diplomado",
            descripcion: "Actualización en presupuesto público, participación vecinal y rendición de cuentas. Este evento está pausado y no aparece en la programación abierta.",
            fecha: "2026-09-04",
            hora: "18:00",
            lugar: "Plataforma virtual",
            modalidad: "virtual",
            enlace: "",
            cupo: 100,
            precioProfesional: "S/ 350",
            precioEstudiante: "S/ 200",
            requisitos: "Cargo vigente o carta de la municipalidad.",
            contacto: "mesas@gestionpublica.ejemplo",
            imagen: "",
            activo: false,
            creadoEn: "2026-08-01 09:00:00",
            organizadorUsuario: "",
            organizadorNombre: ""
          }
        ],
        inscripciones: [
          { id: "INS-0001", eventoId: "EVT-gestion1", nombres: "Ana Lucía", apellidos: "Quispe", dni: "45678912", correo: "ana.quispe@correo.ejemplo", categoria: "Profesional", whatsapp: "987654321", pagado: true, fecha: "2026-10-10 09:15:00", organizadorId: "USR-lima", organizadorUsuario: "lima.cursos", organizadorNombre: "María Delgado" },
          { id: "INS-0002", eventoId: "EVT-gestion1", nombres: "Luis Fernando", apellidos: "Rojas", dni: "40111222", correo: "luis.rojas@correo.ejemplo", categoria: "Estudiante", whatsapp: "912345678", pagado: false, fecha: "2026-10-12 16:40:00", organizadorId: "USR-norte", organizadorUsuario: "lima.norte", organizadorNombre: "Carlos Núñez" }
        ],
        sesiones: []
      };
    }

    function cargar() {
      try {
        var raw = localStorage.getItem(CLAVE_DEMO);
        if (raw) return JSON.parse(raw);
      } catch (error) { /* se regenera */ }
      var data = semilla();
      localStorage.setItem(CLAVE_DEMO, JSON.stringify(data));
      return data;
    }

    function guardar(data) {
      localStorage.setItem(CLAVE_DEMO, JSON.stringify(data));
    }

    function ahora() {
      var fecha = new Date();
      function dos(n) { return n < 10 ? "0" + n : String(n); }
      return fecha.getFullYear() + "-" + dos(fecha.getMonth() + 1) + "-" + dos(fecha.getDate()) + " " + dos(fecha.getHours()) + ":" + dos(fecha.getMinutes()) + ":" + dos(fecha.getSeconds());
    }

    function nuevoId(prefijo) {
      return prefijo + "-" + Math.random().toString(36).slice(2, 10);
    }

    function contar(data, eventoId) {
      var lista = data.inscripciones.filter(function (item) { return item.eventoId === eventoId; });
      return {
        inscritos: lista.length,
        pagados: lista.filter(function (item) { return item.pagado; }).length
      };
    }

    function publico(evento, data) {
      var conteo = contar(data, evento.id);
      return {
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
        cupo: evento.cupo || null,
        precioProfesional: evento.precioProfesional,
        precioEstudiante: evento.precioEstudiante,
        tarifas: evento.tarifas || [],
        mostrarInscritos: evento.mostrarInscritos !== false,
        requisitos: evento.requisitos,
        contacto: evento.contacto,
        imagen: evento.imagen,
        activo: evento.activo,
        inscritos: conteo.inscritos
      };
    }

    function organizadoresEvento(evento, data) {
      if (evento.organizadores && evento.organizadores.length) return evento.organizadores.slice();
      return data.usuarios.filter(function (item) {
        return item.rol === "organizador" && item.eventoId === evento.id && item.activo;
      }).map(function (item) {
        return { id: item.id, usuario: item.usuario, nombre: item.nombre, activo: true };
      });
    }

    function completo(evento, data) {
      var base = publico(evento, data);
      base.pagados = contar(data, evento.id).pagados;
      base.organizadores = organizadoresEvento(evento, data);
      base.organizadorUsuario = base.organizadores[0] ? base.organizadores[0].usuario : (evento.organizadorUsuario || "");
      base.organizadorNombre = base.organizadores[0] ? base.organizadores[0].nombre : (evento.organizadorNombre || "");
      return base;
    }

    function exigir(roles) {
      var sesion = leerSesion();
      if (!sesion) throw new Error("Sesión expirada. Vuelve a entrar.");
      var data = cargar();
      var guardada = data.sesiones.find(function (item) { return item.token === sesion.token; });
      if (!guardada || guardada.expira < Date.now()) throw new Error("Sesión expirada. Vuelve a entrar.");
      var usuario = data.usuarios.find(function (item) { return item.id === guardada.usuarioId && item.activo; });
      if (!usuario) throw new Error("Sesión expirada. Vuelve a entrar.");
      if (roles && roles.indexOf(usuario.rol) === -1) throw new Error("No tienes permiso para esto.");
      return usuario;
    }

    function normalizarEntrada(datos) {
      var cupo = window.Validar.limpio(datos.cupo);
      return {
        titulo: window.Validar.limpio(datos.titulo),
        organizacion: window.Validar.limpio(datos.organizacion),
        tipo: datos.tipo,
        descripcion: window.Validar.texto(datos.descripcion),
        fecha: window.Validar.limpio(datos.fecha),
        hora: window.Validar.limpio(datos.hora),
        lugar: window.Validar.limpio(datos.lugar),
        modalidad: datos.modalidad,
        enlace: window.Validar.limpio(datos.enlace),
        cupo: cupo ? Number(cupo) : null,
        precioProfesional: window.Validar.limpio(datos.precioProfesional),
        precioEstudiante: window.Validar.limpio(datos.precioEstudiante),
        tarifas: Array.isArray(datos.tarifas) ? datos.tarifas.slice(0, 5).map(function (item) {
          return { nombre: window.Validar.limpio(item && item.nombre), precio: window.Validar.limpio(item && item.precio) };
        }).filter(function (item) { return item.nombre || item.precio; }) : [],
        mostrarInscritos: datos.mostrarInscritos !== false,
        requisitos: window.Validar.texto(datos.requisitos),
        contacto: window.Validar.limpio(datos.contacto),
        imagen: window.Validar.limpio(datos.imagen),
        activo: Boolean(datos.activo),
        organizadores: Array.isArray(datos.organizadores) ? datos.organizadores.slice(0, 10).map(function (item) {
          return {
            usuario: window.Validar.limpio(item && item.usuario).toLowerCase(),
            nombre: window.Validar.limpio(item && item.nombre),
            clave: String((item && item.clave) || ""),
            existente: Boolean(item && item.existente)
          };
        }).filter(function (item) { return item.usuario || item.nombre || item.clave; }) : [],
        organizadorUsuario: window.Validar.limpio(datos.organizadorUsuario).toLowerCase(),
        organizadorNombre: window.Validar.limpio(datos.organizadorNombre),
        organizadorClave: String(datos.organizadorClave || "")
      };
    }

    return {
      esDemo: true,
      usuarioActual: usuarioActual,
      restaurar: async function () {
        try { exigir(); return usuarioActual(); }
        catch (error) { borrarSesion(); return null; }
      },
      reiniciar: function () {
        localStorage.removeItem(CLAVE_DEMO);
        borrarSesion();
        location.reload();
      },
      eventosPublicos: async function () {
        var data = cargar();
        return data.eventos.filter(function (evento) { return evento.activo; }).map(function (evento) {
          return publico(evento, data);
        });
      },
      eventoPublico: async function (id) {
        var data = cargar();
        var evento = data.eventos.find(function (item) { return item.id === id; });
        if (!evento) throw new Error("No encontramos ese evento.");
        return publico(evento, data);
      },
      inscribir: async function (datos) {
        var mensaje = window.Validar.inscripcion(datos);
        if (mensaje) throw new Error(mensaje);
        var data = cargar();
        var evento = data.eventos.find(function (item) { return item.id === datos.eventoId; });
        if (!evento || !evento.activo) throw new Error("Este evento no recibe inscripciones.");
        var dni = window.Validar.soloDigitos(datos.dni);
        var repetido = data.inscripciones.some(function (item) {
          return item.eventoId === evento.id && item.dni === dni;
        });
        if (repetido) throw new Error("Este DNI ya está inscrito en el evento.");
        var ocupados = data.inscripciones.filter(function (item) { return item.eventoId === evento.id; }).length;
        if (evento.cupo && ocupados >= evento.cupo) throw new Error("El cupo de este evento ya se completó.");
        var nombresTarifa = [];
        if (evento.tarifas && evento.tarifas.length) {
          nombresTarifa = evento.tarifas.map(function (item) { return item.nombre; });
        } else {
          if (evento.precioProfesional) nombresTarifa.push("Profesional");
          if (evento.precioEstudiante) nombresTarifa.push("Estudiante");
        }
        if (nombresTarifa.length && nombresTarifa.indexOf(window.Validar.limpio(datos.categoria)) === -1) {
          throw new Error("Elige una tarifa de este evento.");
        }
        var ref = window.Validar.limpio(datos.organizadorUsuario || datos.ref).toLowerCase();
        var orgRef = null;
        if (ref) {
          orgRef = data.usuarios.find(function (item) {
            return item.rol === "organizador" && item.eventoId === evento.id && item.activo && item.usuario === ref;
          });
          if (!orgRef) throw new Error("Ese enlace de organizador no es válido para este evento.");
        }
        data.folio = (data.folio || 0) + 1;
        var folio = String(data.folio);
        while (folio.length < 4) folio = "0" + folio;
        var inscripcion = {
          id: "INS-" + folio,
          eventoId: evento.id,
          nombres: window.Validar.limpio(datos.nombres),
          apellidos: window.Validar.limpio(datos.apellidos),
          dni: dni,
          correo: window.Validar.limpio(datos.correo).toLowerCase(),
          categoria: datos.categoria,
          whatsapp: window.Validar.soloDigitos(datos.whatsapp),
          pagado: false,
          fecha: ahora(),
          organizadorId: orgRef ? orgRef.id : "",
          organizadorUsuario: orgRef ? orgRef.usuario : "",
          organizadorNombre: orgRef ? orgRef.nombre : ""
        };
        data.inscripciones.push(inscripcion);
        guardar(data);
        return inscripcion;
      },
      login: async function (usuario, clave) {
        var data = cargar();
        var nombre = window.Validar.limpio(usuario).toLowerCase();
        var encontrado = data.usuarios.find(function (item) {
          return item.usuario === nombre && item.clave === String(clave || "") && item.activo;
        });
        if (!encontrado) throw new Error("Usuario o clave incorrectos.");
        var token = nuevoId("TOK");
        data.sesiones.push({ token: token, usuarioId: encontrado.id, expira: Date.now() + HORAS * 3600 * 1000 });
        guardar(data);
        guardarSesion({
          token: token,
          usuario: encontrado.usuario,
          nombre: encontrado.nombre,
          rol: encontrado.rol,
          eventoId: encontrado.eventoId || ""
        });
        return usuarioActual();
      },
      salir: async function () {
        var sesion = leerSesion();
        if (sesion) {
          var data = cargar();
          data.sesiones = data.sesiones.filter(function (item) { return item.token !== sesion.token; });
          guardar(data);
        }
        borrarSesion();
      },
      eventosAdmin: async function () {
        exigir(["admin"]);
        var data = cargar();
        return data.eventos.map(function (evento) { return completo(evento, data); });
      },
      detalleAdmin: async function (id) {
        exigir(["admin"]);
        var data = cargar();
        var evento = data.eventos.find(function (item) { return item.id === id; });
        if (!evento) throw new Error("No encontramos ese evento.");
        return {
          evento: completo(evento, data),
          inscripciones: data.inscripciones.filter(function (item) { return item.eventoId === id; }).sort(function (a, b) {
            return String(b.fecha).localeCompare(String(a.fecha));
          })
        };
      },
      guardarEvento: async function (datos) {
        var admin = exigir(["admin"]);
        void admin;
        var data = cargar();
        var esNuevo = !datos.id;
        var actual = esNuevo ? null : data.eventos.find(function (item) { return item.id === datos.id; });
        if (!esNuevo && !actual) throw new Error("No encontramos ese evento.");
        if ((!datos.organizadores || !datos.organizadores.length) && datos.organizadorUsuario) {
          datos.organizadores = [{
            usuario: datos.organizadorUsuario,
            nombre: datos.organizadorNombre,
            clave: datos.organizadorClave || "",
            existente: !esNuevo
          }];
        }
        var mensaje = window.Validar.evento(datos, { exigirOrganizador: esNuevo });
        if (mensaje) throw new Error(mensaje);
        var entrada = normalizarEntrada(datos);
        if (!entrada.organizadores.length && entrada.organizadorUsuario) {
          entrada.organizadores = [{
            usuario: entrada.organizadorUsuario,
            nombre: entrada.organizadorNombre,
            clave: entrada.organizadorClave,
            existente: !esNuevo
          }];
        }
        if (datos.imagenArchivo) {
          var foto = String(datos.imagenArchivo).replace(/\s/g, "");
          if (foto.indexOf("/9j/") !== 0 || foto.length > 1800000) throw new Error("No se pudo usar esa foto.");
          entrada.imagen = "data:image/jpeg;base64," + foto;
        }
        for (var i = 0; i < entrada.organizadores.length; i++) {
          var org = entrada.organizadores[i];
          var ocupado = data.usuarios.find(function (item) { return item.usuario === org.usuario; });
          if (ocupado && ocupado.rol === "admin") throw new Error("El usuario " + org.usuario + " está reservado para el administrador.");
          if (ocupado && ocupado.eventoId && (!actual || ocupado.eventoId !== actual.id)) {
            throw new Error("El usuario " + org.usuario + " ya pertenece a otro evento.");
          }
          if (!ocupado && org.clave.length < 6) throw new Error("La clave de " + org.usuario + " debe tener al menos 6 caracteres.");
        }
        var evento = actual || {
          id: nuevoId("EVT"),
          creadoEn: ahora(),
          organizadorUsuario: "",
          organizadorNombre: "",
          organizadores: []
        };
        if (entrada.tarifas.length) {
          entrada.precioProfesional = entrada.tarifas[0].precio || "";
          entrada.precioEstudiante = entrada.tarifas[1] ? entrada.tarifas[1].precio || "" : "";
        }
        ["titulo", "organizacion", "tipo", "descripcion", "fecha", "hora", "lugar", "modalidad", "enlace", "cupo", "precioProfesional", "precioEstudiante", "tarifas", "mostrarInscritos", "requisitos", "contacto", "imagen", "activo"].forEach(function (campo) {
          evento[campo] = entrada[campo];
        });
        var activos = {};
        entrada.organizadores.forEach(function (org) {
          var usuario = data.usuarios.find(function (item) { return item.usuario === org.usuario; });
          if (!usuario) {
            usuario = {
              id: nuevoId("USR"),
              usuario: org.usuario,
              clave: org.clave,
              rol: "organizador",
              eventoId: evento.id,
              nombre: org.nombre,
              activo: true
            };
            data.usuarios.push(usuario);
          } else {
            usuario.nombre = org.nombre;
            usuario.eventoId = evento.id;
            usuario.activo = true;
            if (org.clave) usuario.clave = org.clave;
          }
          activos[usuario.usuario] = true;
        });
        data.usuarios.forEach(function (item) {
          if (item.rol === "organizador" && item.eventoId === evento.id && !activos[item.usuario]) item.activo = false;
        });
        evento.organizadores = data.usuarios.filter(function (item) {
          return item.rol === "organizador" && item.eventoId === evento.id && item.activo;
        }).map(function (item) {
          return { id: item.id, usuario: item.usuario, nombre: item.nombre, activo: true };
        });
        evento.organizadorUsuario = evento.organizadores[0] ? evento.organizadores[0].usuario : "";
        evento.organizadorNombre = evento.organizadores[0] ? evento.organizadores[0].nombre : "";
        if (!actual) data.eventos.push(evento);
        guardar(data);
        return completo(evento, data);
      },
      activarEvento: async function (id, activo) {
        exigir(["admin"]);
        var data = cargar();
        var evento = data.eventos.find(function (item) { return item.id === id; });
        if (!evento) throw new Error("No encontramos ese evento.");
        evento.activo = Boolean(activo);
        guardar(data);
        return completo(evento, data);
      },
      miPanel: async function () {
        var usuario = exigir(["organizador"]);
        var data = cargar();
        var evento = data.eventos.find(function (item) { return item.id === usuario.eventoId; });
        if (!evento) return { evento: null, inscripciones: [], misInscripciones: [], totales: { inscritos: 0, pagados: 0, mios: 0 } };
        var todas = data.inscripciones.filter(function (item) { return item.eventoId === evento.id; }).sort(function (a, b) {
          return String(b.fecha).localeCompare(String(a.fecha));
        });
        var mias = todas.filter(function (item) {
          return String(item.organizadorId) === String(usuario.id) || String(item.organizadorUsuario || "").toLowerCase() === String(usuario.usuario || "").toLowerCase();
        });
        return {
          evento: completo(evento, data),
          inscripciones: todas,
          misInscripciones: mias,
          totales: {
            inscritos: todas.length,
            pagados: todas.filter(function (item) { return item.pagado; }).length,
            mios: mias.length
          }
        };
      },
      marcarPago: async function (id, pagado) {
        var usuario = exigir(["admin", "organizador"]);
        var data = cargar();
        var inscripcion = data.inscripciones.find(function (item) { return item.id === id; });
        if (!inscripcion) throw new Error("No encontramos esa inscripción.");
        if (usuario.rol === "organizador" && inscripcion.eventoId !== usuario.eventoId) {
          throw new Error("No puedes modificar inscripciones de otro evento.");
        }
        inscripcion.pagado = Boolean(pagado);
        guardar(data);
        return inscripcion;
      },
      anularInscripcion: async function (id) {
        var usuario = exigir(["admin", "organizador"]);
        var data = cargar();
        var inscripcion = data.inscripciones.find(function (item) { return item.id === id; });
        if (!inscripcion) throw new Error("No encontramos esa inscripción.");
        if (usuario.rol === "organizador" && inscripcion.eventoId !== usuario.eventoId) {
          throw new Error("No puedes modificar inscripciones de otro evento.");
        }
        data.inscripciones = data.inscripciones.filter(function (item) { return item.id !== id; });
        guardar(data);
      },
      cambiarClave: async function (actual, nueva) {
        var mensaje = window.Validar.claveNueva(actual, nueva);
        if (mensaje) throw new Error(mensaje);
        var usuario = exigir(["admin", "organizador"]);
        var data = cargar();
        var registro = data.usuarios.find(function (item) { return item.id === usuario.id; });
        if (!registro || registro.clave !== String(actual)) throw new Error("La clave actual no coincide.");
        registro.clave = String(nueva);
        guardar(data);
      }
    };
  }

  window.API = window.scriptConfigurado() ? crearRemoto() : crearDemo();
})();
