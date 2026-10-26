const el = (tag, text, cls) => {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (cls) node.className = cls;
  return node;
};
const action = (text, fn, context) => {
  const button = el('button', text, 'secondary');
  button.type = 'button';
  if (context) button.setAttribute('aria-label', text + ': ' + context);
  button.addEventListener('click', fn);
  return button;
};
const dateLabel = value => value ? new Date(value + 'T12:00:00Z').toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }) : 'Дата не указана';
export const zoneOf = value => value?.match(/[+-]\d\d:\d\d$/)?.[0] || '+00:00';
export function localStamp(value, source) {
  if (!value) return '—';
  const zone = zoneOf(source || value);
  const sign = zone.startsWith('-') ? -1 : 1;
  const offset = sign * (Number(zone.slice(1, 3)) * 60 + Number(zone.slice(4)));
  return new Date(Date.parse(value) + offset * 60000).toISOString().slice(0, 16);
}
export const timeInZone = (value, source) => localStamp(value, source).slice(11, 16) || '—';
export function endLabel(booking) {
  const stamp = localStamp(booking.end, booking.start);
  return stamp.startsWith(booking.start.slice(0, 10)) ? stamp.slice(11, 16) : stamp.replace('T', ' ');
}
export const productMeta = {
  defaultSection: 'bookings',
  navigation: ['bookings', 'services', 'staff'],
  labels: { bookings: 'Расписание' },
  headings: {
    bookings: ['Расписание', 'Время встречи, сотрудник и буфер — в одной повестке.'],
    services: ['Услуги и интервалы', 'Продолжительность услуги и время после встречи.'],
    staff: ['Сотрудники', 'Ресурсы, которым можно назначать записи.'],
  },
};

let selectedDate = '', selectedStaff = '';
function labelledSelect(label, choices, value, update) {
  const wrap = el('label', label, 'agenda-filter');
  const select = el('select');
  for (const [key, text] of choices) select.append(new Option(text, key));
  select.value = value;
  select.addEventListener('change', () => update(select.value));
  wrap.append(select);
  return wrap;
}
function bookingRow(booking, data, open) {
  const service = data.services.find(item => item.id === booking.service);
  const staff = data.staff.find(item => item.id === booking.staff);
  const row = el('article', undefined, 'booking-row' + (booking.status === 'cancelled' ? ' is-cancelled' : ''));
  const time = el('div', undefined, 'booking-time');
  time.append(el('strong', booking.start.slice(11, 16)), el('span', 'UTC' + zoneOf(booking.start)));
  const content = el('div', undefined, 'booking-content');
  content.append(el('h3', booking.visitor), el('p', service?.name || 'Услуга не найдена', 'booking-service'));
  const facts = el('div', undefined, 'booking-facts');
  facts.append(el('span', staff?.name || 'Сотрудник не найден'), el('span', `${service?.minutes ?? '—'} мин · буфер ${service?.buffer ?? '—'} мин`));
  content.append(facts);
  const ending = el('div', undefined, 'booking-ending');
  ending.append(el('span', 'С буфером до'), el('strong', endLabel(booking)), el('span', booking.archived ? 'Архив' : booking.status === 'cancelled' ? 'Отменена' : 'Записан', 'state-tag'));
  row.append(time, content, ending, action('Открыть запись', () => open('bookings', booking), booking.visitor));
  return row;
}

export function productView({ host, key, rows, data, open }) {
  if (key !== 'bookings') return false;
  const shell = el('section', undefined, 'agenda');
  const filters = el('div', undefined, 'agenda-filters');
  const body = el('div', undefined, 'agenda-body');
  const dates = [...new Set(rows.map(row => row.start.slice(0, 10)))].sort();
  if (!dates.includes(selectedDate)) selectedDate = '';
  const employees = data.staff.filter(staff => rows.some(row => row.staff === staff.id));
  if (!employees.some(staff => staff.id === selectedStaff)) selectedStaff = '';
  const render = () => {
    body.replaceChildren();
    const visible = rows.filter(row => (!selectedDate || row.start.startsWith(selectedDate)) && (!selectedStaff || row.staff === selectedStaff));
    const caption = document.getElementById('record-count');
    if (caption) caption.textContent = `В повестке: ${visible.length} из ${rows.length}`;
    if (!visible.length) {
      body.append(el('p', 'В выбранную дату у этого сотрудника записей нет. Измените дату или выберите всех сотрудников.', 'agenda-empty'));
      return;
    }
    for (const day of [...new Set(visible.map(row => row.start.slice(0, 10)))].sort()) {
      const section = el('section', undefined, 'agenda-day');
      section.append(el('h2', dateLabel(day)));
      for (const booking of visible.filter(row => row.start.startsWith(day)).sort((a, b) => Date.parse(a.start) - Date.parse(b.start)))
        section.append(bookingRow(booking, data, open));
      body.append(section);
    }
  };
  filters.append(
    labelledSelect('Дата записи', [['', 'Все даты'], ...dates.map(day => [day, dateLabel(day)])], selectedDate, value => { selectedDate = value; render(); }),
    labelledSelect('Сотрудник', [['', 'Все сотрудники'], ...employees.map(staff => [staff.id, staff.name])], selectedStaff, value => { selectedStaff = value; render(); }),
  );
  const toolbar = host.parentElement.querySelector('.collection-toolbar');
  toolbar.classList.add('has-product-filters');
  toolbar.insertBefore(filters, toolbar.querySelector('.archive-toggle'));
  shell.append(body, el('p', 'Дата и начало показаны в часовом поясе записи. Конец включает буфер услуги. Прошедшее время не подтверждает проведение встречи.', 'view-footnote'));
  render();
  host.append(shell);
  return true;
}

export function editorContext({ collection, row, data }) {
  if (!row || collection.key !== 'bookings') return null;
  const service = data.services.find(item => item.id === row.service);
  const context = el('aside', undefined, 'booking-context');
  context.append(el('h2', 'Сохранённый интервал'), el('p', `${row.start.slice(0, 10)} · ${row.start.slice(11, 16)} — ${endLabel(row)} · UTC${zoneOf(row.start)}`), el('p', `${service?.name || 'Услуга не найдена'} · встреча ${service?.minutes ?? '—'} мин + буфер ${service?.buffer ?? '—'} мин`, 'muted'), el('small', 'После изменения сервер заново рассчитает конец и проверит пересечение.'));
  return context;
}
