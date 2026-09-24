// ==========================================
// CONFIGURACIÓN DE SUPABASE
// ==========================================
const SUPABASE_URL = 'https://uwhdgciobraeyqfcahhb.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_veZjv_oyTwnyIefPfTj_RA_otSyvmaV'; 

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Mapa de rendimientos por producto (Piezas por sartén / lata / bolsa)
const RENDIMIENTO_PRODUCTOS = {
  "BARRITA": 4,
  "BARRITA DOBLE": 4,
  "HAMBURGUESA PEQUEÑA": 5,
  "HAMBURGUESA PEQUEÑA DOBLE": 5,
  "HAMBURGUESA MEDIANA": 5,
  "HAMBURGUESA MEDIANA DOBLE": 5,
  "BOLLONCITO": 5,
  "BOLLONCITO DOBLE": 5,
  "CONCHA": 4,
  "CONCHA DOBLE": 4,
  "TRENZA DOBLE": 4,
  "BOLLON DE 4": 12,        // 12 piezas por sartén (3 paquetes de 4)
  "BOLLON DE 4 DOBLE": 12,  
  "BOLLON DE 5": 12,        // 12 piezas por sartén
  "PICOS": 3,
  "PICOS DOBLE": 3,
  "MANJAR": 4,
  "MANJAR DOBLE": 2,
  "TOSTADO": 48,            // 48 piezas por lata
  "TOSTADO DOBLE": 48,
  "ROSCA": 48,              // 48 piezas por lata
  "ROSCA DOBLE": 48,
  "EMPANADA": 48,           // 48 piezas por lata
  "EMPANADA DOBLE": 48,
  "PIQUITO DOBLE": 48,       // 48 piezas por lata
  "POLVORON DOBLE": 1,      // Unidad base
  "HOT-DOG": 6,             // 6 piezas por sartén
  "HAMBURGUESA DE ARO": 6,  // 6 piezas por sartén
  "CONCHA INDIVIDUAL": 6,   // 6 piezas por sartén
  "BARRA CUADRADA": 6,      // 6 piezas por sartén
  "MOLDE": 1                // Molde individual
};

// Función auxiliar para calcular sartenes/latas redondeado hacia arriba
function calcularSartenes(nombreProducto, cantidadTotal) {
  const capacidad = RENDIMIENTO_PRODUCTOS[nombreProducto] || 1;
  return {
    capacidad,
    sartenes: Math.ceil(cantidadTotal / capacidad)
  };
}

