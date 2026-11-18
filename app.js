/* =========================================
   UDABOL GPS - SISTEMA COMPLETO
   Campus Cochabamba
========================================= */

// =========================================
// 1. CONFIGURACIÓN
// =========================================

const entrada = {
    nombre: "Entrada principal UDABOL",
    lat: -17.39068258,
    lng: -66.06906024
};

const centroCampus = [-17.3907, -66.0687];


// =========================================
// 2. DESTINOS UNIVERSITARIOS
// =========================================

const destinos = [
    {
        grupo: "BLOQUE B",
        lugares: ["Aula B1", "Aula B2"]
    },
    {
        grupo: "BLOQUE C",
        lugares: ["Aula C1", "Aula C2", "Aula C3", "Aula C4"]
    },
    {
        grupo: "CENTRO DE CÓMPUTO",
        lugares: ["Aula CC1", "Aula CC2", "Aula CC3", "Aula CC4"]
    },
    {
        grupo: "BLOQUE D",
        lugares: ["Aula D1", "Aula D2", "Aula D3", "Aula D4", "Aula D5"]
    },
    {
        grupo: "BLOQUE G",
        lugares: [
            "Aula G2", "Aula G3", "Aula G4", "Aula G5",
            "Aula G6", "Aula G7", "Aula G8", "Aula G9",
            "Aula G10", "Aula G12", "Aula G13", "Aula G14",
            "Aula G15", "Aula G16", "Aula G17", "Aula G18",
            "Aula G19"
        ]
    },
    {
        grupo: "SERVICIOS UNIVERSITARIOS",
        lugares: [
            "Biblioteca",
            "Jefatura",
            "Caja y Ventanilla",
            "Cafetería",
            "Laboratorio de Química",
            "Librería",
            "Marketing",
            "Gabinete Médico",
            "Área Deportiva",
            "Parqueo",
            "Edificio Nuevo",
            "Edificio de Salud"
        ]
    }
];


// =========================================
// 3. POLÍGONOS Y RUTAS DEL CENTRO DE CÓMPUTO
// Coordenadas importadas del KMZ
// =========================================

const campusShapes = {

    "Aula CC1": {
        area: [
            [-17.39076559757421, -66.06884169116988],
            [-17.39072675698335, -66.06882270714603],
            [-17.39077527571839, -66.0687431456074],
            [-17.39080944302865, -66.0687642755495],
            [-17.39076559757421, -66.06884169116988]
        ],
        route: [
            [-17.39068258211352, -66.06906024059744],
            [-17.39083745382670, -66.06877497198946],
            [-17.39079812725112, -66.06874721804867],
            [-17.39079291988484, -66.06875414849401]
        ]
    },

    "Aula CC2": {
        area: [
            [-17.39076388895728, -66.06873684324633],
            [-17.39072779854445, -66.06871536123720],
            [-17.39067279663206, -66.06879540183681],
            [-17.39071209975410, -66.06881529665448],
            [-17.39076388895728, -66.06873684324633]
        ],
        route: [
            [-17.39068257740846, -66.06906001620335],
            [-17.39083733302842, -66.06877565064696],
            [-17.39075136111303, -66.06871854688904],
            [-17.39074614876610, -66.06872593444044]
        ]
    },

    "Aula CC3": {
        area: [
            [-17.39071546543839, -66.06870938349509],
            [-17.39066692913994, -66.06868082970763],
            [-17.39060950227811, -66.06875932059953],
            [-17.39065834803257, -66.06878807042393],
            [-17.39071546543839, -66.06870938349509]
        ],
        route: [
            [-17.39068245617014, -66.06906257299390],
            [-17.39083710738369, -66.06877325319007],
            [-17.39069753432510, -66.06868630868175],
            [-17.39069130947538, -66.06869464807858]
        ]
    },

    "Aula CC4": {
        area: [
            [-17.39065219733583, -66.06867232097595],
            [-17.39059911185313, -66.06864264017696],
            [-17.39054656030036, -66.06871655087579],
            [-17.39059886499383, -66.06874991453628],
            [-17.39065219733583, -66.06867232097595]
        ],
        route: [
            [-17.39068246603326, -66.06906175820166],
            [-17.39083775358640, -66.06877671094130],
            [-17.39062737047701, -66.06864226042124],
            [-17.39062082664246, -66.06865221800993]
        ]
    }
};


