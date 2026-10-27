// =========================================================
// CONFIGURACIÓN GENERAL: teléfono de WhatsApp y URL pública
// =========================================================
let audioCtx = null;
const NUMERO_WHATSAPP = "50231253629";
const URL_SITIO_GITHUB = "https://alexander-code608.github.io/Cake-Chavez502";

// =========================================================
// EFECTO DE SONIDO: pequeño sonido al interactuar con la página
// =========================================================
function reproducirSonidoGotita() {
    try {
        if (!audioCtx) {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (AudioContextClass) audioCtx = new AudioContextClass();
        }
        if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
        if (!audioCtx) return;

        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        const ahora = audioCtx.currentTime;

        osc.frequency.setValueAtTime(520, ahora);
        osc.frequency.exponentialRampToValueAtTime(1100, ahora + 0.07);
        gain.gain.setValueAtTime(0.18, ahora);
        gain.gain.exponentialRampToValueAtTime(0.001, ahora + 0.08);

        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(ahora);
        osc.stop(ahora + 0.08);
    } catch (e) {}
}

// =========================================================
// INICIALIZACIÓN: arranca las funciones cuando el HTML está listo.
// =========================================================
document.addEventListener("DOMContentLoaded", () => {
    configurarEnlacesDirectosProductos();
    filtrar('todos');
    generarCarruselAutomatico();
    agregarEtiquetasTarjetasCatalogo();
    generarGaleriaInspiracion();
    configurarCalendarioPedidos();
    activarAnimacionesAlDesplazarse();
    // Los enlaces directos se procesan después de cargar el catálogo remoto opcional.

});

// =========================================================
// CARRUSEL AUTOMÁTICO: crear y cambiar las diapositivas
// =========================================================
let indiceSlideActual = 0;
let intervaloCarrusel = null;

function generarCarruselAutomatico() {
    const wrapper = document.getElementById('carrusel-slides-wrapper');
    const puntosContainer = document.getElementById('carrusel-puntos-container');
    const productos = document.querySelectorAll('.producto');

    if (!wrapper || productos.length === 0) return;

    wrapper.innerHTML = '';
    if (puntosContainer) puntosContainer.innerHTML = '';

    productos.forEach((prod, index) => {
        const img = prod.querySelector('.img-producto');
        const titulo = prod.querySelector('h3');
        const desc = prod.querySelector('p');

        if (img && titulo) {
            const rutaImagen = img.getAttribute('src');
            const tituloTexto = titulo.innerText;
            const descTexto = desc ? desc.innerText : '';

            const slide = document.createElement('div');
            slide.className = `carrusel-slide ${index === 0 ? 'active' : ''}`;
            slide.style.backgroundImage = `url('${rutaImagen}')`;
            slide.innerHTML = `
                <div class="carrusel-texto">
                    <h2>${tituloTexto}</h2>
                    <p>${descTexto}</p>
                </div>
            `;
            wrapper.appendChild(slide);

            if (puntosContainer) {
                const punto = document.createElement('span');
                punto.className = `punto ${index === 0 ? 'active' : ''}`;
                punto.onclick = () => irSlide(index);
                puntosContainer.appendChild(punto);
            }
        }
    });

    iniciarCarruselAutomatico();
}

function mostrarSlide(indice) {
    const slides = document.querySelectorAll('.carrusel-slide');
    const puntos = document.querySelectorAll('.punto');

    if (slides.length === 0) return;

    if (indice >= slides.length) indiceSlideActual = 0;
    else if (indice < 0) indiceSlideActual = slides.length - 1;
    else indiceSlideActual = indice;

    slides.forEach((slide, i) => {
        slide.classList.remove('active');
        if (puntos[i]) puntos[i].classList.remove('active');
    });

    slides[indiceSlideActual].classList.add('active');
    if (puntos[indiceSlideActual]) puntos[indiceSlideActual].classList.add('active');
}

function cambiarSlide(direccion) {
    mostrarSlide(indiceSlideActual + direccion);
    reiniciarTemporizadorCarrusel();
}

function irSlide(indice) {
    mostrarSlide(indice);
    reiniciarTemporizadorCarrusel();
}

function iniciarCarruselAutomatico() {
    if (intervaloCarrusel) clearInterval(intervaloCarrusel);
    intervaloCarrusel = setInterval(() => {
        indiceSlideActual++;
        mostrarSlide(indiceSlideActual);
    }, 5000);
}

function reiniciarTemporizadorCarrusel() {
    clearInterval(intervaloCarrusel);
    iniciarCarruselAutomatico();
}

// =========================================================
// VISOR DE IMÁGENES: abrir fotos de productos en grande
// =========================================================
let imagenesGaleriaActual = [];
let indiceImagenActual = 0;
let productoGaleriaActual = null;

// =========================================================
// ENLACES DIRECTOS: cada tarjeta recibe un slug estable para compartirla.
// Ejemplo: ?producto=pastel-de-fresa
// =========================================================
function crearSlugProducto(texto) {
    return String(texto || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

function configurarEnlacesDirectosProductos() {
    document.querySelectorAll('#productos-container .producto').forEach(tarjeta => {
        const titulo = tarjeta.querySelector('h3');
        if (!titulo) return;

        const slug = tarjeta.dataset.productSlug || crearSlugProducto(titulo.textContent.trim());
        tarjeta.dataset.productSlug = slug;
        if (!tarjeta.id) tarjeta.id = `producto-${slug}`;

        // Compatibilidad por si una tarjeta futura no trae el atributo data-product-gallery.
        if (!tarjeta.dataset.productGallery) {
            const imagen = tarjeta.querySelector('.img-producto');
            tarjeta.dataset.productGallery = JSON.stringify(imagen ? [imagen.getAttribute('src')] : []);
        }
        if (!tarjeta.dataset.productDescription) {
            const descripcion = tarjeta.querySelector('p');
            tarjeta.dataset.productDescription = descripcion ? descripcion.textContent.trim() : titulo.textContent.trim();
        }
    });
}

function buscarTarjetaPorSlug(slug) {
    const solicitado = crearSlugProducto(slug);
    return Array.from(document.querySelectorAll('#productos-container .producto'))
        .find(tarjeta => {
            const h3 = tarjeta.querySelector('h3');
            return crearSlugProducto(tarjeta.dataset.productSlug || (h3 && h3.textContent)) === solicitado;
        }) || null;
}

function crearEnlaceDirectoProducto(tarjeta) {
    if (!tarjeta) return URL_SITIO_GITHUB;
    const titulo = tarjeta.querySelector('h3');
    const slug = tarjeta.dataset.productSlug || crearSlugProducto(titulo ? titulo.textContent : '');
    const url = new URL(`${URL_SITIO_GITHUB.replace(/\/$/, '')}/`);
    url.searchParams.set('producto', slug);
    return url.href;
}

function abrirSoloImagenDesdeTarjeta(imagenElemento) {
    const tarjeta = imagenElemento && imagenElemento.closest('#productos-container .producto');
    if (!tarjeta) return;

    let imagenes = [];
    try {
        imagenes = JSON.parse(tarjeta.dataset.productGallery || '[]');
    } catch (error) {
        imagenes = [];
    }
    if (!Array.isArray(imagenes) || !imagenes.length) {
        const imagen = tarjeta.querySelector('.img-producto');
        if (imagen) imagenes = [imagen.getAttribute('src')];
    }

    const titulo = tarjeta.querySelector('h3');
    abrirSoloImagen(
        imagenes,
        titulo ? titulo.textContent.trim() : 'Producto Cake Chavez',
        tarjeta.dataset.productDescription || '',
        tarjeta
    );
}

function abrirSoloImagen(imagenes, titulo, descripcion, tarjetaProducto = null) {
    reproducirSonidoGotita();
    const modalSolo = document.getElementById('modal-solo-imagen');
    const imgElement = document.getElementById('solo-img-src');
    const tituloElement = document.getElementById('solo-img-titulo');
    const descElement = document.getElementById('solo-img-descripcion');
    const indContainer = document.getElementById('galeria-indicadores');
    const btnPrev = document.getElementById('btn-galeria-prev');
    const btnNext = document.getElementById('btn-galeria-next');
    const acciones = document.getElementById('galeria-acciones-producto');

    imagenesGaleriaActual = Array.isArray(imagenes) ? imagenes.filter(Boolean) : [imagenes].filter(Boolean);
    indiceImagenActual = 0;
    productoGaleriaActual = tarjetaProducto;

    if (!productoGaleriaActual && titulo) {
        productoGaleriaActual = Array.from(document.querySelectorAll('#productos-container .producto'))
            .find(tarjeta => {
                const h3 = tarjeta.querySelector('h3');
                return h3 && crearSlugProducto(h3.textContent.trim()) === crearSlugProducto(titulo);
            }) || null;
    }

    if (imgElement) imgElement.src = imagenesGaleriaActual[0] || '';
    // Precarga las imágenes cercanas para que el cambio de foto sea inmediato.
    precargarImagenesGaleria(0);
    if (imgElement) imgElement.alt = titulo || 'Imagen de producto';
    if (tituloElement) tituloElement.innerText = titulo || '';
    if (descElement) descElement.innerText = descripcion || '';
    if (acciones) acciones.hidden = !productoGaleriaActual;

    if (imagenesGaleriaActual.length > 1) {
        if (btnPrev) btnPrev.style.display = 'flex';
        if (btnNext) btnNext.style.display = 'flex';
        if (indContainer) {
            indContainer.innerHTML = '';
            imagenesGaleriaActual.forEach((_, idx) => {
                const punto = document.createElement('span');
                punto.className = `dot-galeria ${idx === 0 ? 'active' : ''}`;
                punto.setAttribute('aria-label', `Ver imagen ${idx + 1}`);
                indContainer.appendChild(punto);
            });
        }
    } else {
        if (btnPrev) btnPrev.style.display = 'none';
        if (btnNext) btnNext.style.display = 'none';
        if (indContainer) indContainer.innerHTML = '';
    }

    if (modalSolo) { modalSolo.style.display = 'flex'; document.body.classList.add('galeria-modal-abierto'); }
}

function pedirProductoGaleria() {
    const tarjeta = productoGaleriaActual;
    if (!tarjeta) {
        alert('No pude identificar este producto. Ábrelo desde el catálogo e inténtalo de nuevo.');
        return;
    }

    const botonPedido = tarjeta.querySelector('button[data-order-button], button[onclick*="abrirVentanita"]');
    if (!botonPedido) {
        alert('Este producto no tiene configurado el botón de pedido.');
        return;
    }

    cerrarSoloImagen();
    window.setTimeout(() => botonPedido.click(), 120);
}

async function compartirEnlaceProducto() {
    const tarjeta = productoGaleriaActual;
    if (!tarjeta) {
        alert('Abre el producto desde el catálogo para obtener su enlace directo.');
        return;
    }

    const titulo = tarjeta.querySelector('h3');
    const nombre = titulo ? titulo.textContent.trim() : 'Producto Cake Chavez';
    const enlace = crearEnlaceDirectoProducto(tarjeta);

    // En celulares compatibles, se puede elegir Facebook, WhatsApp u otra aplicación.
    if (navigator.share) {
        try {
            await navigator.share({
                title: `${nombre} | Cake Chavez`,
                text: `Mira este producto de Cake Chavez: ${nombre}`,
                url: enlace
            });
            return;
        } catch (error) {
            // Si la persona canceló compartir, no abrir otras ventanas inesperadamente.
            if (error && error.name === 'AbortError') return;
        }
    }

    try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(enlace);
            alert(`¡Enlace copiado! Pégalo en tu publicación de Facebook:\n\n${enlace}`);
            return;
        }
    } catch (error) {
        // Se ofrece el método manual de abajo si el navegador bloquea el portapapeles.
    }

    window.prompt('Copia este enlace y pégalo en Facebook:', enlace);
}