// Función auxiliar para formatear Fecha y Hora
function formatearFechaHora(isoString) {
  if (!isoString) return 'N/A';
  const fecha = new Date(isoString);
  return fecha.toLocaleString('es-NI', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}

let vistaMenuPrincipal = '';
let pedidoIdActual = null; // Mantiene el ID si se edita un pedido existente

// Guardar el estado inicial del menú al cargar la página
window.addEventListener('DOMContentLoaded', () => {
  const content = document.getElementById('app-content');
  if (content) {
    vistaMenuPrincipal = content.innerHTML;
  }
});

// Cargar pantalla de pedido e inyectar vendedor
function abrirPedido(vendedor) {
  pedidoIdActual = null; // Reiniciar estado de ID
  fetch('formulario_pedido.html')
    .then(response => {
      if (!response.ok) throw new Error('Error al cargar la plantilla de pedido');
      return response.text();
    })
    .then(html => {
      document.getElementById('app-content').innerHTML = html;
      const elVendedor = document.getElementById('nombre-vendedor');
      if (elVendedor) elVendedor.innerText = vendedor;
      
      // Buscar si el vendedor ya tiene un borrador guardado hoy
      cargarPedidoExistente(vendedor);
    })
    .catch(error => console.error('Error:', error));
}

// Regresar al menú principal
function volverInicio() {
  const appContent = document.getElementById('app-content');
  if (appContent && vistaMenuPrincipal) {
    appContent.innerHTML = vistaMenuPrincipal;
  }
}

// Cálculo en tiempo real de Pan, Dinero y Diferencia
function calcularPedido() {
  let sumaUnidades = 0;
  let sumaMontoPedido = 0;
  let sumaEfectivo = 0;

  // 1. Recorrer la tabla de productos
  const filasProductos = document.querySelectorAll('#tabla-productos tbody tr');
  filasProductos.forEach(fila => {
    const elPrecio = fila.querySelector('.precio');
    const inputCant = fila.querySelector('.cant-prod');
    
    const precio = parseFloat(elPrecio ? elPrecio.innerText.replace('C$', '') : 0) || 0;
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

  // 2. Recorrer desglose de dinero
  const inputsDinero = document.querySelectorAll('#tabla-dinero input');
  inputsDinero.forEach(input => {
    const denominacion = parseFloat(input.getAttribute('data-denom')) || 0;
    const cantidadBilletes = parseInt(input.value) || 0;
    sumaEfectivo += denominacion * cantidadBilletes;
  });

  const elTotalEfectivo = document.getElementById('total-efectivo');
  if (elTotalEfectivo) elTotalEfectivo.innerText = `C$${sumaEfectivo.toFixed(2)}`;

  // 3. Evaluar Diferencia / Saldo
  const diferencia = sumaEfectivo - sumaMontoPedido;
  const boxDiferencia = document.getElementById('box-diferencia');
  
  if (boxDiferencia) {
    boxDiferencia.innerText = `C$${diferencia.toFixed(2)}`;
    if (diferencia === 0) {
      boxDiferencia.style.backgroundColor = '#28a745'; // Verde: Cabal
    } else if (diferencia < 0) {
      boxDiferencia.style.backgroundColor = '#dc3545'; // Rojo: Falta/Deuda
    } else {
      boxDiferencia.style.backgroundColor = '#fd7e14'; // Naranja: Sobrante
    }
  }
}

// Extraer objeto estructurado del formulario
function obtenerPayloadFormulario(estadoAccion = 'GUARDADO') {
  const elVendedor = document.getElementById('nombre-vendedor');
  const vendedor = elVendedor ? elVendedor.innerText : '';
  const productos = [];
  const desgloseEfectivo = {};

  // Extraer únicamente productos con cantidad > 0
  const filasProductos = document.querySelectorAll('#tabla-productos tbody tr');
  filasProductos.forEach(fila => {
    const nombre = fila.cells[0].innerText.trim();
    const elPrecio = fila.querySelector('.precio');
    const inputCant = fila.querySelector('.cant-prod');
    
    const precio = parseFloat(elPrecio ? elPrecio.innerText.replace('C$', '') : 0) || 0;
    const cantidad = parseInt(inputCant ? inputCant.value : 0) || 0;
    
    if (cantidad > 0) {
      productos.push({ producto: nombre, precio, cantidad, subtotal: precio * cantidad });
    }
  });

  // Extraer denominaciones de billetes/monedas
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

// Guardar o Actualizar el borrador del pedido en Supabase
async function guardarPedido(datosPedido) {
  const payload = datosPedido || obtenerPayloadFormulario('GUARDADO');

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

    console.log('Pedido guardado correctamente:', respuesta.data);
    alert('💾 Pedido borrador guardado con éxito.');
  } catch (error) {
    console.error('Error al guardar pedido:', error);
    alert('❌ Ocurrió un error al registrar el borrador.');
  }
}

// Liquidar pedido (Cierre con entrega de dinero)
async function liquidarPedido() {
  const payload = obtenerPayloadFormulario('LIQUIDADO');

  try {
    let respuesta;
    if (pedidoIdActual) {
      respuesta = await supabaseClient
        .from('pedidos')
        .update(payload)
        .eq('id', pedidoIdActual);
    } else {
      respuesta = await supabaseClient
        .from('pedidos')
        .insert([payload]);
    }

    if (respuesta.error) throw respuesta.error;
    alert('🏁 Pedido liquidado correctamente.');
  } catch (error) {
    console.error('Error al liquidar:', error);
    alert('❌ Ocurrió un error al liquidar el pedido.');
  }
}

// Cargar datos previos si el vendedor ya tenía un registro en el día
async function cargarPedidoExistente(vendedor) {
  try {
    const inicioHoy = new Date();
    inicioHoy.setHours(0, 0, 0, 0);

    const { data, error } = await supabaseClient
      .from('pedidos')
      .select('*')
      .eq('vendedor', vendedor)
      .gte('created_at', inicioHoy.toISOString())
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) throw error;

    if (data && data.length > 0) {
      const registro = data[0];
      pedidoIdActual = registro.id;

      // Cargar cantidades guardadas de productos
      const filasProductos = document.querySelectorAll('#tabla-productos tbody tr');
      filasProductos.forEach(fila => {
        const nombre = fila.cells[0].innerText.trim();
        const prodGuardado = registro.productos.find(p => p.producto === nombre);
        const inputCant = fila.querySelector('.cant-prod');
        if (prodGuardado && inputCant) {
          inputCant.value = prodGuardado.cantidad;
        }
      });

      // Cargar desglose de efectivo si existe
      if (registro.desglose_efectivo) {
        const inputsDinero = document.querySelectorAll('#tabla-dinero input');
        inputsDinero.forEach(input => {
          const denom = input.getAttribute('data-denom');
          if (registro.desglose_efectivo[denom] !== undefined) {
            input.value = registro.desglose_efectivo[denom];
          }
        });
      }

      calcularPedido();
    }
  } catch (err) {
    console.warn('Sin pedidos previos registrados hoy para este vendedor:', err);
  }
}

// Limpiar formulario
function limpiarFormulario() {
  const todosInputs = document.querySelectorAll('input[type="number"]');
  todosInputs.forEach(input => input.value = '');
  pedidoIdActual = null;
  calcularPedido();
}

// Abrir y procesar la vista de Arqueo General
function abrirArqueoGeneral() {
  fetch('arqueo_general.html')
    .then(response => {
      if (!response.ok) throw new Error('Error al cargar arqueo_general.html');
      return response.text();
    })
    .then(html => {
      document.getElementById('app-content').innerHTML = html;
      
      // Mostrar la fecha de hoy en pantalla
      const hoy = new Date();
      const elFecha = document.getElementById('fecha-arqueo');
      if (elFecha) {
        elFecha.innerText = hoy.toLocaleDateString('es-NI', {
          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });
      }

      // Cargar los datos desde Supabase
      procesarArqueoGeneral();
    })
    .catch(err => console.error('Error abriendo Arqueo General:', err));
}

function establecerFechasPorDefecto() {
  const hoy = new Date().toISOString().split('T')[0];
  const inputInicio = document.getElementById('fecha-inicio');
  const inputFin = document.getElementById('fecha-fin');

  if (inputInicio && !inputInicio.value) inputInicio.value = hoy;
  if (inputFin && !inputFin.value) inputFin.value = hoy;
}

function cargarHoy() {
  const hoy = new Date().toISOString().split('T')[0];
  const inputInicio = document.getElementById('fecha-inicio');
  const inputFin = document.getElementById('fecha-fin');
  if (inputInicio) inputInicio.value = hoy;
  if (inputFin) inputFin.value = hoy;
  procesarArqueoGeneral();
}

// Consultar Supabase con rango de fechas dinámico (Arqueo General con Fecha/Hora)
async function procesarArqueoGeneral() {
  try {
    establecerFechasPorDefecto();

    const fechaInicioVal = document.getElementById('fecha-inicio').value;
    const fechaFinVal = document.getElementById('fecha-fin').value;

    const inicio = new Date(`${fechaInicioVal}T00:00:00`);
    const fin = new Date(`${fechaFinVal}T23:59:59.999`);

    const { data: pedidos, error } = await supabaseClient
      .from('pedidos')
      .select('*')
      .gte('created_at', inicio.toISOString())
      .lte('created_at', fin.toISOString())
      .order('created_at', { ascending: false });

    if (error) throw error;

    let sumaTotalPan = 0;
    let sumaTotalEfectivo = 0;
    
    const consolidadoBilletes = {
      '36.5': 0, '1000': 0, '500': 0, '200': 0, '100': 0,
      '50': 0, '20': 0, '10': 0, '5': 0, '1': 0, '0.5': 0
    };

    const tbodyVendedores = document.querySelector('#tabla-vendedores-arqueo tbody');
    if (tbodyVendedores) tbodyVendedores.innerHTML = '';

    if (!pedidos || pedidos.length === 0) {
      if (tbodyVendedores) {
        tbodyVendedores.innerHTML = '<tr><td colspan="6" style="text-align:center;">No hay registros en el rango de fechas seleccionado.</td></tr>';
      }
    } else {
      pedidos.forEach(p => {
        sumaTotalPan += parseFloat(p.total_monto) || 0;
        sumaTotalEfectivo += parseFloat(p.total_efectivo) || 0;

        if (p.desglose_efectivo) {
          for (const denom in p.desglose_efectivo) {
            if (consolidadoBilletes[denom] !== undefined) {
              consolidadoBilletes[denom] += parseInt(p.desglose_efectivo[denom]) || 0;
            }
          }
        }

        const dif = parseFloat(p.diferencia) || 0;
        let claseDif = dif === 0 ? 'texto-verde' : (dif < 0 ? 'texto-rojo' : 'texto-naranja');
        const fechaHoraFormateada = formatearFechaHora(p.created_at);

        if (tbodyVendedores) {
          const fila = document.createElement('tr');
          fila.innerHTML = `
            <td><strong>${p.vendedor}</strong></td>
            <td>${fechaHoraFormateada}</td>
            <td>C$ ${parseFloat(p.total_monto || 0).toFixed(2)}</td>
            <td>C$ ${parseFloat(p.total_efectivo || 0).toFixed(2)}</td>
            <td class="${claseDif}">C$ ${dif.toFixed(2)}</td>
            <td><span class="badge-estado ${p.estado ? p.estado.toLowerCase() : 'pendiente'}">${p.estado || 'PENDIENTE'}</span></td>
          `;
          tbodyVendedores.appendChild(fila);
        }
      });
    }

    // Actualizar Tarjetas
    const elCardPan = document.getElementById('card-total-pan');
    const elCardEfectivo = document.getElementById('card-total-efectivo');
    if (elCardPan) elCardPan.innerText = `C$${sumaTotalPan.toFixed(2)}`;
    if (elCardEfectivo) elCardEfectivo.innerText = `C$${sumaTotalEfectivo.toFixed(2)}`;
    
    const diferenciaTotal = sumaTotalEfectivo - sumaTotalPan;
    const cardDif = document.getElementById('card-diferencia');
    const cardDifBox = document.getElementById('card-diferencia-box');
    
    if (cardDif) cardDif.innerText = `C$${diferenciaTotal.toFixed(2)}`;
    if (cardDifBox) {
      if (diferenciaTotal === 0) {
        cardDifBox.style.backgroundColor = '#28a745';
      } else if (diferenciaTotal < 0) {
        cardDifBox.style.backgroundColor = '#dc3545';
      } else {
        cardDifBox.style.backgroundColor = '#fd7e14';
      }
    }

    // Actualizar Tabla Billetes Consolidados
    const tbodyBilletes = document.querySelector('#tabla-consolidado-dinero tbody');
    if (tbodyBilletes) {
      tbodyBilletes.innerHTML = '';
      const denomsOrdenadas = ['1000', '500', '200', '100', '50', '20', '10', '5', '1', '0.5', '36.5'];
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
    alert('❌ Ocurrió un error al cargar los datos.');
  }
}

// Exportar vista a Excel (.csv)
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

// ==========================================
// MÓDULO DE PEDIDO / RESUMEN DE PRODUCCIÓN
// ==========================================

function abrirModulo(modulo) {
  if (modulo === 'PEDIDO') {
    fetch('pedido_resumen.html')
      .then(response => {
        if (!response.ok) throw new Error('Error al cargar pedido_resumen.html');
        return response.text();
      })
      .then(html => {
        document.getElementById('app-content').innerHTML = html;
        procesarResumenPedidos();
      })
      .catch(err => console.error('Error abriendo Resumen de Pedidos:', err));
  }
}

function establecerFechasPorDefectoPedidos() {
  const hoy = new Date().toISOString().split('T')[0];
  const inputInicio = document.getElementById('fecha-inicio-pedido');
  const inputFin = document.getElementById('fecha-fin-pedido');

  if (inputInicio && !inputInicio.value) inputInicio.value = hoy;
  if (inputFin && !inputFin.value) inputFin.value = hoy;
}

function cargarHoyPedidos() {
  const hoy = new Date().toISOString().split('T')[0];
  const inputInicio = document.getElementById('fecha-inicio-pedido');
  const inputFin = document.getElementById('fecha-fin-pedido');
  if (inputInicio) inputInicio.value = hoy;
  if (inputFin) inputFin.value = hoy;
  procesarResumenPedidos();
}

async function procesarResumenPedidos() {
  try {
    establecerFechasPorDefectoPedidos();

    const fechaInicioVal = document.getElementById('fecha-inicio-pedido').value;
    const fechaFinVal = document.getElementById('fecha-fin-pedido').value;

    const inicio = new Date(`${fechaInicioVal}T00:00:00`);
    const fin = new Date(`${fechaFinVal}T23:59:59.999`);

    const { data: pedidos, error } = await supabaseClient
      .from('pedidos')
      .select('productos')
      .gte('created_at', inicio.toISOString())
      .lte('created_at', fin.toISOString());

    if (error) throw error;

    // Objeto para acumular piezas pedidas por cada ítem individual
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

    // Helper para obtener cantidad
    const getCant = (nombre) => totales[nombre] || 0;

    // ==========================================
    // CÁLCULO CONSOLIDADO PARA HORNO
    // ==========================================
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
      
      // PRODUCCIÓN EN LATAS (48 pzs/lata)
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
      }
    ];

    // Llenar Tabla Consolidada
    const tbodyHorno = document.querySelector('#tabla-consolidado-horno tbody');
    if (tbodyHorno) tbodyHorno.innerHTML = '';
    
    let sumaSartenesTotales = 0;
    let sumaPiezasTotales = 0;

    gruposHorno.forEach(g => {
      if (g.piezasBase > 0 || g.sartenes > 0) {
        sumaSartenesTotales += g.sartenes;
        sumaPiezasTotales += g.piezasBase;

        if (tbodyHorno) {
          const fila = document.createElement('tr');
          fila.innerHTML = `
            <td><strong>${g.nombre}</strong></td>
            <td>${g.formulaTexto}</td>
            <td>${g.rendimientoTexto}</td>
            <td><strong style="color: #d9534f; font-size: 1.1em;">${g.sartenes}</strong></td>
          `;
          tbodyHorno.appendChild(fila);
        }
      }
    });

    if (tbodyHorno && tbodyHorno.children.length === 0) {
      tbodyHorno.innerHTML = '<tr><td colspan="4" style="text-align:center;">No hay pedidos registrados en la fecha seleccionada.</td></tr>';
    }

    // Llenar Tabla Desglosada para Admin
    const tbodyAdmin = document.querySelector('#tabla-resumen-produccion tbody');
    if (tbodyAdmin) tbodyAdmin.innerHTML = '';

    const listaProdNombres = Object.keys(totales);
    if (listaProdNombres.length === 0) {
      if (tbodyAdmin) {
        tbodyAdmin.innerHTML = '<tr><td colspan="3" style="text-align:center;">No hay productos solicitados.</td></tr>';
      }
    } else {
      listaProdNombres.forEach(nombreProd => {
        const cant = totales[nombreProd];
        if (cant > 0 && tbodyAdmin) {
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

    // Actualizar Tarjetas de Resumen Superior
    const elCardPiezas = document.getElementById('card-total-piezas');
    const elCardSartenes = document.getElementById('card-total-sartenes');
    if (elCardPiezas) elCardPiezas.innerText = sumaPiezasTotales;
    if (elCardSartenes) elCardSartenes.innerText = sumaSartenesTotales;

  } catch (err) {
    console.error('Error procesando el resumen de pedidos:', err);
    alert('❌ Ocurrió un error al consolidar los pedidos.');
  }
}