// =========================================
// 4. VARIABLES DEL SISTEMA
// =========================================

let poligonoSeleccionado = null;
let rutaActual = null;
let etiquetaDestino = null;
let lineaDirectaUsuarioDestino = null;
let destinoActivo = null;
let primeraUbicacionGPS = true;

let gpsWatchId = null;
let marcadorEstudiante = null;
let circuloPrecision = null;
let ubicacionEstudiante = null;
let avisoLlegadaMostrado = false;
let marcadorTiempoRuta = null;


// =========================================
// 5. COMPROBAR LIBRERÍA LEAFLET
// =========================================

if (typeof L === "undefined") {
    throw new Error(
        "Leaflet no se ha cargado. Comprueba tu conexión a Internet."
    );
}


// =========================================
// 6. CREAR MAPA
// =========================================

const map = L.map("map", {
    zoomControl: false
}).setView(centroCampus, 18);

L.control.zoom({
    position: "topleft"
}).addTo(map);


// =========================================
// 7. MAPA SATELITAL
// =========================================

L.tileLayer(
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    {
        maxZoom: 21,
        maxNativeZoom: 19,
        attribution: "Tiles © Esri"
    }
).addTo(map);


// =========================================
// 8. MARCADOR DE ENTRADA
// =========================================

const marcadorEntrada = L.circleMarker(
    [entrada.lat, entrada.lng],
    {
        radius: 7,
        color: "#ffffff",
        weight: 2,
        fillColor: "#16a36a",
        fillOpacity: 1
    }
).addTo(map);

marcadorEntrada.bindPopup(
    "<strong>Entrada principal UDABOL</strong>"
);


// =========================================
// 9. FUNCIONES AUXILIARES
// =========================================

function normalizarTexto(texto) {
    return texto
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
}

function calcularDistancia(coordenadas) {
    let metros = 0;

    for (let i = 1; i < coordenadas.length; i++) {
        metros += L.latLng(coordenadas[i - 1])
            .distanceTo(L.latLng(coordenadas[i]));
    }

    return metros;
}

function formatoDistancia(metros) {
    if (metros < 1000) {
        return `${Math.round(metros)} m`;
    }

    return `${(metros / 1000).toFixed(2)} km`;
}

function calcularTiempo(metros) {
    const velocidad = 1.2;
    return Math.max(1, Math.ceil(metros / velocidad / 60));
}


// =========================================
// RUTAS PEATONALES EXTERIORES CON VALHALLA
// =========================================

const VALHALLA_ROUTE_URL = "https://valhalla1.openstreetmap.de/route";
let rutaExterior = null;
let ultimaSolicitudRuta = null;
let solicitudRutaEnCurso = false;
let idSolicitudRuta = 0;
let resumenRutaExterior = null;

function decodificarPolyline(encoded, precision = 6) {
    let index = 0;
    let lat = 0;
    let lng = 0;
    const coordinates = [];
    const factor = Math.pow(10, precision);

    while (index < encoded.length) {
        let result = 0;
        let shift = 0;
        let byte;

        do {
            byte = encoded.charCodeAt(index++) - 63;
            result |= (byte & 0x1f) << shift;
            shift += 5;
        } while (byte >= 0x20);

        lat += (result & 1) ? ~(result >> 1) : (result >> 1);

        result = 0;
        shift = 0;

        do {
            byte = encoded.charCodeAt(index++) - 63;
            result |= (byte & 0x1f) << shift;
            shift += 5;
        } while (byte >= 0x20);

        lng += (result & 1) ? ~(result >> 1) : (result >> 1);
        coordinates.push([lat / factor, lng / factor]);
    }

    return coordinates;
}

