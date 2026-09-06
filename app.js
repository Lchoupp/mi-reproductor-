// IMAGEN DE ONDA DE SONIDO POR DEFECTO (BASE64)
// Esta imagen se usará en la lista si la canción no tiene carátula incrustada
const defaultWaveImage = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48ZyBmaWxsPSJub25lIiBzdHJva2U9IiMxREI5NTQiIHN0cm9rZS13aWR0aD0iMS41IiBzdHJva2UtbGluZWNhcD0icm91bmQiPjxwYXRoIGQ9Ik0xNSw1MCBDMjUsNDAgMjUsNjAgMzUsNTAgQzQ1LDQwIDQ1LDYwIDU1LDUwIEM2NSw0MCA2NSw2MCA3NSw1MCBDODUsNDAgODUsNjAgOTUsNTAiPjwvcGF0aD48cGF0aCBkPSJNMTUsNjUgQzI1LDU1IDI1LDc1IDM1LDY1IEM0NSw1NSA0NSw3NSA1NSw2NSBDNjUsNTUgNjUsNzUgNzUsNjUgQzg1LDU1IDg1LDc1IDk1LDY1IiBvcGFjaXR5PSIwLjUiPjwvcGF0aD48cGF0aCBkPSJNMTUsMzUgQzI1LDI1IDI1LDQ1IDM1LDM1IEM0NSwyNSA0NSw0NSA1NSwzNSBDNjUsMjUgNjUsNDUgNzUsMzUgQzg1LDI1IDg1LDQ1IDk1LDM1IiBvcGFjaXR5PSIwLjUiPjwvcGF0aD48L2c+PC9zdmc+';

// Referencias al DOM (Recuperadas)
const cancion = document.getElementById('cancion');
const progreso = document.getElementById('progreso');
const iconoCtrl = document.getElementById('icono-ctrl');
const btnReproducir = document.getElementById('btn-reproducir');
const btnAnterior = document.getElementById('btn-anterior');
const btnSiguiente = document.getElementById('btn-siguiente');
const btnAleatorio = document.getElementById('btn-aleatorio');
const btnRepetir = document.getElementById('btn-repetir');

const tituloCancion = document.getElementById('titulo-cancion');
const artistaCancion = document.getElementById('artista-cancion');
const contador = document.getElementById('contador');
const imagenCaratula = document.getElementById('imagen-caratula');

const tiempoActualElemento = document.getElementById('tiempo-actual');
const tiempoTotalElemento = document.getElementById('tiempo-total');

const inputVolumen = document.getElementById('volumen');
const iconoVolumen = document.getElementById('icono-volumen');
const inputCargarCarpeta = document.getElementById('cargar-carpeta');

const inputBuscador = document.getElementById('buscador');
const listaResultados = document.getElementById('lista-resultados');

const playlistUI = document.getElementById('lista-canciones');

// Referencias del Temporizador
const btnTemporizador = document.getElementById('btn-temporizador');
const textoTemporizador = document.getElementById('texto-temporizador');
const modalTemporizador = document.getElementById('modal-temporizador');
const btnCancelarModal = document.getElementById('btn-cancelar-modal');
const btnIniciarTemporizador = document.getElementById('btn-iniciar-temporizador');
const inputMinutos = document.getElementById('minutos-temporizador');

// Referencia para las luces ambientales
const tarjetaReproductor = document.querySelector('.contenedor-reproductor');

// Estado (Recuperado)
let listaCanciones = [];
let indiceActual = 0;
let esAleatorio = false;
let esRepetir = false;

// Estado del Temporizador
let idTemporizador = null;
let idIntervaloConteo = null;
let tiempoRestanteSegundos = 0;
let modoApagado = 'inmediato';
let temporizadorExpirado = false;

// Formatear segundos a mm:ss (Recuperado)
function formatearTiempo(segundos) {
    if (isNaN(segundos) || segundos <= 0) return '0:00';
    const minutos = Math.floor(segundos / 60);
    const segsRestantes = Math.floor(segundos % 60);
    return `${minutos}:${segsRestantes < 10 ? '0' : ''}${segsRestantes}`;
}

// Extraer metadatos MP3 (LIBRERÍA)
async function obtenerMetadatos(archivo) {
    try {
        const metadata = await window.musicMetadata.parseBlob(archivo);
        const common = metadata.common;
        
        let cover = null;
        if (common.picture && common.picture.length > 0) {
            const base64String = common.picture[0].data.reduce((data, byte) => data + String.fromCharCode(byte), '');
            cover = `data:${common.picture[0].format};base64,${btoa(base64String)}`;
        }
        
        return {
            titulo: common.title || archivo.name.replace(/\.[^/.]+$/, ""),
            artista: common.artist || "Artista desconocido",
            caratula: cover || defaultWaveImage
        };
    } catch (e) {
        console.warn("No se pudieron leer metadatos de:", archivo.name);
        return {
            titulo: archivo.name.replace(/\.[^/.]+$/, ""),
            artista: "Artista desconocido",
            caratula: defaultWaveImage
        };
    }
}