function ejecutarDespuesDeLaAnimacionDelLogo(callback) {
    const logo = document.querySelector('.zona-portada .logo');
    const reduceMovimiento = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!logo || reduceMovimiento || !getComputedStyle(logo).animationName.includes('cakeLogoZoomRegresoV2')) {
        window.setTimeout(callback, 350);
        return;
    }

    let terminado = false;
    let temporizadorSeguridad;
    const finalizar = () => {
        if (terminado) return;
        terminado = true;
        clearTimeout(temporizadorSeguridad);
        logo.removeEventListener('animationend', alTerminarAnimacion);
        window.setTimeout(callback, 360);
    };
    const alTerminarAnimacion = event => {
        if (event.animationName === 'cakeLogoZoomRegresoV2') finalizar();
    };

    logo.addEventListener('animationend', alTerminarAnimacion);
    // Respaldo si el navegador no dispara animationend por ahorro de energía o interrupción.
    temporizadorSeguridad = window.setTimeout(finalizar, 4100);
}

function manejarEnlaceDirectoProducto() {
    let slug = '';
    try {
        slug = new URLSearchParams(window.location.search).get('producto') || '';
    } catch (error) {
        slug = '';
    }
    if (!slug) return;

    const tarjeta = buscarTarjetaPorSlug(slug);
    if (!tarjeta) {
        console.warn(`No se encontró un producto con el enlace: ${slug}`);
        return;
    }

    // Si el enlace viene de Facebook, el logo termina su animación antes de abrir el producto.
    ejecutarDespuesDeLaAnimacionDelLogo(() => {
        const h3 = tarjeta.querySelector('h3');
        let imagenes = [];
        try {
            imagenes = JSON.parse(tarjeta.dataset.productGallery || '[]');
        } catch (error) {
            imagenes = [];
        }
        if (!Array.isArray(imagenes) || !imagenes.length) {
            const img = tarjeta.querySelector('.img-producto');
            if (img) imagenes = [img.getAttribute('src')];
        }
        abrirSoloImagen(
            imagenes,
            h3 ? h3.textContent.trim() : 'Producto Cake Chavez',
            tarjeta.dataset.productDescription || '',
            tarjeta
        );
    });
}

function precargarImagenesGaleria(indice) {
    if (!Array.isArray(imagenesGaleriaActual) || imagenesGaleriaActual.length < 2) return;
    [-1, 1].forEach(delta => { const i = (indice + delta + imagenesGaleriaActual.length) % imagenesGaleriaActual.length; const img = new Image(); img.decoding = 'async'; img.src = imagenesGaleriaActual[i]; });
}

function deslizarGaleria(direccion) {
    if (imagenesGaleriaActual.length <= 1) return;
    reproducirSonidoGotita();
    indiceImagenActual += direccion;

    if (indiceImagenActual >= imagenesGaleriaActual.length) indiceImagenActual = 0;
    if (indiceImagenActual < 0) indiceImagenActual = imagenesGaleriaActual.length - 1;

    const imgElement = document.getElementById('solo-img-src');
    if (imgElement) {
        // No retrasar la interacción con un temporizador: el navegador cambia a la foto ya precargada.
        imgElement.classList.add('galeria-cambiando');
        imgElement.src = imagenesGaleriaActual[indiceImagenActual];
        imgElement.onload = () => imgElement.classList.remove('galeria-cambiando');
        precargarImagenesGaleria(indiceImagenActual);
    }

    const dots = document.querySelectorAll('.dot-galeria');
    dots.forEach((dot, idx) => dot.classList.toggle('active', idx === indiceImagenActual));
}

function cerrarSoloImagen() {
    reproducirSonidoGotita();
    const modalSolo = document.getElementById('modal-solo-imagen');
    if (modalSolo) modalSolo.style.display = 'none';
    document.body.classList.remove('galeria-modal-abierto');
}

// =========================================================
// BÚSQUEDA Y FILTROS: encontrar productos por texto o categoría
// =========================================================
function buscarProductos() {
    const input = document.getElementById('input-busqueda');
    if (!input) return;

    const query = input.value.toLowerCase().trim();
    const productos = document.querySelectorAll('.producto');
    const botonesNav = document.querySelectorAll('.nav-btn');

    if (query !== '') {
        botonesNav.forEach(btn => btn.classList.remove('active'));
    } else {
        const btnTodos = document.querySelector('.nav-btn[onclick*="todos"]');
        if (btnTodos) btnTodos.classList.add('active');
    }

    productos.forEach(prod => {
        const titulo = prod.querySelector('h3').innerText.toLowerCase();
        const desc = prod.querySelector('p').innerText.toLowerCase();

        if (titulo.includes(query) || desc.includes(query)) {
            prod.classList.add('mostrar');
        } else {
            prod.classList.remove('mostrar');
        }
    });
}

// =========================================================
// CATÁLOGO: filtrar por categoría y bajar al primer resultado
// =========================================================
function desplazarseHastaElementoConMenu(elemento) {
    if (!elemento) return;

    const menuCategorias = document.querySelector('.zona-portada nav');
    // Reservamos espacio para el menú fijo, especialmente en pantallas pequeñas.
    const alturaMenu = menuCategorias ? menuCategorias.getBoundingClientRect().height : 0;
    const margenSuperior = alturaMenu + 24;
    const destino = elemento.getBoundingClientRect().top + window.scrollY - margenSuperior;
    const reducirMovimiento = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    window.scrollTo({
        top: Math.max(0, destino),
        behavior: reducirMovimiento ? 'auto' : 'smooth'
    });
}

function filtrar(categoria, elemento) {
    // MEJORA 12: al elegir una categoría, salir del filtro exclusivo de favoritos.
    if (typeof cakeSoloFavoritos !== 'undefined' && cakeSoloFavoritos && typeof salirModoFavoritosCake === 'function') salirModoFavoritosCake();
    const categoriasPermitidas = ['todos', 'pasteles', 'postres', 'galletas', 'bocaditos', 'especiales'];
    const categoriaElegida = categoriasPermitidas.includes(categoria) ? categoria : 'todos';
    const inputBusqueda = document.getElementById('input-busqueda');
    if (inputBusqueda) inputBusqueda.value = '';

    const botones = document.querySelectorAll('.zona-portada .nav-btn');
    botones.forEach(btn => btn.classList.remove('active'));

    if (elemento && elemento.classList) {
        elemento.classList.add('active');
        reproducirSonidoGotita();
    } else {
        const btnCategoria = document.querySelector(`.zona-portada .nav-btn[onclick*="'${categoriaElegida}'"]`);
        if (btnCategoria) btnCategoria.classList.add('active');
    }

    const productos = document.querySelectorAll('#productos-container .producto');
    productos.forEach(prod => {
        const mostrar = categoriaElegida === 'todos' || prod.classList.contains(categoriaElegida);
        prod.classList.toggle('mostrar', mostrar);
    });

    // La carga inicial no desplaza la página. Solo se mueve al tocar un botón del menú.
    if (elemento && elemento.classList) {
        window.setTimeout(() => {
            const primerProducto = categoriaElegida === 'todos'
                ? document.querySelector('#productos-container .producto.mostrar')
                : document.querySelector(`#productos-container .producto.${categoriaElegida}.mostrar`);
            if (primerProducto) desplazarseHastaElementoConMenu(primerProducto);
        }, 90);
    }
}

// =========================================================
// CARRITO: productos seleccionados, cantidades y subtotal
// =========================================================
let orden = [];
let total = 0;
let productoTemporal = {};

function toggleCarrito() {
    const panelLateral = document.getElementById('carrito-lateral');
    const overlay = document.getElementById('overlay');

    if (panelLateral) panelLateral.classList.toggle('abierto');
    if (overlay) overlay.classList.toggle('mostrar');
}