function actualizarDistanciaEnPanel() {
    const valor = document.getElementById("liveDistanceValue");
    const nota = document.getElementById("liveDistanceNote");

    if (!valor || !nota) return;

    if (!ubicacionEstudiante || !destinoActivo) {
        valor.textContent = "Activa el GPS";
        nota.textContent = "Se calculará una ruta peatonal desde tu ubicación.";
        return;
    }

    if (resumenRutaExterior) {
        const distanciaTotal = resumenRutaExterior.distanciaMetros +
            calcularDistancia(campusShapes[destinoActivo].route);

        const minutosTotal = Math.ceil(
            resumenRutaExterior.duracionSegundos / 60 +
            calcularDistancia(campusShapes[destinoActivo].route) / 1.2 / 60
        );

        valor.textContent = formatoDistancia(distanciaTotal);
        nota.textContent = `Ruta peatonal calculada hasta UDABOL + recorrido interno hasta ${destinoActivo} · ${minutosTotal} min aprox.`;

        actualizarMarcadorTiempoRuta(minutosTotal);
        return;
    }

    valor.textContent = "Calculando ruta...";
    nota.textContent = "Consultando calles y caminos peatonales.";
}

function actualizarMarcadorTiempoRuta(minutos) {
    if (!destinoActivo || !campusShapes[destinoActivo]) return;

    if (marcadorTiempoRuta) {
        map.removeLayer(marcadorTiempoRuta);
        marcadorTiempoRuta = null;
    }

    let puntoMedio = null;

    if (rutaExterior && typeof rutaExterior.getLayers === "function") {
        const linea = rutaExterior.getLayers().find(
            capa => typeof capa.getLatLngs === "function"
        );

        if (linea) {
            const puntos = linea.getLatLngs();

            if (puntos.length) {
                puntoMedio = puntos[Math.floor(puntos.length / 2)];
            }
        }
    }

    if (!puntoMedio) {
        const puntos = campusShapes[destinoActivo].route;
        puntoMedio = puntos[Math.floor(puntos.length / 2)];
    }

    marcadorTiempoRuta = L.marker(puntoMedio, {
        interactive: false,
        keyboard: false,
        zIndexOffset: 1500,

        icon: L.divIcon({
            className: "walking-time-marker",

            html: `
                <div class="walking-time-badge">
                    <span>🚶</span>
                    <strong>${minutos} min</strong>
                </div>
            `,

            iconSize: [100, 34],
            iconAnchor: [50, 17]
        })
    }).addTo(map);
}


