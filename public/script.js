// Estado de la reserva
const reservaState = {
  step: 1,
  personas: null,
  fecha: null,
  hora: null,
  nombre: '',
  telefono: '',
  email: ''
};

// Elementos del DOM
const stepElements = document.querySelectorAll('.step');
const stepContentElements = document.querySelectorAll('.step-content');
const progressBar = document.getElementById('step-progress');
const peopleOptions = document.querySelectorAll('.people-option');
const calendarEl = document.getElementById('calendar');
const timeSlotsEl = document.getElementById('time-slots');
const timesContainer = document.getElementById('times-container');
const currentMonthEl = document.getElementById('current-month');
const prevMonthBtn = document.querySelector('.prev-month');
const nextMonthBtn = document.querySelector('.next-month');
const selectedDateEl = document.getElementById('selected-date');
const submitReservaBtn = document.getElementById('submitReserva');
const resultContainer = document.getElementById('result-container');
const loadingEl = document.getElementById('loading');
const stepsContainer = document.querySelector('.steps-container');

// Configuración del proxy
const PROXY_URL = '/api/proxy';
const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbwrRAE5oPxXNU9xVkBUZO27wfVYoKRVPyVNVxgsalJpoa9XFfWGbjLQSXieIDl2QZ7a/exec'; // Reemplazar con tu URL de Google Web App

// Configuración inicial
document.addEventListener('DOMContentLoaded', function() {
  initCalendar();
  setupEventListeners();
  setupStepNavigation();
  setupFormValidation();
  updateStep();
});

// Inicializar calendario
function initCalendar() {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  
  renderCalendar(year, month);
}

// Renderizar calendario
function renderCalendar(year, month) {
  calendarEl.innerHTML = '';
  
  // Encabezados de días
  const dayNames = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
  dayNames.forEach(day => {
    const dayEl = document.createElement('div');
    dayEl.className = 'calendar-day-name';
    dayEl.textContent = day;
    calendarEl.appendChild(dayEl);
  });
  
  // Primer día del mes
  const firstDay = new Date(year, month, 1).getDay();
  // Último día del mes
  const lastDate = new Date(year, month + 1, 0).getDate();
  // Fecha actual
  const today = new Date();
  
  // Días vacíos al inicio
  for (let i = 0; i < firstDay; i++) {
    const emptyEl = document.createElement('div');
    emptyEl.className = 'calendar-day disabled';
    emptyEl.textContent = '';
    calendarEl.appendChild(emptyEl);
  }
  
  // Días del mes
  for (let i = 1; i <= lastDate; i++) {
    const date = new Date(year, month, i);
    const dayEl = document.createElement('div');
    dayEl.className = 'calendar-day';
    dayEl.textContent = i;
    dayEl.dataset.date = date.toISOString().split('T')[0];
    
    // Deshabilitar días pasados
    if (date < today && date.toDateString() !== today.toDateString()) {
      dayEl.classList.add('disabled');
    }
    
    // Resaltar día seleccionado
    if (reservaState.fecha && reservaState.fecha === dayEl.dataset.date) {
      dayEl.classList.add('selected');
    }
    
    dayEl.addEventListener('click', () => {
      if (dayEl.classList.contains('disabled')) return;
      
      // Remover selección anterior
      document.querySelectorAll('.calendar-day.selected').forEach(el => {
        el.classList.remove('selected');
      });
      
      // Seleccionar nuevo día
      dayEl.classList.add('selected');
      reservaState.fecha = dayEl.dataset.date;
      
      // Actualizar fecha seleccionada en el UI
      const dateObj = new Date(reservaState.fecha);
      const options = { weekday: 'short', day: 'numeric', month: 'short' };
      selectedDateEl.textContent = dateObj.toLocaleDateString('es-ES', options);
      
      // Mostrar contenedor de horas
      timesContainer.classList.add('active');
      
      // Cargar horas disponibles
      loadAvailableTimes(reservaState.fecha);
    });
    
    calendarEl.appendChild(dayEl);
  }
  
  // Actualizar título del mes
  const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                     'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  currentMonthEl.textContent = `${monthNames[month]} ${year}`;
}