// Cargar carpeta de audio
inputCargarCarpeta.addEventListener('change', async (e) => {
    const archivosRaw = Array.from(e.target.files).filter(archivo => archivo.type.startsWith('audio/'));
    
    if (archivosRaw.length === 0) {
        alert("No se encontraron archivos de audio en la carpeta seleccionada.");
        return;
    }

    listaCanciones = [];
    playlistUI.innerHTML = "";
    
    pausarCancion();
    artistaCancion.textContent = "Cargando...";
    tituloCancion.textContent = "Procesando metadatos...";

    for (const [index, archivo] of archivosRaw.entries()) {
        artistaCancion.textContent = `Cargando ${index + 1} de ${archivosRaw.length}...`;

        const metadata = await obtenerMetadatos(archivo);
        
        listaCanciones.push({
            archivo: archivo,
            ...metadata
        });

        const li = document.createElement('li');
        li.innerHTML = `
            <div class="miniatura">
                <img src="${metadata.caratula}" alt="Min Carátula">
            </div>
            <div class="info-cancion-lista">
                <p class="titulo">${metadata.titulo}</p>
                <p class="artista">${metadata.artista}</p>
            </div>
        `;
        li.onclick = () => cargarCancion(index);
        playlistUI.appendChild(li);
    }

    indiceActual = 0;
    cargarCancion(indiceActual);
});

// Cargar canción y actualizar carátula PRINCIPAL
function cargarCancion(indice) {
    if (listaCanciones.length === 0) return;

    const cancionActual = listaCanciones[indice];
    cancion.src = URL.createObjectURL(cancionActual.archivo);

    tituloCancion.textContent = cancionActual.titulo;
    artistaCancion.textContent = cancionActual.artista;
    imagenCaratula.src = cancionActual.caratula;
    
    contador.textContent = `Canción ${indice + 1} de ${listaCanciones.length}`;

    progreso.value = 0;
    tiempoActualElemento.textContent = '0:00';
    tiempoTotalElemento.textContent = '0:00';

    const itemsLista = playlistUI.querySelectorAll('li');
    itemsLista.forEach((item, i) => {
        item.classList.toggle('active', i === indice);
    });

    reproducirCancion();
}

// Reproducción / Pausa (Actualizadas con luces ambientales)
function reproducirCancion() {
    cancion.play().catch(error => {
        console.error("Error al reproducir el audio:", error);
    });
    iconoCtrl.classList.remove('fa-play');
    iconoCtrl.classList.add('fa-pause');
    
    // Activar luces ambientales
    tarjetaReproductor.classList.add('reproduciendo');
}

function pausarCancion() {
    cancion.pause();
    iconoCtrl.classList.remove('fa-pause');
    iconoCtrl.classList.add('fa-play');
    
    // Apagar luces ambientales
    tarjetaReproductor.classList.remove('reproduciendo');
}

btnReproducir.addEventListener('click', () => {
    if (listaCanciones.length === 0) return;
    if (cancion.paused) {
        reproducirCancion();
    } else {
        pausarCancion();
    }
});

// Siguiente y Anterior
btnSiguiente.addEventListener('click', siguienteCancion);

function siguienteCancion() {
    if (listaCanciones.length === 0) return;

    if (temporizadorExpirado && modoApagado === 'al_finalizar') {
        pausarCancion();
        cancelarTemporizador();
        return;
    }

    if (esAleatorio) {
        indiceActual = Math.floor(Math.random() * listaCanciones.length);
    } else {
        indiceActual = (indiceActual + 1) % listaCanciones.length;
    }
    cargarCancion(indiceActual);
}

btnAnterior.addEventListener('click', () => {
    if (listaCanciones.length === 0) return;
    if (esAleatorio) {
        indiceActual = Math.floor(Math.random() * listaCanciones.length);
    } else {
        indiceActual = (indiceActual - 1 + listaCanciones.length) % listaCanciones.length;
    }
    cargarCancion(indiceActual);
});

// Modos Aleatorio y Repetir
btnAleatorio.addEventListener('click', () => {
    esAleatorio = !esAleatorio;
    btnAleatorio.classList.toggle('activo', esAleatorio);
});