async function calcularRutaPeatonalExterior(forzar = false) {

    if (!ubicacionEstudiante || !destinoActivo || !campusShapes[destinoActivo]) {
        return;
    }

    const origen = {
        lat: ubicacionEstudiante.lat,
        lon: ubicacionEstudiante.lng
    };

    if (!forzar && ultimaSolicitudRuta) {

        const movimiento = L.latLng(origen.lat, origen.lon)
            .distanceTo(
                L.latLng(
                    ultimaSolicitudRuta.lat,
                    ultimaSolicitudRuta.lon
                )
            );

        if (movimiento < 60 && resumenRutaExterior) return;
    }

    if (solicitudRutaEnCurso) return;

    solicitudRutaEnCurso = true;

    const solicitudActual = ++idSolicitudRuta;

    ultimaSolicitudRuta = origen;
    resumenRutaExterior = null;

    actualizarDistanciaEnPanel();

    try {

        const payload = {
            locations: [
                {
                    lat: origen.lat,
                    lon: origen.lon
                },
                {
                    lat: entrada.lat,
                    lon: entrada.lng
                }
            ],

            costing: "pedestrian",
            units: "kilometers",
            language: "es-ES",
            id: "udabol-gps-walking"
        };

        const respuesta = await fetch(VALHALLA_ROUTE_URL, {
            method: "POST",

            headers: {
                "Content-Type": "application/json",
                "X-Client-Id": "udabol-gps-campus-navigation"
            },

            body: JSON.stringify(payload)
        });

        if (!respuesta.ok) {
            throw new Error(
                `El servicio de rutas respondió ${respuesta.status}.`
            );
        }

        const datos = await respuesta.json();

        if (solicitudActual !== idSolicitudRuta) return;

        const pierna = datos.trip?.legs?.[0];
        const forma = pierna?.shape;
        const resumen = pierna?.summary;

        if (!forma || !resumen) {
            throw new Error(
                "El servicio no encontró una ruta peatonal para este recorrido."
            );
        }

        const coordenadas = decodificarPolyline(forma, 6);

        if (coordenadas.length < 2) {
            throw new Error(
                "La ruta recibida no contiene suficientes puntos."
            );
        }

        resumenRutaExterior = {
            distanciaMetros: (resumen.length || 0) * 1000,
            duracionSegundos: resumen.time || 0
        };

        if (rutaExterior) {
            map.removeLayer(rutaExterior);
        }

        // FONDO BLANCO PUNTEADO DE LA RUTA EXTERIOR

        const fondoRutaExterior = L.polyline(
            coordenadas,
            {
                color: "#ffffff",
                weight: 9,
                opacity: 0.95,
                dashArray: "1 10",
                lineCap: "round",
                lineJoin: "round",
                interactive: false
            }
        );

        // RUTA EXTERIOR AZUL PUNTEADA

        const lineaAzulExterior = L.polyline(
            coordenadas,
            {
                color: "#1268e8",
                weight: 6,
                opacity: 1,
                dashArray: "1 10",
                lineCap: "round",
                lineJoin: "round",
                interactive: false
            }
        );

        rutaExterior = L.layerGroup([
            fondoRutaExterior,
            lineaAzulExterior
        ]).addTo(map);

        rutaExterior.bringToBack();

        if (rutaActual) rutaActual.bringToFront();
        if (poligonoSeleccionado) poligonoSeleccionado.bringToFront();
        if (etiquetaDestino) etiquetaDestino.bringToFront();

        if (marcadorEstudiante) {
            marcadorEstudiante.setZIndexOffset(2000);
        }

        actualizarDistanciaEnPanel();

        const bounds = L.latLngBounds(coordenadas);

        if (poligonoSeleccionado) {
            bounds.extend(poligonoSeleccionado.getBounds());
        }

        bounds.extend(ubicacionEstudiante);

        map.flyToBounds(bounds, {
            padding: [35, 35],
            maxZoom: 18,
            duration: 1.2
        });

        actualizarEstadoGPS(
            "Ruta peatonal lista",
            "Ruta exterior calculada · precisión GPS según el teléfono",
            true
        );

    } catch (error) {

        console.error("Error calculando ruta peatonal:", error);

        resumenRutaExterior = null;

        actualizarDistanciaEnPanel();

        actualizarEstadoGPS(
            "No se pudo calcular la ruta",
            "Comprueba Internet o inténtalo nuevamente. Se conserva el mapa y la ruta interna.",
            true
        );

    } finally {

        if (solicitudActual === idSolicitudRuta) {
            solicitudRutaEnCurso = false;
        }
    }
}


function actualizarReferenciaGPSDestino() {

    if (!ubicacionEstudiante || !destinoActivo) return;

    calcularRutaPeatonalExterior(false);
}


function ajustarVistaNavegacion() {

    if (!destinoActivo || !poligonoSeleccionado) return;

    const boundsDestino = poligonoSeleccionado.getBounds();

    if (ubicacionEstudiante) {

        const boundsCombinados = L.latLngBounds(
            boundsDestino.getSouthWest(),
            boundsDestino.getNorthEast()
        );

        boundsCombinados.extend(ubicacionEstudiante);

        map.flyToBounds(boundsCombinados, {
            padding: [45, 45],
            maxZoom: 19,
            duration: 1.2
        });

    } else {

        map.flyToBounds(boundsDestino, {
            padding: [90, 90],
            maxZoom: 21,
            duration: 1.2
        });
    }
}


// =========================================
// 10. GENERAR MENÚ DE DESTINOS
// =========================================

const contenedor = document.getElementById("destinations");
const sugerencias = document.getElementById("destinationSuggestions");