// Cargar horas disponibles
async function loadAvailableTimes(date) {
  // Mostrar carga
  timeSlotsEl.innerHTML = '<div class="loading">Cargando...</div>';
  
  try {
    // Llamar al proxy para obtener horas disponibles
    const response = await fetch(PROXY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        function: 'getHorasDisponibles',
        parameters: [date, reservaState.personas],
        url: WEB_APP_URL
      })
    });

    const data = await response.json();
    if (data.error) {
      throw new Error(data.error);
    }
    
    renderAvailableTimes(data.result);
  } catch (error) {
    console.error('Error:', error);
    timeSlotsEl.innerHTML = '<div class="error">Error al cargar horas</div>';
  }
}

// Renderizar horas disponibles
function renderAvailableTimes(times) {
  timeSlotsEl.innerHTML = '';
  
  // Obtener fecha/hora actual (cliente)
  const ahora = new Date();
  const hoy = new Date().toISOString().split('T')[0];
  
  times.forEach(time => {
    const timeEl = document.createElement('div');
    timeEl.className = `time-slot`;
    timeEl.textContent = time;
    
    // Si es hoy, verificar si la hora ya pasó
    if (reservaState.fecha === hoy) {
      const [horas, minutos] = time.split(':').map(Number);
      const horaReserva = new Date();
      horaReserva.setHours(horas, minutos, 0, 0);
      
      // Deshabilitar horas pasadas
      if (horaReserva < ahora) {
        timeEl.classList.add('disabled');
        timeEl.title = 'Esta hora ya pasó';
      }
    }
    
    timeEl.addEventListener('click', () => {
      // No permitir seleccionar horas deshabilitadas
      if (timeEl.classList.contains('disabled')) return;
      
      // Remover selección anterior
      document.querySelectorAll('.time-slot.selected').forEach(el => {
        el.classList.remove('selected');
      });
      
      // Seleccionar nueva hora
      timeEl.classList.add('selected');
      reservaState.hora = time;
      
      // Avanzar automáticamente al paso 3 después de 0.5 segundos
      setTimeout(() => {
        navigateToStep(3);
      }, 500);
    });
    
    timeSlotsEl.appendChild(timeEl);
  });
}

// Configurar navegación entre steps
function setupStepNavigation() {
  stepElements.forEach(step => {
    step.addEventListener('click', function() {
      // Obtener número del step desde el ID
      const stepNumber = parseInt(this.id.replace('step', ''));
      
      // Solo permitir navegar a pasos anteriores completados
      if (stepNumber < reservaState.step) {
        navigateToStep(stepNumber);
      }
    });
  });
}

// Configurar validación de formulario
function setupFormValidation() {
  const nombreInput = document.getElementById('nombre');
  const telefonoInput = document.getElementById('telefono');
  const emailInput = document.getElementById('email');
  
  // Función para validar los campos
  const validateForm = () => {
    const nombreValido = nombreInput.value.trim() !== '';
    const telefonoValido = telefonoInput.value.trim() !== '';
    const emailValido = emailInput.value.trim() !== '';
    
    // Habilitar/deshabilitar botón según validación
    submitReservaBtn.disabled = !(nombreValido && telefonoValido && emailValido);
    
    // Actualizar step 3 si todos los campos están completos
    if (nombreValido && telefonoValido && emailValido) {
      document.getElementById('step3').classList.add('completed');
    } else {
      document.getElementById('step3').classList.remove('completed');
    }
  };
  
  // Agregar event listeners a los inputs
  nombreInput.addEventListener('input', validateForm);
  telefonoInput.addEventListener('input', validateForm);
  emailInput.addEventListener('input', validateForm);
  
  // Validación inicial
  validateForm();
}

// Configurar event listeners
function setupEventListeners() {
  // Selección de personas
  peopleOptions.forEach(option => {
    option.addEventListener('click', () => {
      // Remover selección anterior
      document.querySelectorAll('.people-option.selected').forEach(el => {
        el.classList.remove('selected');
      });
      
      // Seleccionar nueva opción
      option.classList.add('selected');
      reservaState.personas = parseInt(option.dataset.people);
      
      // Avanzar automáticamente al paso 2 después de 0.5 segundos
      setTimeout(() => {
        navigateToStep(2);
      }, 500);
    });
  });
  
  // Cambiar mes en calendario
  prevMonthBtn.addEventListener('click', () => {
    const [year, month] = getCurrentCalendarDate();
    renderCalendar(year, month - 1);
  });
  
  nextMonthBtn.addEventListener('click', () => {
    const [year, month] = getCurrentCalendarDate();
    renderCalendar(year, month + 1);
  });
  
  // Enviar reserva
  submitReservaBtn.addEventListener('click', submitReserva);
}

