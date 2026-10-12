// ==========================================
// CONFIGURACIÓN DE SUPABASE
// ==========================================
const SUPABASE_URL = 'https://uwhdgciobraeyqfcahhb.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_veZjv_oyTwnyIefPfTj_RA_otSyvmaV'; 

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let vistaMenuPrincipal = '';
let pedidoIdActual = null; 

// Inicialización al cargar la página
window.addEventListener('DOMContentLoaded', () => {
  const content = document.getElementById('app-content');
  if (content) {
    vistaMenuPrincipal = content.innerHTML;
  }
  crearEstructuraModal();
  cargarEstadosVendedoresHoy();
  console.log("Interfaz de La Confianza S.A. optimizada y lista.");
});

// ==========================================
// SISTEMA DE DIÁLOGOS Y MODALES ELEGANTES
// ==========================================

function crearEstructuraModal() {
  if (document.getElementById('custom-modal')) return;

  const modalHTML = `
    <div id="custom-modal" class="modal-overlay">
      <div class="modal-box">
        <div id="modal-title" class="modal-title">Confirmación</div>
        <div id="modal-body" class="modal-body">¿Está seguro de realizar esta acción?</div>
        <div class="modal-actions">
          <button id="modal-btn-cancel" class="btn-modal btn-modal-cancel">Cancelar</button>
          <button id="modal-btn-confirm" class="btn-modal btn-modal-confirm">Aceptar</button>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function mostrarConfirmacionModal({ titulo, mensaje, tipo = 'primary', textoConfirmar = 'Aceptar' }) {
  return new Promise((resolve) => {
    const modal = document.getElementById('custom-modal');
    const elTitulo = document.getElementById('modal-title');
    const elMensaje = document.getElementById('modal-body');
    const btnConfirm = document.getElementById('modal-btn-confirm');
    const btnCancel = document.getElementById('modal-btn-cancel');

    elTitulo.innerText = titulo;
    elMensaje.innerText = mensaje;
    btnConfirm.innerText = textoConfirmar;

    btnConfirm.className = 'btn-modal ' + (tipo === 'danger' ? 'btn-modal-danger' : 'btn-modal-confirm');
    modal.classList.add('active');

    const handleConfirm = () => {
      cerrarModal();
      cleanup();
      resolve(true);
    };

    const handleCancel = () => {
      cerrarModal();
      cleanup();
      resolve(false);
    };

    const cleanup = () => {
      btnConfirm.removeEventListener('click', handleConfirm);
      btnCancel.removeEventListener('click', handleCancel);
    };

    btnConfirm.addEventListener('click', handleConfirm);
    btnCancel.addEventListener('click', handleCancel);
  });
}

function cerrarModal() {
  const modal = document.getElementById('custom-modal');
  if (modal) modal.classList.remove('active');
}

// ==========================================
// COLORES Y ESTADOS DE VENDEDORES EN INDEX
// ==========================================

function actualizarColorVendedorVisual(nombreVendedor, estado) {
  const botones = document.querySelectorAll('.btn-vendedor, .btn-circulo');
  
  botones.forEach(boton => {
    const textoBoton = boton.textContent.trim().toUpperCase();
    const vendedorBuscado = nombreVendedor.trim().toUpperCase();

    if (textoBoton === vendedorBuscado) {
      boton.classList.remove('guardado', 'liquidado');
      const estadoLower = String(estado).toLowerCase();

      if (estadoLower.includes('guardado') || estadoLower.includes('pedido') || estadoLower.includes('despachado')) {
        boton.classList.add('guardado'); 
      } else if (estadoLower.includes('liquidado')) {
        boton.classList.add('liquidado'); 
      }
    }
  });
}

async function cargarEstadosVendedoresHoy() {
  try {
    if (typeof supabaseClient === 'undefined') return;

    const hoy = new Date().toISOString().split('T')[0];

    const { data, error } = await supabaseClient
      .from('pedidos')
      .select('vendedor, estado, total_monto')
      .gte('created_at', `${hoy}T00:00:00`)
      .lte('created_at', `${hoy}T23:59:59`);

    if (error) return;

    if (data) {
      data.forEach(registro => {
        if (registro.vendedor && registro.estado && registro.total_monto > 0) {
          actualizarColorVendedorVisual(registro.vendedor, registro.estado);
        }
      });
    }
  } catch (err) {
    console.error('Error cargando estados:', err);
  }
}

// ==========================================
// NAVEGACIÓN
// ==========================================

function volverInicio() {
  const appContent = document.getElementById('app-content');
  if (appContent && vistaMenuPrincipal) {
    appContent.innerHTML = vistaMenuPrincipal;
    cargarEstadosVendedoresHoy();
  } else {
    window.location.href = 'index.html';
  }
}

function abrirPedido(vendedor) {
  pedidoIdActual = null; 
  fetch('formulario_pedido.html')
    .then(response => response.text())
    .then(html => {
      document.getElementById('app-content').innerHTML = html;
      const elVendedor = document.getElementById('nombre-vendedor');
      if (elVendedor) elVendedor.innerText = vendedor;
      cargarPedidoExistente(vendedor);
    })
    .catch(error => console.error('Error:', error));
}

// ==========================================
// CÁLCULOS Y BÚSQUEDA DE PEDIDO POR FECHA
// ==========================================

// ==========================================
// CÁLCULOS DEL FORMULARIO (SIN COLUMNA PRECIO)
// ==========================================

function calcularPedido() {
  let sumaUnidades = 0;
  let sumaMontoPedido = 0;
  let sumaEfectivo = 0;

  // 1. Cálculo de productos
  const filasProductos = document.querySelectorAll('#tabla-productos tbody tr');
  filasProductos.forEach(fila => {
    const precio = parseFloat(fila.getAttribute('data-precio')) || 0;
    const inputCant = fila.querySelector('.cant-prod');
    const cantidad = parseInt(inputCant ? inputCant.value : 0) || 0;
    
    const subtotal = precio * cantidad;
    const elTotalFila = fila.querySelector('.total-fila');
    if (elTotalFila) elTotalFila.innerText = `C$${subtotal.toFixed(2)}`;

    sumaUnidades += cantidad;
    sumaMontoPedido += subtotal;
  });

  const elTotalUnidades = document.getElementById('total-unidades');
  const elTotalMonto = document.getElementById('total-monto');
  if (elTotalUnidades) elTotalUnidades.innerText = sumaUnidades;
  if (elTotalMonto) elTotalMonto.innerText = `C$${sumaMontoPedido.toFixed(2)}`;

  // 2. Cálculo de dinero y subtotales por fila
  const filasDinero = document.querySelectorAll('#tabla-dinero tbody tr');
  filasDinero.forEach(fila => {
    const input = fila.querySelector('input');
    if (!input) return;

    const denominacion = parseFloat(input.getAttribute('data-denom')) || 0;
    const cantidadBilletes = parseInt(input.value) || 0;
    const subtotalFila = denominacion * cantidadBilletes;
    
    sumaEfectivo += subtotalFila;

    // Actualizar el subtotal a la par de la denominación
    const elSubtotalFila = fila.querySelector('.subtotal-dinero');
    if (elSubtotalFila) {
      elSubtotalFila.innerText = `C$${subtotalFila.toFixed(2)}`;
    }
  });

  const elTotalEfectivo = document.getElementById('total-efectivo');
  if (elTotalEfectivo) elTotalEfectivo.innerText = `C$${sumaEfectivo.toFixed(2)}`;

  // 3. Cálculo de diferencia
  const diferencia = sumaEfectivo - sumaMontoPedido;
  const boxDiferencia = document.getElementById('box-diferencia');
  
  if (boxDiferencia) {
    boxDiferencia.innerText = `C$${diferencia.toFixed(2)}`;
    if (diferencia === 0) {
      boxDiferencia.style.backgroundColor = '#efca6c'; 
    } else if (diferencia < 0) {
      boxDiferencia.style.backgroundColor = '#a55d22'; 
    } else {
      boxDiferencia.style.backgroundColor = '#faa200'; 
    }
  }
}

function obtenerPayloadFormulario(estadoAccion = 'GUARDADO') {
  const elVendedor = document.getElementById('nombre-vendedor');
  const vendedor = elVendedor ? elVendedor.innerText : '';
  const productos = [];
  const desgloseEfectivo = {};

  const filasProductos = document.querySelectorAll('#tabla-productos tbody tr');
  filasProductos.forEach(fila => {
    const nombre = fila.cells[0].innerText.trim();
    const precio = parseFloat(fila.getAttribute('data-precio')) || 0;
    const inputCant = fila.querySelector('.cant-prod');
    const cantidad = parseInt(inputCant ? inputCant.value : 0) || 0;
    
    if (cantidad > 0) {
      productos.push({ producto: nombre, precio, cantidad, subtotal: precio * cantidad });
    }
  });

  const inputsDinero = document.querySelectorAll('#tabla-dinero input');
  inputsDinero.forEach(input => {
    const denom = input.getAttribute('data-denom');
    const cant = parseInt(input.value) || 0;
    if (denom) desgloseEfectivo[denom] = cant;
  });

  const totalUnidades = parseInt(document.getElementById('total-unidades')?.innerText) || 0;
  const totalMonto = parseFloat(document.getElementById('total-monto')?.innerText.replace('C$', '')) || 0;
  const totalEfectivo = parseFloat(document.getElementById('total-efectivo')?.innerText.replace('C$', '')) || 0;
  const diferencia = parseFloat(document.getElementById('box-diferencia')?.innerText.replace('C$', '')) || 0;

  return {
    vendedor,
    productos,
    total_unidades: totalUnidades,
    total_monto: totalMonto,
    desglose_efectivo: desgloseEfectivo,
    total_efectivo: totalEfectivo,
    diferencia,
    estado: estadoAccion
  };
}

// ==========================================
// FUNCIÓN BORRAR CON MENSAJE DE CONFIRMACIÓN OBLIGATORIO
// ==========================================

async function borrarPedido() {
  const elVendedor = document.getElementById('nombre-vendedor')?.innerText || 'este vendedor';

  // Mostrar el modal elegante preguntando si está seguro
  const confirmado = await mostrarConfirmacionModal({
    titulo: '🗑️ ¿Está seguro que quiere borrar?',
    mensaje: `¿Está seguro que desea borrar el pedido y limpiar los datos de ${elVendedor}? Si existe un registro guardado, también se eliminará de la base de datos.`,
    tipo: 'danger',
    textoConfirmar: 'Sí, Borrar'
  });

  if (!confirmado) return;

  try {
    if (pedidoIdActual) {
      const { error } = await supabaseClient
        .from('pedidos')
        .delete()
        .eq('id', pedidoIdActual);

      if (error) throw error;
      pedidoIdActual = null;
    }

    limpiarFormulario();

    await mostrarConfirmacionModal({
      titulo: '✅ Pedido Borrado',
      mensaje: 'Los datos se han borrado y limpiado correctamente.',
      textoConfirmar: 'Aceptar'
    });
  } catch (err) {
    console.error('Error al borrar:', err);
    await mostrarConfirmacionModal({
      titulo: '❌ Error',
      mensaje: 'Ocurrió un error al intentar eliminar el registro de Supabase.',
      tipo: 'danger',
      textoConfirmar: 'Aceptar'
    });
  }
}



async function consultarPedidoPorFecha() {
  const elVendedor = document.getElementById('nombre-vendedor');
  const vendedor = elVendedor ? elVendedor.innerText : '';
  const inputFecha = document.getElementById('fecha-historial');
  const contenedorDetalle = document.getElementById('detalle-historial');

  if (!inputFecha || !inputFecha.value) return;

  const fechaSeleccionada = inputFecha.value;

  try {
    contenedorDetalle.innerHTML = "Buscando registro...";

    const { data, error } = await supabaseClient
      .from('pedidos')
      .select('*')
      .eq('vendedor', vendedor)
      .gte('created_at', `${fechaSeleccionada}T00:00:00`)
      .lte('created_at', `${fechaSeleccionada}T23:59:59`)
      .order('id', { ascending: false })
      .limit(1);

    if (error) throw error;

    const pedidosValidos = data ? data.filter(p => p.productos && p.productos.length > 0) : [];

    if (pedidosValidos.length > 0) {
      const registro = pedidosValidos[0];
      pedidoIdActual = registro.id;

      const filasProductos = document.querySelectorAll('#tabla-productos tbody tr');
      filasProductos.forEach(fila => {
        const nombre = fila.cells[0].innerText.trim();
        const prodGuardado = registro.productos.find(p => p.producto === nombre);
        const inputCant = fila.querySelector('.cant-prod');
        if (inputCant) {
          inputCant.value = prodGuardado ? prodGuardado.cantidad : 0;
        }
      });

      if (registro.desglose_efectivo) {
        const inputsDinero = document.querySelectorAll('#tabla-dinero input');
        inputsDinero.forEach(input => {
          const denom = input.getAttribute('data-denom');
          input.value = registro.desglose_efectivo[denom] || '';
        });
      }

      calcularPedido();
      contenedorDetalle.innerHTML = `✅ Pedido cargado del día <strong>${fechaSeleccionada}</strong> (Estado: <strong>${registro.estado || 'GUARDADO'}</strong>).`;
    } else {
      pedidoIdActual = null;
      limpiarFormulario();
      contenedorDetalle.innerHTML = `ℹ️ No hay registros con productos guardados para <strong>${vendedor}</strong> el día <strong>${fechaSeleccionada}</strong>.`;
    }
  } catch (err) {
    console.error('Error al consultar por fecha:', err);
  }
}

async function cargarPedidoExistente(vendedor) {
  const hoy = new Date().toISOString().split('T')[0];
  const inputFecha = document.getElementById('fecha-historial');
  if (inputFecha) inputFecha.value = hoy;
  consultarPedidoPorFecha();
}

// ==========================================
// GUARDAR, LIQUIDAR Y BORRAR CON CONFIRMACIÓN
// ==========================================

async function guardarPedido() {
  const payload = obtenerPayloadFormulario('GUARDADO');

  if (!payload.productos || payload.productos.length === 0) {
    await mostrarConfirmacionModal({
      titulo: '⚠️ Pedido Vacío',
      mensaje: 'Por favor ingrese al menos una cantidad de producto antes de guardar.',
      textoConfirmar: 'Entendido'
    });
    return;
  }

  const confirmado = await mostrarConfirmacionModal({
    titulo: '💾 Guardar Pedido',
    mensaje: `¿Está seguro de guardar los cambios para el pedido de ${payload.vendedor}?`,
    textoConfirmar: 'Sí, Guardar'
  });

  if (!confirmado) return;

  try {
    let respuesta;
    if (pedidoIdActual) {
      respuesta = await supabaseClient
        .from('pedidos')
        .update(payload)
        .eq('id', pedidoIdActual)
        .select();
    } else {
      respuesta = await supabaseClient
        .from('pedidos')
        .insert([payload])
        .select();
    }

    if (respuesta.error) throw respuesta.error;

    if (respuesta.data && respuesta.data.length > 0) {
      pedidoIdActual = respuesta.data[0].id;
    }

    actualizarColorVendedorVisual(payload.vendedor, 'guardado');

    await mostrarConfirmacionModal({
      titulo: '✅ ¡Guardado Exitoso!',
      mensaje: 'El pedido se ha modificado correctamente en el sistema.',
      textoConfirmar: 'Aceptar'
    });
  } catch (error) {
    console.error('Error al guardar:', error);
  }
}

async function liquidarPedido() {
  const payload = obtenerPayloadFormulario('LIQUIDADO');

  const confirmado = await mostrarConfirmacionModal({
    titulo: '🏁 Liquidar Saldo Pendiente',
    mensaje: `¿Está seguro que desea marcar este saldo como LIQUIDADO para ${payload.vendedor}?`,
    tipo: 'primary',
    textoConfirmar: 'Sí, Liquidar'
  });

  if (!confirmado) return;

  try {
    let respuesta;
    if (pedidoIdActual) {
      respuesta = await supabaseClient
        .from('pedidos')
        .update(payload)
        .eq('id', pedidoIdActual)
        .select();
    } else {
      respuesta = await supabaseClient
        .from('pedidos')
        .insert([payload])
        .select();
    }

    if (respuesta.error) throw respuesta.error;

    actualizarColorVendedorVisual(payload.vendedor, 'liquidado');

    await mostrarConfirmacionModal({
      titulo: '🏁 Saldo Liquidado',
      mensaje: 'La cuenta ha sido cerrada correctamente.',
      textoConfirmar: 'Aceptar'
    });
  } catch (error) {
    console.error('Error al liquidar:', error);
  }
}



function limpiarFormulario() {
  const todosInputs = document.querySelectorAll('input[type="number"]');
  todosInputs.forEach(input => input.value = '');
  calcularPedido();
}

document.addEventListener('contextmenu', (e) => {
  if (e.target.tagName === 'INPUT') {
    e.preventDefault();
  }
});

// ==========================================
// NAVEGACIÓN DE MÓDULOS PRINCIPALES
// ==========================================

function abrirArqueoGeneral() {
  window.location.href = 'arqueo_general.html';
}

function abrirFormularioGasto() {
  fetch('formulario_gasto.html')
    .then(response => {
      if (!response.ok) throw new Error('Error al cargar la plantilla de gastos');
      return response.text();
    })
    .then(html => {
      document.getElementById('app-content').innerHTML = html;
    })
    .catch(err => {
      console.warn('Cargando vista de gastos alternativa...', err);
    });
}

function abrirModulo(modulo) {
  if (modulo === 'PEDIDO') {
    fetch('pedido_resumen.html')
      .then(response => {
        if (!response.ok) throw new Error('Error al cargar pedido_resumen.html');
        return response.text();
      })
      .then(html => {
        document.getElementById('app-content').innerHTML = html;
        if (typeof procesarResumenPedidos === 'function') {
          procesarResumenPedidos();
        }
      })
      .catch(err => console.error('Error abriendo Resumen de Pedidos:', err));
  }
}

// ==========================================
// MÓDULO DE RESUMEN DE PEDIDOS Y PRODUCCIÓN
// ==========================================

function establecerFechasPorDefectoPedidos() {
  const hoy = new Date().toISOString().split('T')[0];
  const inputInicio = document.getElementById('fecha-desde') || document.getElementById('fecha-inicio-pedido');
  const inputFin = document.getElementById('fecha-hasta') || document.getElementById('fecha-fin-pedido');

  if (inputInicio && !inputInicio.value) inputInicio.value = hoy;
  if (inputFin && !inputFin.value) inputFin.value = hoy;
}

function cargarHoyPedidos() {
  const hoy = new Date().toISOString().split('T')[0];
  const inputInicio = document.getElementById('fecha-desde') || document.getElementById('fecha-inicio-pedido');
  const inputFin = document.getElementById('fecha-hasta') || document.getElementById('fecha-fin-pedido');
  if (inputInicio) inputInicio.value = hoy;
  if (inputFin) inputFin.value = hoy;
  procesarResumenPedidos();
}

async function procesarResumenPedidos() {
  try {
    establecerFechasPorDefectoPedidos();

    const inputInicio = document.getElementById('fecha-desde') || document.getElementById('fecha-inicio-pedido');
    const inputFin = document.getElementById('fecha-hasta') || document.getElementById('fecha-fin-pedido');

    if (!inputInicio || !inputFin) return;

    const fechaInicioVal = inputInicio.value;
    const fechaFinVal = inputFin.value;

    if (!fechaInicioVal || !fechaFinVal) return;

    const { data: pedidos, error } = await supabaseClient
      .from('pedidos')
      .select('productos')
      .gte('created_at', `${fechaInicioVal}T00:00:00`)
      .lte('created_at', `${fechaFinVal}T23:59:59`);

    if (error) throw error;

    const totales = {};

    if (pedidos && pedidos.length > 0) {
      pedidos.forEach(p => {
        if (p.productos && Array.isArray(p.productos)) {
          p.productos.forEach(item => {
            const prod = item.producto;
            const cant = parseInt(item.cantidad) || 0;
            totales[prod] = (totales[prod] || 0) + cant;
          });
        }
      });
    }

    const getCant = (nombre) => totales[nombre] || 0;

    const gruposHorno = [
      {
        nombre: "BARRITA / BARRITA DOBLE",
        piezasBase: getCant("BARRITA") + (getCant("BARRITA DOBLE") * 2),
        formulaTexto: `${getCant("BARRITA")} S + (${getCant("BARRITA DOBLE")} D × 2)`,
        rendimientoTexto: "4 piezas/sartén",
        sartenes: Math.ceil((getCant("BARRITA") + (getCant("BARRITA DOBLE") * 2)) / 4)
      },
      {
        nombre: "HAMBURGUESA PEQUEÑA / DOBLE",
        piezasBase: getCant("HAMBURGUESA PEQUEÑA") + (getCant("HAMBURGUESA PEQUEÑA DOBLE") * 2),
        formulaTexto: `${getCant("HAMBURGUESA PEQUEÑA")} S + (${getCant("HAMBURGUESA PEQUEÑA DOBLE")} D × 2)`,
        rendimientoTexto: "5 piezas/sartén",
        sartenes: Math.ceil((getCant("HAMBURGUESA PEQUEÑA") + (getCant("HAMBURGUESA PEQUEÑA DOBLE") * 2)) / 5)
      },
      {
        nombre: "HAMBURGUESA MEDIANA / DOBLE",
        piezasBase: getCant("HAMBURGUESA MEDIANA") + (getCant("HAMBURGUESA MEDIANA DOBLE") * 2),
        formulaTexto: `${getCant("HAMBURGUESA MEDIANA")} S + (${getCant("HAMBURGUESA MEDIANA DOBLE")} D × 2)`,
        rendimientoTexto: "5 piezas/sartén",
        sartenes: Math.ceil((getCant("HAMBURGUESA MEDIANA") + (getCant("HAMBURGUESA MEDIANA DOBLE") * 2)) / 5)
      },
      {
        nombre: "BOLLONCITO / BOLLONCITO DOBLE",
        piezasBase: getCant("BOLLONCITO") + (getCant("BOLLONCITO DOBLE") * 2),
        formulaTexto: `${getCant("BOLLONCITO")} S + (${getCant("BOLLONCITO DOBLE")} D × 2)`,
        rendimientoTexto: "5 piezas/sartén",
        sartenes: Math.ceil((getCant("BOLLONCITO") + (getCant("BOLLONCITO DOBLE") * 2)) / 5)
      },
      {
        nombre: "CONCHA / CONCHA DOBLE",
        piezasBase: getCant("CONCHA") + (getCant("CONCHA DOBLE") * 2),
        formulaTexto: `${getCant("CONCHA")} S + (${getCant("CONCHA DOBLE")} D × 2)`,
        rendimientoTexto: "4 piezas/sartén",
        sartenes: Math.ceil((getCant("CONCHA") + (getCant("CONCHA DOBLE") * 2)) / 4)
      },
      {
        nombre: "TRENZA DOBLE",
        piezasBase: getCant("TRENZA DOBLE") * 2,
        formulaTexto: `${getCant("TRENZA DOBLE")} D × 2`,
        rendimientoTexto: "4 piezas/sartén",
        sartenes: Math.ceil((getCant("TRENZA DOBLE") * 2) / 4)
      },
      {
        nombre: "BOLLON DE 4 / BOLLON DE 4 DOBLE",
        piezasBase: (getCant("BOLLON DE 4") + getCant("BOLLON DE 4 DOBLE")) * 4,
        formulaTexto: `(${getCant("BOLLON DE 4")} S + ${getCant("BOLLON DE 4 DOBLE")} D) × 4 piezas`,
        rendimientoTexto: "12 piezas/sartén",
        sartenes: Math.ceil(((getCant("BOLLON DE 4") + getCant("BOLLON DE 4 DOBLE")) * 4) / 12)
      },
      {
        nombre: "BOLLON DE 5",
        piezasBase: getCant("BOLLON DE 5") * 5,
        formulaTexto: `${getCant("BOLLON DE 5")} paquetes × 5 piezas`,
        rendimientoTexto: "12 piezas/sartén",
        sartenes: Math.ceil((getCant("BOLLON DE 5") * 5) / 12)
      },
      {
        nombre: "PICOS / PICOS DOBLE",
        piezasBase: getCant("PICOS") + (getCant("PICOS DOBLE") * 2),
        formulaTexto: `${getCant("PICOS")} S + (${getCant("PICOS DOBLE")} D × 2)`,
        rendimientoTexto: "3 piezas/sartén",
        sartenes: Math.ceil((getCant("PICOS") + (getCant("PICOS DOBLE") * 2)) / 3)
      },
      {
        nombre: "MANJAR (SIMPLE Y DOBLE)",
        piezasBase: getCant("MANJAR") + (getCant("MANJAR DOBLE") * 2),
        formulaTexto: `${getCant("MANJAR")} S + (${getCant("MANJAR DOBLE")} D × 2)`,
        rendimientoTexto: "4 piezas/sartén",
        sartenes: Math.ceil((getCant("MANJAR") + (getCant("MANJAR DOBLE") * 2)) / 4)
      },
      {
        nombre: "HOT-DOG",
        piezasBase: getCant("HOT-DOG") * 8,
        formulaTexto: `${getCant("HOT-DOG")} paquetes × 8 piezas`,
        rendimientoTexto: "6 piezas/sartén",
        sartenes: Math.ceil((getCant("HOT-DOG") * 8) / 6)
      },
      {
        nombre: "HAMBURGUESA DE ARO",
        piezasBase: getCant("HAMBURGUESA DE ARO"),
        formulaTexto: `${getCant("HAMBURGUESA DE ARO")} piezas`,
        rendimientoTexto: "6 piezas/sartén",
        sartenes: Math.ceil(getCant("HAMBURGUESA DE ARO") / 6)
      },
      {
        nombre: "CONCHA INDIVIDUAL",
        piezasBase: getCant("CONCHA INDIVIDUAL"),
        formulaTexto: `${getCant("CONCHA INDIVIDUAL")} piezas`,
        rendimientoTexto: "6 piezas/sartén",
        sartenes: Math.ceil(getCant("CONCHA INDIVIDUAL") / 6)
      },
      {
        nombre: "BARRA CUADRADA",
        piezasBase: getCant("BARRA CUADRADA"),
        formulaTexto: `${getCant("BARRA CUADRADA")} piezas`,
        rendimientoTexto: "6 piezas/sartén",
        sartenes: Math.ceil(getCant("BARRA CUADRADA") / 6)
      },
      {
        nombre: "TOSTADO / TOSTADO DOBLE",
        piezasBase: getCant("TOSTADO") + (getCant("TOSTADO DOBLE") * 2),
        formulaTexto: `${getCant("TOSTADO")} S + (${getCant("TOSTADO DOBLE")} D × 2)`,
        rendimientoTexto: "48 piezas/lata",
        sartenes: Math.ceil((getCant("TOSTADO") + (getCant("TOSTADO DOBLE") * 2)) / 48)
      },
      {
        nombre: "ROSCA / ROSCA DOBLE",
        piezasBase: getCant("ROSCA") + (getCant("ROSCA DOBLE") * 2),
        formulaTexto: `${getCant("ROSCA")} S + (${getCant("ROSCA DOBLE")} D × 2)`,
        rendimientoTexto: "48 piezas/lata",
        sartenes: Math.ceil((getCant("ROSCA") + (getCant("ROSCA DOBLE") * 2)) / 48)
      },
      {
        nombre: "EMPANADA / EMPANADA DOBLE",
        piezasBase: getCant("EMPANADA") + (getCant("EMPANADA DOBLE") * 2),
        formulaTexto: `${getCant("EMPANADA")} S + (${getCant("EMPANADA DOBLE")} D × 2)`,
        rendimientoTexto: "48 piezas/lata",
        sartenes: Math.ceil((getCant("EMPANADA") + (getCant("EMPANADA DOBLE") * 2)) / 48)
      },
      {
        nombre: "PIQUITO DOBLE",
        piezasBase: getCant("PIQUITO DOBLE") * 2,
        formulaTexto: `${getCant("PIQUITO DOBLE")} D × 2`,
        rendimientoTexto: "48 piezas/lata",
        sartenes: Math.ceil((getCant("PIQUITO DOBLE") * 2) / 48)
      },
      {
        nombre: "POLVORON DOBLE",
        piezasBase: getCant("POLVORON DOBLE"),
        formulaTexto: `${getCant("POLVORON DOBLE")} unidades/arrobas`,
        rendimientoTexto: "1 unidad base",
        sartenes: getCant("POLVORON DOBLE")
      },
      {
        nombre: "MOLDE",
        piezasBase: getCant("MOLDE"),
        formulaTexto: `${getCant("MOLDE")} piezas`,
        rendimientoTexto: "1 molde/unidad",
        sartenes: getCant("MOLDE")
      },
      {
        nombre: "BARRA DE MANTEQUILLA",
        piezasBase: getCant("BARRA DE MANTEQUILLA"),
        formulaTexto: `${getCant("BARRA DE MANTEQUILLA")} piezas`,
        rendimientoTexto: "1 barra/unidad",
        sartenes: getCant("BARRA DE MANTEQUILLA")
      },
      {
        nombre: "CACHO CON MANTEQUILLA",
        piezasBase: getCant("CACHO CON MANTEQUILLA"),
        formulaTexto: `${getCant("CACHO CON MANTEQUILLA")} piezas`,
        rendimientoTexto: "1 cacho/unidad",
        sartenes: getCant("CACHO CON MANTEQUILLA")
      },
      {
        nombre: "ENROLLADO DOBLE",
        piezasBase: getCant("ENROLLADO DOBLE") * 2,
        formulaTexto: `${getCant("ENROLLADO DOBLE")} D × 2`,
        rendimientoTexto: "2.5 piezas/sartén",
        sartenes: Math.ceil((getCant("ENROLLADO DOBLE") * 2) / 2.5)
      }
    ];

    const tbodyHorno = document.getElementById('tbody-consolidado-horno');
    if (tbodyHorno) {
      tbodyHorno.innerHTML = '';
      gruposHorno.forEach(g => {
        if (g.piezasBase > 0 || g.sartenes > 0) {
          const fila = document.createElement('tr');
          fila.innerHTML = `
            <td><strong>${g.nombre}</strong></td>
            <td>${g.formulaTexto}</td>
            <td>${g.rendimientoTexto}</td>
            <td><strong style="color: #ef4444; font-size: 1.1em;">${g.sartenes}</strong></td>
          `;
          tbodyHorno.appendChild(fila);
        }
      });

      if (tbodyHorno.children.length === 0) {
        tbodyHorno.innerHTML = '<tr><td colspan="4" style="text-align:center;">No hay pedidos registrados en la fecha seleccionada.</td></tr>';
      }
    }

    const tbodyAdmin = document.getElementById('tbody-detalle-individual');
    if (tbodyAdmin) {
      tbodyAdmin.innerHTML = '';
      const listaProdNombres = Object.keys(totales);
      if (listaProdNombres.length === 0) {
        tbodyAdmin.innerHTML = '<tr><td colspan="3" style="text-align:center;">No hay productos solicitados.</td></tr>';
      } else {
        listaProdNombres.forEach(nombreProd => {
          const cant = totales[nombreProd];
          if (cant > 0) {
            const fila = document.createElement('tr');
            fila.innerHTML = `
              <td><strong>${nombreProd}</strong></td>
              <td>${cant} piezas/paquetes</td>
              <td>Registrado en pedido diario</td>
            `;
            tbodyAdmin.appendChild(fila);
          }
        });
      }
    }
  } catch (err) {
    console.error('Error procesando el resumen de pedidos:', err);
  }
}

// ==========================================
// MÓDULO DE ARQUEO GENERAL DE CAJA
// ==========================================

function establecerFechasPorDefecto() {
  const hoy = new Date().toISOString().split('T')[0];
  const inputInicio = document.getElementById('fecha-inicio');
  const inputFin = document.getElementById('fecha-fin');

  if (inputInicio && !inputInicio.value) inputInicio.value = hoy;
  if (inputFin && !inputFin.value) inputFin.value = hoy;
}

function cargarHoyArqueo() {
  const hoy = new Date().toISOString().split('T')[0];
  const inputInicio = document.getElementById('fecha-inicio');
  const inputFin = document.getElementById('fecha-fin');
  if (inputInicio) inputInicio.value = hoy;
  if (inputFin) inputFin.value = hoy;
  procesarArqueoGeneral();
}

async function procesarArqueoGeneral() {
  try {
    establecerFechasPorDefecto();

    const fechaInicioVal = document.getElementById('fecha-inicio')?.value;
    const fechaFinVal = document.getElementById('fecha-fin')?.value;

    if (!fechaInicioVal || !fechaFinVal) return;

    const { data: pedidos, error: errPedidos } = await supabaseClient
      .from('pedidos')
      .select('*')
      .gte('created_at', `${fechaInicioVal}T00:00:00`)
      .lte('created_at', `${fechaFinVal}T23:59:59`)
      .order('created_at', { ascending: false });

    if (errPedidos) throw errPedidos;

    const { data: gastos, error: errGastos } = await supabaseClient
      .from('gastos')
      .select('*')
      .gte('created_at', `${fechaInicioVal}T00:00:00`)
      .lte('created_at', `${fechaFinVal}T23:59:59`)
      .order('created_at', { ascending: false });

    if (errGastos) throw errGastos;

    let sumaTotalPan = 0;
    let sumaTotalEfectivo = 0;
    let sumaTotalGastos = 0;

    const consolidadoBilletes = {
      '1000': 0, '500': 0, '200': 0, '100': 0,
      '50': 0, '20': 0, '10': 0, '5': 0, '1': 0, '0.5': 0
    };

    const tbodyVendedores = document.querySelector('#tabla-vendedores-arqueo tbody');
    if (tbodyVendedores) tbodyVendedores.innerHTML = '';

    const pedidosValidos = pedidos ? pedidos.filter(p => p.productos && p.productos.length > 0) : [];

    if (pedidosValidos.length === 0) {
      if (tbodyVendedores) {
        tbodyVendedores.innerHTML = '<tr><td colspan="6" style="text-align:center;">No hay registros de ventas en el rango seleccionado.</td></tr>';
      }
    } else {
      pedidosValidos.forEach(p => {
        const montoPan = parseFloat(p.total_monto) || 0;
        const montoEfectivo = parseFloat(p.total_efectivo) || 0;
        sumaTotalPan += montoPan;
        sumaTotalEfectivo += montoEfectivo;

        if (p.desglose_efectivo) {
          for (const denom in p.desglose_efectivo) {
            if (consolidadoBilletes[denom] !== undefined) {
              consolidadoBilletes[denom] += parseInt(p.desglose_efectivo[denom]) || 0;
            }
          }
        }

        const dif = parseFloat(p.diferencia) || 0;
        let claseDif = dif === 0 ? 'texto-verde' : (dif < 0 ? 'texto-rojo' : 'texto-naranja');
        const fechaFormateada = p.created_at ? p.created_at.replace('T', ' ').slice(0, 16) : 'N/A';

        if (tbodyVendedores) {
          const fila = document.createElement('tr');
          fila.innerHTML = `
            <td><strong>${p.vendedor}</strong></td>
            <td>${fechaFormateada}</td>
            <td>C$ ${montoPan.toFixed(2)}</td>
            <td>C$ ${montoEfectivo.toFixed(2)}</td>
            <td class="${claseDif}">C$ ${dif.toFixed(2)}</td>
            <td><span class="badge-estado">${p.estado || 'GUARDADO'}</span></td>
          `;
          tbodyVendedores.appendChild(fila);
        }
      });
    }

    if (gastos && gastos.length > 0) {
      gastos.forEach(g => {
        sumaTotalGastos += parseFloat(g.monto) || 0;
      });
    }

    const elCardPan = document.getElementById('card-total-pan');
    const elCardEfectivo = document.getElementById('card-total-efectivo');
    const elCardGastos = document.getElementById('card-total-gastos');

    if (elCardPan) elCardPan.innerText = `C$${sumaTotalPan.toFixed(2)}`;
    if (elCardEfectivo) elCardEfectivo.innerText = `C$${sumaTotalEfectivo.toFixed(2)}`;
    if (elCardGastos) elCardGastos.innerText = `C$${sumaTotalGastos.toFixed(2)}`;

    const diferenciaTotal = (sumaTotalEfectivo + sumaTotalGastos) - sumaTotalPan;
    const cardDif = document.getElementById('card-diferencia');
    const cardDifBox = document.getElementById('card-diferencia-box');

    if (cardDif) cardDif.innerText = `C$${diferenciaTotal.toFixed(2)}`;
    if (cardDifBox) {
      cardDifBox.style.backgroundColor = diferenciaTotal === 0 ? '#10b981' : (diferenciaTotal < 0 ? '#ef4444' : '#f59e0b');
    }

    const tbodyBilletes = document.querySelector('#tabla-consolidado-dinero tbody');
    if (tbodyBilletes) {
      tbodyBilletes.innerHTML = '';
      const denomsOrdenadas = ['1000', '500', '200', '100', '50', '20', '10', '5', '1', '0.5'];
      denomsOrdenadas.forEach(denom => {
        const cant = consolidadoBilletes[denom] || 0;
        const subtotal = parseFloat(denom) * cant;

        const fila = document.createElement('tr');
        fila.innerHTML = `
          <td><strong>C$${denom}</strong></td>
          <td>${cant}</td>
          <td>C$${subtotal.toFixed(2)}</td>
        `;
        tbodyBilletes.appendChild(fila);
      });
    }

  } catch (err) {
    console.error('Error procesando el arqueo general:', err);
  }
}

function exportarExcelArqueo() {
  const tabla = document.getElementById('tabla-vendedores-arqueo');
  if (!tabla) return;
  let csv = [];
  for (let i = 0; i < tabla.rows.length; i++) {
    let row = [], cols = tabla.rows[i].querySelectorAll('td, th');
    for (let j = 0; j < cols.length; j++) {
      row.push('"' + cols[j].innerText.replace(/"/g, '""') + '"');
    }
    csv.push(row.join(','));
  }
  const csvFile = new Blob([csv.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const downloadLink = document.createElement('a');
  downloadLink.download = `Arqueo_General_${new Date().toISOString().slice(0,10)}.csv`;
  downloadLink.href = window.URL.createObjectURL(csvFile);
  downloadLink.style.display = 'none';
  document.body.appendChild(downloadLink);
  downloadLink.click();
}
async function abrirPedido(vendedor) {
  pedidoIdActual = null; 
  try {
    const response = await fetch('formulario_pedido.html');
    const html = await response.text();
    document.getElementById('app-content').innerHTML = html;
    
    const elVendedor = document.getElementById('nombre-vendedor');
    if (elVendedor) elVendedor.innerText = vendedor;

    // 1. Cargar la lista de productos y precios directamente desde Supabase
    await cargarProductosDinamicos();

    // 2. Cargar el pedido existente del día
    cargarPedidoExistente(vendedor);
  } catch (error) {
    console.error('Error al abrir pedido:', error);
  }
}

async function cargarProductosDinamicos() {
  const tbody = document.getElementById('tabla-productos-body');
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;">Cargando productos...</td></tr>';

  const { data: productos, error } = await supabaseClient
    .from('productos')
    .select('*')
    .order('orden', { ascending: true });

  if (error) {
    console.error('Error al obtener productos de Supabase:', error);
    tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; color:red;">Error al cargar productos</td></tr>';
    return;
  }

  tbody.innerHTML = '';

  productos.forEach(prod => {
    const fila = document.createElement('tr');
    // Guardamos el precio en el atributo data-precio para los cálculos internos
    fila.setAttribute('data-precio', prod.precio);
    fila.innerHTML = `
      <td>${prod.nombre}</td>
      <td><input type="number" min="0" placeholder="0" class="cant-prod" oninput="calcularPedido()"></td>
      <td class="total-fila" style="text-align: right;">C$0.00</td>
    `;
    tbody.appendChild(fila);
  });
}
// ==========================================
// MÓDULO DE GASTOS
// ==========================================

async function guardarGasto(event) {
  event.preventDefault();
  
  const concepto = document.getElementById('concepto-gasto').value.trim();
  const monto = parseFloat(document.getElementById('monto-gasto').value) || 0;
  const observacion = document.getElementById('observacion-gasto').value.trim();

  if (!concepto || monto <= 0) {
    await mostrarConfirmacionModal({
      titulo: '⚠️ Datos incompletos',
      mensaje: 'Por favor ingrese un concepto y un monto válido.',
      textoConfirmar: 'Entendido'
    });
    return;
  }

  const confirmado = await mostrarConfirmacionModal({
    titulo: '💾 Registrar Gasto',
    mensaje: `¿Desea registrar el gasto de C$${monto.toFixed(2)} por "${concepto}"?`,
    textoConfirmar: 'Sí, Guardar'
  });

  if (!confirmado) return;

  try {
    const { error } = await supabaseClient
      .from('gastos')
      .insert([{ concepto, monto, observacion }]);

    if (error) throw error;

    document.getElementById('form-gasto').reset();
    await cargarGastosHoy();

    await mostrarConfirmacionModal({
      titulo: '✅ Gasto Registrado',
      mensaje: 'El gasto se ha guardado correctamente en el sistema.',
      textoConfirmar: 'Aceptar'
    });
  } catch (err) {
    console.error('Error al guardar gasto:', err);
    await mostrarConfirmacionModal({
      titulo: '❌ Error',
      mensaje: 'No se pudo guardar el gasto en Supabase.',
      tipo: 'danger',
      textoConfirmar: 'Aceptar'
    });
  }
}

async function cargarGastosHoy() {
  const tbody = document.getElementById('tbody-gastos');
  if (!tbody) return;

  const hoy = new Date().toISOString().split('T')[0];

  try {
    const { data: gastos, error } = await supabaseClient
      .from('gastos')
      .select('*')
      .gte('created_at', `${hoy}T00:00:00`)
      .lte('created_at', `${hoy}T23:59:59`)
      .order('created_at', { ascending: false });

    if (error) throw error;

    tbody.innerHTML = '';

    if (!gastos || gastos.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No hay gastos registrados hoy.</td></tr>';
      return;
    }

    gastos.forEach(g => {
      
      const hora = g.created_at ? new Date(g.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A';
      const fila = document.createElement('tr');
      fila.innerHTML = `
        <td>${hora}</td>
        <td><strong>${g.concepto}</strong></td>
        <td>C$${parseFloat(g.monto).toFixed(2)}</td>
        <td>${g.observacion || '-'}</td>
        <td><button class="btn-modal btn-modal-danger" style="padding: 5px 10px; font-size: 0.8rem;" onclick="eliminarGasto(${g.id})">Borrar</button></td>
      `;
      tbody.appendChild(fila);
    });
  } catch (err) {
    console.error('Error al cargar gastos:', err);
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:red;">Error al cargar gastos</td></tr>';
  }
}

async function eliminarGasto(id) {
  const confirmado = await mostrarConfirmacionModal({
    titulo: '🗑️ Eliminar Gasto',
    mensaje: '¿Está seguro que desea eliminar este registro de gasto?',
    tipo: 'danger',
    textoConfirmar: 'Sí, Eliminar'
  });

  if (!confirmado) return;

  try {
    const { error } = await supabaseClient
      .from('gastos')
      .delete()
      .eq('id', id);

    if (error) throw error;

    await cargarGastosHoy();
  } catch (err) {
    console.error('Error al eliminar gasto:', err);
  }
}

// Reemplazar la función abrirFormularioGasto para que cargue la lista automáticamente
function abrirFormularioGasto() {
  fetch('formulario_gasto.html')
    .then(response => {
      if (!response.ok) throw new Error('Error al cargar la plantilla de gastos');
      return response.text();
    })
    .then(html => {
      document.getElementById('app-content').innerHTML = html;
      cargarGastosHoy();
    })
    .catch(err => {
      console.error('Error al abrir formulario de gastos:', err);
    });
}
function cargarConsolidadoHoy() {
  const hoy = new Date().toISOString().split('T')[0];
  const inputInicio = document.getElementById('fecha-desde');
  const inputFin = document.getElementById('fecha-hasta');
  if (inputInicio) inputInicio.value = hoy;
  if (inputFin) inputFin.value = hoy;
  procesarResumenPedidos();
}
// ==========================================
// CONTROL DESPLEGABLE DE HISTORIAL
// ==========================================

function toggleHistorial() {
  const seccion = document.getElementById('seccion-historial');
  if (seccion) {
    if (seccion.style.display === 'none' || seccion.style.display === '') {
      seccion.style.display = 'block';
      // Opcional: Hacer scroll suave hacia el historial al abrirlo
      seccion.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else {
      seccion.style.display = 'none';
    }
  }
}
// ==========================================
// MÓDULO DE VENTA LOCAL TÁCTICA (POS)
// ==========================================

let carritoVentaLocal = [];
let productosDisponiblesLocal = [];

function abrirVentaLocal() {
  carritoVentaLocal = [];
  fetch('venta_local.html')
    .then(response => {
      if (!response.ok) throw new Error('Error al cargar venta_local.html');
      return response.text();
    })
    .then(html => {
      document.getElementById('app-content').innerHTML = html;
      cargarProductosVentaLocal();
    })
    .catch(err => console.error('Error abriendo Venta Local:', err));
}

async function cargarProductosVentaLocal() {
  const grid = document.getElementById('grid-productos-local');
  if (!grid) return;

  grid.innerHTML = '<div style="grid-column: span 2; text-align:center; padding: 20px;">Cargando productos...</div>';

  try {
    const { data: productos, error } = await supabaseClient
      .from('productos')
      .select('*')
      .order('orden', { ascending: true });

    if (error) throw error;

    productosDisponiblesLocal = productos || [];
    grid.innerHTML = '';

    productosDisponiblesLocal.forEach(prod => {
      // Usamos precio_local si existe, de lo contrario usamos precio + margen o precio normal
      const precioLocal = prod.precio_local !== undefined ? prod.precio_local : (prod.precio + 2); 

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn-vendedor';
      btn.style.cssText = `
        background-color: #f59e0b; 
        color: white; 
        padding: 12px 8px; 
        border-radius: 10px; 
        border: none; 
        cursor: pointer; 
        display: flex; 
        flex-direction: column; 
        align-items: center; 
        justify-content: center; 
        gap: 4px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        transition: transform 0.1s;
      `;
      btn.innerHTML = `
        <span style="font-weight: 700; font-size: 0.95rem; text-align: center;">${prod.nombre}</span>
        <span style="font-size: 0.85rem; background: rgba(0,0,0,0.15); padding: 2px 8px; border-radius: 6px;">C$${precioLocal.toFixed(2)}</span>
      `;
      btn.onclick = () => agregarAlCarritoLocal(prod.id, precioLocal);
      grid.appendChild(btn);
    });
  } catch (err) {
    console.error('Error cargando productos para venta local:', err);
    grid.innerHTML = '<div style="color:red; text-align:center;">Error al cargar catálogo</div>';
  }
}

function agregarAlCarritoLocal(idProd, precio) {
  const producto = productosDisponiblesLocal.find(p => p.id === idProd);
  if (!producto) return;

  const itemExistente = carritoVentaLocal.find(item => item.id === idProd);
  if (itemExistente) {
    itemExistente.cantidad += 1;
  } else {
    carritoVentaLocal.push({
      id: producto.id,
      producto: producto.nombre,
      precio: precio,
      cantidad: 1
    });
  }
  renderizarCarritoLocal();
}

function cambiarCantidadLocal(idProd, delta) {
  const item = carritoVentaLocal.find(i => i.id === idProd);
  if (!item) return;

  item.cantidad += delta;
  if (item.cantidad <= 0) {
    carritoVentaLocal = carritoVentaLocal.filter(i => i.id !== idProd);
  }
  renderizarCarritoLocal();
}

function renderizarCarritoLocal() {
  const tbody = document.getElementById('tbody-carrito-local');
  const elTotal = document.getElementById('total-venta-local');
  if (!tbody) return;

  tbody.innerHTML = '';
  let totalGeneral = 0;

  if (carritoVentaLocal.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: #94a3b8; padding: 20px;">El carrito está vacío</td></tr>';
    if (elTotal) elTotal.innerText = 'C$0.00';
    return;
  }

  carritoVentaLocal.forEach(item => {
    const subtotal = item.precio * item.cantidad;
    totalGeneral += subtotal;

    const fila = document.createElement('tr');
    fila.style.borderBottom = '1px solid #f1f5f9';
    fila.innerHTML = `
      <td style="padding: 8px 4px; font-weight: 600; font-size: 0.9rem;">${item.producto}</td>
      <td style="padding: 8px 4px; text-align: center;">
        <button onclick="cambiarCantidadLocal(${item.id}, -1)" style="padding: 2px 6px; background: #e2e8f0; border: none; border-radius: 4px; cursor: pointer;">-</button>
        <span style="margin: 0 6px; font-weight: 600;">${item.cantidad}</span>
        <button onclick="cambiarCantidadLocal(${item.id}, 1)" style="padding: 2px 6px; background: #e2e8f0; border: none; border-radius: 4px; cursor: pointer;">+</button>
      </td>
      <td style="padding: 8px 4px; text-align: right; font-weight: 600;">C$${subtotal.toFixed(2)}</td>
      <td style="padding: 8px 4px; text-align: center;">
        <button onclick="cambiarCantidadLocal(${item.id}, -${item.cantidad})" style="color: #ef4444; background: none; border: none; cursor: pointer; font-size: 1rem;">×</button>
      </td>
    `;
    tbody.appendChild(fila);
  });

  if (elTotal) elTotal.innerText = `C$${totalGeneral.toFixed(2)}`;
}

async function cobrarVentaLocal() {
  if (carritoVentaLocal.length === 0) {
    await mostrarConfirmacionModal({
      titulo: '⚠️ Carrito Vacío',
      mensaje: 'Agregue al menos un producto al ticket antes de cobrar.',
      textoConfirmar: 'Entendido'
    });
    return;
  }

  let totalMonto = carritoVentaLocal.reduce((acc, item) => acc + (item.precio * item.cantidad), 0);
  let totalUnidades = carritoVentaLocal.reduce((acc, item) => acc + item.cantidad, 0);

  const confirmado = await mostrarConfirmacionModal({
    titulo: '💰 Confirmar Venta Local',
    mensaje: `¿Desea registrar y cobrar esta venta por un total de C$${totalMonto.toFixed(2)}?`,
    textoConfirmar: 'Sí, Cobrar'
  });

  if (!confirmado) return;

  const payload = {
    vendedor: 'VENTA LOCAL',
    productos: carritoVentaLocal.map(i => ({ producto: i.producto, precio: i.precio, cantidad: i.cantidad, subtotal: i.precio * i.cantidad })),
    total_unidades: totalUnidades,
    total_monto: totalMonto,
    total_efectivo: totalMonto, // Se asume pago exacto al contado
    diferencia: 0,
    estado: 'LIQUIDADO'
  };

  try {
    const { error } = await supabaseClient
      .from('pedidos')
      .insert([payload]);

    if (error) throw error;

    await mostrarConfirmacionModal({
      titulo: '✅ Venta Exitosa',
      mensaje: 'La venta local se ha registrado y liquidado correctamente.',
      textoConfirmar: 'Aceptar'
    });

    abrirVentaLocal(); // Reiniciar ticket para la siguiente venta
  } catch (err) {
    console.error('Error al guardar venta local:', err);
    await mostrarConfirmacionModal({
      titulo: '❌ Error',
      mensaje: 'No se pudo registrar la venta en Supabase.',
      tipo: 'danger',
      textoConfirmar: 'Aceptar'
    });
  }
}
function cargarConsolidado() {
  procesarResumenPedidos();
}