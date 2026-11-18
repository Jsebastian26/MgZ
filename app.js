document.addEventListener('DOMContentLoaded', () => {
    // REEMPLAZA ESTE NUMERO POR EL WHATSAPP BUSINESS DE MGZ (57 + 10 digitos)
    const WHATSAPP_NEGOCIO = "573000000000";

    const services = [
        { id: 'cut', name: 'Corte de Cabello', description: 'Fade, mullet, taper o clasico con navaja.', price: 25000, isHaircut: true },
        { id: 'dye', name: 'Pintura de Pelo', description: 'Platinados, rayos, mechas o color completo.', price: 60000, isHaircut: false },
        { id: 'mask', name: 'Mascarilla Facial / Capilar', description: 'Limpieza profunda puntos negros e hidratacion.', price: 30000, isHaircut: false },
        { id: 'beard', name: 'Tratamiento de Barberia', description: 'Perfilado de barba, vapor y toalla caliente.', price: 20000, isHaircut: false }
    ];

    let selectedServiceIds = new Set();

    const servicesGrid = document.getElementById('services-grid');
    const bookingForm = document.getElementById('booking-form');
    const sessionTokenInput = document.getElementById('session-token');
    const submitBtn = document.getElementById('submit-btn');
    const globalError = document.getElementById('form-global-error');
    
    const modal = document.getElementById('confirmation-modal');
    const modalBody = document.getElementById('modal-body');
    const whatsappBtn = document.getElementById('whatsapp-redirect-btn');
    const modalCloseBtn = document.getElementById('modal-close-btn');

    sessionTokenInput.value = SecurityManager.generateSessionToken();

    function renderServices() {
        servicesGrid.innerHTML = '';
        services.forEach(service => {
            const card = document.createElement('div');
            card.className = `service-card ${selectedServiceIds.has(service.id) ? 'selected' : ''}`;
            card.dataset.id = service.id;

            const title = document.createElement('h3');
            title.textContent = service.name;

            const desc = document.createElement('p');
            desc.textContent = service.description;

            const price = document.createElement('span');
            price.className = 'price';
            price.textContent = `$${service.price.toLocaleString()} COP`;

            card.appendChild(title);
            card.appendChild(desc);
            card.appendChild(price);

            card.addEventListener('click', () => {
                if (selectedServiceIds.has(service.id)) {
                    selectedServiceIds.delete(service.id);
                    card.classList.remove('selected');
                } else {
                    selectedServiceIds.add(service.id);
                    card.classList.add('selected');
                }
            });

            servicesGrid.appendChild(card);
        });
    }

    function updateLoyaltyUI() {
        const count = SecurityManager.LoyaltyStorage.getCounter();
        const counterText = document.getElementById('loyalty-counter-text');
        const progressFill = document.getElementById('progress-fill');

        if (count >= 5) {
            counterText.textContent = 'CORTE GRATIS ACTIVADO PARA ESTE TURNO';
            progressFill.style.width = '100%';
        } else {
            counterText.textContent = `Cortes acumulados: ${count} / 5`;
            progressFill.style.width = `${(count / 5) * 100}%`;
        }
    }

    bookingForm.addEventListener('submit', (e) => {
        e.preventDefault();
        globalError.textContent = '';
        document.querySelectorAll('.error-message').forEach(el => el.textContent = '');

        if (selectedServiceIds.size === 0) {
            globalError.textContent = 'Selecciona al menos un servicio primero.';
            return;
        }

        if (!SecurityManager.validateSessionToken(sessionTokenInput.value)) {
            globalError.textContent = 'Sesion vencida. Recarga la pagina para continuar.';
            return;
        }

        const nameInput = document.getElementById('client-name');
        const phoneInput = document.getElementById('client-phone');
        const emailInput = document.getElementById('client-email');
        const dateInput = document.getElementById('booking-date');

        const vName = SecurityManager.validators.name(nameInput.value);
        const vPhone = SecurityManager.validators.phone(phoneInput.value);
        const vEmail = SecurityManager.validators.email(emailInput.value);
        const vDate = SecurityManager.validators.date(dateInput.value);

        let hasError = false;

        if (!vName.isValid) {
            document.getElementById('error-name').textContent = 'Pon un nombre valido (solo letras).';
            hasError = true;
        }
        if (!vPhone.isValid) {
            document.getElementById('error-phone').textContent = 'Pon un numero valido (7 a 15 digitos).';
            hasError = true;
        }
        if (!vEmail.isValid) {
            document.getElementById('error-email').textContent = 'Correo no valido.';
            hasError = true;
        }
        if (!vDate.isValid) {
            document.getElementById('error-date').textContent = 'Elige una fecha y hora futura.';
            hasError = true;
        }

        if (hasError) return;

        submitBtn.disabled = true;
        submitBtn.textContent = 'ARMANDO TU TURNO...';

        let hasHaircutSelected = false;
        selectedServiceIds.forEach(id => {
            const s = services.find(serv => serv.id === id);
            if (s && s.isHaircut) hasHaircutSelected = true;
        });

        let currentLoyalty = SecurityManager.LoyaltyStorage.getCounter();
        let isFreeHaircutApplied = false;

        if (hasHaircutSelected) {
            if (currentLoyalty >= 5) {
                isFreeHaircutApplied = true;
                SecurityManager.LoyaltyStorage.setCounter(0);
            } else {
                SecurityManager.LoyaltyStorage.setCounter(currentLoyalty + 1);
            }
        }

        let totalPrice = 0;
        let listaServiciosTexto = [];
        const fechaFormateada = vDate.sanitized.replace('T', ' ');

        let summaryDetailsHTML = `
            <p><strong>Cliente:</strong> ${vName.sanitized}</p>
            <p><strong>WhatsApp:</strong> ${vPhone.sanitized}</p>
            <p><strong>Fecha y Hora:</strong> ${fechaFormateada}</p>
            <p><strong>Servicios:</strong></p>
            <ul>
        `;

        selectedServiceIds.forEach(id => {
            const s = services.find(serv => serv.id === id);
            if (s) {
                let priceToApply = s.price;
                if (s.isHaircut && isFreeHaircutApplied) {
                    priceToApply = 0;
                    summaryDetailsHTML += `<li>${s.name} - <strong>GRATIS (Premio Lealtad MgZ)</strong></li>`;
                    listaServiciosTexto.push(`${s.name} (GRATIS - Premio Lealtad)`);
                    isFreeHaircutApplied = false;
                } else {
                    summaryDetailsHTML += `<li>${s.name} - $${s.price.toLocaleString()} COP</li>`;
                    listaServiciosTexto.push(`${s.name} ($${s.price.toLocaleString()})`);
                }
                totalPrice += priceToApply;
            }
        });

        summaryDetailsHTML += `</ul>
            <p style="margin-top: 0.75rem;"><strong>Total en efectivo:</strong> $${totalPrice.toLocaleString()} COP</p>
            <p style="margin-top: 0.5rem; color: var(--neon-pink);"><strong>OJO:</strong> Llega 15 minutos antes o se cancela la cita.</p>
        `;

        const mensajeWhatsApp = 
            `Que mas MgZ, quiero separar mi turno:\n\n` +
            `*Cliente:* ${vName.rawClean}\n` +
            `*Fecha y Hora:* ${fechaFormateada}\n` +
            `*Servicios:* ${listaServiciosTexto.join(', ')}\n` +
            `*Total a pagar en efectivo:* $${totalPrice.toLocaleString()} COP\n` +
            `*Cortes acumulados:* ${SecurityManager.LoyaltyStorage.getCounter()} / 5\n\n` +
            `_Regla clara: Llego 15 minutos antes o se cancela la cita._`;

        const urlWhatsApp = `https://wa.me/${WHATSAPP_NEGOCIO}?text=${encodeURIComponent(mensajeWhatsApp)}`;
        whatsappBtn.href = urlWhatsApp;

        modalBody.innerHTML = summaryDetailsHTML;
        modal.classList.add('active');

        SecurityManager.consumeSessionToken();

        setTimeout(() => {
            window.open(urlWhatsApp, '_blank', 'noopener,noreferrer');
        }, 1000);
    });

    modalCloseBtn.addEventListener('click', () => {
        modal.classList.remove('active');
        window.location.reload();
    });

    // --- LOGICA DEL CARRUSEL DE FOTOS ---
    const slides = document.querySelectorAll('.carousel-slide');
    const dotsContainer = document.getElementById('carousel-dots');
    const prevBtn = document.getElementById('prev-slide');
    const nextBtn = document.getElementById('next-slide');
    let currentSlide = 0;

    // Crear puntos indicadores
    slides.forEach((_, index) => {
        const dot = document.createElement('div');
        dot.className = `dot ${index === 0 ? 'active' : ''}`;
        dot.addEventListener('click', () => goToSlide(index));
        dotsContainer.appendChild(dot);
    });

    const dots = document.querySelectorAll('.dot');

    function goToSlide(index) {
        slides[currentSlide].classList.remove('active');
        dots[currentSlide].classList.remove('active');
        
        currentSlide = (index + slides.length) % slides.length;
        
        slides[currentSlide].classList.add('active');
        dots[currentSlide].classList.add('active');
    }

    prevBtn.addEventListener('click', () => goToSlide(currentSlide - 1));
    nextBtn.addEventListener('click', () => goToSlide(currentSlide + 1));

    // Soporte para deslizar con el dedo en celulares (Touch Swipe)
    let touchStartX = 0;
    const track = document.getElementById('carousel-track');
    track.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    track.addEventListener('touchend', (e) => {
        const touchEndX = e.changedTouches[0].screenX;
        if (touchStartX - touchEndX > 40) goToSlide(currentSlide + 1);
        if (touchEndX - touchStartX > 40) goToSlide(currentSlide - 1);
    }, { passive: true });

    renderServices();
    updateLoyaltyUI();
});