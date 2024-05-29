import L from './leaflet.js';

class Markers {

	// Стейт
	state = [];
	// Маркеры
	markers = [];
	// Скрытые маркеры
	hidedMarkers = [];
	// Цвет маркера по умолчанию
	markerColor = "#0099ff";
	// Координаты по умолчанию
	defaultLatlng = [55.750494675436116, 37.617487907409675];
	// Масштаб по умолчанию
	scale = 8;

	constructor() {
		this.addMarker = this.addMarker.bind(this);
		this.createMarker = this.createMarker.bind(this);

		// Инициализация
		this.init();
	}

	init() {
		// Получаем сохраненные данные
		const state = this.loadState();

		// Координаты последнего маркера или по умолчанию
		const lastLatlng = state.at(-1)?.latlng || this.defaultLatlng;

		// Инициализация карты
		this.map = L.map('map').setView(lastLatlng, this.scale);

		// Используем OpenStreetMap
		L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(this.map);

		// Инициализация событий
		this.initEvents();

		// Инициализация маркеров
		state.forEach(this.createMarker);
	}

	initEvents() {
		// Получаем поле поиска
		const searchInput = document.getElementById('searchInput');
		
		// Фильтрация маркеров по введенному тексту
		searchInput.addEventListener('input', e => {
			var searchText = e.target.value.trim();
			this.filterMarkers(searchText);
		});

		// Добавление маркера по клику на карту
		this.map.on('click', async ({ latlng }) => {
			try {
				// Запрашиваем данные
				const markerObject = await this.prompt({ latlng });
				// Создаем маркер
				this.createMarker(markerObject);
			}catch(e) {
				return;
			}
		});
	}

	createMarker(markerObject) {
		const { latlng, color } = markerObject;
		// Получаем индекс будущего элемента
		const index = this.state.length;

		// Сохраняем маркер в стейте
		this.state.push(markerObject);

		// Создаем попап
		const popup = this.getPopup(markerObject);

		// Получаем элементы попапа
		const $title = popup.querySelector('.popup-title');
		const $description = popup.querySelector('.popup-description');
		const $type = popup.querySelector('.popup-type');
		const $editBtn = popup.querySelector('#editBtn');
		const $removeBtn = popup.querySelector('#removeBtn');

		// Добавляем маркер
		const marker = this.addMarker({ latlng, popup, color });

		// Обработчик клика по кнопке "Изменить"
		$editBtn.addEventListener('click', async () => {
			try {
				// Запрашиваем данные
				const newMarkerObject = await this.prompt(markerObject);
				// Получаем новый маркер
				const newIcon = this.getIcon(newMarkerObject.color);

				// Обновляем визуал попапа
				$title.value = newMarkerObject.title;
				$description.value = newMarkerObject.description;
				$type.value = newMarkerObject.type;
				marker.setIcon(newIcon);

				// Возвращаем попап на карту
				marker._popup.openOn(this.map);

				// Обновляем маркер в стейте
				this.state[index] = newMarkerObject;
				// Сохраняем в localStorage
				this.saveState();
			}catch(e){
				// Возвращаем попап на карту
				marker._popup.openOn(this.map);
			}
		});

		$removeBtn.addEventListener('click', () => {
			// Удаляем маркер
			this.removeMarker(marker);
			// Удаляем маркер из стейта
			delete this.state[index];
			// Сохраняем в localStorage
			this.saveState();
		});

		// Сохраняем в localStorage
		this.saveState();
	}

