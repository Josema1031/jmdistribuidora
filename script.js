// Firebase SDKs
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyA36uwBk0FBDc6rI16BAsqUNe_AXLpv62Q",
  authDomain: "carniceriadonjose-48638.firebaseapp.com",
  projectId: "carniceriadonjose-48638",
  storageBucket: "carniceriadonjose-48638.firebasestorage.app",
  messagingSenderId: "322531750471",
  appId: "1:322531750471:web:78e290c9c81eecc7be3762"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const tiendaId = "JM DISTRIBUCIONES";
const productosRef = collection(db, "tiendas", tiendaId, "productos");

// Limpiar carrito al iniciar la página
localStorage.removeItem("carrito");

// Variables globales
let carrito = JSON.parse(localStorage.getItem("carrito")) || [];
let productosCargados = [];
let productosMostrados = 0;
const cantidadPorCarga = 8;

// Cargar productos desde Firebase
async function cargarProductos() {
  document.getElementById("loader").style.display = "block";
  try {
    const snapshot = await getDocs(productosRef);
    productosCargados = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));

    mostrarProductos(productosCargados);
  } catch (error) {
    console.error("Error cargando productos:", error);
  } finally {
    document.getElementById("loader").style.display = "none";
  }
}

// Buscar productos en tiempo real
document.getElementById("buscador").addEventListener("input", e => {
  const texto = e.target.value.toLowerCase();
  const filtrados = productosCargados.filter(p => p.nombre.toLowerCase().includes(texto));
  mostrarProductos(filtrados);
});

// Guardar carrito
function guardarCarrito() {
  localStorage.setItem("carrito", JSON.stringify(carrito));
}

// Mostrar carrito
function mostrarCarrito() {
  const lista = document.getElementById("lista-carrito");
  lista.innerHTML = "";

  carrito.forEach((prod, index) => {
    const subtotal = prod.precio * prod.cantidad;
    const tipo = prod.cantidad >= prod.unidadesPack ? "Mayorista" : "Unitario";

    const li = document.createElement("li");
    li.innerHTML = `${prod.nombre} (${tipo}) - $${prod.precio} x ${prod.cantidad} = <strong>$${subtotal}</strong><br>`;

    const btnMenos = document.createElement("button");
    btnMenos.textContent = "➖";
    btnMenos.addEventListener("click", (e) => {
      e.stopPropagation();
      disminuirCantidad(index);
    });

    const btnMas = document.createElement("button");
    btnMas.textContent = "➕";
    btnMas.addEventListener("click", (e) => {
      e.stopPropagation();
      aumentarCantidad(index);
    });

    const btnEliminar = document.createElement("button");
    btnEliminar.textContent = "❌";
    btnEliminar.addEventListener("click", (e) => {
      e.stopPropagation();
      eliminarDelCarrito(index);
    });

    li.appendChild(btnMenos);
    li.appendChild(btnMas);
    li.appendChild(btnEliminar);
    lista.appendChild(li);
  });

  const total = carrito.reduce((acc, p) => acc + p.precio * p.cantidad, 0);
  document.getElementById("total").textContent = `Total: $${total}`;
}

// Actualizar carrito (guardar + mostrar)
function actualizarCarrito() {
  guardarCarrito();
  mostrarCarrito();
}

// Agregar producto
function agregarAlCarrito(id, nombre, precioBase) {
  const producto = productosCargados.find(p => p.id === id);
  if (!producto) return;

  const index = carrito.findIndex(p => p.id === id);

  if (index !== -1) {
    carrito[index].cantidad += 1;
  } else {
    const precioInicial = producto.precioUnitario || producto.precio || precioBase;
    carrito.push({ 
      id, 
      nombre, 
      cantidad: 1, 
      precio: precioInicial,
      precioUnitario: producto.precioUnitario || producto.precio,
      precioMayorista: producto.precioMayorista || producto.precio,
      unidadesPack: producto.unidadesPack || 6
    });
  }

  actualizarPreciosPorCantidad();
  actualizarCarrito();
}

// Actualizar precio según cantidad
function actualizarPreciosPorCantidad() {
  carrito = carrito.map(p => {
    const umbral = p.unidadesPack || 6;
    const nuevoPrecio = (p.cantidad >= umbral) ? p.precioMayorista : p.precioUnitario;
    return { ...p, precio: nuevoPrecio };
  });
}

// Aumentar cantidad
function aumentarCantidad(index) {
  carrito[index].cantidad += 1;
  actualizarPreciosPorCantidad();
  actualizarCarrito();
}

// Disminuir cantidad
function disminuirCantidad(index) {
  if (carrito[index].cantidad > 1) {
    carrito[index].cantidad -= 1;
  } else {
    carrito.splice(index, 1);
  }
  actualizarPreciosPorCantidad();
  actualizarCarrito();
}

// Eliminar producto
function eliminarDelCarrito(index) {
  carrito.splice(index, 1);
  actualizarCarrito();
}

// Vaciar carrito
document.getElementById("btn-vaciar").addEventListener("click", () => {
  if (confirm("¿Estás seguro que querés vaciar el carrito?")) {
    carrito = [];
    actualizarCarrito();
  }
});