destinos.forEach(grupo => {

    const seccion = document.createElement("section");
    seccion.className = "destination-group";

    const titulo = document.createElement("h3");
    titulo.textContent = grupo.grupo;

    const lista = document.createElement("div");
    lista.className = "destination-list";

    grupo.lugares.forEach(nombre => {

        const boton = document.createElement("button");

        boton.type = "button";
        boton.className = "destination-btn";
        boton.textContent = nombre;

        const opcion = document.createElement("option");
        opcion.value = nombre;

        sugerencias.appendChild(opcion);

        if (campusShapes[nombre]) {

            boton.addEventListener("click", () => {
                seleccionarDestino(nombre, boton);
            });

        } else {

            boton.classList.add("pending");

            boton.title =
                "Faltan las coordenadas y la ruta de este destino.";

            boton.addEventListener("click", () => {
                mostrarAvisoPendiente(nombre);
            });
        }

        lista.appendChild(boton);
    });

    seccion.appendChild(titulo);
    seccion.appendChild(lista);

    contenedor.appendChild(seccion);
});


// =========================================
// 11. MOSTRAR DESTINO PENDIENTE
// =========================================

function mostrarAvisoPendiente(nombre) {

    const panel = document.getElementById("routeInformation");

    panel.innerHTML = `
        <div class="route-top">
            <div class="route-icon">📍</div>

            <div>
                <h3>${nombre}</h3>
                <p>Destino pendiente de configurar</p>
            </div>
        </div>

        <div class="route-note">
            Necesitamos importar las coordenadas, el polígono
            y la ruta peatonal de este destino.
        </div>
    `;
}


// =========================================
// 12. CREAR ETIQUETA DEL AULA
// =========================================

function crearEtiquetaDestino(nombre, poligono) {

    if (etiquetaDestino) {
        map.removeLayer(etiquetaDestino);
        etiquetaDestino = null;
    }

    const centro = poligono.getBounds().getCenter();

    etiquetaDestino = L.marker(centro, {
        interactive: false,
        keyboard: false,
        zIndexOffset: 1000,

        icon: L.divIcon({
            className: "aula-label-container",

            html: `
                <div class="aula-label">
                    <span class="aula-label-pin">●</span>
                    ${nombre.toUpperCase()}
                </div>
            `,

            iconSize: [140, 32],
            iconAnchor: [70, 16]
        })
    }).addTo(map);
}


// =========================================
// 13. MOSTRAR INFORMACIÓN DE RUTA
// =========================================

function mostrarPanel(nombre, geometria) {

    const panel = document.getElementById("routeInformation");

    const distancia = calcularDistancia(geometria.route);
    const tiempo = calcularTiempo(distancia);

    panel.innerHTML = `
        <div class="route-top">
            <div class="route-icon">🧭</div>

            <div>
                <h3>${nombre}</h3>
                <p>Destino seleccionado</p>
            </div>
        </div>

        <div class="route-stats">

            <div class="route-stat">
                <span>Distancia del recorrido</span>
                <strong>${formatoDistancia(distancia)}</strong>
                <small>Ruta importada</small>
            </div>

            <div class="route-stat">
                <span>Tiempo estimado</span>
                <strong>${tiempo} min</strong>
                <small>Caminando a 1.2 m/s</small>
            </div>

        </div>

        <div class="route-live-distance">
            <span>Distancia desde tu ubicación GPS</span>

            <strong id="liveDistanceValue">
                Activa el GPS
            </strong>

            <small id="liveDistanceNote">
                Se calculará una ruta peatonal exterior hasta UDABOL
                y luego el tramo interno al aula.
            </small>
        </div>

        <div class="route-steps">

            <div class="route-step">
                <span class="step-dot start"></span>
                <span>Entrada principal UDABOL</span>
            </div>

            <div class="route-step">
                <span class="step-dot end"></span>
                <strong>${nombre}</strong>
            </div>

        </div>

        <div class="route-note">
            Distancia y tiempo aproximados según la geometría
            de la ruta importada.
        </div>
    `;
}


// =========================================
// 14. LIMPIAR CAPAS ANTERIORES
// =========================================