function abrirVentanita(nombre, arg2, arg3, arg4, arg5, arg6, arg7) {
    reproducirSonidoGotita();

    const modalTitulo = document.getElementById('modal-titulo');
    const modalCantidad = document.getElementById('modal-cantidad');
    const divTamano = document.getElementById('opciones-tamano');
    const selectTamano = document.getElementById('modal-select-tamano');
    const modalImg = document.getElementById('modal-img');
    const modalDesc = document.getElementById('modal-descripcion');

    if (modalTitulo) modalTitulo.innerText = nombre;
    if (modalCantidad) modalCantidad.value = 1;

    let imagen = '';
    let descripcion = '';
    const tipoDeclarado = String(arg5 || '').toLowerCase();

    if (tipoDeclarado === 'pastel') {
        const pequeno = Number(arg2) || 0;
        const mediano = Number(arg3) || 0;
        const grande = Number(arg4) || 0;

        productoTemporal = {
            nombre: nombre,
            pequeno,
            mediano,
            grande,
            tipo: 'pastel'
        };
        imagen = arg6 || '';
        descripcion = arg7 || '';

        // Muestra solo los tamaños que tengan precio configurado; evita opciones Q0.00.
        const opciones = [
            { nombre: 'Pequeño', precio: pequeno },
            { nombre: 'Mediano', precio: mediano },
            { nombre: 'Grande', precio: grande }
        ].filter(opcion => Number.isFinite(opcion.precio) && opcion.precio > 0);

        if (!opciones.length) {
            const respaldo = pequeno || mediano || grande || 0;
            opciones.push({ nombre: 'Mediano', precio: respaldo });
        }

        if (divTamano) divTamano.style.display = 'block';
        if (selectTamano) {
            const indiceMediano = opciones.findIndex(opcion => opcion.nombre === 'Mediano');
            const indiceSeleccionado = indiceMediano >= 0 ? indiceMediano : 0;
            selectTamano.innerHTML = opciones.map((opcion, indice) => {
                const precio = opcion.precio.toFixed(2);
                const seleccionado = indice === indiceSeleccionado ? ' selected' : '';
                return `<option value="${opcion.nombre}" data-precio="${precio}"${seleccionado}>${opcion.nombre} - Q${precio}</option>`;
            }).join('');
        }
    } else {
        // En algunos botones antiguos el precio aparece en arg2 y en otros en arg3.
        // Toma el primer valor mayor que cero y usa arg6/arg7 para imagen/descripción.
        const candidatosPrecio = [arg2, arg3, arg4].map(valor => Number(valor));
        const precioBase = candidatosPrecio.find(valor => Number.isFinite(valor) && valor > 0) || 0;

        productoTemporal = {
            nombre: nombre,
            precioBase,
            tipo: 'unidad'
        };
        imagen = arg6 || '';
        descripcion = arg7 || '';
        if (divTamano) divTamano.style.display = 'none';
    }

    if (modalImg) {
        modalImg.src = imagen;
        modalImg.alt = nombre;
    }

    if (modalDesc) modalDesc.innerText = descripcion;
    productoTemporal.imagen = imagen;

    calcularSubtotalModal();

    const modalProducto = document.getElementById('modal-producto');
    if (modalProducto) modalProducto.style.display = 'flex';
}

function cerrarVentanita() {
    reproducirSonidoGotita();
    const modalProducto = document.getElementById('modal-producto');
    if (modalProducto) modalProducto.style.display = 'none';
}

function calcularSubtotalModal() {
    const cantInput = document.getElementById('modal-cantidad');
    let cantidad = cantInput ? parseInt(cantInput.value) : 1;

    if (isNaN(cantidad) || cantidad < 1) cantidad = 1;

    let precioUnitario = 0;

    if (productoTemporal.tipo === 'pastel') {
        const selectTamano = document.getElementById('modal-select-tamano');

        if (selectTamano && selectTamano.options && selectTamano.selectedIndex >= 0) {
            const opcionSeleccionada = selectTamano.options[selectTamano.selectedIndex];

            if (opcionSeleccionada && opcionSeleccionada.dataset && opcionSeleccionada.dataset.precio) {
                precioUnitario = parseFloat(opcionSeleccionada.dataset.precio);
            }
        }
    } else if (productoTemporal.precioBase) {
        precioUnitario = productoTemporal.precioBase;
    }

    const subtotal = precioUnitario * cantidad;
    const pInfo = document.getElementById('modal-precio-info');
    const pSubtotal = document.getElementById('modal-subtotal');

    if (pInfo) pInfo.innerText = "Precio unitario: Q" + precioUnitario.toFixed(2);
    if (pSubtotal) pSubtotal.innerText = "Q" + subtotal.toFixed(2);
}

function agregarDesdeVentanita() {
    reproducirSonidoGotita();

    const cantInput = document.getElementById('modal-cantidad');
    let cantidad = cantInput ? parseInt(cantInput.value) : 1;

    if (isNaN(cantidad) || cantidad < 1) cantidad = 1;

    let nombreFinal = productoTemporal.nombre || "Producto";
    let precioFinal = 0;

    if (productoTemporal.tipo === 'pastel') {
        const selectTamano = document.getElementById('modal-select-tamano');
        const tamanoNombre = selectTamano ? selectTamano.value : 'Mediano';

        if (selectTamano && selectTamano.options && selectTamano.selectedIndex >= 0) {
            const opcionSeleccionada = selectTamano.options[selectTamano.selectedIndex];

            if (opcionSeleccionada && opcionSeleccionada.dataset && opcionSeleccionada.dataset.precio) {
                precioFinal = parseFloat(opcionSeleccionada.dataset.precio);
            }
        }

        nombreFinal = `${productoTemporal.nombre} (${tamanoNombre})`;
    } else {
        precioFinal = productoTemporal.precioBase || 0;
    }

    const productoExistente = orden.find(item => item.nombre === nombreFinal);

    if (productoExistente) {
        productoExistente.cantidad += cantidad;
    } else {
        orden.push({
            nombre: nombreFinal,
            precio: precioFinal,
            cantidad: cantidad,
            imagen: productoTemporal.imagen || ''
        });
    }

    total += (precioFinal * cantidad);
    actualizarCarrito();
    cerrarVentanita();

    const panelLateral = document.getElementById('carrito-lateral');

    if (panelLateral && !panelLateral.classList.contains('abierto')) {
        toggleCarrito();
    }
}



// =========================================================
// MEJORA 1: PRODUCTOS DESTACADOS — navegar hasta una tarjeta del catálogo
// =========================================================
// Lleva desde la sección de destacados hasta la tarjeta correspondiente del catálogo.
function irAProducto(idProducto) {
    filtrar('todos');
    const producto = document.getElementById(idProducto);
    if (!producto) return;
    window.setTimeout(() => {
        desplazarseHastaElementoConMenu(producto);
        producto.classList.add('producto-destacado-enfasis');
        window.setTimeout(() => producto.classList.remove('producto-destacado-enfasis'), 1600);
    }, 90);
}

// =========================================================
// MEJORA 5: ETIQUETAS DE AYUDA EN LAS TARJETAS DEL CATÁLOGO
// Se agregan con JavaScript para evitar repetir el mismo HTML en cada producto.
// =========================================================
function agregarEtiquetasTarjetasCatalogo() {
    const productos = document.querySelectorAll('#productos-container .producto');

    productos.forEach(producto => {
        // Evita crear una etiqueta duplicada si la función se ejecuta otra vez.
        if (producto.querySelector('.producto-etiqueta')) return;

        let textoEtiqueta = 'Preparación artesanal';
        if (producto.classList.contains('pasteles')) textoEtiqueta = 'Pastel por encargo';
        else if (producto.classList.contains('postres')) textoEtiqueta = 'Postre artesanal';
        else if (producto.classList.contains('galletas')) textoEtiqueta = 'Dulce para compartir';
        else if (producto.classList.contains('bocaditos')) textoEtiqueta = 'Ideal para compartir';
        else if (producto.classList.contains('especiales')) textoEtiqueta = 'Selección especial';

        const etiqueta = document.createElement('span');
        etiqueta.className = 'producto-etiqueta';
        etiqueta.textContent = textoEtiqueta;
        etiqueta.setAttribute('aria-label', textoEtiqueta);
        producto.insertBefore(etiqueta, producto.firstChild);
    });
}

// =========================================================
// MEJORA 6: GALERÍA DE INSPIRACIÓN A PARTIR DEL CATÁLOGO EXISTENTE
// Estas fotos son referencias de productos del catálogo, no reseñas ni encargos de clientes.
// =========================================================
function generarGaleriaInspiracion() {
    const contenedor = document.getElementById('galeria-inspiracion-grid');
    if (!contenedor) return;

    contenedor.innerHTML = '';
    const productos = Array.from(document.querySelectorAll('#productos-container .producto'));

    productos.slice(0, 9).forEach(producto => {
        const imagenProducto = producto.querySelector('.img-producto');
        const tituloProducto = producto.querySelector('h3');
        if (!imagenProducto || !tituloProducto) return;

        const rutaImagen = imagenProducto.getAttribute('src');
        if (!rutaImagen) return;

        const titulo = tituloProducto.textContent.trim();
        const tarjeta = document.createElement('button');
        tarjeta.type = 'button';
        tarjeta.className = 'galeria-inspiracion-item';
        tarjeta.setAttribute('aria-label', `Ver en grande: ${titulo}`);

        const imagen = document.createElement('img');
        imagen.src = rutaImagen;
        imagen.alt = titulo;
        imagen.loading = 'lazy';

        const pie = document.createElement('span');
        pie.className = 'galeria-inspiracion-pie';
        pie.textContent = titulo;

        const icono = document.createElement('span');
        icono.className = 'galeria-inspiracion-ampliar';
        icono.setAttribute('aria-hidden', 'true');
        icono.innerHTML = '<i class="fas fa-magnifying-glass-plus"></i>';

        tarjeta.append(imagen, pie, icono);
        tarjeta.addEventListener('click', () => {
            abrirSoloImagen([rutaImagen], titulo, 'Imagen de inspiración del catálogo de Cake Chavez. Puedes compartir esta idea al personalizar tu pedido.', producto);
        });
        contenedor.appendChild(tarjeta);
    });
}

// =========================================================
// MEJORA 7: CALENDARIO DE PEDIDOS
// Consulta en Supabase la capacidad disponible; el registro final vuelve a validar de forma atómica.
// =========================================================
function formatoFechaLocal(fecha) {
    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return `${anio}-${mes}-${dia}`;
}

function configurarCalendarioPedidos() {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    hoy.setDate(hoy.getDate() + 1); // No permitir elegir hoy: no se aceptan pedidos para el mismo día.
    const fechaMinima = formatoFechaLocal(hoy);

    ['fecha-consulta-pedidos', 'fecha-personalizar', 'cliente-fecha'].forEach(id => {
        const campoFecha = document.getElementById(id);
        if (campoFecha) { campoFecha.min = fechaMinima; campoFecha.addEventListener('change', () => comprobarDisponibilidadFechaCake(campoFecha)); }
    });
}