// Enviar pedido por WhatsApp
document.getElementById("btn-enviar").addEventListener("click", () => {
  if (carrito.length === 0) {
    alert("El carrito está vacío");
    return;
  }

  const mensajeProductos = carrito.map((p, i) => `${i + 1}. ${p.nombre} - $${p.precio} x ${p.cantidad}`).join("\n");
  const total = carrito.reduce((acc, p) => acc + p.precio * p.cantidad, 0);
  const mensajeCompleto = `${mensajeProductos}\n\nTotal del pedido: $${total}`;

  const url = `https://wa.me/5493444579137?text=Hola, quiero hacer el siguiente pedido:%0A${encodeURIComponent(mensajeCompleto)}`;
  window.open(url, "_blank");

  carrito = [];
  actualizarCarrito();
  window.location.href = "gracias.html";
});

// Mostrar productos
function mostrarProductos(lista) {
  const contenedor = document.getElementById("contenedor-productos");
  contenedor.innerHTML = "";
  productosMostrados = 0;
  cargarMasProductos(lista);

  const btn = document.getElementById("btn-mostrar-mas");
  if (lista.length > cantidadPorCarga) {
    btn.style.display = "inline-block";
    btn.onclick = () => cargarMasProductos(lista);
  } else {
    btn.style.display = "none";
  }
}

function cargarMasProductos(lista) {
  const contenedor = document.getElementById("contenedor-productos");
  const fin = productosMostrados + cantidadPorCarga;
  const fragmento = lista.slice(productosMostrados, fin);

  fragmento.forEach(prod => {
    if (!prod.id || !prod.nombre || !prod.precio) return;

    const div = document.createElement("div");
    div.className = "card";
    let descuento = prod.descuento;
    if (!descuento && prod.precioAnterior && prod.precioAnterior > prod.precio) {
      descuento = Math.round(100 - (prod.precio * 100) / prod.precioAnterior);
    }

    div.innerHTML = `
      <div class="card-contenido">
        ${descuento ? `<span class="etiqueta-descuento">-${descuento}%</span>` : ""}
        <img src="${prod.imagen}" alt="${prod.nombre}" style="cursor: pointer;" onclick="abrirModal('${prod.id}')">
        <h3>${prod.nombre}</h3>
        <p>${prod.tipoVenta}</p>
        ${prod.precioUnitario ? `<p><strong>Precio Unitario:</strong> $${prod.precioUnitario}</p>` : ""}
        ${prod.precioMayorista ? `<p><strong>Precio Mayorista:</strong> $${prod.precioMayorista}</p>` : ""}
        ${prod.unidadesPack ? `<p><strong>Unidades por pack:</strong> ${prod.unidadesPack}</p>` : ""}
        <p class="precio">
          ${prod.precioAnterior && prod.precioAnterior > prod.precio ? `<span class="precio-anterior">$${prod.precioAnterior}</span>` : ""}
          <span class="precio-actual">$${prod.precio}</span>
        </p>
        <button onclick="agregarAlCarrito('${prod.id}', '${prod.nombre.replaceAll("'", "\\'")}', ${prod.precio})">Agregar</button>
      </div>
    `;

    contenedor.appendChild(div);
  });

  productosMostrados += fragmento.length;

  const btn = document.getElementById("btn-mostrar-mas");
  if (productosMostrados >= lista.length) {
    btn.style.display = "none";
  }
}

// Modal
function abrirModal(id) {
  const producto = productosCargados.find(p => p.id === id);
  if (!producto) return;

  document.getElementById("modal-imagen").src = producto.imagen;
  document.getElementById("modal-nombre").textContent = producto.nombre;
  document.getElementById("modal-precio").textContent = "$" + producto.precio;
  document.getElementById("modal-descripcion").textContent = producto.descripcion || "";
  document.getElementById("modal-producto").classList.remove("oculto");

  document.getElementById("modal-agregar").onclick = () => {
    agregarAlCarrito(producto.id, producto.nombre, producto.precio);
    cerrarModal();
  };
}

function cerrarModal() {
  document.getElementById("modal-producto").classList.add("oculto");
}

// Carrito flotante toggle
document.getElementById("toggle-carrito").addEventListener("click", () => {
  document.getElementById("carrito-contenido").classList.toggle("oculto");
});

// Cerrar carrito al hacer clic fuera
document.addEventListener("click", function (event) {
  const carritoContenido = document.getElementById("carrito-contenido");

  if (
    !carritoContenido.classList.contains("oculto") &&
    !carritoContenido.contains(event.target) &&
    event.target.id !== "toggle-carrito"
  ) {
    carritoContenido.classList.add("oculto");
  }
});

// Filtro por categoría
function filtrarCategoria(categoria) {
  if (categoria === 'todo') {
    mostrarProductos(productosCargados);
  } else {
    const filtrados = productosCargados.filter(p => p.categoria === categoria);
    mostrarProductos(filtrados);
  }
}
window.filtrarCategoria = filtrarCategoria;

// Exponer funciones globales
window.agregarAlCarrito = agregarAlCarrito;
window.abrirModal = abrirModal;
window.cerrarModal = cerrarModal;

// Sincronizar si cambia en otra pestaña
window.addEventListener("storage", e => {
  if (e.key === "productosActualizados") {
    cargarProductos();
  }
});

// Inicialización
cargarProductos();
mostrarCarrito();