function limpiarCapas() {

    if (poligonoSeleccionado) {
        map.removeLayer(poligonoSeleccionado);
        poligonoSeleccionado = null;
    }

    if (rutaActual) {
        map.removeLayer(rutaActual);
        rutaActual = null;
    }

    if (etiquetaDestino) {
        map.removeLayer(etiquetaDestino);
        etiquetaDestino = null;
    }

    if (lineaDirectaUsuarioDestino) {
        map.removeLayer(lineaDirectaUsuarioDestino);
        lineaDirectaUsuarioDestino = null;
    }

    if (rutaExterior) {
        map.removeLayer(rutaExterior);
        rutaExterior = null;
    }

    if (marcadorTiempoRuta) {
        map.removeLayer(marcadorTiempoRuta);
        marcadorTiempoRuta = null;
    }

    resumenRutaExterior = null;
    ultimaSolicitudRuta = null;

    document.querySelectorAll(".destination-btn").forEach(boton => {
        boton.classList.remove("active");
    });
}


// =========================================
// 15. SELECCIONAR DESTINO
// =========================================

function seleccionarDestino(nombre, boton) {

    const geometria = campusShapes[nombre];

    if (!geometria) {
        mostrarAvisoPendiente(nombre);
        return;
    }

    destinoActivo = nombre;
    avisoLlegadaMostrado = false;

    limpiarCapas();

    if (boton) {
        boton.classList.add("active");
    }

    // Dibujar polígono del aula

    poligonoSeleccionado = L.polygon(
        geometria.area,
        {
            color: "#0865dc",
            weight: 2,
            opacity: 1,
            fillColor: "#1685ff",
            fillOpacity: 0.30
        }
    ).addTo(map);


    // FONDO BLANCO PUNTEADO DE LA RUTA INTERNA

    const rutaBlanca = L.polyline(
        geometria.route,
        {
            color: "#ffffff",
            weight: 6,
            opacity: 0.95,
            dashArray: "1 10",
            lineCap: "round",
            lineJoin: "round",
            interactive: false
        }
    );


    // RUTA INTERNA AZUL PUNTEADA

    const rutaAzul = L.polyline(
        geometria.route,
        {
            color: "#087cff",
            weight: 3,
            opacity: 1,
            dashArray: "1 10",
            lineCap: "round",
            lineJoin: "round",
            interactive: false
        }
    );

    rutaActual = L.layerGroup([
        rutaBlanca,
        rutaAzul
    ]).addTo(map);


    // Etiqueta sobre el aula

    crearEtiquetaDestino(nombre, poligonoSeleccionado);

    poligonoSeleccionado.bindPopup(
        `<strong>${nombre}</strong>`
    );


    // Mostrar el aula y la ubicación GPS si está activa

    ajustarVistaNavegacion();

    mostrarPanel(nombre, geometria);
    actualizarDistanciaEnPanel();

    if (rutaExterior) {
        map.removeLayer(rutaExterior);
        rutaExterior = null;
    }

    resumenRutaExterior = null;
    ultimaSolicitudRuta = null;

    if (ubicacionEstudiante) {
        calcularRutaPeatonalExterior(true);
    }
}


// =========================================
// 16. BUSCADOR
// =========================================

function buscarDestino() {

    const texto = normalizarTexto(
        document.getElementById("searchInput").value
    );

    if (!texto) {
        alert("Escribe el nombre de un aula o servicio.");
        return;
    }

    const todosLosNombres = destinos.flatMap(
        grupo => grupo.lugares
    );

    const encontrado = todosLosNombres.find(nombre => {

        const normalizado = normalizarTexto(nombre);
        const corto = normalizado.replace("aula ", "");

        return normalizado === texto || corto === texto;
    });

    if (!encontrado) {
        alert("No encontramos ese destino.");
        return;
    }

    if (!campusShapes[encontrado]) {
        mostrarAvisoPendiente(encontrado);
        return;
    }

    const boton = [
        ...document.querySelectorAll(".destination-btn")
    ].find(elemento => elemento.textContent === encontrado);

    seleccionarDestino(encontrado, boton);
}

document.getElementById("searchButton")
    .addEventListener("click", buscarDestino);

document.getElementById("searchInput")
    .addEventListener("keydown", evento => {
        if (evento.key === "Enter") {
            buscarDestino();
        }
    });


// =========================================
// 17. RESTABLECER MAPA
// =========================================