async function comprobarDisponibilidadFechaCake(campoFecha) {
    if (!campoFecha || !campoFecha.value) return true;
    const client = obtenerClienteSupabaseCake();
    const aviso = document.getElementById('aviso-disponibilidad-fecha');
    if (!client) return true;
    if (aviso) aviso.textContent = 'Consultando disponibilidad para esa fecha…';
    const { data, error } = await client.rpc('cake_check_order_date', { p_date: campoFecha.value });
    if (error) { if (aviso) aviso.textContent = 'No pudimos confirmar los espacios en este momento. Puedes consultar por WhatsApp.'; return true; }
    const estado = Array.isArray(data) ? data[0] : data;
    if (estado && estado.available === false) {
        campoFecha.setCustomValidity('Esta fecha ya está completa. Elige otra fecha.');
        campoFecha.classList.add('cake-fecha-completa');
        if (aviso) aviso.textContent = 'Esta fecha está COMPLETA. Elige otro día para continuar.';
        alert('Esta fecha ya está completa. Por favor, elige otro día.');
        campoFecha.reportValidity();
        return false;
    }
    campoFecha.setCustomValidity(''); campoFecha.classList.remove('cake-fecha-completa');
    if (aviso && estado) aviso.textContent = `Hay espacio para esa fecha: ${estado.remaining} pedido(s) disponible(s). La fecha se confirma por WhatsApp.`;
    return true;
}

function abrirPersonalizadorDesdeCalendario() {
    const campoConsulta = document.getElementById('fecha-consulta-pedidos');
    const campoPersonalizar = document.getElementById('fecha-personalizar');

    if (!campoConsulta || !campoConsulta.value) {
        alert('Elige primero una fecha tentativa para tu pedido.');
        if (campoConsulta) campoConsulta.focus();
        return;
    }
    comprobarDisponibilidadFechaCake(campoConsulta).then(disponible => {
        if (!disponible) return;
        if (campoPersonalizar) campoPersonalizar.value = campoConsulta.value;
        abrirModalPersonalizar();
    });
}

// =========================================================
// MEJORA 4: ABRIR EL PERSONALIZADOR CON UNA OCASIÓN PRESELECCIONADA
// =========================================================
function abrirPersonalizadorConOcasion(ocasion) {
    const selectorOcasion = document.getElementById('ocasion-personalizar');
    if (selectorOcasion) {
        const opcionExiste = Array.from(selectorOcasion.options).some(opcion => opcion.value === ocasion || opcion.textContent.trim() === ocasion);
        if (opcionExiste) selectorOcasion.value = ocasion;
    }
    abrirModalPersonalizar();
}

// =========================================================
// MEJORA 3: SOLICITUD DE OPINIÓN REAL POR WHATSAPP
// No publica reseñas automáticamente; solo prepara un mensaje para el cliente.
// =========================================================
function solicitarOpinionWhatsapp(tema) {
    const mensajes = {
        sabor: 'Quisiera compartir mi opinión sobre el sabor de un producto.',
        pedido: 'Quisiera compartir mi experiencia con mi pedido.',
        foto: 'Quisiera compartir una foto y una opinión sobre mi pedido.'
    };
    const texto = `Hola, Cake Chavez. ${mensajes[tema] || 'Quisiera compartir mi opinión sobre Cake Chavez.'}\n\nProducto o pedido: [escribe aquí]\nMi opinión: [escribe aquí]\n\nPor favor, consúltenme antes de publicar mi comentario o mi foto.`;
    const url = `https://wa.me/${NUMERO_WHATSAPP}?text=${encodeURIComponent(texto)}`;
    const ventana = window.open(url, '_blank');
    if (ventana) ventana.opener = null;
    else window.location.href = url;
}

// =========================================================
// MEJORA 8: BOTÓN GENERAL DE CONTACTO PARA PREGUNTAS FRECUENTES
// =========================================================
function contactarPorWhatsApp() {
    const texto = 'Hola, Cake Chavez. Tengo una consulta sobre pedidos, entrega o formas de pago.';
    const url = `https://wa.me/${NUMERO_WHATSAPP}?text=${encodeURIComponent(texto)}`;
    const ventana = window.open(url, '_blank');
    if (ventana) ventana.opener = null;
    else window.location.href = url;
}

// MEJORA 2: PERSONALIZADOR — vista previa temporal de la foto elegida.
let fotoPersonalizadaObjectUrl = null;
const MAX_FOTO_PERSONALIZADA_MB = 8;

// Muestra una vista previa local de la foto elegida; no se sube al sitio.
function previsualizarFotoPersonalizada(event) {
    const input = event && event.target;
    const archivo = input && input.files ? input.files[0] : null;
    const contenedor = document.getElementById('contenedor-vista-foto-personalizada');
    const img = document.getElementById('vista-previa-foto-personalizada');
    const nombre = document.getElementById('nombre-foto-personalizada');

    if (fotoPersonalizadaObjectUrl) {
        URL.revokeObjectURL(fotoPersonalizadaObjectUrl);
        fotoPersonalizadaObjectUrl = null;
    }

    if (!archivo) {
        if (contenedor) contenedor.hidden = true;
        if (img) img.removeAttribute('src');
        if (nombre) nombre.textContent = '';
        return;
    }

    if (!archivo.type || !archivo.type.startsWith('image/')) {
        alert('Selecciona un archivo de imagen, por favor.');
        input.value = '';
        if (contenedor) contenedor.hidden = true;
        return;
    }

    if (archivo.size > MAX_FOTO_PERSONALIZADA_MB * 1024 * 1024) {
        alert(`La foto debe pesar menos de ${MAX_FOTO_PERSONALIZADA_MB} MB. Elige una imagen más pequeña.`);
        input.value = '';
        if (contenedor) contenedor.hidden = true;
        if (img) img.removeAttribute('src');
        if (nombre) nombre.textContent = '';
        return;
    }

    fotoPersonalizadaObjectUrl = URL.createObjectURL(archivo);
    if (img) img.src = fotoPersonalizadaObjectUrl;
    if (nombre) nombre.textContent = `${archivo.name} · ${(archivo.size / (1024 * 1024)).toFixed(2)} MB`;
    if (contenedor) contenedor.hidden = false;
}

function quitarFotoPersonalizada() {
    const input = document.getElementById('foto-personalizar');
    const contenedor = document.getElementById('contenedor-vista-foto-personalizada');
    const img = document.getElementById('vista-previa-foto-personalizada');
    const nombre = document.getElementById('nombre-foto-personalizada');

    if (input) input.value = '';
    if (fotoPersonalizadaObjectUrl) {
        URL.revokeObjectURL(fotoPersonalizadaObjectUrl);
        fotoPersonalizadaObjectUrl = null;
    }
    if (img) img.removeAttribute('src');
    if (nombre) nombre.textContent = '';
    if (contenedor) contenedor.hidden = true;
}

function obtenerValorPersonalizacion(id, valorPredeterminado = 'No indicado') {
    const elemento = document.getElementById(id);
    if (!elemento) return valorPredeterminado;
    const valor = String(elemento.value || '').trim();
    return valor || valorPredeterminado;
}

// =========================================================
// PERSONALIZADOR: abrir y cerrar la ventana de formulario
// =========================================================
function abrirModalPersonalizar() {
    reproducirSonidoGotita();

    const modal = document.getElementById('modal-personalizar');

    if (modal) {
        modal.style.display = 'flex';
        modal.setAttribute('aria-hidden', 'false');
        document.body.classList.add('modal-abierto');
        modal.querySelector('.cerrar-personalizar').focus();
    }
}

function cerrarModalPersonalizar() {
    reproducirSonidoGotita();

    const modal = document.getElementById('modal-personalizar');

    if (modal) {
        modal.style.display = 'none';
        modal.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('modal-abierto');
    }
}

// =========================================================
// WHATSAPP PERSONALIZADO: preparar detalles y compartir la foto si el navegador lo admite
// =========================================================
async function enviarPedidoPersonalizadoWhatsApp() {
    reproducirSonidoGotita();

    const archivoInput = document.getElementById('foto-personalizar');
    const foto = archivoInput && archivoInput.files ? archivoInput.files[0] : null;
    const nombre = obtenerValorPersonalizacion('nombre-personalizar');
    const ocasion = obtenerValorPersonalizacion('ocasion-personalizar');
    const sabor = obtenerValorPersonalizacion('sabor-personalizar');
    const tamano = obtenerValorPersonalizacion('tamano-personalizar');
    const colores = obtenerValorPersonalizacion('colores-personalizar');
    const fecha = obtenerValorPersonalizacion('fecha-personalizar');
    const detalles = obtenerValorPersonalizacion('detalles-personalizar');

    // La fecha de entrega es obligatoria también para pasteles personalizados.
    if (!fecha || fecha === 'No indicado') {
        alert('Selecciona la fecha de entrega para continuar con tu solicitud de pastel personalizado.');
        const campoFecha = document.getElementById('fecha-personalizar');
        if (campoFecha) { campoFecha.focus(); campoFecha.reportValidity?.(); }
        return;
    }

    let texto = 'Hola, Cake Chavez. Quisiera cotizar un pastel personalizado.\n\n';
    texto += `Nombre: ${nombre}\n`;
    texto += `Ocasión: ${ocasion}\n`;
    texto += `Sabor: ${sabor}\n`;
    texto += `Tamaño: ${tamano}\n`;
    texto += `Colores o temática: ${colores}\n`;
    texto += `Fecha de entrega: ${fecha}\n`;
    texto += `Detalles: ${detalles}\n`;

    // Registrar la solicitud personalizada antes de abrir WhatsApp.
    const clienteSupabase = obtenerClienteSupabaseCake();
    if (!clienteSupabase) {
        alert('No se pudo conectar con el sistema de pedidos. No se ha enviado la solicitud. Inténtalo más tarde o contáctanos por WhatsApp.');
        return;
    }
    const codigoPersonalizado = `CC-${(window.crypto?.randomUUID ? crypto.randomUUID().replace(/-/g, '') : `${Date.now()}${Math.random().toString(16).slice(2)}`).toUpperCase().slice(0, 16)}`;
    const payloadPersonalizado = {
        order_type: 'pastel_personalizado',
        name: String(nombre === 'No indicado' ? '' : nombre).slice(0, 120),
        delivery_date: String(fecha).slice(0, 10),
        address: '', total: 0, items: [],
        occasion: String(ocasion).slice(0, 100),
        flavor: String(sabor).slice(0, 100),
        size: String(tamano).slice(0, 100),
        colors_theme: String(colores).slice(0, 500),
        customization: String(detalles).slice(0, 2000),
        photo_reference_name: foto ? String(foto.name).slice(0, 200) : ''
    };
    const { data: registroPersonalizado, error: errorRegistroPersonalizado } = await clienteSupabase.rpc(
        'cake_register_order_with_capacity',
        { p_order_code: codigoPersonalizado, p_payload: payloadPersonalizado }
    );
    if (errorRegistroPersonalizado) {
        console.error('No se pudo registrar la solicitud personalizada:', errorRegistroPersonalizado.message);
        alert('No se pudo guardar tu solicitud en el sistema, por lo que no abriremos WhatsApp todavía. Inténtalo de nuevo o contáctanos por WhatsApp.');
        return;
    }
    const codigoGuardado = (Array.isArray(registroPersonalizado) ? registroPersonalizado[0] : registroPersonalizado)?.order_code || codigoPersonalizado;
    texto += `\nCódigo de solicitud: ${codigoGuardado}\n`;

    // En navegadores compatibles, comparte la foto y el texto mediante el menú
    // nativo del teléfono. El cliente aún debe elegir WhatsApp y confirmar el envío.
    let puedeCompartirFoto = false;
    try {
        puedeCompartirFoto = Boolean(
            foto && navigator.share && navigator.canShare && navigator.canShare({ files: [foto] })
        );
    } catch (error) {
        puedeCompartirFoto = false;
    }

    if (puedeCompartirFoto) {
        try {
            await navigator.share({
                files: [foto],
                title: 'Referencia para pastel personalizado - Cake Chavez',
                text: texto
            });
            cerrarModalPersonalizar();
            return;
        } catch (error) {
            // Si la persona cerró el menú de compartir, no abrir WhatsApp por sorpresa.
            if (error && error.name === 'AbortError') return;
            console.error('No se pudo compartir la foto desde este navegador:', error);
            alert('No se pudo compartir la foto desde el menú del teléfono. Puedes volver a intentarlo o abrir WhatsApp con los detalles y adjuntar la imagen manualmente.');
            return;
        }
    }

    if (foto) {
        texto += '\nElegí una foto de referencia. Si no se adjunta automáticamente, la enviaré manualmente en este chat de WhatsApp.';
    }

    const url = `https://wa.me/${NUMERO_WHATSAPP}?text=${encodeURIComponent(texto)}`;
    const ventana = window.open(url, '_blank');

    // Evita que la nueva pestaña pueda manipular la página de Cake Chavez.
    if (ventana) {
        ventana.opener = null;
    } else {
        // Si el navegador bloquea la nueva pestaña, navega en la misma pestaña.
        window.location.href = url;
    }
    cerrarModalPersonalizar();
}