btnRepetir.addEventListener('click', () => {
    esRepetir = !esRepetir;
    btnRepetir.classList.toggle('activo', esRepetir);
});

// Eventos de barra y tiempos
cancion.addEventListener('loadedmetadata', () => {
    progreso.max = cancion.duration;
    tiempoTotalElemento.textContent = formatearTiempo(cancion.duration);
});

cancion.addEventListener('timeupdate', () => {
    if (!cancion.paused && cancion.duration) {
        progreso.value = cancion.currentTime;
        tiempoActualElemento.textContent = formatearTiempo(cancion.currentTime);
    }
});

progreso.addEventListener('input', () => {
    cancion.currentTime = progreso.value;
    tiempoActualElemento.textContent = formatearTiempo(progreso.value);
});

// Fin de pista
cancion.addEventListener('ended', () => {
    if (temporizadorExpirado && modoApagado === 'al_finalizar') {
        pausarCancion();
        cancelarTemporizador();
    } else if (esRepetir) {
        reproducirCancion();
    } else {
        siguienteCancion();
    }
});

// Volumen
inputVolumen.addEventListener('input', (e) => {
    cancion.volume = e.target.value;
    actualizarIconoVolumen(e.target.value);
});

function actualizarIconoVolumen(valor) {
    iconoVolumen.className = 'fa-solid ';
    if (valor == 0) {
        iconoVolumen.classList.add('fa-volume-xmark');
    } else if (valor < 0.5) {
        iconoVolumen.classList.add('fa-volume-low');
    } else {
        iconoVolumen.classList.add('fa-volume-high');
    }
}

// Búsqueda
inputBuscador.addEventListener('input', (e) => {
    const texto = e.target.value.toLowerCase().trim();
    listaResultados.innerHTML = '';

    if (texto === '' || listaCanciones.length === 0) {
        listaResultados.classList.add('oculto');
        return;
    }

    const resultados = listaCanciones.map((c, index) => ({ c, index }))
        .filter(item => item.c.titulo.toLowerCase().includes(texto));

    if (resultados.length > 0) {
        resultados.forEach(item => {
            const li = document.createElement('li');
            li.textContent = item.c.titulo;
            li.addEventListener('click', () => {
                cargarCancion(item.index);
                listaResultados.classList.add('oculto');
                inputBuscador.value = '';
            });
            listaResultados.appendChild(li);
        });
        listaResultados.classList.remove('oculto');
    } else {
        listaResultados.classList.add('oculto');
    }
});

document.addEventListener('click', (e) => {
    if (!inputBuscador.contains(e.target) && !listaResultados.contains(e.target)) {
        listaResultados.classList.add('oculto');
    }
});

// --- LÓGICA DEL TEMPORIZADOR ---

btnTemporizador.addEventListener('click', () => {
    if (idTemporizador) {
        cancelarTemporizador();
    } else {
        modalTemporizador.classList.remove('oculto');
    }
});

btnCancelarModal.addEventListener('click', () => {
    modalTemporizador.classList.add('oculto');
});

btnIniciarTemporizador.addEventListener('click', () => {
    const minutos = parseInt(inputMinutos.value);
    if (isNaN(minutos) || minutos <= 0) return;

    const radiosModo = document.getElementsByName('modo-apaguado');
    for (const radio of radiosModo) {
        if (radio.checked) {
            modoApagado = radio.value;
            break;
        }
    }

    tiempoRestanteSegundos = minutos * 60;
    temporizadorExpirado = false;
    modalTemporizador.classList.add('oculto');
    btnTemporizador.classList.add('activo');

    actualizarEtiquetaTemporizador();

    clearInterval(idIntervaloConteo);
    clearTimeout(idTemporizador);

    idIntervaloConteo = setInterval(() => {
        tiempoRestanteSegundos--;
        actualizarEtiquetaTemporizador();

        if (tiempoRestanteSegundos <= 0) {
            clearInterval(idIntervaloConteo);
            ejecutarApagado();
        }
    }, 1000);
});

function actualizarEtiquetaTemporizador() {
    textoTemporizador.textContent = formatearTiempo(tiempoRestanteSegundos);
}

function ejecutarApagado() {
    temporizadorExpirado = true;

    if (modoApagado === 'inmediato') {
        pausarCancion();
        cancelarTemporizador();
    } else {
        textoTemporizador.textContent = "Al terminar pista";
    }
}

function cancelarTemporizador() {
    clearTimeout(idTemporizador);
    clearInterval(idIntervaloConteo);
    idTemporizador = null;
    idIntervaloConteo = null;
    temporizadorExpirado = false;
    btnTemporizador.classList.remove('activo');
    textoTemporizador.textContent = 'Temporizador';
}