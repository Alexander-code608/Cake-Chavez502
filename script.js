// Contexto de audio global
let audioCtx = null;

// NUMERO DE WHATSAPP REAL CONFIGURADO
const NUMERO_WHATSAPP = "50231253629";

// SONIDO DE GOTA DE AGUA SUAVE
function reproducirSonidoGotita() {
    try {
        if (!audioCtx) {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (AudioContextClass) {
                audioCtx = new AudioContextClass();
            }
        }
        if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume();
        }

        if (!audioCtx) return;

        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc.type = 'sine';
        const ahora = audioCtx.currentTime;

        // Tono suave estilo gota natural
        osc.frequency.setValueAtTime(520, ahora);
        osc.frequency.exponentialRampToValueAtTime(1100, ahora + 0.07);

        gain.gain.setValueAtTime(0.18, ahora);
        gain.gain.exponentialRampToValueAtTime(0.001, ahora + 0.08);

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.start(ahora);
        osc.stop(ahora + 0.08);
    } catch (e) {
        // Silencioso si hay restricciones
    }
}

document.addEventListener("DOMContentLoaded", () => {
    filtrar('todos');
    generarCarruselAutomatico();
});

// ==========================================
// CÓDIGO DEL CARRUSEL AUTOMÁTICO (DETECTA TODAS LAS IMÁGENES)
// ==========================================
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

            // Crear Slide
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

            // Crear Punto indicador
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

    if (indice >= slides.length) {
        indiceSlideActual = 0;
    } else if (indice < 0) {
        indiceSlideActual = slides.length - 1;
    } else {
        indiceSlideActual = indice;
    }

    slides.forEach((slide, i) => {
        slide.classList.remove('active');
        if (puntos[i]) puntos[i].classList.remove('active');
    });

    slides[indiceSlideActual].classList.add('active');
    if (puntos[indiceSlideActual]) {
        puntos[indiceSlideActual].classList.add('active');
    }
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
    }, 5000); // Cambia automáticamente cada 5 segundos
}

function reiniciarTemporizadorCarrusel() {
    clearInterval(intervaloCarrusel);
    iniciarCarruselAutomatico();
}

// ==========================================
// GALERÍA DE IMÁGENES DEL MISMO PRODUCTO (OPCIÓN 2)
// ==========================================
let imagenesGaleriaActual = [];
let indiceImagenActual = 0;

function abrirSoloImagen(imagenes, titulo, descripcion) {
    reproducirSonidoGotita();
    const modalSolo = document.getElementById('modal-solo-imagen');
    const imgElement = document.getElementById('solo-img-src');
    const tituloElement = document.getElementById('solo-img-titulo');
    const descElement = document.getElementById('solo-img-descripcion');
    const indContainer = document.getElementById('galeria-indicadores');
    const btnPrev = document.getElementById('btn-galeria-prev');
    const btnNext = document.getElementById('btn-galeria-next');

    if (Array.isArray(imagenes)) {
        imagenesGaleriaActual = imagenes;
    } else {
        imagenesGaleriaActual = [imagenes];
    }

    indiceImagenActual = 0;

    if (imgElement) imgElement.src = imagenesGaleriaActual[0];
    if (tituloElement) tituloElement.innerText = titulo;
    if (descElement) descElement.innerText = descripcion;

    if (imagenesGaleriaActual.length > 1) {
        if (btnPrev) btnPrev.style.display = 'block';
        if (btnNext) btnNext.style.display = 'block';
        
        if (indContainer) {
            indContainer.innerHTML = '';
            imagenesGaleriaActual.forEach((_, idx) => {
                const dot = document.createElement('span');
                dot.className = `dot-galeria ${idx === 0 ? 'active' : ''}`;
                indContainer.appendChild(dot);
            });
        }
    } else {
        if (btnPrev) btnPrev.style.display = 'none';
        if (btnNext) btnNext.style.display = 'none';
        if (indContainer) indContainer.innerHTML = '';
    }

    if (modalSolo) modalSolo.style.display = 'flex';
}

function deslizarGaleria(direccion) {
    if (imagenesGaleriaActual.length <= 1) return;
    
    reproducirSonidoGotita();
    indiceImagenActual += direccion;
    
    if (indiceImagenActual >= imagenesGaleriaActual.length) indiceImagenActual = 0;
    if (indiceImagenActual < 0) indiceImagenActual = imagenesGaleriaActual.length - 1;

    const imgElement = document.getElementById('solo-img-src');
    if (imgElement) {
        imgElement.style.opacity = '0.3';
        setTimeout(() => {
            imgElement.src = imagenesGaleriaActual[indiceImagenActual];
            imgElement.style.opacity = '1';
        }, 120);
    }

    const dots = document.querySelectorAll('.dot-galeria');
    dots.forEach((dot, idx) => {
        if (idx === indiceImagenActual) {
            dot.classList.add('active');
        } else {
            dot.classList.remove('active');
        }
    });
}