// Obtener fecha actual del calendario
function getCurrentCalendarDate() {
  const [monthName, year] = currentMonthEl.textContent.split(' ');
  const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                     'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const month = monthNames.indexOf(monthName);
  return [parseInt(year), month];
}

// Navegar entre pasos
function navigateToStep(step) {
  reservaState.step = step;
  updateStep();
}

// Actualizar paso actual
function updateStep() {
  // Actualizar indicadores de pasos
  stepElements.forEach((step, index) => {
    step.classList.remove('active', 'completed');
    if (index + 1 === reservaState.step) {
      step.classList.add('active');
    } else if (index + 1 < reservaState.step) {
      step.classList.add('completed');
      step.style.cursor = 'pointer';
    }
  });
  
  // Actualizar barra de progreso
  progressBar.style.width = `${((reservaState.step - 1) / 2) * 100}%`;
  
  // Mostrar contenido del paso actual
  stepContentElements.forEach((content, index) => {
    content.classList.remove('active');
    if (index + 1 === reservaState.step) {
      content.classList.add('active');
    }
  });
}

// Enviar reserva
async function submitReserva() {
  // Obtener datos del formulario
  reservaState.nombre = document.getElementById('nombre').value;
  reservaState.telefono = document.getElementById('telefono').value;
  reservaState.email = document.getElementById('email').value;
  
  // Mostrar carga
  document.getElementById('step-content3').style.display = 'none';
  loadingEl.style.display = 'block';
  
  // Preparar datos para enviar
  const datosReserva = {
    nombre: reservaState.nombre,
    telefono: reservaState.telefono,
    email: reservaState.email,
    personas: reservaState.personas,
    fecha: reservaState.fecha,
    hora: reservaState.hora
  };
  
  try {
    // Llamar al proxy para crear la reserva
    const response = await fetch(PROXY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        function: 'crearReserva',
        parameters: [datosReserva],
        url: WEB_APP_URL
      })
    });

    const data = await response.json();
    if (data.error) {
      throw new Error(data.error);
    }
    
    loadingEl.style.display = 'none';
    showReservaResult(data.result);
  } catch (error) {
    console.error('Error:', error);
    loadingEl.style.display = 'none';
    alert(error.message || 'Error al crear la reserva');
  }
}

// Mostrar resultado de la reserva
function showReservaResult(reserva) {
  // Actualizar datos en la UI
  document.getElementById('reservaId').textContent = reserva.idReserva;
  document.getElementById('reservaNombre').textContent = reserva.nombre;
  document.getElementById('reservaPersonas').textContent = reserva.personas;
  document.getElementById('reservaFecha').textContent = reserva.fecha;
  document.getElementById('reservaHora').textContent = reserva.hora;
  
  // Ocultar steps
  stepsContainer.style.display = 'none';
  
  // Mostrar resultado
  resultContainer.style.display = 'block';
}

// Nueva reserva
function nuevaReserva() {
  // Resetear estado
  reservaState.step = 1;
  reservaState.personas = null;
  reservaState.fecha = null;
  reservaState.hora = null;
  reservaState.nombre = '';
  reservaState.telefono = '';
  reservaState.email = '';
  
  // Resetear UI
  document.querySelectorAll('.people-option.selected').forEach(el => {
    el.classList.remove('selected');
  });
  
  document.querySelectorAll('.calendar-day.selected').forEach(el => {
    el.classList.remove('selected');
  });
  
  document.querySelectorAll('.time-slot.selected').forEach(el => {
    el.classList.remove('selected');
  });
  
  document.getElementById('nombre').value = '';
  document.getElementById('telefono').value = '';
  document.getElementById('email').value = '';
  
  selectedDateEl.textContent = 'Selecciona una fecha';
  timesContainer.classList.remove('active');
  
  // Mostrar steps nuevamente
  stepsContainer.style.display = 'block';
  
  // Ocultar resultado y mostrar primer paso
  resultContainer.style.display = 'none';
  document.getElementById('step-content1').style.display = 'block';
  
  // Actualizar paso
  updateStep();
  initCalendar();
  
  // Resetear validación de formulario
  submitReservaBtn.disabled = true;
  document.getElementById('step3').classList.remove('completed');
}