document.getElementById("resetButton")
    .addEventListener("click", () => {

        limpiarCapas();

        destinoActivo = null;
        avisoLlegadaMostrado = false;

        document.getElementById("searchInput").value = "";

        if (ubicacionEstudiante && marcadorEstudiante) {

            map.flyTo(
                ubicacionEstudiante,
                18,
                { duration: 1.5 }
            );

        } else {

            map.flyTo(
                centroCampus,
                18,
                { duration: 1.5 }
            );
        }

        document.getElementById("routeInformation").innerHTML = `
            <div class="route-top">
                <div class="route-icon">📍</div>

                <div>
                    <h3>Bienvenido a UDABOL GPS</h3>
                    <p>Selecciona un destino para comenzar.</p>
                </div>
            </div>
        `;
    });


// =========================================
// 18. REFERENCIAS DE LOS CONTROLES GPS
// =========================================

const botonIniciarGPS = document.getElementById("startGpsButton");
const botonDetenerGPS = document.getElementById("stopGpsButton");

const gpsIndicador = document.getElementById("gpsStatusIndicator");
const gpsTitulo = document.getElementById("gpsStatusTitle");
const gpsTexto = document.getElementById("gpsStatusText");


// =========================================
// 19. ACTUALIZAR ESTADO VISUAL DEL GPS
// =========================================

function actualizarEstadoGPS(titulo, mensaje, activo = false) {

    if (gpsTitulo) {
        gpsTitulo.textContent = titulo;
    }

    if (gpsTexto) {
        gpsTexto.textContent = mensaje;
    }

    if (gpsIndicador) {
        gpsIndicador.classList.toggle("active", activo);
    }
}


// =========================================
// 20. ICONO AZUL DEL ESTUDIANTE
// =========================================

function crearIconoEstudiante() {

    return L.divIcon({
        className: "student-location-marker",

        html: `
            <div class="student-location-dot">
                <div class="student-location-pulse"></div>
            </div>
        `,

        iconSize: [20, 20],
        iconAnchor: [10, 10]
    });
}


// =========================================
// 21. INICIAR GPS
// =========================================

function iniciarGPS() {

    if (!navigator.geolocation) {

        actualizarEstadoGPS(
            "GPS no disponible",
            "Tu navegador no admite geolocalización."
        );

        return;
    }

    if (gpsWatchId !== null) {
        return;
    }

    botonIniciarGPS.disabled = true;

    actualizarEstadoGPS(
        "Buscando ubicación...",
        "Acepta el permiso de ubicación del navegador."
    );

    gpsWatchId = navigator.geolocation.watchPosition(
        actualizarPosicionEstudiante,
        errorGPS,
        {
            enableHighAccuracy: true,
            maximumAge: 1000,
            timeout: 20000
        }
    );

    botonDetenerGPS.disabled = false;
}


// =========================================
// 22. ACTUALIZAR POSICIÓN DEL ESTUDIANTE
// =========================================

function actualizarPosicionEstudiante(posicion) {

    const lat = posicion.coords.latitude;
    const lng = posicion.coords.longitude;
    const precision = posicion.coords.accuracy;

    ubicacionEstudiante = L.latLng(lat, lng);

    // Crear marcador si todavía no existe

    if (!marcadorEstudiante) {

        marcadorEstudiante = L.marker(
            [lat, lng],
            {
                icon: crearIconoEstudiante(),
                zIndexOffset: 2000
            }
        ).addTo(map);

        marcadorEstudiante.bindPopup(
            "<strong>Tu ubicación actual</strong>"
        );

        if (destinoActivo && poligonoSeleccionado) {

            ajustarVistaNavegacion();

        } else {

            map.flyTo(
                [lat, lng],
                Math.max(map.getZoom(), 19),
                { duration: 1.5 }
            );
        }

    } else {

        marcadorEstudiante.setLatLng([lat, lng]);
    }


    // Dibujar círculo de precisión GPS

    if (!circuloPrecision) {

        circuloPrecision = L.circle(
            [lat, lng],
            {
                radius: precision,
                color: "#1685ff",
                weight: 1,
                fillColor: "#1685ff",
                fillOpacity: 0.10,
                interactive: false
            }
        ).addTo(map);

    } else {

        circuloPrecision.setLatLng([lat, lng]);
        circuloPrecision.setRadius(precision);
    }


    actualizarEstadoGPS(
        "GPS activo",
        `Precisión aproximada: ${Math.round(precision)} metros`,
        true
    );

    actualizarReferenciaGPSDestino();
    actualizarDistanciaEnPanel();

    comprobarLlegada(precision);
}