function cerrarSoloImagen() {
    reproducirSonidoGotita();
    const modalSolo = document.getElementById('modal-solo-imagen');
    if (modalSolo) modalSolo.style.display = 'none';
}

// FUNCIÓN PARA LA BARRA DE BÚSQUEDA
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

// FUNCIÓN PARA FILTRAR CATEGORÍAS
function filtrar(categoria, elemento) {
    const inputBusqueda = document.getElementById('input-busqueda');
    if (inputBusqueda) inputBusqueda.value = '';

    const botones = document.querySelectorAll('.nav-btn');
    botones.forEach(btn => btn.classList.remove('active'));
    
    if (elemento && elemento.classList) {
        elemento.classList.add('active');
        reproducirSonidoGotita();
    } else {
        const btnCategoria = document.querySelector(`.nav-btn[onclick*="${categoria}"]`);
        if (btnCategoria) btnCategoria.classList.add('active');
    }

    const productos = document.querySelectorAll('.producto');
    productos.forEach(prod => {
        if (categoria === 'todos' || prod.classList.contains(categoria)) {
            prod.classList.add('mostrar');
        } else {
            prod.classList.remove('mostrar');
        }
    });
}

// Variables del Carrito
let orden = [];
let total = 0;

// Variable temporal para la ventanita emergente de compra
let productoTemporal = {};

// Mostrar / Ocultar el panel del carrito
function toggleCarrito() {
    const panelLateral = document.getElementById('carrito-lateral');
    const overlay = document.getElementById('overlay');
    if (panelLateral) panelLateral.classList.toggle('abierto');
    if (overlay) overlay.classList.toggle('mostrar');
}

// ==========================================
// VENTANITA EMERGENTE (MODAL DE COMPRA)
// ==========================================
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

    if (typeof arg3 === 'number') {
        productoTemporal = {
            nombre: nombre,
            pequeno: arg2,
            mediano: arg3,
            grande: arg4,
            tipo: 'pastel'
        };
        imagen = arg6 || '';
        descripcion = arg7 || '';

        if (divTamano) divTamano.style.display = 'block';

        let pPequeno = productoTemporal.pequeno.toFixed(2);
        let pMediano = productoTemporal.mediano.toFixed(2);
        let pGrande = productoTemporal.grande.toFixed(2);

        if (selectTamano) {
            selectTamano.innerHTML = `
                <option value="Pequeño" data-precio="${pPequeno}">Pequeño - Q${pPequeno}</option>
                <option value="Mediano" data-precio="${pMediano}" selected>Mediano - Q${pMediano}</option>
                <option value="Grande" data-precio="${pGrande}">Grande - Q${pGrande}</option>
            `;
        }
    } else {
        productoTemporal = {
            nombre: nombre,
            precioBase: arg2,
            tipo: 'unidad'
        };
        imagen = arg4 || '';
        descripcion = arg5 || '';

        if (divTamano) divTamano.style.display = 'none';
    }
    
    if (modalImg) {
        modalImg.src = imagen;
        modalImg.alt = nombre;
    }
    if (modalDesc) {
        modalDesc.innerText = descripcion;
    }

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
    
    let subtotal = precioUnitario * cantidad;
    
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
        let tamanoNombre = selectTamano ? selectTamano.value : 'Mediano';

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

// ==========================================
// VENTANITA EMERGENTE (PERSONALIZAR PASTEL - OPCIÓN 1)
// ==========================================
function abrirModalPersonalizar() {
    reproducirSonidoGotita();
    const modal = document.getElementById('modal-personalizar');
    if (modal) modal.style.display = 'flex';
}

function cerrarModalPersonalizar() {
    reproducirSonidoGotita();
    const modal = document.getElementById('modal-personalizar');
    if (modal) modal.style.display = 'none';
}

function previsualizarImagenCustom(event) {
    const file = event.target.files[0];
    const previewContainer = document.getElementById('preview-custom-container');
    const previewImg = document.getElementById('preview-custom-img');

    if (file && previewImg && previewContainer) {
        const reader = new FileReader();
        reader.onload = function(e) {
            previewImg.src = e.target.result;
            previewContainer.style.display = 'block';
        }
        reader.readAsDataURL(file);
    } else if (previewContainer) {
        previewContainer.style.display = 'none';
    }
}