// =========================================================
// GESTIÓN DEL CARRITO: eliminar artículos y recalcular totales
// =========================================================
function eliminarItem(index) {
    reproducirSonidoGotita();

    if (orden[index]) {
        total -= (orden[index].precio * orden[index].cantidad);
        orden.splice(index, 1);
        actualizarCarrito();
    }
}

function actualizarCarrito() {
    const lista = document.getElementById('lista-orden');
    const totalPrecio = document.getElementById('total-precio');
    const datosCliente = document.getElementById('datos-cliente');
    const contadorBurbuja = document.getElementById('contador-carrito');

    if (!lista) return;

    lista.innerHTML = '';
    let cantidadTotalArticulos = 0;
    total = 0;

    orden.forEach(item => {
        total += (item.precio * item.cantidad);
    });

    if (totalPrecio) totalPrecio.innerText = total.toFixed(2);

    if (orden.length === 0) {
        lista.innerHTML = '<li class="empty-msg">Tu orden está vacía.</li>';

        if (datosCliente) datosCliente.style.display = 'none';
        if (contadorBurbuja) contadorBurbuja.innerText = 0;
    } else {
        orden.forEach((item, index) => {
            cantidadTotalArticulos += item.cantidad;

            const li = document.createElement('li');
            li.innerHTML = `
                <div style="flex: 1; padding-right: 10px;">
                    <b>${item.cantidad}x</b> ${item.nombre}
                </div>
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span>Q${(item.precio * item.cantidad).toFixed(2)}</span>
                    <button class="btn-eliminar-item" onclick="eliminarItem(${index})" title="Quitar producto">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;

            lista.appendChild(li);
        });

        if (datosCliente) datosCliente.style.display = 'block';
        if (contadorBurbuja) contadorBurbuja.innerText = cantidadTotalArticulos;
    }
}

// =========================================================
// CONFIRMAR PEDIDO: enviar productos y datos de entrega por WhatsApp
// =========================================================
async function confirmarOrden() {
    reproducirSonidoGotita();

    const nombre = document.getElementById('cliente-nombre').value.trim();
    const fecha = document.getElementById('cliente-fecha').value;
    const direccion = document.getElementById('cliente-direccion').value.trim();

    if (nombre === "" || fecha === "" || direccion === "") {
        alert("Por favor llena tu nombre, la fecha de entrega y tu dirección para enviar la orden.");
        return;
    }

    if (orden.length === 0) {
        alert("Tu orden está vacía.");
        return;
    }

    // MEJORA 11: abrir la pestaña en el clic del usuario para evitar bloqueos de ventanas emergentes.
    const ventanaWhatsapp = window.open('about:blank', '_blank');
    let codigoSeguimiento = '';
    if (typeof window.registrarPedidoCake === 'function') {
        try {
            codigoSeguimiento = await window.registrarPedidoCake({
                nombre,
                fecha,
                direccion,
                total,
                items: orden.map(item => ({ nombre: item.nombre, precio: item.precio, cantidad: item.cantidad, imagen: item.imagen || '' }))
            }) || '';
        } catch (error) {
            console.error('No se pudo registrar el pedido:', error);
        }
        // Si Supabase no pudo confirmar el cupo, no se debe enviar el pedido a WhatsApp
        // como si hubiera sido aceptado. El RPC ya muestra el motivo al cliente.
        if (!codigoSeguimiento) {
            if (ventanaWhatsapp && !ventanaWhatsapp.closed) ventanaWhatsapp.close();
            return;
        }
    }

    let texto = `🎂 *NUEVO PEDIDO DE CAKE CHAVEZ* 🎂\n`;
    texto += `──────────────────────────────\n\n`;
    texto += `🛒 *DETALLE DE LA ORDEN:*\n`;

    const fotosLista = [];

    orden.forEach(item => {
        texto += `• ${item.cantidad}x ${item.nombre} — Q${(item.precio * item.cantidad).toFixed(2)}\n`;

        if (item.imagen && item.imagen.trim() !== '') {
            const rutaAbsolutaImg = item.imagen.startsWith('http')
                ? item.imagen
                : `${URL_SITIO_GITHUB}/${item.imagen}`;

            fotosLista.push(`• ${item.nombre}:\n${rutaAbsolutaImg}`);
        }
    });

    texto += `\n💰 *TOTAL A PAGAR: Q${total.toFixed(2)}*\n\n`;
    texto += `──────────────────────────────\n\n`;
    texto += `📦 *DATOS DE ENTREGA:*\n`;
    texto += `👤 *Cliente:* ${nombre}\n`;
    texto += `📅 *Fecha de entrega:* ${fecha}\n`;
    texto += `📍 *Dirección:* ${direccion}\n\n`;

    if (fotosLista.length > 0) {
        texto += `🖼️ *FOTOS DE REFERENCIA DE LOS PRODUCTOS:*\n`;
        texto += fotosLista.join('\n\n') + '\n\n';
    }

    texto += `──────────────────────────────\n`;
    if (codigoSeguimiento) {
        texto += `🔎 *Código de seguimiento:* ${codigoSeguimiento}\n`;
        texto += `Consulta el estado en: ${URL_SITIO_GITHUB}/#seguimiento-pedidos\n`;
    }
    texto += `_Mensaje generado automáticamente desde ${URL_SITIO_GITHUB}_`;

    const url = `https://wa.me/${NUMERO_WHATSAPP}?text=${encodeURIComponent(texto)}`;
    if (ventanaWhatsapp && !ventanaWhatsapp.closed) {
        ventanaWhatsapp.opener = null;
        ventanaWhatsapp.location.href = url;
    } else {
        window.location.href = url;
    }

    orden = [];
    total = 0;

    if (document.getElementById('cliente-nombre')) {
        document.getElementById('cliente-nombre').value = '';
    }

    if (document.getElementById('cliente-fecha')) {
        document.getElementById('cliente-fecha').value = '';
    }

    if (document.getElementById('cliente-direccion')) {
        document.getElementById('cliente-direccion').value = '';
    }

    actualizarCarrito();
    toggleCarrito();
}



// =========================================================
// ANIMACIONES AL DESPLAZARSE: revelar secciones y productos suavemente
// No oculta contenido si el navegador no soporta IntersectionObserver
// ni si el visitante ha pedido reducir las animaciones.
// =========================================================
function activarAnimacionesAlDesplazarse() {
    const prefiereReducirMovimiento = window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefiereReducirMovimiento || !('IntersectionObserver' in window)) return;

    const selectores = [
        '.zona-portada .carrusel-seccion',
        '.zona-portada .buscador-container',
        '.zona-portada nav',
        '.zona-portada .catalogo-intro',
        '.destacados-section',
        '.ocasiones-section',
        '.cake-tematicas-section',
        '.cake-ofertas-section',
        '.cake-calculadora-section',
        '.cake-seguimiento-section',
        '.cake-entregas-section',
        '#productos-container .producto',
        '.opiniones-section',
        '.galeria-inspiracion-section',
        '.calendario-pedidos-section',
        '.preguntas-section',
        '.redes-sociales',
        'body > footer'
    ];
    const elementos = document.querySelectorAll(selectores.join(','));
    if (!elementos.length) return;

    const observador = new IntersectionObserver((entradas, observer) => {
        entradas.forEach(entrada => {
            if (entrada.isIntersecting) {
                entrada.target.classList.add('visible-scroll');
                observer.unobserve(entrada.target);
            }
        });
    }, {
        threshold: 0.08,
        rootMargin: '0px 0px -28px 0px'
    });

    elementos.forEach((elemento, indice) => {
        elemento.classList.add('revelar-scroll');
        // Un retraso corto produce una entrada escalonada, sin hacer lenta la navegación.
        elemento.style.setProperty('--reveal-delay', `${(indice % 3) * 65}ms`);
        observador.observe(elemento);
    });
}

// Mantiene la barra de categorías visible al bajar y la devuelve a su sitio al volver arriba.
// =========================================================
// MENÚ FIJO: mantener visibles las categorías durante el desplazamiento
// =========================================================
(function activarBarraCategoriasFija() {
    const barra = document.querySelector('.zona-portada nav');
    if (!barra) return;

    const espacio = document.createElement('div');
    espacio.className = 'espacio-barra-categorias';
    espacio.hidden = true;
    barra.parentNode.insertBefore(espacio, barra);

    let puntoFijacion = 0;

    function medirPunto() {
        if (!barra.classList.contains('barra-categorias-fija')) {
            puntoFijacion = barra.getBoundingClientRect().top + window.scrollY;
        }
    }

    function actualizarBarra() {
        const fijar = window.scrollY >= puntoFijacion;
        barra.classList.toggle('barra-categorias-fija', fijar);
        espacio.hidden = !fijar;

        if (fijar) {
            espacio.style.height = `${barra.offsetHeight}px`;
        }
    }

    medirPunto();

    window.addEventListener('scroll', actualizarBarra, { passive: true });
    window.addEventListener('resize', () => {
        medirPunto();
        actualizarBarra();
    });
    window.addEventListener('load', () => {
        medirPunto();
        actualizarBarra();
    });

    document.addEventListener('keydown', event => {
        const modal = document.getElementById('modal-personalizar');

        if (event.key === 'Escape' && modal?.style.display === 'flex') {
            cerrarModalPersonalizar();
        }
    });
})();


// =========================================================
// MEJORAS 9 A 17: NUEVAS FUNCIONES DE CAKE CHAVEZ
// Cada bloque tiene una etiqueta para localizarlo fácilmente en el código.
// =========================================================

// CLIENTE SUPABASE: la clave publicable es visible por diseño; RLS debe proteger los datos.
function obtenerClienteSupabaseCake() {
    try {
        return typeof window.getCakeSupabaseClient === 'function' ? window.getCakeSupabaseClient() : null;
    } catch (error) {
        console.warn('Supabase todavía no está configurado.', error);
        return null;
    }
}

// MEJORA 4 / 12: FAVORITOS — se guardan localmente en este dispositivo.
const CAKE_FAVORITOS_KEY = 'cake-chavez-favoritos-v1';
let cakeSoloFavoritos = false;
function obtenerFavoritosCake() {
    try {
        const datos = JSON.parse(localStorage.getItem(CAKE_FAVORITOS_KEY) || '[]');
        return new Set(Array.isArray(datos) ? datos : []);
    } catch (error) { return new Set(); }
}
function guardarFavoritosCake(favoritos) {
    try { localStorage.setItem(CAKE_FAVORITOS_KEY, JSON.stringify(Array.from(favoritos))); }
    catch (error) { console.warn('No fue posible guardar favoritos en este navegador.'); }
}
function obtenerSlugDeTarjetaCake(tarjeta) {
    if (!tarjeta) return '';
    const titulo = tarjeta.querySelector('h3');
    return tarjeta.dataset.productSlug || crearSlugProducto(titulo ? titulo.textContent : '');
}
function actualizarBotonFavoritoCake(boton, slug) {
    const favorito = obtenerFavoritosCake().has(slug);
    boton.setAttribute('aria-pressed', String(favorito));
    boton.innerHTML = favorito
        ? '<i class="fas fa-heart" aria-hidden="true"></i> Guardado en favoritos'
        : '<i class="far fa-heart" aria-hidden="true"></i> Guardar favorito';
}
function agregarBotonesFavoritosCake() {
    document.querySelectorAll('#productos-container .producto').forEach(tarjeta => {
        const slug = obtenerSlugDeTarjetaCake(tarjeta);
        if (!slug || tarjeta.querySelector('.producto-favorito-btn')) return;
        const boton = document.createElement('button');
        boton.type = 'button';
        boton.className = 'producto-favorito-btn';
        boton.setAttribute('aria-label', `Guardar ${tarjeta.querySelector('h3')?.textContent || 'producto'} en favoritos`);
        actualizarBotonFavoritoCake(boton, slug);
        boton.addEventListener('click', () => {
            const favoritos = obtenerFavoritosCake();
            if (favoritos.has(slug)) favoritos.delete(slug); else favoritos.add(slug);
            guardarFavoritosCake(favoritos);
            actualizarBotonFavoritoCake(boton, slug);
            actualizarContadorFavoritosCake();
            if (cakeSoloFavoritos) mostrarFavoritosCake();
        });
        const imagen = tarjeta.querySelector('.img-producto');
        const precio = tarjeta.querySelector('.precio');
        if (precio) tarjeta.insertBefore(boton, precio);
        else if (imagen) imagen.insertAdjacentElement('afterend', boton);
        else tarjeta.prepend(boton);
    });
    actualizarContadorFavoritosCake();
}
function actualizarContadorFavoritosCake() {
    const contador = document.getElementById('cake-favoritos-contador');
    if (contador) contador.textContent = String(obtenerFavoritosCake().size);
}
function mostrarFavoritosCake() {
    const favoritos = obtenerFavoritosCake();
    const tarjetas = Array.from(document.querySelectorAll('#productos-container .producto'));
    const aviso = document.getElementById('cake-favoritos-aviso');
    const boton = document.getElementById('cake-btn-ver-favoritos');
    cakeSoloFavoritos = true;
    tarjetas.forEach(tarjeta => {
        const slug = obtenerSlugDeTarjetaCake(tarjeta);
        const mostrar = favoritos.has(slug);
        tarjeta.classList.toggle('favorito-oculto', !mostrar);
        tarjeta.classList.toggle('mostrar', mostrar);
    });
    if (boton) boton.setAttribute('aria-pressed', 'true');
    if (aviso) aviso.textContent = favoritos.size
        ? `Mostrando ${favoritos.size} favorito(s) guardado(s) en este dispositivo.`
        : 'Aún no guardaste favoritos. Pulsa el corazón de un producto para añadirlo.';
    const catalogo = document.getElementById('productos-container');
    if (catalogo) catalogo.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function salirModoFavoritosCake() {
    cakeSoloFavoritos = false;
    document.querySelectorAll('#productos-container .producto').forEach(t => t.classList.remove('favorito-oculto'));
    const boton = document.getElementById('cake-btn-ver-favoritos');
    const aviso = document.getElementById('cake-favoritos-aviso');
    if (boton) boton.setAttribute('aria-pressed', 'false');
    if (aviso) aviso.textContent = 'Guarda tus pasteles favoritos con el corazón de cada tarjeta.';
}

// MEJORA 10: CALCULADORA — estimación local basada en el precio publicado.
function extraerDatosPrecioDeTarjetaCake(tarjeta) {
    if (tarjeta && tarjeta.__cakeProduct) {
        const p = tarjeta.__cakeProduct;
        const sizes = [
            { name: 'Pequeño', price: Number(p.price_small) || 0 },
            { name: 'Mediano', price: Number(p.price_medium) || 0 },
            { name: 'Grande', price: Number(p.price_large) || 0 }
        ].filter(x => x.price > 0);
        return {
            slug: p.slug, name: p.name, price: Number(p.price) || (sizes.length ? Math.min(...sizes.map(x => x.price)) : 0),
            hasSizes: Boolean(p.has_sizes), sizes, description: p.description || '', image: p.image_url || ''
        };
    }
    const titulo = tarjeta?.querySelector('h3')?.textContent.trim() || 'Producto';
    const precioTexto = tarjeta?.querySelector('.precio')?.textContent || '';
    const visual = precioTexto.match(/Q\s*([\d,.]+)/i);
    let base = visual ? Number(visual[1].replace(/,/g, '')) : 0;
    const boton = tarjeta?.querySelector('button[onclick*="abrirVentanita"]');
    const onClick = boton?.getAttribute('onclick') || '';
    const args = onClick.match(/abrirVentanita\(\s*(['"])(.*?)\1\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*(['"])(.*?)\6/i);
    const hasSizes = Boolean(args && args[7].toLowerCase() === 'pastel');
    const sizes = args ? [
        { name:'Pequeño', price:Number(args[3]) || 0 },
        { name:'Mediano', price:Number(args[4]) || 0 },
        { name:'Grande', price:Number(args[5]) || 0 }
    ].filter(x => x.price > 0) : [];
    if (!base && sizes.length) base = Math.min(...sizes.map(x => x.price));
    return { slug: obtenerSlugDeTarjetaCake(tarjeta), name: titulo, price: base || (sizes.length ? Math.min(...sizes.map(x => x.price)) : 0), hasSizes, sizes, description: tarjeta?.dataset.productDescription || '', image: tarjeta?.querySelector('.img-producto')?.getAttribute('src') || '' };
}
function rellenarCalculadoraCake() {
    const select = document.getElementById('cake-calculo-producto');
    if (!select) return;
    const seleccionadoPrevio = select.value;
    const tarjetas = Array.from(document.querySelectorAll('#productos-container .producto'));
    select.replaceChildren();
    tarjetas.forEach(tarjeta => {
        const datos = extraerDatosPrecioDeTarjetaCake(tarjeta);
        const op = document.createElement('option');
        op.value = datos.slug;
        op.textContent = `${datos.name} · Desde Q${datos.price.toFixed(2)}`;
        op.dataset.price = String(datos.price);
        op.dataset.hasSizes = String(datos.hasSizes);
        op.dataset.prices = JSON.stringify(datos.sizes);
        select.appendChild(op);
    });
    if (seleccionadoPrevio && Array.from(select.options).some(o => o.value === seleccionadoPrevio)) select.value = seleccionadoPrevio;
    actualizarCalculadoraCake();
}
function actualizarCalculadoraCake() {
    const select = document.getElementById('cake-calculo-producto');
    const selectTamano = document.getElementById('cake-calculo-tamano');
    const wrapTamano = document.getElementById('cake-calculo-tamano-wrap');
    const cantidadInput = document.getElementById('cake-calculo-cantidad');
    const total = document.getElementById('cake-calculo-total');
    const nota = document.getElementById('cake-calculo-nota');
    if (!select || !total) return;
    const option = select.options[select.selectedIndex];
    if (!option) { total.textContent = 'Q0.00'; return; }
    let unit = Number(option.dataset.price) || 0;
    const hasSizes = option.dataset.hasSizes === 'true';
    let sizes = [];
    try { sizes = JSON.parse(option.dataset.prices || '[]'); } catch (error) { sizes = []; }
    // Compatibilidad si una opción antigua guarda solo números.
    sizes = sizes.map((item, idx) => typeof item === 'number' ? ({ name:['Pequeño','Mediano','Grande'][idx] || 'Tamaño', price:item }) : item).filter(item => Number(item.price) > 0);
    if (wrapTamano) wrapTamano.hidden = !hasSizes || sizes.length <= 1;
    if (selectTamano) {
        const oldValue = selectTamano.value;
        selectTamano.replaceChildren();
        if (hasSizes && sizes.length > 1) {
            sizes.forEach(size => {
                const op = document.createElement('option'); op.value = String(size.price); op.textContent = `${size.name || 'Tamaño'} · Q${Number(size.price).toFixed(2)}`; selectTamano.appendChild(op);
            });
            if (Array.from(selectTamano.options).some(o => o.value === oldValue)) selectTamano.value = oldValue;
        }
        if (hasSizes && sizes.length) unit = Number(selectTamano.value) || Number(sizes[0].price);
    }
    let cantidad = Math.max(1, Math.min(99, parseInt(cantidadInput?.value || '1', 10) || 1));
    if (cantidadInput) cantidadInput.value = String(cantidad);
    total.textContent = `Q${(unit * cantidad).toFixed(2)}`;
    if (nota) nota.textContent = unit > 0 ? 'Estimado con los precios visibles; la decoración, disponibilidad y precio final se confirman por WhatsApp.' : 'Este producto no tiene un precio configurado. Escríbenos para cotizarlo.';
}
function consultarEstimadoCake() {
    const select = document.getElementById('cake-calculo-producto');
    const cantidad = document.getElementById('cake-calculo-cantidad')?.value || '1';
    const tamanoSelect = document.getElementById('cake-calculo-tamano');
    const option = select?.options[select.selectedIndex];
    if (!option) return;
    const tamano = tamanoSelect && !document.getElementById('cake-calculo-tamano-wrap')?.hidden ? `, tamaño ${tamanoSelect.options[tamanoSelect.selectedIndex]?.textContent || ''}` : '';
    const texto = `Hola, Cake Chavez. Quisiera consultar el estimado de ${option.textContent.split(' · ')[0]}${tamano}, cantidad ${cantidad}. ¿Me confirman el precio final y disponibilidad?`;
    window.open(`https://wa.me/${NUMERO_WHATSAPP}?text=${encodeURIComponent(texto)}`, '_blank', 'noopener,noreferrer');
}

// MEJORA 9: OFERTAS — las promociones se activan desde el panel de administración.
function crearElementoTextoCake(tag, className, texto) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    el.textContent = texto || '';
    return el;
}
function renderizarOfertasCake(productosRemotos) {
    const grid = document.getElementById('cake-ofertas-grid');
    if (!grid) return;
    grid.replaceChildren();
    const ofertas = (Array.isArray(productosRemotos) ? productosRemotos : []).filter(p => p.is_offer && p.is_active !== false);
    if (!ofertas.length) {
        const mensaje = crearElementoTextoCake('p', 'cake-estado-vacio', 'No hay ofertas activas publicadas en este momento. Escríbenos para consultar promociones vigentes.');
        grid.appendChild(mensaje);
        return;
    }
    ofertas.forEach(p => {
        const card = document.createElement('article'); card.className = 'cake-oferta-card';
        const img = document.createElement('img'); img.src = p.image_url || ''; img.alt = p.name || 'Producto en oferta'; img.loading = 'lazy';
        img.onerror = () => { img.style.display = 'none'; };
        const info = document.createElement('div'); info.className = 'cake-oferta-info';
        info.appendChild(crearElementoTextoCake('span', 'cake-oferta-sello', 'Oferta especial'));
        info.appendChild(crearElementoTextoCake('h3', '', p.name));
        info.appendChild(crearElementoTextoCake('p', '', p.description || 'Consulta los detalles de esta oferta por WhatsApp.'));
        const price = document.createElement('div'); price.className = 'cake-oferta-precio';
        if (Number(p.sale_price) > 0) {
            if (Number(p.price) > Number(p.sale_price)) { const old = document.createElement('del'); old.textContent = `Q${Number(p.price).toFixed(2)}`; price.appendChild(old); }
            price.appendChild(crearElementoTextoCake('strong', '', `Q${Number(p.sale_price).toFixed(2)}`));
        } else {
            price.appendChild(crearElementoTextoCake('strong', '', Number(p.price) > 0 ? `Desde Q${Number(p.price).toFixed(2)}` : 'Consultar precio'));
        }
        const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'destacado-boton'; btn.textContent = 'Ver producto'; btn.addEventListener('click', () => {
            const cardCatalogo = buscarTarjetaPorSlug(p.slug);
            if (cardCatalogo) { filtrar('todos'); window.setTimeout(() => { desplazarseHastaElementoConMenu(cardCatalogo); abrirSoloImagenDesdeTarjeta(cardCatalogo.querySelector('.img-producto')); }, 180); }
        });
        info.append(price, btn); card.append(img, info); grid.appendChild(card);
    });
}

// MEJORA 1: los productos marcados como destacados en administración reemplazan las tarjetas manuales.
function renderizarDestacadosDesdeAdminCake(productosRemotos) {
    if (!Array.isArray(productosRemotos)) return;
    const grid = document.querySelector('.destacados-grid');
    if (!grid) return;
    const destacados = productosRemotos.filter(p => p.is_featured && p.is_active !== false).slice(0, 6);
    // Conserva las tarjetas originales si todavía no se ha marcado ningún producto destacado.
    if (!destacados.length) return;
    grid.replaceChildren();
    destacados.forEach(p => {
        const card = document.createElement('article'); card.className = 'destacado-card';
        const imageWrap = document.createElement('div'); imageWrap.className = 'destacado-imagen-wrap';
        const seal = crearElementoTextoCake('span','destacado-sello','Destacado');
        const img = document.createElement('img'); img.className='destacado-imagen'; img.src=p.image_url||''; img.alt=p.name||'Producto destacado'; img.loading='lazy'; img.onerror=()=>{img.style.display='none';};
        imageWrap.append(seal,img);
        const info = document.createElement('div'); info.className='destacado-info';
        info.appendChild(crearElementoTextoCake('h3','',p.name));
        info.appendChild(crearElementoTextoCake('p','',p.description||'Una idea dulce para tu celebración.'));
        const btn=document.createElement('button');btn.type='button';btn.className='destacado-boton';btn.textContent='Ver en catálogo →';
        btn.addEventListener('click',()=>irAProducto(`producto-${crearSlugProducto(p.slug||p.name)}`));
        info.appendChild(btn);card.append(imageWrap,info);grid.appendChild(card);
    });
}

// MEJORA 13: OPINIONES REALES — solamente las aprobadas desde la administración.
async function cargarOpinionesAprobadasCake(client) {
    const contenedor = document.getElementById('cake-opiniones-publicadas');
    if (!contenedor) return;
    if (!client) {
        contenedor.replaceChildren(crearElementoTextoCake('p', 'cake-estado-vacio', 'Las opiniones de clientes aparecerán aquí cuando se conecte el panel y se publiquen comentarios reales con permiso.'));
        return;
    }
    const { data, error } = await client.from('testimonials').select('id, customer_name, review_text, rating, photo_url').eq('is_published', true).order('created_at', { ascending: false }).limit(12);
    if (error) {
        console.warn('No se pudieron cargar las opiniones publicadas.', error.message);
        return;
    }
    contenedor.replaceChildren();
    if (!data?.length) { contenedor.appendChild(crearElementoTextoCake('p', 'cake-estado-vacio', 'Todavía no hay opiniones aprobadas para mostrar.')); return; }
    data.forEach(review => {
        const card = document.createElement('article'); card.className = 'cake-opinion-card';
        if (review.photo_url) { const img = document.createElement('img'); img.src = review.photo_url; img.alt = `Fotografía compartida por ${review.customer_name || 'un cliente'}`; img.loading = 'lazy'; img.onerror=()=>img.remove(); card.appendChild(img); }
        const puntuacion = Math.max(1, Math.min(5, Number(review.rating) || 5));
        card.appendChild(crearElementoTextoCake('div', 'cake-opinion-estrellas', '★'.repeat(puntuacion) + '☆'.repeat(5 - puntuacion)));
        const quote = document.createElement('blockquote'); quote.textContent = review.review_text || ''; card.appendChild(quote);
        card.appendChild(crearElementoTextoCake('strong', '', review.customer_name || 'Cliente de Cake Chavez'));
        contenedor.appendChild(card);
    });
}

// MEJORA 16: INFORMACIÓN DE ENTREGA — datos editables desde el panel privado.
async function cargarInformacionTiendaCake(client) {
    if (!client) return;
    const { data, error } = await client.from('store_settings').select('delivery_info, payment_info, order_notice').eq('id', 1).maybeSingle();
    if (error || !data) return;
    const entrega = document.getElementById('cake-info-entrega');
    const pagos = document.getElementById('cake-info-pagos');
    const anticipo = document.getElementById('cake-info-anticipacion');
    if (entrega && data.delivery_info) entrega.textContent = data.delivery_info;
    if (pagos && data.payment_info) pagos.textContent = data.payment_info;
    if (anticipo && data.order_notice) anticipo.textContent = data.order_notice;
}

// MEJORA 11: REGISTRO MÍNIMO DEL PEDIDO PARA SEGUIMIENTO; no guarda datos en el navegador público.
window.registrarPedidoCake = async function (datosPedido) {
    const client = obtenerClienteSupabaseCake();
    if (!client) return '';
    const random = (window.crypto?.randomUUID ? crypto.randomUUID().replace(/-/g, '') : `${Date.now()}${Math.random().toString(16).slice(2)}`).toUpperCase();
    const code = `CC-${random.slice(0, 16)}`;
    const payload = {
        name: String(datosPedido.nombre || '').slice(0, 120),
        delivery_date: String(datosPedido.fecha || '').slice(0, 20),
        address: String(datosPedido.direccion || '').slice(0, 500),
        total: Number(datosPedido.total) || 0,
        items: Array.isArray(datosPedido.items) ? datosPedido.items.slice(0, 80).map(i => ({ name: String(i.nombre || '').slice(0, 160), price: Number(i.precio)||0, quantity: Math.max(1, Math.min(99, Number(i.cantidad)||1)), image: String(i.imagen||'').slice(0, 600) })) : []
    };
    const { data, error } = await client.rpc('cake_register_order_with_capacity', { p_order_code: code, p_payload: payload });
    if (error) {
        console.warn('No se pudo registrar el pedido:', error.message);
        if (/FECHA_COMPLETA|límite de pedidos|fecha de entrega/i.test(error.message || '')) {
            alert(error.message.replace('FECHA_COMPLETA: ', ''));
        } else {
            alert('No pudimos confirmar el espacio de esa fecha. No se registró el pedido en el sistema; por favor, consulta por WhatsApp antes de continuar.');
        }
        return '';
    }
    return (Array.isArray(data) ? data[0] : data)?.order_code || code;
};
async function consultarEstadoPedidoCake(event) {
    if (event) event.preventDefault();
    const input = document.getElementById('cake-codigo-seguimiento');
    const resultado = document.getElementById('cake-seguimiento-resultado');
    const client = obtenerClienteSupabaseCake();
    const code = String(input?.value || '').trim().toUpperCase();
    if (!resultado || !code) return;
    if (!client) { resultado.textContent = 'El seguimiento necesita que Cake Chavez configure la conexión segura. Mientras tanto, consulta el estado por WhatsApp.'; return; }
    resultado.textContent = 'Buscando tu pedido…';
    const { data, error } = await client.rpc('lookup_order_status', { p_code: code });
    if (error) { resultado.textContent = 'No fue posible consultar el seguimiento en este momento. Escríbenos por WhatsApp para recibir ayuda.'; return; }
    const registro = Array.isArray(data) ? data[0] : data;
    if (!registro) { resultado.textContent = 'No encontramos un pedido con ese código. Comprueba que lo escribiste correctamente o consúltanos por WhatsApp.'; return; }
    const mapa = { recibido: 'Recibido', en_preparacion: 'En preparación', listo: 'Listo para entrega o recogida', entregado: 'Entregado', cancelado: 'Cancelado' };
    resultado.replaceChildren();
    resultado.appendChild(crearElementoTextoCake('span', 'cake-seguimiento-status', mapa[registro.status] || registro.status || 'Estado actualizado'));
    const fecha = registro.created_at ? new Date(registro.created_at).toLocaleDateString('es-GT', { year:'numeric', month:'long', day:'numeric' }) : '';
    resultado.appendChild(crearElementoTextoCake('p', '', `Pedido ${registro.order_code}${fecha ? ` · registrado el ${fecha}` : ''}. Para cualquier duda, contáctanos por WhatsApp.`));
}

// MEJORA 14: ASISTENTE RÁPIDO — respuestas guiadas y accesos a secciones.
function configurarAsistenteCake() {
    const panel = document.getElementById('cake-asistente-panel');
    const abrir = document.getElementById('cake-asistente-abrir');
    const cerrar = document.getElementById('cake-asistente-cerrar');
    if (!panel || !abrir || !cerrar) return;
    const setOpen = open => { panel.hidden = !open; abrir.setAttribute('aria-expanded', String(open)); };
    abrir.addEventListener('click', () => setOpen(panel.hidden));
    cerrar.addEventListener('click', () => setOpen(false));
    panel.querySelectorAll('[data-assistant-action]').forEach(button => button.addEventListener('click', () => {
        const action = button.dataset.assistantAction;
        setOpen(false);
        if (action === 'catalogo') { filtrar('pasteles'); return; }
        if (action === 'ofertas') { document.getElementById('ofertas-especiales')?.scrollIntoView({ behavior:'smooth' }); return; }
        if (action === 'personalizar') { abrirModalPersonalizar(); return; }
        if (action === 'entrega') { document.getElementById('informacion-entregas')?.scrollIntoView({ behavior:'smooth' }); return; }
        if (action === 'whatsapp') { contactarPorWhatsApp(); }
    }));
}

// MEJORA 17: SINCRONIZACIÓN DEL CATÁLOGO CON LA BASE DE DATOS ADMINISTRABLE.
// Si no hay URL/clave o no existe conexión, el catálogo original continúa funcionando.
function construirTarjetaRemotaCake(producto) {
    const categoriasValidas = ['pasteles','postres','galletas','bocaditos','especiales'];
    const categoria = categoriasValidas.includes(producto.category) ? producto.category : 'especiales';
    const slug = crearSlugProducto(producto.slug || producto.name);
    const card = document.createElement('article');
    card.className = `producto ${categoria} todos`;
    card.id = `producto-${slug}`;
    card.dataset.productSlug = slug;
    card.dataset.productDescription = producto.description || '';
    card.dataset.productGallery = JSON.stringify([producto.image_url, ...(Array.isArray(producto.gallery_urls) ? producto.gallery_urls : [])].filter(Boolean));
    card.__cakeProduct = { ...producto, slug, category: categoria };
    if (producto.is_featured) card.appendChild(crearElementoTextoCake('span','producto-etiqueta','Destacado'));
    const img = document.createElement('img'); img.className='img-producto'; img.src=producto.image_url || ''; img.alt=producto.name || 'Producto Cake Chavez'; img.loading='lazy';
    img.addEventListener('click',()=>abrirSoloImagenDesdeTarjeta(img)); img.onerror=()=>{ img.alt='Imagen no disponible'; };
    const h3=crearElementoTextoCake('h3','',producto.name || 'Producto');
    const desc=crearElementoTextoCake('p','',producto.description || 'Consulta los detalles de este producto.');
    const sizePrices=[producto.price_small,producto.price_medium,producto.price_large].map(v=>Number(v)||0).filter(v=>v>0);
    const unitPrice=(producto.has_sizes && sizePrices.length ? Math.min(...sizePrices) : Number(producto.price)||0);
    const salePrice=Number(producto.sale_price)||0;
    const price=crearElementoTextoCake('span','precio', salePrice>0 && salePrice<unitPrice ? `Oferta Q${salePrice.toFixed(2)}` : (producto.has_sizes ? `Desde Q${unitPrice.toFixed(2)}` : `Q${unitPrice.toFixed(2)}`));
    const orderButton=document.createElement('button'); orderButton.type='button'; orderButton.dataset.orderButton='true'; orderButton.textContent='Añadir a la orden';
    orderButton.addEventListener('click',()=>{
        const small=Number(producto.price_small)||0, medium=Number(producto.price_medium)||0, large=Number(producto.price_large)||0;
        abrirVentanita(producto.name, producto.has_sizes ? small : unitPrice, producto.has_sizes ? medium : 0, producto.has_sizes ? large : 0, producto.has_sizes ? 'pastel':'unidad', producto.image_url, producto.description || '');
    });
    card.append(img,h3,desc,price,orderButton);
    return card;
}
async function sincronizarCatalogoAdminCake() {
    const client = obtenerClienteSupabaseCake();
    if (!client) return null;
    const { data, error } = await client.from('products').select('*').eq('is_active', true).order('display_order', { ascending:true }).order('created_at',{ascending:true});
    if (error) { console.warn('Se mantiene el catálogo local porque no se pudo consultar la base de datos:', error.message); return null; }
    if (!Array.isArray(data)) return null;
    const contenedor=document.getElementById('productos-container');
    if (!contenedor) return null;
    contenedor.replaceChildren();
    const fragment=document.createDocumentFragment();
    data.forEach(p=>fragment.appendChild(construirTarjetaRemotaCake(p)));
    contenedor.appendChild(fragment);
    window.CAKE_PRODUCTOS_REMOTOS = data;
    configurarEnlacesDirectosProductos();
    filtrar('todos');
    return data;
}

// MEJORA 15: TEMÁTICAS — la selección se incorpora al personalizador sin prometer un diseño fijo.
function configurarTematicasCake() {
    document.querySelectorAll('[data-cake-theme]').forEach(button => button.addEventListener('click', () => {
        const theme = button.dataset.cakeTheme || '';
        const campo = document.getElementById('colores-personalizar');
        const detalles = document.getElementById('detalles-personalizar');
        if (campo && !campo.value.trim()) campo.value = theme;
        else if (campo && !campo.value.includes(theme)) campo.value += `, ${theme}`;
        if (detalles && !detalles.value.trim()) detalles.value = `Me gustaría un pastel con temática ${theme.toLowerCase()}.`;
        abrirModalPersonalizar();
    }));
}

// INICIALIZACIÓN DE LAS MEJORAS: corre después de los scripts actuales del catálogo.
document.addEventListener('DOMContentLoaded', async () => {
    const client = obtenerClienteSupabaseCake();
    document.getElementById('cake-btn-ver-favoritos')?.addEventListener('click', () => {
        if (cakeSoloFavoritos) { salirModoFavoritosCake(); filtrar('todos'); }
        else mostrarFavoritosCake();
    });
    document.getElementById('cake-calculo-producto')?.addEventListener('change', actualizarCalculadoraCake);
    document.getElementById('cake-calculo-tamano')?.addEventListener('change', actualizarCalculadoraCake);
    document.getElementById('cake-calculo-cantidad')?.addEventListener('input', actualizarCalculadoraCake);
    document.getElementById('cake-calculo-consultar')?.addEventListener('click', consultarEstimadoCake);
    document.getElementById('cake-seguimiento-form')?.addEventListener('submit', consultarEstadoPedidoCake);
    configurarAsistenteCake();
    configurarTematicasCake();

    const productosRemotos = await sincronizarCatalogoAdminCake();
    // Después de la posible sincronización, regeneramos elementos derivados del catálogo.
    configurarEnlacesDirectosProductos();
    agregarEtiquetasTarjetasCatalogo();
    agregarBotonesFavoritosCake();
    generarCarruselAutomatico();
    generarGaleriaInspiracion();
    rellenarCalculadoraCake();
    renderizarOfertasCake(productosRemotos || []);
    renderizarDestacadosDesdeAdminCake(productosRemotos);
    await Promise.all([cargarOpinionesAprobadasCake(client), cargarInformacionTiendaCake(client)]);
    activarAnimacionesAlDesplazarse();
    manejarEnlaceDirectoProducto();
});

// FIN DE MEJORAS 9 A 17. Comentarios descriptivos para facilitar futuras modificaciones.