// =========================================
// 23. COMPROBAR LLEGADA APROXIMADA
// =========================================

function comprobarLlegada(precision) {

    if (!destinoActivo || !poligonoSeleccionado) {
        return;
    }

    if (avisoLlegadaMostrado) {
        return;
    }

    if (precision > 30) {
        return;
    }

    const centroDestino = poligonoSeleccionado
        .getBounds()
        .getCenter();

    const distancia = ubicacionEstudiante.distanceTo(
        centroDestino
    );

    if (distancia <= 15) {

        avisoLlegadaMostrado = true;

        const panel = document.getElementById("routeInformation");

        const aviso = document.createElement("div");

        aviso.className = "arrival-message";

        aviso.textContent =
            `¡Has llegado cerca de ${destinoActivo}!`;

        panel.appendChild(aviso);

        actualizarEstadoGPS(
            "Destino alcanzado",
            `Estás cerca de ${destinoActivo}.`,
            true
        );
    }
}


// =========================================
// 24. MANEJAR ERRORES DEL GPS
// =========================================

function errorGPS(error) {

    if (gpsWatchId !== null) {

        navigator.geolocation.clearWatch(gpsWatchId);
        gpsWatchId = null;
    }

    botonIniciarGPS.disabled = false;
    botonDetenerGPS.disabled = true;

    switch (error.code) {

        case error.PERMISSION_DENIED:

            actualizarEstadoGPS(
                "Permiso denegado",
                "Permite la ubicación en la configuración del navegador."
            );

            break;

        case error.POSITION_UNAVAILABLE:

            actualizarEstadoGPS(
                "Ubicación no disponible",
                "No se pudo obtener tu posición actual."
            );

            break;

        case error.TIMEOUT:

            actualizarEstadoGPS(
                "Tiempo agotado",
                "No se recibió la ubicación. Intenta nuevamente."
            );

            break;

        default:

            actualizarEstadoGPS(
                "Error GPS",
                "No fue posible obtener tu ubicación."
            );
    }

    console.error(
        "Error de geolocalización:",
        error.message
    );
}


// =========================================
// 25. DETENER GPS
// =========================================

function detenerGPS() {

    if (gpsWatchId !== null) {

        navigator.geolocation.clearWatch(gpsWatchId);
        gpsWatchId = null;
    }

    if (marcadorEstudiante) {

        map.removeLayer(marcadorEstudiante);
        marcadorEstudiante = null;
    }

    if (circuloPrecision) {

        map.removeLayer(circuloPrecision);
        circuloPrecision = null;
    }

    ubicacionEstudiante = null;
    avisoLlegadaMostrado = false;
    resumenRutaExterior = null;
    ultimaSolicitudRuta = null;

    if (rutaExterior) {

        map.removeLayer(rutaExterior);
        rutaExterior = null;
    }

    if (marcadorTiempoRuta) {

        map.removeLayer(marcadorTiempoRuta);
        marcadorTiempoRuta = null;
    }

    actualizarDistanciaEnPanel();

    botonIniciarGPS.disabled = false;
    botonDetenerGPS.disabled = true;

    actualizarEstadoGPS(
        "GPS detenido",
        "Activa tu ubicación para comenzar."
    );
}


// =========================================
// 26. CONECTAR BOTONES GPS
// =========================================

botonIniciarGPS.addEventListener("click", iniciarGPS);
botonDetenerGPS.addEventListener("click", detenerGPS);


// =========================================
// 27. INICIAR SISTEMA
// =========================================

map.whenReady(() => {

    setTimeout(() => {
        map.invalidateSize();
    }, 300);

    console.log("UDABOL GPS iniciado correctamente.");

    console.log(
        "Aulas con polígonos y rutas:",
        Object.keys(campusShapes)
    );
});