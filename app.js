/* =====================================================
   UDABOL GPS - NUEVA VERSION
   Fuente geografica unica: ./campus.geojson
   No contiene destinos ni coordenadas manuales antiguos.
===================================================== */

(() => {
  'use strict';

  const GEOJSON_URL = './campus.geojson';
  const VALHALLA_URL = 'https://valhalla1.openstreetmap.de/route';
  const CAMPUS_FALLBACK = [-17.3907, -66.0687];
  const URL_UDABOL = 'https://arispeariel30-tech.github.io/udabol-gps/';


  const routeTooltipStyle = document.createElement('style');
  routeTooltipStyle.textContent = `
    .leaflet-tooltip.route-start-tooltip {
      background: #15803d; color: #fff; border: 2px solid #fff;
      border-radius: 7px; padding: 5px 9px; font-weight: 800;
      box-shadow: 0 2px 8px #0008;
    }
    .leaflet-tooltip.route-start-tooltip:before { border-top-color: #15803d; }
    .leaflet-tooltip.selected-destination-tooltip {
      background: #123b68; color: #fff; border: 2px solid #fff;
      border-radius: 7px; padding: 5px 9px; font-weight: 800;
      box-shadow: 0 2px 8px #0008;
    }
    .leaflet-tooltip.selected-destination-tooltip:before { border-top-color: #123b68; }
  `;
  document.head.appendChild(routeTooltipStyle);

  const $ = (id) => document.getElementById(id);
  const ui = {
    destinations: $('destinations'), suggestions: $('destinationSuggestions'),
    search: $('searchInput'), searchButton: $('searchButton'),
    routeInfo: $('routeInformation'), reset: $('resetButton'),
    gpsStart: $('startGpsButton'), gpsStop: $('stopGpsButton'),
    gpsIndicator: $('gpsStatusIndicator'), gpsTitle: $('gpsStatusTitle'),
    gpsText: $('gpsStatusText'), topbar: document.querySelector('.topbar')
  };

  if (typeof L === 'undefined') {
    alert('No se pudo cargar Leaflet. Comprueba tu conexión a Internet.');
    return;
  }
  if (!ui.destinations || !ui.search || !ui.routeInfo) {
    console.error('Faltan elementos HTML necesarios para UDABOL GPS.');
    return;
  }

  let map;
  let geoFeatures = [];
  let destinations = [];
  let selected = null;
  let selectedLayers = L.layerGroup();
  let gpsWatchId = null;
  let studentMarker = null;
  let accuracyCircle = null;
  let studentPosition = null;
  let exteriorRoute = null;
  let routeRequestId = 0;

  const normalize = (value) => String(value || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[_-]+/g, ' ').replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ').trim();

  const featureName = (feature) => {
    const p = feature.properties || {};
    return String(p.name || p.Name || p.title || p.nombre || '').trim();
  };

  const coordsToLatLngs = (coords) => coords.map(([lng, lat]) => [lat, lng]);

  function setGpsStatus(title, message, active = false) {
    if (ui.gpsTitle) ui.gpsTitle.textContent = title;
    if (ui.gpsText) ui.gpsText.textContent = message;
    if (ui.gpsIndicator) ui.gpsIndicator.classList.toggle('active', active);
  }

  function distanceMeters(points) {
    let total = 0;
    for (let i = 1; i < points.length; i++) {
      total += L.latLng(points[i - 1]).distanceTo(L.latLng(points[i]));
    }
    return total;
  }

  function formatDistance(meters) {
    return meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(2)} km`;
  }

  function walkingMinutes(meters) {
    return Math.max(1, Math.ceil(meters / 1.2 / 60));
  }

  function routeBaseName(name) {
    return normalize(name)
      .replace(/^ruta entrada /, '')
      .replace(/^ruta /, '')
      .replace(/^entrada /, '')
      .trim();
  }

  function aliasesFor(name) {
    const n = normalize(name);
    const aliases = new Set([n, n.replace(/^aula /, ''), n.replace(/^aulas /, '')]);
    if (n.includes('caja')) aliases.add('caja');
    if (n.includes('biblioteca')) aliases.add('biblioteca');
    if (n.includes('cafeteria')) aliases.add('cafeteria');
    if (n.includes('libreria')) aliases.add('libreria');
    if (n.includes('marketing') || n.includes('maketing')) {
      aliases.add('marketing');
      aliases.add('maketing');
    }
    if (n.includes('quimica')) { aliases.add('labo quimica'); aliases.add('lab quimica'); aliases.add('laboratorio quimica'); }
    if (n.includes('morfologia')) aliases.add('mofolofia');
    if (n.includes('edificio nuevo')) aliases.add('edificio nueco');
    if (n.includes('area deportiva')) aliases.add('area deportiva');
    if (/^aula [bc dg]\d+/i.test(name)) aliases.add(n.replace(/^aula /, ''));
    return [...aliases].filter(Boolean);
  }

  function groupFor(name) {
    const n = normalize(name);
    if (/\baula b/.test(n)) return 'AULAS - BLOQUE B';
    if (/\baula c/.test(n)) return 'AULAS - BLOQUE C';
    if (/\baula d/.test(n)) return 'AULAS - BLOQUE D';
    if (/\baula g/.test(n)) return 'AULAS - BLOQUE G';
    if (/piso|planta baja|ts |cs /.test(n)) return 'EDIFICIO NUEVO - AULAS';
    if (/edificio/.test(n)) return 'EDIFICIOS';
    if (/cancha|deportiva|area verde|parqueo/.test(n)) return 'ÁREAS DEL CAMPUS';
    return 'SERVICIOS UNIVERSITARIOS';
  }

  function destinationLabel(name) {
    return name.replace(/\s+/g, ' ').trim();
  }


  function featureCenter(feature) {
    if (!feature?.geometry) return null;
    const bounds = L.geoJSON(feature).getBounds();
    return bounds.isValid() ? bounds.getCenter() : null;
  }

  function destinationAliases(name) {
    const n = normalize(name);
    const aliases = new Set([n]);
    aliases.add(n.replace(/^aula\s+/, ''));
    aliases.add(n.replace(/^aulas\s+/, ''));
    aliases.add(n.replace(/\baulas?\b/g, ' ').replace(/\s+/g, ' ').trim());
    if (n.includes('caja')) aliases.add('caja');
    if (n.includes('biblioteca')) aliases.add('biblioteca');
    if (n.includes('cafeteria')) aliases.add('cafeteria');
    if (n.includes('libreria')) aliases.add('libreria');
    if (n.includes('marketing') || n.includes('maketing')) {
      aliases.add('marketing');
      aliases.add('maketing');
    }
    if (n.includes('quimica')) {
      aliases.add('lab quimica');
      aliases.add('labo quimica');
      aliases.add('laboratorio quimica');
    }
    if (n.includes('morfologia')) aliases.add('mofolofia');
    if (n.includes('area deportiva') || n.includes('cancha de futsal')) aliases.add('area deportiva');
    if (n.includes('edificio antiguo')) aliases.add('edificio de salud martin cardenas');
    if (n.includes('edificio nuevo')) aliases.add('edificio nuevo');
    if (n.includes('edificio de salud')) aliases.add('edificio salud');
    if (n.includes('edificio antiguo')) aliases.add('edificio antiguo');
    if (n.includes('biblioteca')) aliases.add('biblioteca');
    if (n.includes('aula b1') || n.includes('aulas b1')) aliases.add('b1');
    return [...aliases].filter(Boolean);
  }

  function routeBaseName(name) {
    return normalize(name)
      .replace(/^ruta entrada\s*/, '')
      .replace(/^ruta\s*/, '')
      .replace(/^entrada\s*/, '')
      .replace(/^_+/, '')
      .trim();
  }

  function compactRouteKey(value) {
    return normalize(value)
      .replace(/\baulas?\b/g, ' ')
      .replace(/\bts\s+(\d+)\s+a\s+ts\s+(\d+)\b/g, 'ts $1 a $2')
      .replace(/\bcs\s+(\d+)\s+a\s+cs\s+(\d+)\b/g, 'cs $1 a $2')
      .replace(/\bts\s+(\d+)\s+ts\s+(\d+)\b/g, 'ts $1 a $2')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function routeMatchesDestination(routeName, destinationName) {
    const base = compactRouteKey(routeBaseName(routeName));
    const aliases = destinationAliases(destinationName).map(compactRouteKey);
    return aliases.includes(base);
  }

  function chooseBestRoute(destinationName, candidateRoutes, targetFeature) {
    const matches = candidateRoutes.filter(route => routeMatchesDestination(route.name, destinationName));
    if (!matches.length) return null;
    if (matches.length === 1 || !targetFeature) return matches[0].feature;

    const target = featureCenter(targetFeature);
    if (!target) return matches[0].feature;
    let best = null;
    let bestDistance = Infinity;
    for (const item of matches) {
      const coords = item.feature.geometry.coordinates;
      const end = coords?.[coords.length - 1];
      if (!end) continue;
      const d = target.distanceTo(L.latLng(end[1], end[0]));
      if (d < bestDistance) {
        bestDistance = d;
        best = item.feature;
      }
    }
    return best || matches[0].feature;
  }


  function aliasesOverlap(nameA, nameB) {
    const a = new Set(destinationAliases(nameA).map(compactRouteKey));
    const b = destinationAliases(nameB).map(compactRouteKey);
    return b.some(value => value && a.has(value));
  }

  function makeDestinationIndex(features) {
    const polygonsByName = new Map();
    const points = [];
    const routes = [];

    for (const feature of features) {
      if (!feature.geometry) continue;
      const name = featureName(feature);
      if (!name) continue;
      const type = feature.geometry.type;
      const key = normalize(name);

      if (type === 'Polygon' || type === 'MultiPolygon') {
        if (!polygonsByName.has(key)) polygonsByName.set(key, { name, geometries: [], features: [] });
        polygonsByName.get(key).features.push(feature);
        if (type === 'Polygon') polygonsByName.get(key).geometries.push(feature.geometry.coordinates);
        else polygonsByName.get(key).geometries.push(...feature.geometry.coordinates);
      } else if (type === 'Point') {
        points.push({ name, feature, key });
      } else if (type === 'LineString' && feature.geometry.coordinates?.length >= 2) {
        if (!normalize(name).startsWith('terreno de la universidad')) routes.push({ name, feature });
      }
    }

    const ignored = /^(marca de posicion|marca de posicion sin titulo|poligono sin titulo|punto sin nombre|area verde|entrada a la u u dabol|aulas b1 etc|ingreso)$/;
    const destinations = [];
    const usedPoints = new Set();

    for (const group of polygonsByName.values()) {
      if (ignored.test(normalize(group.name))) continue;

      const polygonFeature = {
        type: 'Feature',
        properties: { name: group.name },
        geometry: { type: 'MultiPolygon', coordinates: group.geometries }
      };

      const relatedPoints = points.filter(p =>
        !usedPoints.has(p.feature) && aliasesOverlap(group.name, p.name)
      );

      const polygonCenter = featureCenter(polygonFeature);
      let pointFeature = null;
      if (relatedPoints.length) {
        relatedPoints.sort((a, b) => {
          const ca = featureCenter(a.feature), cb = featureCenter(b.feature);
          return polygonCenter.distanceTo(ca) - polygonCenter.distanceTo(cb);
        });
        pointFeature = relatedPoints[0].feature;
        usedPoints.add(pointFeature);
      }

      const targetFeature = pointFeature || polygonFeature;
      const route = chooseBestRoute(group.name, routes, targetFeature);
      destinations.push({
        name: group.name,
        polygon: polygonFeature,
        point: pointFeature,
        route,
        sourceFeatures: group.features
      });
    }

    for (const point of points) {
      if (usedPoints.has(point.feature) || ignored.test(normalize(point.name))) continue;

      const route = chooseBestRoute(point.name, routes, point.feature);
      destinations.push({
        name: point.name,
        polygon: null,
        point: point.feature,
        route
      });
      usedPoints.add(point.feature);
    }

    return destinations.sort((a, b) => a.name.localeCompare(b.name, 'es'));
  }

  function geometryBounds(feature, target) {
    if (!feature?.geometry) return;
    const layer = L.geoJSON(feature);
    const bounds = layer.getBounds();
    if (bounds.isValid()) target.extend(bounds);
  }

  function clearSelected() {
    selectedLayers.clearLayers();
    if (exteriorRoute) { map.removeLayer(exteriorRoute); exteriorRoute = null; }
    document.querySelectorAll('.destination-btn.active').forEach(b => b.classList.remove('active'));
  }

  function createDestinationButton(destination, groupElement) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'destination-btn';
    button.textContent = destination.name;
    button.addEventListener('click', () => selectDestination(destination, button));
    groupElement.appendChild(button);
    if (ui.suggestions && ![...ui.suggestions.options].some(o => normalize(o.value) === normalize(destination.name))) {
      const option = document.createElement('option');
      option.value = destination.name;
      ui.suggestions.appendChild(option);
    }
  }

  function renderDestinationMenu() {
    ui.destinations.innerHTML = '';
    if (ui.suggestions) ui.suggestions.innerHTML = '';
    const groups = new Map();
    for (const destination of destinations) {
      const groupName = groupFor(destination.name);
      if (!groups.has(groupName)) {
        const section = document.createElement('section');
        section.className = 'destination-group';
        const heading = document.createElement('h3');
        heading.textContent = groupName;
        const list = document.createElement('div');
        list.className = 'destination-list';
        section.append(heading, list);
        ui.destinations.appendChild(section);
        groups.set(groupName, list);
      }
      createDestinationButton(destination, groups.get(groupName));
    }
  }

  function showRoutePanel(destination) {
    const routePoints = destination.route ? coordsToLatLngs(destination.route.geometry.coordinates) : [];
    const routeDistance = routePoints.length > 1 ? distanceMeters(routePoints) : 0;
    const hasRoute = routePoints.length > 1;
    ui.routeInfo.innerHTML = `
      <div class="route-top"><div class="route-icon">🧭</div><div>
        <h3>${destination.name}</h3><p>Destino seleccionado</p>
      </div></div>
      <div class="route-stats">
        <div class="route-stat"><span>Recorrido medido</span><strong>${hasRoute ? formatDistance(routeDistance) : 'No disponible'}</strong><small>Según el KMZ nuevo</small></div>
        <div class="route-stat"><span>Tiempo estimado</span><strong>${hasRoute ? walkingMinutes(routeDistance) + ' min' : '—'}</strong><small>Velocidad peatonal aproximada</small></div>
      </div>
      <div class="route-live-distance"><span>Tu ubicación actual</span><strong id="liveDistanceValue">${studentPosition ? 'Calculando...' : 'Activa el GPS'}</strong><small id="liveDistanceNote">La ubicación se obtiene con el GPS del dispositivo.</small></div>
      <div class="route-note">${hasRoute ? 'Se muestra el recorrido importado de las mediciones nuevas.' : 'Este destino tiene ubicación geográfica, pero el KMZ no contiene una ruta asociada reconocible.'}</div>`;
  }


  function selectDestination(destination, button) {
    selected = destination;
    clearSelected();
    if (button) button.classList.add('active');

    if (destination.polygon) {
      L.geoJSON(destination.polygon, {
        style: { color: '#087cff', weight: 3, fillColor: '#1685ff', fillOpacity: 0.30 }
      }).addTo(selectedLayers);
    }

    let routeCoords = [];
    if (destination.route?.geometry?.coordinates?.length >= 2) {
      routeCoords = coordsToLatLngs(destination.route.geometry.coordinates);

      // Borde blanco y puntos azules: ruta peatonal visible sobre cualquier imagen.
      L.polyline(routeCoords, {
        color: '#ffffff', weight: 9, opacity: 1,
        dashArray: '1 11', lineCap: 'round', lineJoin: 'round'
      }).addTo(selectedLayers);
      L.polyline(routeCoords, {
        color: '#087cff', weight: 5, opacity: 1,
        dashArray: '1 11', lineCap: 'round', lineJoin: 'round'
      }).addTo(selectedLayers);

      const start = routeCoords[0];
      L.circleMarker(start, {
        radius: 8, color: '#ffffff', weight: 3,
        fillColor: '#16a34a', fillOpacity: 1
      }).bindTooltip('Entrada principal', {
        permanent: true, direction: 'top', offset: [0, -8],
        className: 'route-start-tooltip'
      }).addTo(selectedLayers);
    }

    let targetLatLng = null;
    if (destination.point?.geometry?.coordinates) {
      const c = destination.point.geometry.coordinates;
      targetLatLng = L.latLng(c[1], c[0]);
    } else if (routeCoords.length) {
      targetLatLng = L.latLng(routeCoords[routeCoords.length - 1]);
    } else if (destination.polygon) {
      targetLatLng = featureCenter(destination.polygon);
    }

    if (targetLatLng) {
      L.circleMarker(targetLatLng, {
        radius: 9, color: '#ffffff', weight: 3,
        fillColor: '#087cff', fillOpacity: 1
      }).bindTooltip(destination.name, {
        permanent: true, direction: 'top', offset: [0, -10],
        className: 'selected-destination-tooltip'
      }).addTo(selectedLayers);
    }

    selectedLayers.addTo(map);

    const bounds = L.latLngBounds([]);
    if (destination.polygon) geometryBounds(destination.polygon, bounds);
    if (destination.point) geometryBounds(destination.point, bounds);
    if (destination.route) geometryBounds(destination.route, bounds);
    if (studentPosition) bounds.extend(studentPosition);
    if (bounds.isValid()) map.flyToBounds(bounds, { padding: [65, 65], maxZoom: 20, duration: 1.1 });

    showRoutePanel(destination);
    updateLiveDistance();
    if (studentPosition) requestPedestrianRoute();
  }

  function searchDestination() {
    const query = normalize(ui.search.value);
    if (!query) return alert('Escribe el nombre de un aula o servicio.');
    const found = destinations.find(d => normalize(d.name) === query || normalize(d.name).replace(/^aula /, '') === query || normalize(d.name).includes(query));
    if (!found) return alert('No encontramos ese destino en el KMZ nuevo.');
    const button = [...document.querySelectorAll('.destination-btn')].find(b => normalize(b.textContent) === normalize(found.name));
    selectDestination(found, button);
  }

  function updateLiveDistance() {
    const value = $('liveDistanceValue');
    const note = $('liveDistanceNote');
    if (!value || !note || !selected || !studentPosition) return;
    let target = null;
    if (selected.polygon) target = L.geoJSON(selected.polygon).getBounds().getCenter();
    else if (selected.point) target = L.geoJSON(selected.point).getBounds().getCenter();
    if (!target) return;
    const meters = studentPosition.distanceTo(target);
    value.textContent = formatDistance(meters);
    note.textContent = 'Distancia directa aproximada desde tu ubicación; no equivale a distancia por pasillos.';
  }

  async function requestPedestrianRoute() {
    if (!studentPosition || !selected) return;
    const id = ++routeRequestId;
    // Valhalla route to the selected destination's polygon center or point.
    let target;
    if (selected.polygon) target = L.geoJSON(selected.polygon).getBounds().getCenter();
    else if (selected.point) target = L.geoJSON(selected.point).getBounds().getCenter();
    if (!target) return;
    try {
      const response = await fetch(VALHALLA_URL, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locations: [
          { lat: studentPosition.lat, lon: studentPosition.lng },
          { lat: target.lat, lon: target.lng }
        ], costing: 'pedestrian', units: 'kilometers', language: 'es-ES' })
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (id !== routeRequestId) return;
      const shape = data.trip?.legs?.[0]?.shape;
      if (!shape) throw new Error('No se recibió una ruta peatonal.');
      const coords = decodePolyline(shape, 6);
      if (exteriorRoute) map.removeLayer(exteriorRoute);
      exteriorRoute = L.layerGroup([
        L.polyline(coords, {
          color: '#ffffff', weight: 9, opacity: 1,
          dashArray: '1 11', lineCap: 'round', lineJoin: 'round'
        }),
        L.polyline(coords, {
          color: '#087cff', weight: 5, opacity: 1,
          dashArray: '1 11', lineCap: 'round', lineJoin: 'round'
        })
      ]).addTo(map);
      const summary = data.trip.legs[0].summary;
      const value = $('liveDistanceValue');
      const note = $('liveDistanceNote');
      if (value && summary) value.textContent = formatDistance(summary.length * 1000);
      if (note && summary) note.textContent = `Ruta peatonal calculada · ${Math.ceil(summary.time / 60)} min aprox.`;
      setGpsStatus('Ruta peatonal calculada', 'Se muestra la ruta desde tu ubicación hasta el destino.', true);
    } catch (error) {
      console.warn('No se pudo calcular ruta peatonal:', error);
      updateLiveDistance();
      setGpsStatus('GPS activo', 'Ubicación disponible; no se pudo calcular la ruta por calles.', true);
    }
  }

  function decodePolyline(encoded, precision = 6) {
    let index = 0, lat = 0, lng = 0;
    const points = [], factor = 10 ** precision;
    while (index < encoded.length) {
      let result = 0, shift = 0, byte;
      do { byte = encoded.charCodeAt(index++) - 63; result |= (byte & 31) << shift; shift += 5; } while (byte >= 32);
      lat += (result & 1) ? ~(result >> 1) : (result >> 1);
      result = 0; shift = 0;
      do { byte = encoded.charCodeAt(index++) - 63; result |= (byte & 31) << shift; shift += 5; } while (byte >= 32);
      lng += (result & 1) ? ~(result >> 1) : (result >> 1);
      points.push([lat / factor, lng / factor]);
    }
    return points;
  }

  function onPosition(position) {
    const { latitude, longitude, accuracy } = position.coords;
    studentPosition = L.latLng(latitude, longitude);
    if (!studentMarker) {
      studentMarker = L.circleMarker(studentPosition, { radius: 8, color: '#fff', weight: 3, fillColor: '#1685ff', fillOpacity: 1 }).addTo(map).bindPopup('<strong>Tu ubicación actual</strong>');
      map.flyTo(studentPosition, Math.max(map.getZoom(), 18), { duration: 1 });
    } else studentMarker.setLatLng(studentPosition);
    if (!accuracyCircle) accuracyCircle = L.circle(studentPosition, { radius: accuracy, color: '#1685ff', weight: 1, fillColor: '#1685ff', fillOpacity: .1 }).addTo(map);
    else { accuracyCircle.setLatLng(studentPosition); accuracyCircle.setRadius(accuracy); }
    setGpsStatus('GPS activo', `Precisión aproximada: ${Math.round(accuracy)} metros`, true);
    updateLiveDistance();
    if (selected) requestPedestrianRoute();
  }

  function onGpsError(error) {
    let message = 'No fue posible obtener tu ubicación.';
    if (error.code === 1) message = 'Permite el acceso a la ubicación en tu navegador.';
    if (error.code === 2) message = 'La ubicación no está disponible en este momento.';
    if (error.code === 3) message = 'Se agotó el tiempo para obtener la ubicación. Intenta nuevamente.';
    setGpsStatus('Error de GPS', message, false);
    if (ui.gpsStart) ui.gpsStart.disabled = false;
    if (ui.gpsStop) ui.gpsStop.disabled = true;
  }

  function startGps() {
    if (!navigator.geolocation) return setGpsStatus('GPS no disponible', 'Este navegador no admite geolocalización.');
    if (gpsWatchId !== null) return;
    if (ui.gpsStart) ui.gpsStart.disabled = true;
    if (ui.gpsStop) ui.gpsStop.disabled = false;
    setGpsStatus('Buscando ubicación...', 'Acepta el permiso de ubicación del navegador.');
    gpsWatchId = navigator.geolocation.watchPosition(onPosition, onGpsError, { enableHighAccuracy: true, maximumAge: 1000, timeout: 20000 });
  }

  function stopGps() {
    if (gpsWatchId !== null) navigator.geolocation.clearWatch(gpsWatchId);
    gpsWatchId = null;
    [studentMarker, accuracyCircle, exteriorRoute].forEach(layer => { if (layer) map.removeLayer(layer); });
    studentMarker = accuracyCircle = exteriorRoute = null;
    studentPosition = null;
    routeRequestId++;
    if (ui.gpsStart) ui.gpsStart.disabled = false;
    if (ui.gpsStop) ui.gpsStop.disabled = true;
    setGpsStatus('GPS detenido', 'Activa tu ubicación para comenzar.', false);
    updateLiveDistance();
  }

  function resetMap() {
    selected = null;
    clearSelected();
    ui.search.value = '';
    ui.routeInfo.innerHTML = '<div class="route-top"><div class="route-icon">📍</div><div><h3>Bienvenido a UDABOL GPS</h3><p>Selecciona un destino para comenzar.</p></div></div>';
    map.flyTo(CAMPUS_FALLBACK, 18, { duration: 1 });
  }

  function addQrButton() {
    if (!ui.topbar || $('udabolQRButton')) return;
    const button = document.createElement('button');
    button.id = 'udabolQRButton'; button.type = 'button'; button.textContent = '▦ QR';
    Object.assign(button.style, { background: '#fff', color: '#123b68', border: 0, borderRadius: '9px', padding: '10px 18px', fontWeight: '800', cursor: 'pointer', marginLeft: 'auto', marginRight: '16px' });
    const status = ui.topbar.querySelector('.header-status');
    if (status) ui.topbar.insertBefore(button, status); else ui.topbar.appendChild(button);
    const modal = document.createElement('div');
    modal.id = 'udabolQRModal'; modal.className = 'udabol-qr-overlay';
    modal.innerHTML = `<div class="udabol-qr-card"><button class="udabol-qr-close" type="button">×</button><div class="udabol-qr-logo">U</div><h2>UDABOL GPS</h2><p>Escanea este código para ingresar al sistema</p><img class="udabol-qr-image" src="https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(URL_UDABOL)}" alt="Código QR de UDABOL GPS"><strong>Campus Cochabamba</strong><a class="udabol-qr-link" href="${URL_UDABOL}" target="_blank" rel="noopener">Abrir UDABOL GPS</a></div>`;
    document.body.appendChild(modal);
    button.addEventListener('click', () => modal.classList.add('visible'));
    modal.querySelector('.udabol-qr-close').addEventListener('click', () => modal.classList.remove('visible'));
    modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('visible'); });
  }

  async function initialize() {
    setGpsStatus('Cargando campus...', 'Leyendo destinos del archivo geográfico nuevo.');
    try {
      const response = await fetch(GEOJSON_URL, { cache: 'no-store' });
      if (!response.ok) throw new Error(`No se pudo leer campus.geojson (${response.status}).`);
      const geojson = await response.json();
      if (geojson.type !== 'FeatureCollection' || !Array.isArray(geojson.features)) throw new Error('El archivo no es un GeoJSON válido.');
      geoFeatures = geojson.features;
      destinations = makeDestinationIndex(geoFeatures);
      if (!destinations.length) throw new Error('No se encontraron destinos con geometría en el archivo.');

      const allBounds = L.latLngBounds([]);
      geoFeatures.forEach(feature => geometryBounds(feature, allBounds));
      const initialCenter = allBounds.isValid() ? allBounds.getCenter() : CAMPUS_FALLBACK;

      map = L.map('map', { zoomControl: false }).setView(initialCenter, 18);
      L.control.zoom({ position: 'topleft' }).addTo(map);
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 21, maxNativeZoom: 19, attribution: 'Tiles © Esri'
      }).addTo(map);
      selectedLayers.addTo(map);

      // Mapa base limpio: no se dibujan etiquetas, puntos ni polígonos de todos los destinos.
      // Solo se agrega el polígono y la ruta del destino cuando el usuario lo selecciona.

      renderDestinationMenu();
      if (allBounds.isValid()) map.fitBounds(allBounds, { padding: [25, 25] });
      setGpsStatus('Campus cargado', `${destinations.length} destinos disponibles. Selecciona uno para ver solo su ruta desde la entrada.`, false);
      console.info('UDABOL GPS KMZ #6 iniciado', { elementos: geoFeatures.length, destinos: destinations.length, conRuta: destinations.filter(d => d.route).length });
      addQrButton();
      setTimeout(() => map.invalidateSize(), 300);
    } catch (error) {
      console.error(error);
      setGpsStatus('Error al cargar el campus', 'Verifica que campus.geojson esté junto a index.html y que uses un servidor web.');
      ui.routeInfo.innerHTML = `<div class="route-note">No se pudo cargar el mapa: ${error.message}</div>`;
    }
  }

  if (ui.searchButton) ui.searchButton.addEventListener('click', searchDestination);
  ui.search.addEventListener('keydown', e => { if (e.key === 'Enter') searchDestination(); });
  if (ui.reset) ui.reset.addEventListener('click', resetMap);
  if (ui.gpsStart) ui.gpsStart.addEventListener('click', startGps);
  if (ui.gpsStop) { ui.gpsStop.addEventListener('click', stopGps); ui.gpsStop.disabled = true; }

  initialize();
})();