function enviarPedidoPersonalizadoWhatsApp() {
    reproducirSonidoGotita();
    
    const descripcion = document.getElementById('custom-descripcion').value.trim();
    const fecha = document.getElementById('custom-fecha').value;
    const nombre = document.getElementById('custom-nombre').value.trim();
    const telefono = document.getElementById('custom-telefono').value.trim();
    const fileInput = document.getElementById('custom-imagen');

    if (descripcion === "" || fecha === "" || nombre === "") {
        alert("Por favor llena la descripción, tu nombre y la fecha deseada para procesar tu cotización.");
        return;
    }

    let texto = `🎂 *COTIZACIÓN DE PASTEL PERSONALIZADO* 🎂\n`;
    texto += `──────────────────────────────\n\n`;
    texto += `👤 *Cliente:* ${nombre}\n`;
    if (telefono !== "") texto += `📞 *Teléfono:* ${telefono}\n`;
    texto += `📅 *Fecha requerida:* ${fecha}\n\n`;
    texto += `📝 *Detalles del diseño deseado:*\n${descripcion}\n\n`;
    
    if (fileInput && fileInput.files.length > 0) {
        texto += `📷 *(Adjunto/Enviaré la foto de referencia guardada desde mi dispositivo)*\n\n`;
    }

    texto += `──────────────────────────────\n`;
    texto += `_Mensaje enviado desde cakechavez.netlify.app_`;

    const url = `https://wa.me/${NUMERO_WHATSAPP}?text=${encodeURIComponent(texto)}`;
    window.open(url, '_blank');

    document.getElementById('custom-descripcion').value = '';
    document.getElementById('custom-fecha').value = '';
    document.getElementById('custom-nombre').value = '';
    document.getElementById('custom-telefono').value = '';
    if (fileInput) fileInput.value = '';
    const prev = document.getElementById('preview-custom-container');
    if (prev) prev.style.display = 'none';
    cerrarModalPersonalizar();
}

// ==========================================
// ELIMINAR UN PRODUCTO DEL CARRITO
// ==========================================
function eliminarItem(index) {
    reproducirSonidoGotita();
    if (orden[index]) {
        total -= (orden[index].precio * orden[index].cantidad);
        orden.splice(index, 1);
        actualizarCarrito();
    }
}

// Actualizar la lista en pantalla
function actualizarCarrito() {
    const lista = document.getElementById('lista-orden');
    const totalPrecio = document.getElementById('total-precio');
    const datosCliente = document.getElementById('datos-cliente');
    const contadorBurbuja = document.getElementById('contador-carrito');
    
    if (!lista) return;

    lista.innerHTML = ''; 
    let cantidadTotalArticulos = 0;

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

    if (totalPrecio) totalPrecio.innerText = total.toFixed(2);
}

// ==========================================
// ENVIAR LA ORDEN POR WHATSAPP (OPCIÓN 1)
// ==========================================
function confirmarOrden() {
    reproducirSonidoGotita();
    if (orden.length === 0) {
        alert("Por favor, agrega productos a tu orden primero.");
        return;
    }

    const nombreInput = document.getElementById('cliente-nombre');
    const telefonoInput = document.getElementById('cliente-telefono');
    const fechaInput = document.getElementById('cliente-fecha');
    const direccionInput = document.getElementById('cliente-direccion');

    const nombre = nombreInput ? nombreInput.value.trim() : '';
    const telefono = telefonoInput ? telefonoInput.value.trim() : '';
    const fecha = fechaInput ? fechaInput.value : '';
    const direccion = direccionInput ? direccionInput.value.trim() : '';

    if (nombre === "" || telefono === "" || fecha === "" || direccion === "") {
        alert("Por favor, llena tus datos completos (incluyendo la fecha de entrega) para procesar el envío.");
        return;
    }

    let texto = `🎂 *NUEVO PEDIDO DE CAKE CHAVEZ* 🎂\n`;
    texto += `──────────────────────────────\n\n`;
    texto += `🛒 *DETALLE DE LA ORDEN:*\n`;
    
    let fotosLista = [];

    orden.forEach(item => {
        texto += `• ${item.cantidad}x ${item.nombre} — Q${(item.precio * item.cantidad).toFixed(2)}\n`;
        if (item.imagen && item.imagen !== '') {
            let urlCompleta = item.imagen.startsWith('http') ? item.imagen : `https://cakechavez.netlify.app/${item.imagen}`;
            fotosLista.push(`• ${item.nombre}:\n${urlCompleta}`);
        }
    });

    texto += `\n💰 *TOTAL A PAGAR: Q${total.toFixed(2)}*\n`;
    texto += `──────────────────────────────\n\n`;
    texto += `📦 *DATOS DE ENTREGA:*\n`;
    texto += `👤 *Cliente:* ${nombre}\n`;
    texto += `📞 *Teléfono:* ${telefono}\n`;
    texto += `📅 *Fecha de entrega:* ${fecha}\n`;
    texto += `📍 *Dirección:* ${direccion}\n\n`;

    if (fotosLista.length > 0) {
        texto += `🖼️ *FOTOS DE REFERENCIA DE LOS PRODUCTOS:*\n`;
        texto += fotosLista.join('\n\n') + `\n\n`;
    }

    texto += `──────────────────────────────\n`;
    texto += `_Mensaje generado automáticamente desde cakechavez.netlify.app_`;

    const url = `https://wa.me/${NUMERO_WHATSAPP}?text=${encodeURIComponent(texto)}`;
    window.open(url, '_blank');

    orden = [];
    total = 0;
    if (nombreInput) nombreInput.value = '';
    if (telefonoInput) telefonoInput.value = '';
    if (fechaInput) fechaInput.value = '';
    if (direccionInput) direccionInput.value = '';
    actualizarCarrito();
    toggleCarrito();
}