	async prompt({
		latlng,
		title = '',
		description = '',
		type = '',
		color = this.markerColor
	}) {
		return new Promise((resolve, reject) => {
			// Созадём форму
			const prompt = document.createElement('form');
			prompt.classList.add('prompt');
			
			prompt.innerHTML = `
				<div class="popup-content">
					<input type="text" name="title" value="${title}" autocomplete="off" placeholder="Название" />
					<textarea name="description" placeholder="Описание">${description}</textarea>
					<input type="text" name="type" value="${type}" autocomplete="off" placeholder="Тип" />
					<label class="popup-color">
						<input type="color" name="color" value="${color}" />
						Цвет маркера: <div class="pin" id="markerColor" style="--color: ${color}"></div>
					</label>
				</div>
				<div class="popup-actions">
					<button type="button" class="popup-btn red" id="cancelBtn">Отмена</button>
					<button type="button" class="popup-btn green" id="saveBtn">Сохранить</button>
				</div>
			`;

			// Создаём попап и задаём параметры
			const popup = L.popup();
			popup.setLatLng(latlng);
			popup.setContent(prompt);

			// Получаем кнопки
			const $saveBtn = prompt.querySelector('#saveBtn');
			const $cancelBtn = prompt.querySelector('#cancelBtn');

			$saveBtn.addEventListener('click', (e) => {
				e.preventDefault();
				
				// Получаем данные из формы
				const title = prompt.elements.title.value;
				const description = prompt.elements.description.value;
				const type = prompt.elements.type.value;
				const color = prompt.elements.color.value;

				// Возвращаем данные
				resolve({ latlng, title, description, type, color });

				// Закрываем попап
				popup.close();
			});

			// Закрываем попап при отмене
			$cancelBtn.addEventListener('click', popup.close.bind(popup));

			prompt.elements.color.addEventListener('change', ({ target }) => {
				// Получаем цвет
				const color = target.value;
				// Обновляем представление
				prompt.querySelector('#markerColor').setAttribute("style", "--color: " + color);
			});

			// reject при закрытии попапа
			popup.on('remove', reject);

			// Открываем попап
			popup.openOn(this.map);
		})
	}

	getIcon(color) {
		return L.divIcon({
			className: 'pin-parent',
			iconSize: [20, 27],
			iconAnchor: [12, 38],
			popupAnchor: [0.5, -16],
			color,
			html: `<div class="pin" style="--color: ${color}"></div>`
		  })
	}

	getPopup({ title, description, type }) {
		const popup = document.createElement('div');
		popup.classList.add('popup');
		
		popup.innerHTML = `
			<div class="popup-content">
				<strong class="popup-title">${title}</strong>
				<p class="popup-description">${description}</p>
				<small class="popup-type"><em>${type}</em></small>
			</div>
			<div class="popup-actions">
				<button class="popup-btn" id="editBtn">Изменить</button>
				<button class="popup-btn red" id="removeBtn">Удалить</button>
			</div>
		`;

		return popup;
	}

	addMarker({ latlng, popup, color = this.markerColor }) {
		// Получаем объект иконки маркера
		const icon = this.getIcon(color);
		// Создаём и добавляем маркер
		const marker = L.marker(latlng, { draggable: true, icon }).addTo(this.map);
		// Биндим попап
		marker.bindPopup(popup);
		// Сохраняем маркер в коллекцию
		this.markers.push(marker);
		// Возвращаем маркер
		return marker;
	}

	removeMarker(marker) {
		// Удаляем маркер с карты
		this.map.removeLayer(marker);
		// Удаляем маркер из коллекции
		this.markers = this.markers.filter(_marker => {
			return _marker !== marker;
		});
		// Сохраняем стейт
		this.saveState();
	}

	filterMarkers(text) {
		// Если есть скрытые маркеры
		// Показываем их
		if (this.hidedMarkers) {
			this.hidedMarkers.forEach(marker => {
				if (!this.map.hasLayer(marker)) {
					this.map.addLayer(marker);
				}
			});
			// Очищаем массив
			this.hideMarkers = [];
		}

		// Если текста нет, то ничего не делаем
		if (!text) { return }
		
		this.state.forEach((marker, key) => {
			// Проверяем, содержится ли текст в описании
			if (!marker.description.toLowerCase().includes(text.toLowerCase())) {
				this.hidedMarkers.push(this.markers[key]);
				// Если нет, то скрываем маркер
				this.map.removeLayer(this.markers[key]);
			}
		})
	}

	saveState() {
		// Удаляем пустые индексы
		const notNullState = this.state.filter(marker => !!marker);
		// Сохраняем стейт
		localStorage.setItem('markers', JSON.stringify(notNullState));
	}

	loadState() {
		// Загружаем стейт
		return JSON.parse(localStorage.getItem('markers')) || [];
	}

}

export default Markers;
